-- =============================================================================
-- Custom Access Token Hook
-- =============================================================================
-- Injects firm_id and firm_role into every Supabase JWT's app_metadata.
-- This enables the firmContextMiddleware to extract firm_id from the JWT
-- without a database lookup on every request.
--
-- DEPLOYMENT STEPS:
--   1. Run this SQL in the Supabase SQL Editor (or as a Drizzle migration)
--   2. In Supabase Dashboard → Authentication → Hooks → Custom Access Token Hook:
--      Enable the hook and select: public.custom_access_token_hook
--
-- The function looks up the user's firm membership and injects:
--   - app_metadata.firm_id   (the firm's UUID)
--   - app_metadata.firm_role ('admin' | 'member')
--
-- If the user has no firm_members record (pre-onboarding), these fields are
-- absent from the JWT — firmContextMiddleware will return 403 for data routes,
-- and the user will be directed to /app/onboarding.
-- =============================================================================

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  claims jsonb;
  user_firm_id text;
  user_role text;
begin
  -- Look up the user's firm membership.
  -- Uses firm_members.deleted_at IS NULL to exclude soft-deleted memberships.
  select fm.firm_id::text, fm.role
    into user_firm_id, user_role
    from public.firm_members fm
   where fm.user_id = (event->>'user_id')::uuid
     and fm.deleted_at is null
   limit 1;

  -- Extract current claims from the event
  claims := event->'claims';

  -- Inject firm_id and firm_role into app_metadata if the user has a firm
  if user_firm_id is not null then
    claims := jsonb_set(claims, '{app_metadata,firm_id}', to_jsonb(user_firm_id));
    claims := jsonb_set(claims, '{app_metadata,firm_role}', to_jsonb(user_role));
  end if;

  -- Return the modified event with updated claims
  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Grant execute permission to supabase_auth_admin (required for Supabase to invoke this hook)
grant execute on function public.custom_access_token_hook to supabase_auth_admin;

-- Revoke from all other roles for security
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

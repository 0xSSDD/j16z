# Onboarding Flow

## Overview
End-to-end flow from Supabase signup to firm creation, deal seeding, JWT refresh, and authenticated app access. Spans Next.js middleware, Supabase Auth, the Hono API, and a Custom Access Token Hook.

## Complete Flow

```mermaid
sequenceDiagram
    participant USER as User
    participant FE as Next.js Frontend
    participant MW as Next.js Middleware
    participant SUPA as Supabase Auth
    participant HOOK as Custom Access Token Hook
    participant API as Hono API (/api/auth)
    participant DB as PostgreSQL

    Note over USER,DB: === SIGNUP ===

    USER->>FE: Visit /login
    FE->>FE: Render LoginForm<br/>(magic link / password)

    alt Magic Link
        FE->>SUPA: signInWithOtp({email})<br/>redirectTo: /auth/confirm
        SUPA-->>USER: Email with magic link
        USER->>FE: Click magic link
        FE->>FE: /auth/confirm route handler
        FE->>SUPA: exchangeCodeForSession(code)<br/>or verifyOtp({token_hash})
    else Password Signup
        FE->>SUPA: signUp({email, password})
        SUPA-->>USER: Confirmation email
        USER->>FE: Click confirmation link → /auth/confirm
        FE->>SUPA: exchangeCodeForSession(code)
    else Password Login
        FE->>SUPA: signInWithPassword({email, password})
        SUPA-->>FE: Session with JWT
        FE->>API: GET /api/auth/me
        API-->>FE: { firm: null }
        FE->>FE: Redirect to /app/onboarding
    end

    Note over USER,DB: === ONBOARDING ===

    SUPA-->>HOOK: Issue JWT → custom_access_token_hook
    HOOK->>DB: SELECT firm_id FROM firm_members WHERE user_id = sub
    DB-->>HOOK: (empty — no firm yet)
    HOOK-->>SUPA: JWT without firm_id in app_metadata

    FE->>FE: /auth/confirm checks user.app_metadata.firm_id
    FE->>FE: No firm_id → redirect to /app/onboarding

    USER->>FE: Enter firm name on /app/onboarding
    FE->>API: POST /api/auth/onboard<br/>{firmName: "Acme Capital"}

    API->>DB: Check existing firm_members (idempotency)
    API->>DB: INSERT INTO firms (name)
    DB-->>API: firm.id = 'abc-123'
    API->>DB: INSERT INTO firm_members (firm_id, user_id, role='admin')
    API->>API: seedFirm(firm.id, userId)
    API->>DB: INSERT 7 starter deals (is_starter=true)
    API->>DB: INSERT 4 starter events
    API->>DB: INSERT watchlist + watchlist_deals
    API->>DB: INSERT audit_log entries
    API-->>FE: 201 {firm: {id, name}}

    Note over USER,DB: === SESSION REFRESH ===

    FE->>SUPA: refreshSession()
    SUPA->>HOOK: Re-issue JWT → custom_access_token_hook
    HOOK->>DB: SELECT firm_id, role FROM firm_members
    DB-->>HOOK: firm_id='abc-123', role='admin'
    HOOK-->>SUPA: JWT with app_metadata.firm_id='abc-123'
    SUPA-->>FE: New JWT with firm_id

    FE->>FE: router.push('/app/inbox')

    Note over USER,DB: === AUTHENTICATED ACCESS ===

    USER->>FE: Navigate to /app/inbox
    MW->>SUPA: getUser() — validate session
    SUPA-->>MW: User authenticated
    MW-->>FE: Allow access
    FE->>API: GET /api/events (Bearer JWT with firm_id)
    API->>API: authMiddleware → firmContextMiddleware
    API->>DB: SELECT events WHERE firm_id = 'abc-123'
    DB-->>API: Starter events
    API-->>FE: Events JSON
```

## Next.js Middleware Route Protection

```mermaid
flowchart TD
    REQ["Incoming Request"] --> REFRESH["Refresh Supabase session"]
    REFRESH --> AUTH_CHECK{"Skip /auth/* routes?"}

    AUTH_CHECK -->|"/auth/*"| PASS["Pass through<br/>(auth routes handle themselves)"]
    AUTH_CHECK -->|other| USER_CHECK{"User authenticated?"}

    USER_CHECK -->|no| PATH_CHECK{"Path starts with /app/?"}
    PATH_CHECK -->|yes| REDIRECT_LOGIN["Redirect to /login?next={path}"]
    PATH_CHECK -->|no| PASS

    USER_CHECK -->|yes| LOGIN_CHECK{"Path is /login?"}
    LOGIN_CHECK -->|yes| REDIRECT_APP["Redirect to /app/inbox"]
    LOGIN_CHECK -->|no| PASS
```

**Key behavior:** The middleware refreshes the Supabase session on EVERY request. This keeps tokens fresh and prevents stale sessions. The `?next=` parameter preserves the user's intended destination through the login flow.

## Auth Confirm Route Handler (`/auth/confirm`)

```mermaid
flowchart TD
    CONFIRM["GET /auth/confirm"] --> PARAMS{"Has code param?"}

    PARAMS -->|yes| PKCE["exchangeCodeForSession(code)<br/>(PKCE flow — magic link, signup)"]
    PARAMS -->|no| HASH{"Has token_hash param?"}

    HASH -->|yes| OTP["verifyOtp({type, token_hash})<br/>(Legacy OTP flow)"]
    HASH -->|no| ERROR["Redirect to /login<br/>(missing params)"]

    PKCE --> FIRM_CHECK{"user.app_metadata.firm_id<br/>exists?"}
    OTP --> FIRM_CHECK

    FIRM_CHECK -->|yes| APP["Redirect to<br/>/app/inbox or ?next param"]
    FIRM_CHECK -->|no| ONBOARD["Redirect to<br/>/app/onboarding"]
```

## Sign Out Flow

```mermaid
sequenceDiagram
    participant USER as User
    participant FE as Frontend
    participant SUPA as Supabase
    participant ROUTE as /auth/signout

    USER->>FE: Click logout
    FE->>ROUTE: POST /auth/signout
    ROUTE->>SUPA: signOut({ scope: 'global' })
    ROUTE->>ROUTE: Clear all sb-* cookies<br/>(set expires to epoch 0)
    ROUTE-->>FE: Redirect to /login
```

**`scope: 'global'`** signs out from all devices/sessions, not just the current one.

## Login Form Modes

```mermaid
stateDiagram-v2
    [*] --> MagicLink: Default mode

    MagicLink --> PasswordLogin: "Sign in with password" link
    MagicLink --> PasswordSignup: "Create account" link

    PasswordLogin --> MagicLink: "Sign in with magic link" link
    PasswordLogin --> PasswordSignup: "Create account" link

    PasswordSignup --> PasswordLogin: "Sign in" link
    PasswordSignup --> MagicLink: "Sign in with magic link" link

    MagicLink --> EmailSent: Submit email
    PasswordLogin --> CheckFirm: Submit credentials
    PasswordSignup --> ConfirmationSent: Submit credentials

    CheckFirm --> Onboarding: firm === null
    CheckFirm --> AppInbox: firm !== null
```

## Custom Access Token Hook

The hook is a PostgreSQL function that runs every time Supabase issues a JWT:

```mermaid
flowchart TD
    TOKEN_ISSUE["Supabase issues JWT"] --> HOOK["custom_access_token_hook(event)"]
    HOOK --> LOOKUP["SELECT firm_id, role<br/>FROM firm_members<br/>WHERE user_id = event.claims.sub<br/>AND deleted_at IS NULL"]

    LOOKUP --> FOUND{"Row found?"}
    FOUND -->|yes| INJECT["Set claims.app_metadata.firm_id<br/>Set claims.app_metadata.firm_role"]
    FOUND -->|no| UNCHANGED["Return claims unchanged<br/>(no firm_id in JWT)"]

    INJECT --> RETURN["Return modified claims"]
    UNCHANGED --> RETURN
```

**Deployment requirement:** This hook must be enabled in the Supabase Dashboard under Authentication → Hooks → Custom Access Token Hook. Without it:
- No JWT will ever contain `firm_id`
- All data route requests will get 403 from `firmContextMiddleware`
- The app will be stuck in an infinite onboarding loop

**Timing gotcha:** After `POST /api/auth/onboard` creates the firm_members record, the frontend MUST call `supabase.auth.refreshSession()` to get a new JWT with the firm_id injected. Without this refresh, the old JWT (without firm_id) would still be used and data routes would 403.

## Invite Flow (Post-Onboarding)

```mermaid
sequenceDiagram
    participant ADMIN as Admin User
    participant API as POST /api/auth/invite
    participant SUPA as Supabase Admin Client
    participant DB as PostgreSQL
    participant NEW as Invited User

    ADMIN->>API: POST {email, role: 'member'}
    API->>API: Verify caller is admin (query firm_members)
    API->>SUPA: inviteUserByEmail(email, {data: {firmId, role}})
    SUPA-->>NEW: Invitation email
    API->>DB: INSERT INTO invites (firmId, email, role, token, expiresAt)
    API->>DB: INSERT INTO audit_log
    API-->>ADMIN: 201 {message, invite}

    NEW->>SUPA: Click invite link → create account
    Note over NEW,SUPA: Invited user follows normal<br/>signup → onboarding flow<br/>(but invite data pre-populates firm_id)
```

**Gotcha:** The invite endpoint uses `firmContextMiddleware`? No — it's under `/api/auth/*` which skips firm context. It manually queries `firm_members` to find the caller's firm and verify admin role. This is correct because the endpoint needs to work the same whether or not the JWT has firm_id.

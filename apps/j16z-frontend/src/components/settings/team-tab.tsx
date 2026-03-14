'use client';

import { Loader2, Plus, Shield, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { getFirmMembers, inviteFirmMember, removeMember, updateMemberRole } from '@/lib/api';

type MemberRole = 'admin' | 'member';

interface FirmMember {
  id: string;
  userId: string;
  email: string;
  role: MemberRole;
  joinedAt: string;
}

interface InviteModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onInvite: (email: string, role: MemberRole) => Promise<void>;
}

function InviteModal({ isOpen, isSubmitting, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  if (!isOpen) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) return;
    await onInvite(email, role);
    setEmail('');
    setRole('member');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">Invite Team Member</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="mb-2 block text-sm font-medium text-text-main">
              Email Address
            </label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label htmlFor="invite-role" className="mb-2 block text-sm font-medium text-text-main">
              Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(event) => setRole(event.target.value as MemberRole)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function formatJoinedAt(isoDate: string): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString();
}

function getRoleBadge(role: MemberRole) {
  if (role === 'admin') {
    return (
      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-500">
        Admin
      </span>
    );
  }

  return (
    <span className="rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-xs text-primary-500">
      Member
    </span>
  );
}

export function TeamTab() {
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadMembers = useCallback(async () => {
    setError(null);

    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const signedInUserId = session?.user?.id ?? null;
      setCurrentUserId(signedInUserId);

      const rows = await getFirmMembers();
      const normalizedMembers: FirmMember[] = rows.map((member) => ({
        id: member.id,
        userId: member.userId,
        email: member.email,
        role: member.role === 'admin' ? 'admin' : 'member',
        joinedAt: member.joinedAt,
      }));

      const currentMember = normalizedMembers.find((member) => member.userId === signedInUserId);
      setIsAdmin(currentMember?.role === 'admin');
      setMembers(normalizedMembers);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'Failed to load team members';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  const handleInvite = async (email: string, role: MemberRole) => {
    setIsMutating(true);
    setError(null);
    try {
      await inviteFirmMember(email, role);
      await loadMembers();
    } catch (inviteError) {
      const message = inviteError instanceof Error ? inviteError.message : 'Failed to send invitation';
      setError(message);
      throw inviteError;
    } finally {
      setIsMutating(false);
    }
  };

  const handleRoleChange = async (memberId: string, role: MemberRole) => {
    setIsMutating(true);
    setError(null);
    try {
      await updateMemberRole(memberId, role);
      await loadMembers();
    } catch (updateError) {
      const message = updateError instanceof Error ? updateError.message : 'Failed to update member role';
      setError(message);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const confirmed = window.confirm('Are you sure you want to remove this team member?');
    if (!confirmed) return;

    setIsMutating(true);
    setError(null);
    try {
      await removeMember(memberId);
      await loadMembers();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : 'Failed to remove member';
      setError(message);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="space-y-6">
      <InviteModal
        isOpen={showInviteModal}
        isSubmitting={isMutating}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Team Members</h2>
          <p className="text-sm text-text-muted">Manage team access and permissions</p>
        </div>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            disabled={isMutating}
            className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="h-4 w-4" />
            Invite Member
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>
      ) : null}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-background">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">
                Joined
              </th>
              {isAdmin ? (
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-text-muted">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody className="divide-y divide-border bg-surface">
            {isLoading ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-sm text-text-muted">
                  <div className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading members...
                  </div>
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-4 py-10 text-center text-sm text-text-muted">
                  No team members found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr key={member.id}>
                  <td className="px-4 py-3 text-sm text-text-main">{member.email}</td>
                  <td className="px-4 py-3 text-sm">{getRoleBadge(member.role)}</td>
                  <td className="px-4 py-3 text-sm text-text-main">{formatJoinedAt(member.joinedAt)}</td>
                  {isAdmin ? (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={member.role}
                          onChange={(event) => {
                            const nextRole = event.target.value === 'admin' ? 'admin' : 'member';
                            void handleRoleChange(member.id, nextRole);
                          }}
                          disabled={isMutating || member.userId === currentUserId}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs text-text-main focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>

                        <button
                          type="button"
                          onClick={() => void handleRemoveMember(member.id)}
                          disabled={isMutating || member.userId === currentUserId}
                          className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                          title="Remove member"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-main">
          <Shield className="mb-1 mr-1 inline h-4 w-4" />
          Role Permissions
        </h3>
        <div className="space-y-2 text-xs text-text-muted">
          <div className="flex gap-2">
            <span className="font-medium text-red-500">Admin:</span>
            <span>Can invite/remove members and manage role assignments.</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-primary-500">Member:</span>
            <span>Can access product workflows based on firm defaults.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

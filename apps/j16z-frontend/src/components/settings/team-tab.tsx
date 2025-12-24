"use client";

import { useState } from "react";
import { Plus, Mail, Shield, Trash2, Edit2, Clock } from "lucide-react";

type UserRole = "admin" | "analyst" | "pm";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  joinedDate: string;
  lastActive: string;
  status: "active" | "pending";
}

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (email: string, role: UserRole) => void;
}

function InviteModal({ isOpen, onClose, onInvite }: InviteModalProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("analyst");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onInvite(email, role);
      setEmail("");
      setRole("analyst");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">Invite Team Member</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main placeholder-text-dim focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="analyst">Analyst - View and analyze deals</option>
              <option value="pm">Portfolio Manager - Manage positions</option>
              <option value="admin">Admin - Full access</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface EditMemberModalProps {
  isOpen: boolean;
  member: TeamMember | null;
  onClose: () => void;
  onUpdate: (memberId: string, role: UserRole) => void;
}

function EditMemberModal({ isOpen, member, onClose, onUpdate }: EditMemberModalProps) {
  const [role, setRole] = useState<UserRole>(member?.role || "analyst");

  if (!isOpen || !member) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(member.id, role);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-surface p-6">
        <h3 className="mb-4 text-lg font-semibold text-text-main">Edit Member Permissions</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Member
            </label>
            <div className="rounded-md border border-border bg-background px-3 py-2">
              <p className="text-sm font-medium text-text-main">{member.name}</p>
              <p className="text-xs text-text-muted">{member.email}</p>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-text-main">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-main focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="analyst">Analyst - View and analyze deals</option>
              <option value="pm">Portfolio Manager - Manage positions</option>
              <option value="admin">Admin - Full access</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-text-main transition-colors hover:bg-surfaceHighlight"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
            >
              Update Permissions
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function TeamTab() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [members, setMembers] = useState<TeamMember[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("team_members");
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch {
          // Ignore parse errors
        }
      }
    }
    return [
      {
        id: "1",
        name: "David's Analyst",
        email: "analyst@j16z.com",
        role: "admin",
        joinedDate: "2023-01-15",
        lastActive: "2 minutes ago",
        status: "active",
      },
      {
        id: "2",
        name: "Sarah Chen",
        email: "sarah.chen@company.com",
        role: "analyst",
        joinedDate: "2023-06-20",
        lastActive: "1 hour ago",
        status: "active",
      },
      {
        id: "3",
        name: "Michael Torres",
        email: "m.torres@company.com",
        role: "pm",
        joinedDate: "2023-08-10",
        lastActive: "3 hours ago",
        status: "active",
      },
      {
        id: "4",
        name: "jessica.wong@company.com",
        email: "jessica.wong@company.com",
        role: "analyst",
        joinedDate: "2023-12-18",
        lastActive: "Pending",
        status: "pending",
      },
    ];
  });

  const handleInvite = (email: string, role: UserRole) => {
    const newMember: TeamMember = {
      id: Date.now().toString(),
      name: email,
      email,
      role,
      joinedDate: new Date().toISOString().split("T")[0],
      lastActive: "Pending",
      status: "pending",
    };
    const updated = [...members, newMember];
    setMembers(updated);
    localStorage.setItem("team_members", JSON.stringify(updated));
  };

  const handleUpdateRole = (memberId: string, role: UserRole) => {
    const updated = members.map(m =>
      m.id === memberId ? { ...m, role } : m
    );
    setMembers(updated);
    localStorage.setItem("team_members", JSON.stringify(updated));
  };

  const handleRemoveMember = (memberId: string) => {
    if (confirm("Are you sure you want to remove this team member? This action cannot be undone.")) {
      const updated = members.filter(m => m.id !== memberId);
      setMembers(updated);
      localStorage.setItem("team_members", JSON.stringify(updated));
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const styles = {
      admin: "bg-red-500/10 text-red-500 border-red-500/30",
      pm: "bg-blue-500/10 text-blue-500 border-blue-500/30",
      analyst: "bg-green-500/10 text-green-500 border-green-500/30",
    };
    const labels = {
      admin: "Admin",
      pm: "Portfolio Manager",
      analyst: "Analyst",
    };
    return (
      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${styles[role]}`}>
        {labels[role]}
      </span>
    );
  };

  const activeMembers = members.filter(m => m.status === "active");
  const pendingInvitations = members.filter(m => m.status === "pending");

  return (
    <div className="space-y-6">
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInvite}
      />

      <EditMemberModal
        isOpen={showEditModal}
        member={selectedMember}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMember(null);
        }}
        onUpdate={handleUpdateRole}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text-main">Team Members</h2>
          <p className="text-sm text-text-muted">
            Manage team access and permissions
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-600"
        >
          <Plus className="h-4 w-4" />
          Invite Member
        </button>
      </div>

      {/* Active Members */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-text-main">
          Active Members ({activeMembers.length})
        </h3>
        <div className="space-y-2">
          {activeMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-primary-500 to-amber-600 text-sm font-bold text-white">
                  {member.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                </div>
                <div>
                  <p className="font-medium text-text-main">{member.name}</p>
                  <p className="text-xs text-text-muted">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {getRoleBadge(member.role)}
                <div className="flex items-center gap-1 text-xs text-text-dim">
                  <Clock className="h-3 w-3" />
                  {member.lastActive}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedMember(member);
                      setShowEditModal(true);
                    }}
                    className="rounded-md p-2 text-text-muted transition-colors hover:bg-surfaceHighlight hover:text-text-main"
                    title="Edit permissions"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title="Remove member"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-main">
            Pending Invitations ({pendingInvitations.length})
          </h3>
          <div className="space-y-2">
            {pendingInvitations.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 opacity-60"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border">
                    <Mail className="h-4 w-4 text-text-dim" />
                  </div>
                  <div>
                    <p className="font-medium text-text-main">{member.email}</p>
                    <p className="text-xs text-text-muted">Invitation sent on {member.joinedDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {getRoleBadge(member.role)}
                  <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                    Pending
                  </span>
                  <button
                    onClick={() => handleRemoveMember(member.id)}
                    className="rounded-md p-2 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500"
                    title="Cancel invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Permissions Info */}
      <section className="rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-3 text-sm font-semibold text-text-main">
          <Shield className="mb-1 inline h-4 w-4" /> Role Permissions
        </h3>
        <div className="space-y-2 text-xs text-text-muted">
          <div className="flex gap-2">
            <span className="font-medium text-red-500">Admin:</span>
            <span>Full access to all features, team management, and settings</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-blue-500">Portfolio Manager:</span>
            <span>Manage positions, view all deals, configure alerts</span>
          </div>
          <div className="flex gap-2">
            <span className="font-medium text-green-500">Analyst:</span>
            <span>View and analyze deals, create watchlists, receive alerts</span>
          </div>
        </div>
      </section>
    </div>
  );
}

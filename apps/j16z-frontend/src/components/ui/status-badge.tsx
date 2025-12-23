import { DealStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: DealStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    ANNOUNCED: "bg-green-500/10 text-green-500 border-green-500/20",
    REGULATORY_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    LITIGATION: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    TERMINATED: "bg-red-500/10 text-red-500 border-red-500/20",
    CLOSED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
  };

  const icons = {
    ANNOUNCED: "🟢",
    REGULATORY_REVIEW: "🟡",
    LITIGATION: "🟠",
    APPROVED: "🔵",
    TERMINATED: "🔴",
    CLOSED: "⚪",
  };

  const labels = {
    ANNOUNCED: "Announced",
    REGULATORY_REVIEW: "Regulatory Review",
    LITIGATION: "Litigation",
    APPROVED: "Approved",
    TERMINATED: "Terminated",
    CLOSED: "Closed",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border font-mono text-xs font-medium ${styles[status]}`}
    >
      <span>{icons[status]}</span>
      <span>{labels[status]}</span>
    </span>
  );
}

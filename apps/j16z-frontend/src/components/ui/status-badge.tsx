import { DealStatus } from "@/lib/types";
import { CheckCircle2, AlertCircle, Scale, ThumbsUp, XCircle, Circle } from "lucide-react";

interface StatusBadgeProps {
  status: DealStatus;
}

const StatusIcon = ({ status }: { status: DealStatus }) => {
  const iconProps = { className: "h-3.5 w-3.5" };

  switch (status) {
    case "ANNOUNCED":
      return <CheckCircle2 {...iconProps} />;
    case "REGULATORY_REVIEW":
      return <AlertCircle {...iconProps} />;
    case "LITIGATION":
      return <Scale {...iconProps} />;
    case "APPROVED":
      return <ThumbsUp {...iconProps} />;
    case "TERMINATED":
      return <XCircle {...iconProps} />;
    case "CLOSED":
      return <Circle {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    ANNOUNCED: "bg-green-500/10 text-green-500 border-green-500/20",
    REGULATORY_REVIEW: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    LITIGATION: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    APPROVED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    TERMINATED: "bg-red-500/10 text-red-500 border-red-500/20",
    CLOSED: "bg-zinc-500/10 text-zinc-500 border-zinc-500/20",
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
      <StatusIcon status={status} />
      <span>{labels[status]}</span>
    </span>
  );
}

import { AlertCircle, CheckCircle2, Circle, Scale, ThumbsUp, XCircle } from 'lucide-react';
import type { DealStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: DealStatus;
}

const StatusIcon = ({ status }: { status: DealStatus }) => {
  const iconProps = { className: 'h-3.5 w-3.5' };

  switch (status) {
    case 'ANNOUNCED':
      return <CheckCircle2 {...iconProps} />;
    case 'REGULATORY_REVIEW':
      return <AlertCircle {...iconProps} />;
    case 'LITIGATION':
      return <Scale {...iconProps} />;
    case 'APPROVED':
      return <ThumbsUp {...iconProps} />;
    case 'TERMINATED':
      return <XCircle {...iconProps} />;
    case 'CLOSED':
      return <Circle {...iconProps} />;
    default:
      return <Circle {...iconProps} />;
  }
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const styles = {
    ANNOUNCED: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    REGULATORY_REVIEW: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    LITIGATION: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    APPROVED: 'bg-primary-500/10 text-primary-500 border-primary-500/20',
    TERMINATED: 'bg-red-500/10 text-red-500 border-red-500/20',
    CLOSED: 'bg-surface text-text-muted border-border',
  };

  const labels = {
    ANNOUNCED: 'Announced',
    REGULATORY_REVIEW: 'Regulatory Review',
    LITIGATION: 'Litigation',
    APPROVED: 'Approved',
    TERMINATED: 'Terminated',
    CLOSED: 'Closed',
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

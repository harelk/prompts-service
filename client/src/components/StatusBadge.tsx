import type { PromptStatus } from "../hooks/usePrompts";

const STATUS_CONFIG: Record<
  PromptStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "טיוטה",
    className: "bg-status-draft-bg text-status-draft-text",
  },
  active: {
    label: "ממתין לביצוע",
    className: "bg-status-active-bg text-status-active-text",
  },
  in_progress: {
    label: "בביצוע",
    className: "bg-status-in_progress-bg text-status-in_progress-text",
  },
  done: {
    label: "הושלם",
    className: "bg-status-done-bg text-status-done-text",
  },
  archived: {
    label: "ארכיון",
    className: "bg-status-archived-bg text-status-archived-text",
  },
};

interface StatusBadgeProps {
  status: PromptStatus;
  className?: string;
}

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };

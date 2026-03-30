import type { PromptOwner } from "../hooks/usePrompts";

const OWNER_CONFIG: Record<PromptOwner, { label: string; className: string }> = {
  raout: { label: "רעות", className: "bg-owner-raout-bg text-owner-raout-text" },
  harel: { label: "הראל", className: "bg-owner-harel-bg text-owner-harel-text" },
  dvora: { label: "דבורה", className: "bg-owner-dvora-bg text-owner-dvora-text" },
  claude: { label: "קלאוד", className: "bg-owner-claude-bg text-owner-claude-text" },
};

interface OwnerBadgeProps {
  owner: PromptOwner;
  className?: string;
}

export default function OwnerBadge({ owner, className = "" }: OwnerBadgeProps) {
  const config = OWNER_CONFIG[owner] ?? { label: owner, className: "" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export { OWNER_CONFIG };

import { useNavigate } from "react-router-dom";
import type { Prompt } from "../hooks/usePrompts";
import StatusBadge from "./StatusBadge";
import OwnerBadge from "./OwnerBadge";
import ServiceChips from "./ServiceChips";

interface PromptCardProps {
  prompt: Prompt;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("he-IL", {
    day: "numeric",
    month: "short",
  });
}

export default function PromptCard({ prompt }: PromptCardProps) {
  const navigate = useNavigate();

  const preview =
    prompt.content.length > 120
      ? prompt.content.slice(0, 120) + "..."
      : prompt.content;

  return (
    <button
      onClick={() => navigate(`/prompts/${prompt.id}`)}
      className="w-full text-right bg-background-surface rounded-lg p-4 shadow-sm border border-gray-100 hover:border-primary/30 hover:shadow-md active:scale-[0.99] transition-all fade-in"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <StatusBadge status={prompt.status} />
          <OwnerBadge owner={prompt.owner} />
        </div>
        <span className="text-xs text-text-tertiary">{formatDate(prompt.createdAt)}</span>
      </div>

      <h3 className="font-semibold text-text-primary text-md mb-1 leading-snug">{prompt.title}</h3>

      <p className="text-sm text-text-secondary leading-relaxed mb-3">{preview}</p>

      {prompt.services.length > 0 && (
        <ServiceChips services={prompt.services} />
      )}
    </button>
  );
}

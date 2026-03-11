import type { Service } from "../hooks/usePrompts";

interface ServiceChipsProps {
  services: Service[];
  max?: number;
}

export default function ServiceChips({ services, max = 3 }: ServiceChipsProps) {
  if (services.length === 0) return null;

  const visible = services.slice(0, max);
  const overflow = services.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((s) => (
        <span
          key={s.id}
          className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-text-secondary text-xs rounded-full"
        >
          {s.name}
        </span>
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-text-tertiary text-xs rounded-full">
          +{overflow}
        </span>
      )}
    </div>
  );
}

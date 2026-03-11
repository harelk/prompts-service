import { NavLink, useNavigate } from "react-router-dom";
import { FileText, Plus, Grid } from "lucide-react";

export default function BottomNav() {
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-20 bg-background-surface border-t border-gray-100 bottom-nav-height max-w-[480px] mx-auto left-1/2 -translate-x-1/2 w-full">
      <div
        className="flex items-center justify-around h-16"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-text-tertiary"
            }`
          }
        >
          <FileText size={22} />
          <span className="text-xs font-medium">פרומפטים</span>
        </NavLink>

        <button
          onClick={() => navigate("/prompts/new")}
          className="flex flex-col items-center gap-1 py-2 px-4 rounded-lg text-text-tertiary hover:text-primary transition-colors"
        >
          <Plus size={22} />
          <span className="text-xs font-medium">חדש</span>
        </button>

        <NavLink
          to="/services"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-2 px-4 rounded-lg transition-colors ${
              isActive ? "text-primary" : "text-text-tertiary"
            }`
          }
        >
          <Grid size={22} />
          <span className="text-xs font-medium">סרוויסים</span>
        </NavLink>
      </div>
    </nav>
  );
}

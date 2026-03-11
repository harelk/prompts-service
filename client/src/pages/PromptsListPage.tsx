import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X } from "lucide-react";
import Layout from "../components/Layout";
import PromptCard from "../components/PromptCard";
import { usePrompts } from "../hooks/usePrompts";
import type { PromptStatus } from "../hooks/usePrompts";

type FilterTab = "all" | PromptStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "draft", label: "טיוטה" },
  { key: "active", label: "ממתין לביצוע" },
  { key: "done", label: "הושלם" },
  { key: "archived", label: "ארכיון" },
];

export default function PromptsListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the debounce timer on unmount to prevent state updates on unmounted component.
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(value), 300);
  }, []);

  const { prompts, loading, error, reload } = usePrompts({
    status: activeTab === "all" ? undefined : activeTab,
    search: debouncedSearch || undefined,
  });

  return (
    <Layout title="ניהול פרומפטים">
      <div className="px-4 pt-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-background-surface text-text-secondary border border-gray-200 hover:border-primary/30"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute top-1/2 -translate-y-1/2 end-3 text-text-tertiary pointer-events-none"
          />
          <input
            type="search"
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="חיפוש פרומפטים..."
            className="w-full pr-9 pl-4 py-2.5 bg-background-surface border border-gray-200 rounded-full text-sm text-right placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute top-1/2 -translate-y-1/2 start-3 text-text-tertiary hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Content */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-background-surface rounded-lg animate-pulse border border-gray-100" />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-error text-sm mb-3">{error}</p>
            <button
              onClick={reload}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm hover:bg-primary-hover"
            >
              נסה שנית
            </button>
          </div>
        )}

        {!loading && !error && prompts.length === 0 && (
          <div className="text-center py-16">
            {debouncedSearch ? (
              <>
                <p className="text-text-secondary text-md font-medium">לא נמצאו תוצאות</p>
                <p className="text-text-tertiary text-sm mt-1">נסה לחפש מילה אחרת</p>
              </>
            ) : (
              <>
                <p className="text-text-secondary text-md font-medium">אין פרומפטים עדיין</p>
                <p className="text-text-tertiary text-sm mt-1">לחץ על + ליצירת פרומפט חדש</p>
              </>
            )}
          </div>
        )}

        {!loading && !error && prompts.length > 0 && (
          <div className="space-y-3 pb-4">
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} prompt={prompt} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => navigate("/prompts/new")}
        className="fixed bottom-[76px] end-4 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover active:bg-primary-pressed flex items-center justify-center transition-colors z-10"
        style={{ bottom: "calc(76px + env(safe-area-inset-bottom, 0px))" }}
        aria-label="פרומפט חדש"
      >
        <Plus size={24} />
      </button>
    </Layout>
  );
}

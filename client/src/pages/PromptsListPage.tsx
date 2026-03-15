import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, X, ChevronDown } from "lucide-react";
import Layout from "../components/Layout";
import PromptCard from "../components/PromptCard";
import { usePrompts } from "../hooks/usePrompts";
import { useServices } from "../hooks/useServices";
import type { PromptStatus } from "../hooks/usePrompts";

type FilterTab = "all" | PromptStatus;

const TABS: { key: FilterTab; label: string }[] = [
  { key: "all", label: "הכל" },
  { key: "draft", label: "טיוטה" },
  { key: "active", label: "ממתין לביצוע" },
  { key: "in_progress", label: "בביצוע" },
  { key: "done", label: "הושלם" },
  { key: "archived", label: "ארכיון" },
];

export default function PromptsListPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [serviceDropdownOpen, setServiceDropdownOpen] = useState(false);
  const [serviceSearch, setServiceSearch] = useState("");
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { services } = useServices();

  const filteredServices = useMemo(
    () =>
      serviceSearch
        ? services.filter((s) => s.name.includes(serviceSearch))
        : services,
    [services, serviceSearch]
  );

  const selectedServiceName = useMemo(
    () => services.find((s) => s.id === selectedServiceId)?.name,
    [services, selectedServiceId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) {
        setServiceDropdownOpen(false);
        setServiceSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

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
    serviceId: selectedServiceId,
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

        {/* Service Filter Dropdown */}
        {services.length > 0 && (
          <div className="relative" ref={serviceDropdownRef}>
            <button
              onClick={() => {
                setServiceDropdownOpen((v) => !v);
                setServiceSearch("");
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 border rounded-md text-sm text-right transition-colors ${
                selectedServiceId
                  ? "bg-primary/5 border-primary text-primary"
                  : "bg-background-surface border-gray-200 text-text-secondary"
              }`}
            >
              <ChevronDown size={16} className="text-text-tertiary" />
              <span>{selectedServiceName ?? "כל הסרוויסים"}</span>
            </button>
            {serviceDropdownOpen && (
              <div className="absolute z-20 top-full mt-1 w-full bg-background-surface border border-gray-200 rounded-md shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    type="text"
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="חיפוש סרוויס..."
                    autoFocus
                    className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right placeholder-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  <button
                    onClick={() => {
                      setSelectedServiceId(undefined);
                      setServiceDropdownOpen(false);
                      setServiceSearch("");
                    }}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                      !selectedServiceId ? "text-primary font-medium" : "text-text-primary"
                    }`}
                  >
                    כל הסרוויסים
                  </button>
                  {filteredServices.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setSelectedServiceId(s.id);
                        setServiceDropdownOpen(false);
                        setServiceSearch("");
                      }}
                      className={`w-full text-right px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        selectedServiceId === s.id ? "text-primary font-medium" : "text-text-primary"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                  {filteredServices.length === 0 && (
                    <p className="px-3 py-2 text-sm text-text-tertiary">לא נמצאו סרוויסים</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

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

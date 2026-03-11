import { useState, useRef } from "react";
import { Plus, Trash2, Grid } from "lucide-react";
import Layout from "../components/Layout";
import { useServices } from "../hooks/useServices";

export default function ServicesPage() {
  const { services, loading, error, createService, deleteService } = useServices();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) {
      setAddError("שם הסרוויס נדרש");
      inputRef.current?.focus();
      return;
    }

    setAdding(true);
    setAddError(null);
    try {
      await createService(name);
      setNewName("");
      inputRef.current?.focus();
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "שגיאה בהוספה");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteService(id);
    } catch {
      // silently handle
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleAdd();
  };

  return (
    <Layout title="סרוויסים">
      <div className="px-4 pt-4 space-y-4">
        {/* Add New */}
        <div className="bg-background-surface rounded-lg border border-gray-100 p-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">הוסף סרוויס חדש</h2>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newName}
              onChange={(e) => {
                setNewName(e.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={handleKeyDown}
              placeholder="שם הסרוויס (למשל: Claude)"
              className={`flex-1 px-3 py-2.5 border rounded-md text-sm text-right bg-background-app placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                addError ? "border-error" : "border-gray-200"
              }`}
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="flex items-center gap-1.5 px-3 py-2.5 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
              {adding ? "..." : "הוסף"}
            </button>
          </div>
          {addError && <p className="text-error text-xs">{addError}</p>}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-background-surface rounded-lg animate-pulse border border-gray-100" />
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="text-center py-6">
            <p className="text-error text-sm">{error}</p>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && services.length === 0 && (
          <div className="text-center py-12">
            <Grid size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-text-secondary font-medium">אין סרוויסים עדיין</p>
            <p className="text-text-tertiary text-sm mt-1">הוסף את הסרוויס הראשון שלך</p>
          </div>
        )}

        {/* Services List */}
        {!loading && !error && services.length > 0 && (
          <div className="space-y-2">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center justify-between bg-background-surface border border-gray-100 rounded-lg px-4 py-3 fade-in"
              >
                <span className="text-sm font-medium text-text-primary">{service.name}</span>
                <button
                  onClick={() => handleDelete(service.id)}
                  disabled={deletingId === service.id}
                  className="p-1.5 text-text-tertiary hover:text-error disabled:opacity-40 transition-colors rounded"
                  aria-label={`מחק ${service.name}`}
                >
                  {deletingId === service.id ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}

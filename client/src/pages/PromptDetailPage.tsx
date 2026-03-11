import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Edit2, Check, X, Trash2, Copy, CheckCheck, ChevronDown } from "lucide-react";
import Layout from "../components/Layout";
import StatusBadge from "../components/StatusBadge";
import { usePrompt } from "../hooks/usePrompts";
import { useServices } from "../hooks/useServices";
import type { PromptStatus } from "../hooks/usePrompts";

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("he-IL", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function PromptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { prompt, loading, error, updatePrompt, deletePrompt } = usePrompt(id!);
  const { services } = useServices();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<PromptStatus>("draft");
  const [editServiceIds, setEditServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const startEdit = () => {
    if (!prompt) return;
    setEditTitle(prompt.title);
    setEditContent(prompt.content);
    setEditStatus(prompt.status);
    setEditServiceIds(prompt.services.map((s) => s.id));
    setEditErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditErrors({});
  };

  const saveEdit = async () => {
    const errs: Record<string, string> = {};
    if (!editTitle.trim()) errs.title = "יש להוסיף כותרת";
    if (!editContent.trim()) errs.content = "יש להוסיף תוכן";
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      return;
    }

    setSaving(true);
    try {
      await updatePrompt({
        title: editTitle.trim(),
        content: editContent.trim(),
        status: editStatus,
        serviceIds: editServiceIds,
      });
      setEditing(false);
    } catch (err) {
      setEditErrors({ general: err instanceof Error ? err.message : "שגיאה בשמירה" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deletePrompt();
      navigate("/", { replace: true });
    } catch {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleCopy = async () => {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleService = (sid: string) => {
    setEditServiceIds((prev) =>
      prev.includes(sid) ? prev.filter((id) => id !== sid) : [...prev, sid]
    );
  };

  const STATUS_OPTIONS: { value: PromptStatus; label: string }[] = [
    { value: "draft", label: "טיוטה" },
    { value: "active", label: "ממתין לביצוע" },
    { value: "done", label: "הושלם" },
    { value: "archived", label: "ארכיון" },
  ];

  if (loading) {
    return (
      <Layout
        title="פרטי פרומפט"
        headerLeft={
          <button onClick={() => navigate(-1)} className="text-text-secondary p-1 rounded">
            <ChevronRight size={20} />
          </button>
        }
      >
        <div className="px-4 pt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-background-surface rounded-lg animate-pulse" />
          ))}
        </div>
      </Layout>
    );
  }

  if (error || !prompt) {
    return (
      <Layout
        title="פרטי פרומפט"
        headerLeft={
          <button onClick={() => navigate(-1)} className="text-text-secondary p-1 rounded">
            <ChevronRight size={20} />
          </button>
        }
      >
        <div className="px-4 pt-8 text-center">
          <p className="text-error text-sm">{error ?? "הפרומפט לא נמצא"}</p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-md text-sm"
          >
            חזור לרשימה
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={editing ? "עריכה" : "פרטי פרומפט"}
      headerLeft={
        <button onClick={() => navigate(-1)} className="text-text-secondary p-1 rounded">
          <ChevronRight size={20} />
        </button>
      }
      headerRight={
        editing ? (
          <div className="flex gap-2">
            <button onClick={cancelEdit} className="text-text-secondary p-1 rounded">
              <X size={20} />
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="text-primary p-1 rounded disabled:opacity-50"
            >
              <Check size={20} />
            </button>
          </div>
        ) : (
          <button onClick={startEdit} className="text-primary p-1 rounded">
            <Edit2 size={18} />
          </button>
        )
      }
    >
      <div className="px-4 pt-4 space-y-4 pb-8">
        {editing ? (
          // Edit Mode
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">כותרת</label>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  if (editErrors.title) setEditErrors((p) => ({ ...p, title: "" }));
                }}
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-right bg-background-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${
                  editErrors.title ? "border-error" : "border-gray-200"
                }`}
              />
              {editErrors.title && <p className="text-error text-xs mt-1">{editErrors.title}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">תוכן</label>
              <textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                  if (editErrors.content) setEditErrors((p) => ({ ...p, content: "" }));
                }}
                rows={8}
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-right bg-background-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none ${
                  editErrors.content ? "border-error" : "border-gray-200"
                }`}
              />
              {editErrors.content && <p className="text-error text-xs mt-1">{editErrors.content}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">סטטוס</label>
              <div className="relative">
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as PromptStatus)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm text-right bg-background-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary appearance-none"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  className="absolute top-1/2 -translate-y-1/2 start-3 text-text-tertiary pointer-events-none"
                />
              </div>
            </div>

            {services.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">סרוויסים</label>
                <div className="flex flex-wrap gap-2">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleService(s.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        editServiceIds.includes(s.id)
                          ? "bg-primary text-white border-primary"
                          : "bg-background-surface text-text-secondary border-gray-200 hover:border-primary/30"
                      }`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {editErrors.general && (
              <p className="text-error text-sm">{editErrors.general}</p>
            )}

            <button
              onClick={saveEdit}
              disabled={saving}
              className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover disabled:opacity-50 transition-colors"
            >
              {saving ? "שומר..." : "שמור שינויים"}
            </button>
          </div>
        ) : (
          // View Mode
          <div className="space-y-4">
            {/* Status + Date */}
            <div className="flex items-center justify-between">
              <StatusBadge status={prompt.status} />
              <span className="text-xs text-text-tertiary">{formatDate(prompt.createdAt)}</span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-text-primary leading-snug">{prompt.title}</h2>

            {/* Services */}
            {prompt.services.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {prompt.services.map((s) => (
                  <span
                    key={s.id}
                    className="px-2.5 py-1 bg-gray-100 text-text-secondary text-sm rounded-full"
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="bg-background-surface border border-gray-100 rounded-lg p-4 relative">
              <button
                onClick={handleCopy}
                className="absolute top-3 start-3 p-1.5 rounded-md text-text-tertiary hover:text-primary hover:bg-gray-50 transition-colors"
                title="העתק תוכן"
              >
                {copied ? <CheckCheck size={16} className="text-success" /> : <Copy size={16} />}
              </button>
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap pe-6">
                {prompt.content}
              </p>
            </div>

            {/* Updated at */}
            {prompt.updatedAt !== prompt.createdAt && (
              <p className="text-xs text-text-tertiary text-end">
                עודכן: {formatDate(prompt.updatedAt)}
              </p>
            )}

            {/* Raw Transcription */}
            {prompt.rawTranscription && (
              <details className="bg-gray-50 rounded-md border border-gray-200">
                <summary className="px-3 py-2 text-sm text-text-secondary cursor-pointer select-none">
                  תמלול גולמי
                </summary>
                <p className="px-3 pb-3 text-sm text-text-tertiary leading-relaxed whitespace-pre-wrap">
                  {prompt.rawTranscription}
                </p>
              </details>
            )}

            {/* Delete Button */}
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-error text-sm hover:opacity-80 transition-opacity mt-2"
              >
                <Trash2 size={16} />
                מחק פרומפט
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-lg p-4 space-y-3">
                <p className="text-sm text-text-primary font-medium">האם למחוק את הפרומפט?</p>
                <p className="text-xs text-text-secondary">פעולה זו אינה ניתנת לביטול.</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2 border border-gray-200 rounded-md text-sm text-text-secondary hover:bg-gray-50"
                  >
                    ביטול
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 py-2 bg-error text-white rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50"
                  >
                    {deleting ? "מוחק..." : "מחק"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

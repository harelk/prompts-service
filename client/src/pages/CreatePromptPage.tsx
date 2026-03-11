import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, ChevronDown } from "lucide-react";
import Layout from "../components/Layout";
import VoiceRecorder from "../components/VoiceRecorder";
import { useServices } from "../hooks/useServices";
import { createPrompt } from "../hooks/usePrompts";
import type { PromptStatus } from "../hooks/usePrompts";

type InputMode = "type" | "record";

export default function CreatePromptPage() {
  const navigate = useNavigate();
  const { services } = useServices();

  const [mode, setMode] = useState<InputMode>("type");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rawTranscription, setRawTranscription] = useState<string | undefined>();
  const [status, setStatus] = useState<PromptStatus>("draft");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = "יש להוסיף כותרת";
    if (!content.trim()) errs.content = "יש להוסיף תוכן";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const prompt = await createPrompt({
        title: title.trim(),
        content: content.trim(),
        status,
        serviceIds: selectedServiceIds,
        rawTranscription,
      });
      navigate(`/prompts/${prompt.id}`, { replace: true });
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : "שגיאה בשמירה" });
      setSaving(false);
    }
  };

  const handleVoiceResult = (result: {
    rawTranscription: string;
    cleanedText: string;
    suggestedTitle: string;
  }) => {
    setContent(result.cleanedText);
    setTitle(result.suggestedTitle);
    setRawTranscription(result.rawTranscription);
    setMode("type"); // switch to type mode to review
    setVoiceError(null);
  };

  const toggleService = (id: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const STATUS_OPTIONS: { value: PromptStatus; label: string }[] = [
    { value: "draft", label: "טיוטה" },
    { value: "active", label: "ממתין לביצוע" },
    { value: "done", label: "הושלם" },
    { value: "archived", label: "ארכיון" },
  ];

  return (
    <Layout
      title="פרומפט חדש"
      headerLeft={
        <button
          onClick={() => navigate(-1)}
          className="text-text-secondary hover:text-text-primary p-1 rounded"
        >
          <ChevronRight size={20} />
        </button>
      }
      headerRight={
        <button
          onClick={handleSave}
          disabled={saving}
          className="text-primary font-semibold text-sm disabled:opacity-50"
        >
          {saving ? "שומר..." : "שמור"}
        </button>
      }
    >
      <div className="px-4 pt-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode("type")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "type"
                ? "bg-background-surface text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            הקלדה
          </button>
          <button
            onClick={() => setMode("record")}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
              mode === "record"
                ? "bg-background-surface text-primary shadow-sm"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            הקלטה
          </button>
        </div>

        {mode === "record" && (
          <div className="bg-background-surface rounded-lg p-4 border border-gray-100">
            <VoiceRecorder
              onResult={handleVoiceResult}
              onError={(msg) => setVoiceError(msg)}
            />
            {voiceError && (
              <p className="text-error text-sm text-center mt-2">{voiceError}</p>
            )}
          </div>
        )}

        {mode === "type" && (
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                כותרת <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((p) => ({ ...p, title: "" }));
                }}
                placeholder="כותרת הפרומפט"
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-right bg-background-surface placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors ${
                  errors.title ? "border-error" : "border-gray-200"
                }`}
              />
              {errors.title && <p className="text-error text-xs mt-1">{errors.title}</p>}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">
                תוכן <span className="text-error">*</span>
              </label>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  if (errors.content) setErrors((p) => ({ ...p, content: "" }));
                }}
                placeholder="תוכן הפרומפט..."
                rows={6}
                className={`w-full px-3 py-2.5 border rounded-md text-sm text-right bg-background-surface placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none ${
                  errors.content ? "border-error" : "border-gray-200"
                }`}
              />
              {errors.content && <p className="text-error text-xs mt-1">{errors.content}</p>}
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">סטטוס</label>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as PromptStatus)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-md text-sm text-right bg-background-surface focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors appearance-none"
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

            {/* Services */}
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
                        selectedServiceIds.includes(s.id)
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

            {/* Raw Transcription (if from voice) */}
            {rawTranscription && (
              <details className="bg-gray-50 rounded-md border border-gray-200">
                <summary className="px-3 py-2 text-sm text-text-secondary cursor-pointer select-none">
                  תמלול גולמי
                </summary>
                <p className="px-3 pb-3 text-sm text-text-tertiary leading-relaxed whitespace-pre-wrap">
                  {rawTranscription}
                </p>
              </details>
            )}

            {errors.general && (
              <p className="text-error text-sm">{errors.general}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 transition-colors"
            >
              {saving ? "שומר..." : "שמור פרומפט"}
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}

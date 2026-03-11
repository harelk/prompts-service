import { useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, login } = useAuth();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    const success = await login(password.trim());
    setLoading(false);

    if (!success) {
      setError("סיסמה שגויה. אנא נסה שנית.");
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
      setPassword("");
      inputRef.current?.focus();
    }
  };

  return (
    <div className="min-h-dvh bg-background-app flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-background-surface rounded-lg p-8 shadow-sm">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-status-active-bg rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#4F52E8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-semibold text-text-primary">ניהול פרומפטים</h1>
            <p className="text-sm text-text-secondary mt-1">הכנס סיסמה להמשך</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={shaking ? "shake" : ""}>
              <input
                ref={inputRef}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="סיסמה"
                autoFocus
                autoComplete="current-password"
                className={`w-full px-4 py-3 rounded-md border text-md text-right bg-background-app placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-colors ${
                  error ? "border-error" : "border-gray-200"
                }`}
              />
              {error && (
                <p className="text-error text-sm mt-1 text-right">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "מתחבר..." : "כניסה"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ShieldCheck, AlertCircle } from "lucide-react";

interface CaptchaWidgetProps {
  onChallengeChange?: (token: string, input: string) => void;
  userInput: string;
  onUserInputChange: (val: string) => void;
  disabled?: boolean;
}

export default function CaptchaWidget({
  onChallengeChange,
  userInput,
  onUserInputChange,
  disabled = false,
}: CaptchaWidgetProps) {
  const [captchaImage, setCaptchaImage] = useState<string>("");
  const [captchaToken, setCaptchaToken] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNewChallenge = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/auth/captcha");
      if (!res.ok) {
        throw new Error(`Failed to load security challenge (${res.status})`);
      }
      const data = await res.json();
      setCaptchaToken(data.captchaToken);
      setCaptchaImage(data.captchaImage);
      onUserInputChange("");
      if (onChallengeChange) {
        onChallengeChange(data.captchaToken, "");
      }
    } catch (err: any) {
      console.warn("CAPTCHA challenge fetch error:", err);
      setError("Failed to load security challenge. Please click reload.");
    } finally {
      setLoading(false);
    }
  }, [onChallengeChange, onUserInputChange]);

  useEffect(() => {
    fetchNewChallenge();
  }, [fetchNewChallenge]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    onUserInputChange(val);
    if (onChallengeChange) {
      onChallengeChange(captchaToken, val);
    }
  };

  return (
    <div className="space-y-2 select-none" id="captcha-container">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <label htmlFor="captcha-input" className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Anti-Bot Verification</span>
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Case-insensitive</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Anti-bot Visual Distorted Canvas */}
        <div className="relative flex-shrink-0 h-12 bg-slate-950 border border-slate-700/80 rounded-lg overflow-hidden flex items-center justify-center p-0.5">
          {loading ? (
            <div className="w-[160px] h-11 flex items-center justify-center gap-1.5 text-slate-400 text-xs font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Generating...</span>
            </div>
          ) : captchaImage ? (
            <img
              src={captchaImage}
              alt="Security CAPTCHA Challenge"
              className="h-full w-auto object-contain rounded"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-[160px] h-11 flex items-center justify-center text-xs text-rose-400 px-2 text-center">
              Unable to load
            </div>
          )}
        </div>

        {/* Reload button */}
        <button
          type="button"
          id="captcha-refresh-btn"
          onClick={fetchNewChallenge}
          disabled={loading || disabled}
          title="Request a new CAPTCHA challenge"
          className="p-3 bg-slate-800 hover:bg-slate-750 active:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white border border-slate-700/80 rounded-lg transition flex items-center justify-center"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
        </button>

        {/* Input box */}
        <input
          id="captcha-input"
          type="text"
          maxLength={6}
          autoComplete="off"
          disabled={disabled || loading}
          placeholder="Code"
          value={userInput}
          onChange={handleInputChange}
          className="flex-1 min-w-[90px] h-12 px-3 bg-slate-850 border border-slate-700 text-white font-mono font-bold tracking-widest text-center text-base rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
      </div>

      {error && (
        <div className="flex items-center gap-1 text-[11px] text-rose-400">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

/**
 * Server-side anti-bot verification helper
 */
export async function verifyCaptchaChallenge(captchaToken: string, userInput: string): Promise<{ success: boolean; verificationToken?: string; error?: string }> {
  if (!captchaToken || !userInput.trim()) {
    return { success: false, error: "Please enter the security verification code." };
  }

  try {
    const res = await fetch("/api/auth/captcha/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        captchaToken,
        userInput: userInput.trim(),
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || "Security code verification failed." };
    }

    return { success: true, verificationToken: data.verificationToken };
  } catch (err: any) {
    console.warn("CAPTCHA verification network error:", err);
    return { success: false, error: "Network error validating security code. Please retry." };
  }
}

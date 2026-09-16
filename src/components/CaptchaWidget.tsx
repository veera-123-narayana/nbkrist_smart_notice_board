import { useEffect, useRef, useState, useCallback } from "react";
import { ShieldCheck, AlertCircle, RefreshCw } from "lucide-react";

declare global {
  interface Window {
    grecaptcha?: {
      render: (
        container: HTMLElement | string,
        parameters: {
          sitekey: string;
          theme?: "dark" | "light";
          size?: "normal" | "compact";
          tabindex?: number;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (error?: any) => void;
        }
      ) => number;
      reset: (widgetId?: number) => void;
      getResponse: (widgetId?: number) => string;
      ready: (callback: () => void) => void;
    };
    onGoogleReCaptchaLoad?: () => void;
  }
}

interface CaptchaWidgetProps {
  onVerify?: (token: string) => void;
  onExpire?: () => void;
  onError?: (err?: any) => void;
  disabled?: boolean;
  className?: string;
  // Backward compatibility props
  onChallengeChange?: (token: string, input: string) => void;
  userInput?: string;
  onUserInputChange?: (val: string) => void;
}

// Fallback to official Google reCAPTCHA v2 Checkbox test site key for localhost testing
// Production key should be provided in VITE_RECAPTCHA_SITE_KEY environment variable
const FALLBACK_TEST_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

export default function CaptchaWidget({
  onVerify,
  onExpire,
  onError,
  disabled = false,
  className = "",
  onChallengeChange,
  onUserInputChange,
}: CaptchaWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<number | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);

  const siteKey =
    import.meta.env.VITE_RECAPTCHA_SITE_KEY &&
    import.meta.env.VITE_RECAPTCHA_SITE_KEY.trim() !== "" &&
    !import.meta.env.VITE_RECAPTCHA_SITE_KEY.includes("YOUR_")
      ? import.meta.env.VITE_RECAPTCHA_SITE_KEY.trim()
      : FALLBACK_TEST_SITE_KEY;

  const handleVerify = useCallback(
    (token: string) => {
      setIsVerified(true);
      setLoadError(null);
      if (onVerify) {
        onVerify(token);
      }
      if (onChallengeChange) {
        onChallengeChange(token, token);
      }
      if (onUserInputChange) {
        onUserInputChange(token);
      }
    },
    [onVerify, onChallengeChange, onUserInputChange]
  );

  const handleExpire = useCallback(() => {
    setIsVerified(false);
    if (onExpire) {
      onExpire();
    }
    if (onVerify) {
      onVerify("");
    }
    if (onChallengeChange) {
      onChallengeChange("", "");
    }
    if (onUserInputChange) {
      onUserInputChange("");
    }
  }, [onExpire, onVerify, onChallengeChange, onUserInputChange]);

  const handleWidgetError = useCallback(
    (err?: any) => {
      console.warn("Google reCAPTCHA widget error:", err);
      setLoadError("reCAPTCHA failed to connect. Please check your network or site key.");
      if (onError) {
        onError(err);
      }
    },
    [onError]
  );

  const renderRecaptcha = useCallback(() => {
    if (!containerRef.current || !window.grecaptcha?.render) return;

    try {
      // If already rendered inside this container, reset instead of re-rendering
      if (widgetIdRef.current !== null) {
        window.grecaptcha.reset(widgetIdRef.current);
        return;
      }

      containerRef.current.innerHTML = "";
      const id = window.grecaptcha.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: handleVerify,
        "expired-callback": handleExpire,
        "error-callback": handleWidgetError,
      });

      widgetIdRef.current = id;
      setIsLoaded(true);
      setLoadError(null);
    } catch (err: any) {
      console.warn("reCAPTCHA render notice:", err);
      // In case of error (e.g., container already has widget)
      setIsLoaded(true);
    }
  }, [siteKey, handleVerify, handleExpire, handleWidgetError]);

  useEffect(() => {
    // If window.grecaptcha is already available on the page
    if (window.grecaptcha && window.grecaptcha.render) {
      renderRecaptcha();
      return;
    }

    // Set up global callback for when Google script finishes loading
    window.onGoogleReCaptchaLoad = () => {
      renderRecaptcha();
    };

    // Inject Google reCAPTCHA script if not already present
    const SCRIPT_ID = "google-recaptcha-v2-script";
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.google.com/recaptcha/api.js?onload=onGoogleReCaptchaLoad&render=explicit";
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        setLoadError("Could not load Google reCAPTCHA. Please check your internet connection.");
      };
      document.head.appendChild(script);
    } else if (window.grecaptcha) {
      // Script tag exists, wait for ready
      window.grecaptcha.ready?.(() => {
        renderRecaptcha();
      });
    }

    return () => {
      // Clean up on unmount if needed
      if (widgetIdRef.current !== null && window.grecaptcha?.reset) {
        try {
          window.grecaptcha.reset(widgetIdRef.current);
        } catch {
          // ignore cleanup reset errors
        }
      }
    };
  }, [renderRecaptcha]);

  return (
    <div className={`space-y-2 select-none ${className}`} id="captcha-container">
      <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
        <label className="flex items-center gap-1.5 text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Security Verification</span>
        </label>
        <span className="text-[10px] text-slate-500 font-mono">Google reCAPTCHA v2</span>
      </div>

      <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-950/70 border border-slate-800 min-h-[86px] overflow-hidden">
        {!isLoaded && !loadError && (
          <div className="flex items-center gap-2 py-4 text-xs text-slate-400 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            <span>Loading reCAPTCHA verification...</span>
          </div>
        )}

        <div
          ref={containerRef}
          id="recaptcha-element"
          className={`${disabled ? "pointer-events-none opacity-50" : ""} flex justify-center w-full`}
        />

        {loadError && (
          <div className="flex items-center gap-1.5 text-[11px] text-rose-400 mt-2 px-2 py-1 bg-rose-950/40 border border-rose-800/40 rounded w-full">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{loadError}</span>
          </div>
        )}

        {isVerified && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold mt-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Verification Confirmed</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Backend verification helper that calls the backend /api/auth/captcha/verify endpoint
 * using VITE_BACKEND_URL (configured for Netlify/production).
 */
export async function verifyCaptchaWithBackend(recaptchaToken: string): Promise<{ success: boolean; error?: string }> {
  if (!recaptchaToken || !recaptchaToken.trim()) {
    return { success: false, error: "Please complete the Google reCAPTCHA checkbox." };
  }

  try {
    const rawBackend = import.meta.env.VITE_BACKEND_URL || "";
    const backendUrl = rawBackend.replace(/\/+$/, "");
    const endpoint = backendUrl ? `${backendUrl}/api/auth/captcha/verify` : "/api/auth/captcha/verify";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recaptchaToken: recaptchaToken.trim() }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || "Google reCAPTCHA verification failed. Please try again.",
      };
    }

    return { success: true };
  } catch (err: any) {
    console.warn("reCAPTCHA backend verification network error:", err);
    return {
      success: false,
      error: "Unable to reach backend verification service. Please verify VITE_BACKEND_URL configuration.",
    };
  }
}

// Alias for backward compatibility
export const verifyCaptchaChallenge = async (
  tokenOrChallenge: string,
  _userInput?: string
): Promise<{ success: boolean; verificationToken?: string; error?: string }> => {
  const result = await verifyCaptchaWithBackend(tokenOrChallenge);
  return {
    success: result.success,
    verificationToken: tokenOrChallenge,
    error: result.error,
  };
};

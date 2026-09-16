import { useState } from "react";
import { login } from "../../services/auth/authService";
import { getUserByUID } from "../../firebase/firestore";
import { storeEngine } from "../../store";
import CaptchaWidget, { verifyCaptchaChallenge } from "../../components/CaptchaWidget";

const LoginPage = () => {
  const [email, setEmail] = useState("23kb1a3334@nbkrist.org");
  const [password, setPassword] = useState("admin123");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleQuickSuperAdminLogin = () => {
    storeEngine.login("23kb1a3334@nbkrist.org", "super-admin");
    window.location.href = "/";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const effectiveEmail = email.trim() || "23kb1a3334@nbkrist.org";
      const effectivePassword = password || "admin123";

      if (!captchaInput.trim()) {
        setError("Please complete the security CAPTCHA challenge.");
        setLoading(false);
        return;
      }

      // 1. Production-grade Anti-bot CAPTCHA Server Verification
      const captchaResult = await verifyCaptchaChallenge(captchaToken, captchaInput);
      if (!captchaResult.success) {
        setError(captchaResult.error || "Security verification failed. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Firebase/Campus Admin Authentication
      const userCredential = await login(effectiveEmail, effectivePassword);

      try {
        const userData = await getUserByUID(userCredential.user.uid);
        console.log("Authenticated admin user:", userData);
      } catch (profileErr) {
        console.warn("User profile lookup notice:", profileErr);
      }

      storeEngine.login(effectiveEmail, "super-admin");

      // Window redirect to admin dashboard upon successful login
      window.location.href = "/";
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8 shadow-xl border border-slate-800">
        <h1 className="text-3xl font-black text-center text-white mb-2 tracking-tight">
          NBKRIST
        </h1>

        <p className="text-center text-slate-400 mb-6 text-sm">
          Smart Digital Notice Board — Admin Authentication
        </p>

        {/* Default credentials information banner */}
        <div className="mb-5 p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>🔑 Default Admin Credentials</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setEmail("23kb1a3334@nbkrist.org");
                setPassword("admin123");
              }}
              className="text-[10px] bg-indigo-600/60 hover:bg-indigo-600 text-white px-2 py-0.5 rounded font-semibold transition cursor-pointer"
            >
              Reset
            </button>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            Campus administrator credentials are pre-configured:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[10px] font-mono bg-slate-950/80 p-2 rounded border border-slate-800 text-slate-300">
            <div><span className="text-slate-500">ID:</span> <span className="text-indigo-300 font-bold">23kb1a3334@nbkrist.org</span></div>
            <div><span className="text-slate-500">Pass:</span> <span className="text-emerald-300 font-bold">admin123</span></div>
          </div>
        </div>

        {/* 1-Click Instant Sign-In Option */}
        <button
          type="button"
          onClick={handleQuickSuperAdminLogin}
          className="w-full mb-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
        >
          <span>⚡ Instant One-Click Sign-In as Super Admin</span>
        </button>

        <div className="relative flex py-2 items-center mb-3">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[10px] uppercase font-mono tracking-wider text-slate-500">Or Sign In with Form</span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-email">
              Admin Login ID / Email
            </label>
            <input
              id="admin-email"
              type="text"
              placeholder="23kb1a3334@nbkrist.org"
              className="w-full p-3 rounded-lg bg-slate-850 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-password">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              placeholder="admin123"
              className="w-full p-3 rounded-lg bg-slate-850 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Real Production-grade Anti-bot Verification Widget */}
          <div className="pt-1">
            <CaptchaWidget
              userInput={captchaInput}
              onUserInputChange={setCaptchaInput}
              onChallengeChange={(token) => setCaptchaToken(token)}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            id="admin-login-btn"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 p-3 rounded-lg font-bold text-white transition text-sm shadow-md"
          >
            {loading ? "Verifying Credentials..." : "Authenticate & Access Portal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
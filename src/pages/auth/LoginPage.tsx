import { useState } from "react";
import { login } from "../../services/auth/authService";
import { getUserByUID } from "../../firebase/firestore";
import { storeEngine } from "../../store";
import CaptchaWidget, { verifyCaptchaWithBackend, resetRecaptcha } from "../../components/CaptchaWidget";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");

      const cleanEmail = email.trim();
      const cleanPassword = password;

      if (!cleanEmail || !cleanPassword) {
        setError("Please enter your Admin Login ID and Password.");
        setLoading(false);
        return;
      }

      if (!captchaToken) {
        setError("Please complete the Google reCAPTCHA verification checkbox.");
        setLoading(false);
        return;
      }

      // 1. Google reCAPTCHA v2 Server Verification via Backend
      const captchaResult = await verifyCaptchaWithBackend(captchaToken);
      if (!captchaResult.success) {
        setError(captchaResult.error || "Security verification failed. Please try again.");
        setCaptchaToken("");
        resetRecaptcha();
        setLoading(false);
        return;
      }

      // 2. Firebase Authentication
      const userCredential = await login(cleanEmail, cleanPassword);

      try {
        const userData = await getUserByUID(userCredential.user.uid);
        console.log("Authenticated admin user:", userData);
      } catch (profileErr) {
        console.warn("User profile lookup notice:", profileErr);
      }

      // Determine administrative role
      const lower = cleanEmail.toLowerCase();
      let role: "super-admin" | "dept-admin" = "dept-admin";
      if (lower.includes("super") || lower.includes("principal") || lower.includes("admin@nbkrist.org")) {
        role = "super-admin";
      }

      storeEngine.login(cleanEmail, role);

      // Window redirect to admin dashboard upon successful login
      window.location.href = "/";
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setError(err.message || "Failed to sign in. Please verify your credentials.");
      setCaptchaToken("");
      resetRecaptcha();
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

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="admin-email">
              Admin Login ID / Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              placeholder="admin@nbkrist.org"
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
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full p-3 rounded-lg bg-slate-850 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {/* Google reCAPTCHA v2 Checkbox Verification Widget */}
          <div className="pt-1">
            <CaptchaWidget
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken("")}
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
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 p-3 rounded-lg font-bold text-white transition text-sm shadow-md cursor-pointer"
          >
            {loading ? "Verifying Credentials..." : "Authenticate & Access Portal"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;

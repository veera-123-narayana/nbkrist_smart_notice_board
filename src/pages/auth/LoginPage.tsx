import { useState } from "react";
import { login } from "../../services/auth/authService";
import { getUserByUID } from "../../firebase/firestore";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

    const handleLogin = async () => {
    try {
      setLoading(true);
      setError("");

      const userCredential = await login(email, password);

      const userData = await getUserByUID(
          userCredential.user.uid
      );

      console.log(userData);

    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md bg-slate-900 rounded-xl p-8 shadow-xl">

        <h1 className="text-3xl font-bold text-center text-white mb-2">
          NBKRIST
        </h1>

        <p className="text-center text-slate-400 mb-8">
          Smart Digital Notice Board
        </p>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 rounded bg-slate-800 text-white mb-4"
          value={email}
          onChange={(e)=>setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 rounded bg-slate-800 text-white mb-4"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
        />

        {error && (
          <p className="text-red-400 text-sm mb-4">
            {error}
          </p>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 p-3 rounded font-bold"
        >
          {loading ? "Signing In..." : "Login"}
        </button>

      </div>
    </div>
  );
};

export default LoginPage;
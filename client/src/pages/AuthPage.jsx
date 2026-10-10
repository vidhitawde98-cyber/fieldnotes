import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { apiFetch, readError } from "../lib/api.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (mode === "signup" && !form.name.trim()) return setError("Name is required");
    if (!form.email.trim()) return setError("Email is required");
    if (!form.password) return setError("Password is required");
    if (mode === "signup" && form.password.length < 6) return setError("Password must be at least 6 characters");

    setLoading(true);
    try {
      const path = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const body = mode === "signup" ? form : { email: form.email, password: form.password };
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
      if (!res.ok) throw new Error(await readError(res, "Something went wrong"));
      const data = await res.json();
      login(data.token, data.user);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Cannot reach the server. Please try again in a moment." : err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm bg-white border-2 border-ink rounded-2xl shadow-card p-7 -rotate-1">
        <p className="font-hand text-2xl text-sage-dark text-center -mb-1">welcome to</p>
        <h1 className="font-display font-extrabold text-3xl text-ink text-center mb-6">Fieldnotes</h1>

        {error && (
          <div className="bg-blush/70 border-2 border-ink text-ink text-sm font-medium rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <input
              type="text"
              placeholder="Your name"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-ink rounded-xl bg-cream focus:outline-none focus:ring-2 focus:ring-sage-dark font-body"
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 border-2 border-ink rounded-xl bg-cream focus:outline-none focus:ring-2 focus:ring-sage-dark font-body"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-2.5 pr-11 border-2 border-ink rounded-xl bg-cream focus:outline-none focus:ring-2 focus:ring-sage-dark font-body"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-butter hover:bg-butter-dark disabled:opacity-60 border-2 border-ink rounded-xl py-2.5 font-display font-extrabold text-ink shadow-card-sm hover:-translate-y-0.5 transition-all"
          >
            {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }}
          className="w-full text-center text-sm text-ink-soft hover:text-ink mt-4 underline underline-offset-2"
        >
          {mode === "login" ? "New here? Create an account" : "Already have an account? Log in"}
        </button>
        <Link to="/" className="block text-center text-xs text-ink-soft hover:text-ink mt-3">
          ← back to the feed
        </Link>
      </div>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const { login, isAdmin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAdmin) {
    router.push("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await login(email, password);
    if (result.success) {
      // Check if the logged in user is admin - redirect will happen via useEffect in admin page
      router.push("/admin");
    } else {
      setError(result.error || "Credenciales incorrectas");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-dark via-gray-900 to-trust-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
              <span className="text-white font-bold text-xl">T</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">Panel Administrativo</h1>
          <p className="text-gray-400 text-sm">Ingresa con tu cuenta de administrador</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/20 transition-all text-sm" placeholder="admin@trust.com" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Contrasena</label>
            <div className="relative">
              <input type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/20 transition-all text-sm pr-12" placeholder="Contrasena" required />
              <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showPass ? <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" /> : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>}
                </svg>
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-trust-blue/25 transition-all disabled:opacity-50 text-sm">
            {loading ? "Ingresando..." : "Ingresar al panel"}
          </button>
        </form>
        <div className="text-center mt-6">
          <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
}

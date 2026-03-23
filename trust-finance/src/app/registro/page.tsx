"use client";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Registro() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    password: "",
    confirmPassword: "",
  });

  const update = (field: string, value: string) => setForm((p) => ({ ...p, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.apellido || !form.email || !form.telefono || !form.password) {
      setError("Todos los campos son obligatorios");
      return;
    }
    if (form.password.length < 6) {
      setError("La contrasena debe tener al menos 6 caracteres");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Las contrasenas no coinciden");
      return;
    }
    setLoading(true);
    const result = await register({
      nombre: form.nombre,
      apellido: form.apellido,
      email: form.email,
      telefono: form.telefono,
      password: form.password,
    });
    setLoading(false);
    if (result.success) {
      router.push("/dashboard");
    } else {
      setError(result.error || "Error al registrarse");
    }
  };

  const handleGoogle = async () => {
    setError("");
    const result = await loginWithGoogle();
    if (!result.success) {
      setError(result.error || "Error al registrarse con Google");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-trust-gray via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center gap-2 justify-center mb-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <span className="text-xl font-bold text-trust-dark">
            Trust <span className="text-trust-blue">Finance</span>
          </span>
        </Link>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-extrabold text-trust-dark mb-2">Crear cuenta</h1>
          <p className="text-gray-500 mb-6 sm:mb-8 text-sm">Registrate para solicitar financiamiento</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-6">
              {error}
            </div>
          )}

          {/* Google Button */}
          <button
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 border-2 border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all mb-6 text-sm sm:text-base"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Registrarse con Google
          </button>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400 font-medium">O con tu correo</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Nombre</label>
                <input type="text" value={form.nombre} onChange={(e) => update("nombre", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Tu nombre" />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Apellido</label>
                <input type="text" value={form.apellido} onChange={(e) => update("apellido", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Tu apellido" />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Correo electronico</label>
              <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="correo@ejemplo.com" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Telefono / WhatsApp</label>
              <input type="tel" value={form.telefono} onChange={(e) => update("telefono", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="+51 999 999 999" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Contrasena</label>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all pr-12 text-sm" placeholder="Minimo 6 caracteres" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={showPassword ? "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" : "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 100 6 3 3 0 000-6z"} /></svg>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1.5">Confirmar contrasena</label>
              <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Repite tu contrasena" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 sm:py-3.5 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-xl font-semibold text-sm sm:text-lg hover:shadow-lg hover:shadow-trust-blue/25 transition-all disabled:opacity-50 mt-2">
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>
          </form>

          <p className="text-center text-xs sm:text-sm text-gray-500 mt-6">
            Ya tienes cuenta?{" "}
            <Link href="/login" className="text-trust-blue font-semibold hover:underline">
              Inicia sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

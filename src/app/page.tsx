"use client";
import { useState } from "react";

const STEPS = ["info", "negocio", "importacion", "financiero", "confirmacion"] as const;
type Step = (typeof STEPS)[number];

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [submitted, setSubmitted] = useState(false);
  const [monto, setMonto] = useState(5000);
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    telefono: "",
    dni: "",
    ciudad: "",
    nombreNegocio: "",
    ruc: "",
    tipoNegocio: "",
    tiempoOperando: "",
    ventasMensuales: "",
    tieneRUC: "",
    productoImportar: "",
    paisOrigen: "",
    experienciaImportando: "",
    frecuenciaImportacion: "",
    montoSolicitado: "",
    plazoVenta: "",
    tieneCompradoresConfirmados: "",
    comoConociste: "",
    comentarios: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const nextStep = () => {
    const i = STEPS.indexOf(step);
    if (i < STEPS.length - 1) setStep(STEPS[i + 1]);
  };
  const prevStep = () => {
    const i = STEPS.indexOf(step);
    if (i > 0) setStep(STEPS[i - 1]);
  };

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const inicial = monto * 0.3;
  const financiado = monto * 0.7;

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="text-xl font-bold text-trust-dark">
              Trust <span className="text-trust-blue">Finance</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-trust-blue transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-trust-blue transition-colors">Beneficios</a>
            <a href="#simulador" className="hover:text-trust-blue transition-colors">Simulador</a>
          </div>
          <button
            onClick={() => { setShowForm(true); setStep("info"); }}
            className="px-6 py-2.5 bg-trust-blue text-white rounded-xl text-sm font-semibold hover:bg-trust-blue/90 transition-all hover:shadow-lg hover:shadow-trust-blue/25"
          >
            Postular ahora
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-trust-gray via-white to-blue-50"></div>
        <div className="absolute top-20 right-0 w-96 h-96 bg-trust-light/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-trust-blue/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-trust-blue/10 text-trust-blue px-4 py-2 rounded-full text-sm font-medium mb-6">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              Financiamiento seguro para importadores
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-trust-dark leading-tight mb-6">
              Importa con solo el{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-trust-blue to-trust-light">
                30% de inicial
              </span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl">
              Nosotros financiamos el 70% restante de tu importacion. Pagas cuando vendas tu mercaderia. Sin complicaciones, sin burocracia excesiva.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => { setShowForm(true); setStep("info"); }}
                className="px-8 py-4 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-2xl text-lg font-semibold hover:shadow-xl hover:shadow-trust-blue/30 transition-all transform hover:-translate-y-0.5"
              >
                Solicitar financiamiento
              </button>
              <a
                href="#como-funciona"
                className="px-8 py-4 bg-white border-2 border-gray-200 text-trust-dark rounded-2xl text-lg font-semibold hover:border-trust-blue/30 transition-all text-center"
              >
                Ver como funciona
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg">
              {[
                { num: "+200", label: "Importaciones financiadas" },
                { num: "70%", label: "Financiamos de tu compra" },
                { num: "30%", label: "Es tu unica inversion inicial" },
              ].map((s, i) => (
                <div key={i}>
                  <div className="text-3xl font-extrabold text-trust-blue">{s.num}</div>
                  <div className="text-sm text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-24 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-trust-dark mb-4">Como funciona</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Un proceso simple y transparente para financiar tus importaciones</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "1. Postula", desc: "Llena el formulario con los datos de tu negocio y la importacion que deseas realizar." },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "2. Evaluacion", desc: "Nuestro equipo evalua tu solicitud en un plazo maximo de 48 horas habiles." },
              { icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z", title: "3. Paga el 30%", desc: "Una vez aprobado, solo depositas el 30% del valor total de la importacion." },
              { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "4. Recibe y vende", desc: "Recibe tu mercaderia y paga el 70% restante con las ganancias de tus ventas." },
            ].map((item, i) => (
              <div key={i} className="relative bg-trust-gray rounded-2xl p-8 hover:shadow-xl transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                </div>
                <h3 className="text-xl font-bold text-trust-dark mb-3">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="py-24 px-6 bg-gradient-to-b from-trust-gray to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold text-trust-dark mb-4">Por que elegir Trust Finance</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">Beneficios disenados para importadores que quieren crecer</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Solo 30% de inicial", desc: "Accede a tus productos pagando unicamente el 30% del costo total. El resto lo financiamos nosotros." },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Paga cuando vendas", desc: "No te presionamos con cuotas fijas. Pagas el 70% restante cuando ya hayas vendido tu mercaderia." },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Proceso seguro", desc: "Toda la operacion esta respaldada por Trust, con contratos claros y transparentes." },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "Respuesta rapida", desc: "Evaluamos tu solicitud en maximo 48 horas habiles. Sin tramites burocraticos innecesarios." },
              { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064", title: "Importa de cualquier pais", desc: "Financiamos importaciones de China, USA, Europa y cualquier parte del mundo." },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Asesoria personalizada", desc: "Te acompanamos en todo el proceso de importacion con asesores especializados." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-trust-light/50 hover:shadow-lg transition-all">
                <div className="w-12 h-12 rounded-xl bg-trust-blue/10 flex items-center justify-center mb-5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#002bb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                </div>
                <h3 className="text-lg font-bold text-trust-dark mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIMULADOR */}
      <section id="simulador" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-extrabold text-trust-dark mb-4">Simula tu financiamiento</h2>
            <p className="text-lg text-gray-500">Mueve el slider para ver cuanto necesitas de inicial</p>
          </div>
          <div className="bg-gradient-to-br from-trust-gray to-white rounded-3xl p-10 border border-gray-100">
            <label className="block text-sm font-semibold text-gray-600 mb-3">Monto total de importacion (USD)</label>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-trust-blue"
            />
            <div className="text-center my-6">
              <span className="text-5xl font-extrabold text-trust-dark">${monto.toLocaleString()}</span>
            </div>
            <div className="grid grid-cols-2 gap-6 mt-8">
              <div className="bg-white rounded-2xl p-6 text-center border border-green-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Tu inicial (30%)</div>
                <div className="text-3xl font-extrabold text-green-600">${inicial.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center border border-blue-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Trust financia (70%)</div>
                <div className="text-3xl font-extrabold text-trust-blue">${financiado.toLocaleString()}</div>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(true); setStep("info"); setForm(prev => ({ ...prev, montoSolicitado: monto.toString() })); }}
              className="w-full mt-8 py-4 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-trust-blue/25 transition-all"
            >
              Solicitar este financiamiento
            </button>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-6 bg-gradient-to-br from-trust-blue to-trust-light relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 border-2 border-white rounded-full"></div>
        </div>
        <div className="max-w-3xl mx-auto text-center relative">
          <h2 className="text-4xl font-extrabold text-white mb-6">Listo para hacer crecer tu negocio?</h2>
          <p className="text-xl text-white/80 mb-10">Postula ahora y recibe una respuesta en menos de 48 horas</p>
          <button
            onClick={() => { setShowForm(true); setStep("info"); }}
            className="px-10 py-4 bg-white text-trust-blue rounded-2xl text-lg font-bold hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
          >
            Postular ahora
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 bg-trust-dark">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-white font-bold">Trust Finance</span>
          </div>
          <p className="text-gray-400 text-sm">&copy; 2026 Trust Finance. Todos los derechos reservados.</p>
        </div>
      </footer>

      {/* MODAL FORMULARIO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {submitted ? (
              <div className="p-12 text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <h3 className="text-3xl font-extrabold text-trust-dark mb-4">Solicitud enviada!</h3>
                <p className="text-gray-500 text-lg mb-8">Gracias {form.nombre}, hemos recibido tu solicitud. Nuestro equipo te contactara en un plazo maximo de 48 horas habiles al numero {form.telefono}.</p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); }} className="px-8 py-3 bg-trust-blue text-white rounded-xl font-semibold hover:bg-trust-blue/90 transition-all">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-trust-dark">Solicitar financiamiento</h3>
                  <button onClick={() => setShowForm(false)} className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Progress */}
                <div className="mb-8">
                  <div className="flex justify-between text-xs font-medium text-gray-400 mb-2">
                    {["Datos personales", "Negocio", "Importacion", "Financiero", "Confirmar"].map((label, i) => (
                      <span key={i} className={i <= stepIndex ? "text-trust-blue" : ""}>{label}</span>
                    ))}
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-trust-blue to-trust-light rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* Step: Info Personal */}
                {step === "info" && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre *</label>
                        <input type="text" value={form.nombre} onChange={e => updateField("nombre", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Apellido *</label>
                        <input type="text" value={form.apellido} onChange={e => updateField("apellido", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="Tu apellido" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Correo electronico *</label>
                      <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Telefono / WhatsApp *</label>
                        <input type="tel" value={form.telefono} onChange={e => updateField("telefono", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="+51 999 999 999" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">DNI / CE *</label>
                        <input type="text" value={form.dni} onChange={e => updateField("dni", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="12345678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Ciudad *</label>
                      <input type="text" value={form.ciudad} onChange={e => updateField("ciudad", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="Lima, Arequipa, etc." />
                    </div>
                  </div>
                )}

                {/* Step: Negocio */}
                {step === "negocio" && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Nombre del negocio *</label>
                      <input type="text" value={form.nombreNegocio} onChange={e => updateField("nombreNegocio", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="Mi Empresa SAC" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Tienes RUC? *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Si, tengo RUC", "No, soy persona natural"].map(opt => (
                          <button key={opt} onClick={() => updateField("tieneRUC", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${form.tieneRUC === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    {form.tieneRUC === "Si, tengo RUC" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1.5">Numero de RUC</label>
                        <input type="text" value={form.ruc} onChange={e => updateField("ruc", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="20XXXXXXXXX" />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Tipo de negocio *</label>
                      <select value={form.tipoNegocio} onChange={e => updateField("tipoNegocio", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white">
                        <option value="">Selecciona una opcion</option>
                        <option value="retail">Retail / Tienda fisica</option>
                        <option value="ecommerce">E-commerce / Tienda online</option>
                        <option value="mayorista">Mayorista / Distribuidor</option>
                        <option value="mixto">Mixto (fisico + online)</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Tiempo operando *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Menos de 6 meses", "6 meses - 1 ano", "1 - 3 anos", "Mas de 3 anos"].map(opt => (
                          <button key={opt} onClick={() => updateField("tiempoOperando", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${form.tiempoOperando === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Ventas mensuales promedio (USD) *</label>
                      <select value={form.ventasMensuales} onChange={e => updateField("ventasMensuales", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white">
                        <option value="">Selecciona un rango</option>
                        <option value="menos-1000">Menos de $1,000</option>
                        <option value="1000-5000">$1,000 - $5,000</option>
                        <option value="5000-15000">$5,000 - $15,000</option>
                        <option value="15000-50000">$15,000 - $50,000</option>
                        <option value="mas-50000">Mas de $50,000</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Step: Importacion */}
                {step === "importacion" && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Que producto deseas importar? *</label>
                      <input type="text" value={form.productoImportar} onChange={e => updateField("productoImportar", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="Ej: Accesorios electronicos, ropa, repuestos..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Pais de origen *</label>
                      <select value={form.paisOrigen} onChange={e => updateField("paisOrigen", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white">
                        <option value="">Selecciona el pais</option>
                        <option value="china">China</option>
                        <option value="usa">Estados Unidos</option>
                        <option value="europa">Europa</option>
                        <option value="corea">Corea del Sur</option>
                        <option value="japon">Japon</option>
                        <option value="india">India</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Experiencia importando *</label>
                      <div className="grid grid-cols-1 gap-3">
                        {["Es mi primera importacion", "He importado 1-3 veces", "He importado 4-10 veces", "Importo regularmente (+10 veces)"].map(opt => (
                          <button key={opt} onClick={() => updateField("experienciaImportando", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${form.experienciaImportando === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Con que frecuencia planeas importar? *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Solo esta vez", "Cada 2-3 meses", "Mensualmente", "Aun no lo se"].map(opt => (
                          <button key={opt} onClick={() => updateField("frecuenciaImportacion", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${form.frecuenciaImportacion === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step: Financiero */}
                {step === "financiero" && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Monto total de importacion (USD) *</label>
                      <input type="number" value={form.montoSolicitado} onChange={e => updateField("montoSolicitado", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all" placeholder="5000" />
                    </div>
                    {form.montoSolicitado && (
                      <div className="bg-trust-gray rounded-2xl p-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-xs font-medium text-gray-400 mb-1">Tu inicial (30%)</div>
                            <div className="text-2xl font-extrabold text-green-600">${(Number(form.montoSolicitado) * 0.3).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-xs font-medium text-gray-400 mb-1">Trust financia (70%)</div>
                            <div className="text-2xl font-extrabold text-trust-blue">${(Number(form.montoSolicitado) * 0.7).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">En cuanto tiempo estimas vender la mercaderia? *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Menos de 1 mes", "1-2 meses", "2-3 meses", "Mas de 3 meses"].map(opt => (
                          <button key={opt} onClick={() => updateField("plazoVenta", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${form.plazoVenta === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Ya tienes compradores confirmados para esta mercaderia? *</label>
                      <div className="grid grid-cols-2 gap-3">
                        {["Si, ya tengo compradores", "Parcialmente, algunos", "No, pero tengo experiencia vendiendo", "No, es un mercado nuevo para mi"].map(opt => (
                          <button key={opt} onClick={() => updateField("tieneCompradoresConfirmados", opt)} className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left ${form.tieneCompradoresConfirmados === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Como conociste Trust Finance?</label>
                      <select value={form.comoConociste} onChange={e => updateField("comoConociste", e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white">
                        <option value="">Selecciona una opcion</option>
                        <option value="redes-sociales">Redes sociales</option>
                        <option value="referido">Referido por alguien</option>
                        <option value="google">Busqueda en Google</option>
                        <option value="trustworld">Pagina de Trust World</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1.5">Comentarios adicionales</label>
                      <textarea value={form.comentarios} onChange={e => updateField("comentarios", e.target.value)} rows={3} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all resize-none" placeholder="Algo mas que debamos saber..."></textarea>
                    </div>
                  </div>
                )}

                {/* Step: Confirmacion */}
                {step === "confirmacion" && (
                  <div className="space-y-6">
                    <div className="bg-trust-gray rounded-2xl p-6">
                      <h4 className="font-bold text-trust-dark mb-4">Resumen de tu solicitud</h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Nombre:</span><span className="font-medium">{form.nombre} {form.apellido}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{form.email}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Telefono:</span><span className="font-medium">{form.telefono}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Negocio:</span><span className="font-medium">{form.nombreNegocio}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Producto:</span><span className="font-medium">{form.productoImportar}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Pais origen:</span><span className="font-medium">{form.paisOrigen}</span></div>
                        <hr className="border-gray-200" />
                        <div className="flex justify-between"><span className="text-gray-500">Monto total:</span><span className="font-bold text-lg">${Number(form.montoSolicitado || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Tu inicial (30%):</span><span className="font-bold text-green-600">${(Number(form.montoSolicitado || 0) * 0.3).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Trust financia (70%):</span><span className="font-bold text-trust-blue">${(Number(form.montoSolicitado || 0) * 0.7).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
                      <strong>Nota:</strong> Al enviar esta solicitud, nuestro equipo revisara tu informacion y te contactara en un plazo maximo de 48 horas habiles para continuar con el proceso.
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                  {stepIndex > 0 ? (
                    <button onClick={prevStep} className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                      Atras
                    </button>
                  ) : <div />}
                  {step === "confirmacion" ? (
                    <button onClick={handleSubmit} className="px-8 py-3 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-trust-blue/25 transition-all">
                      Enviar solicitud
                    </button>
                  ) : (
                    <button onClick={nextStep} className="px-8 py-3 bg-trust-blue text-white rounded-xl font-semibold hover:bg-trust-blue/90 transition-all">
                      Continuar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

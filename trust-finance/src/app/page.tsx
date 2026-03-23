"use client";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import Link from "next/link";

const STEPS = ["info", "negocio", "importacion", "financiero", "confirmacion"] as const;
type Step = (typeof STEPS)[number];

export default function Home() {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState<Step>("info");
  const [submitted, setSubmitted] = useState(false);
  const [monto, setMonto] = useState(5000);
  const [mobileMenu, setMobileMenu] = useState(false);
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

  const handleSubmit = async () => {
    if (user) {
      try {
        await supabase.from("solicitudes").insert({
          user_id: user.id,
          producto: form.productoImportar,
          pais: form.paisOrigen,
          monto: Number(form.montoSolicitado) || 0,
          estado: "pendiente",
          nombre: form.nombre,
          apellido: form.apellido,
          email: form.email,
          telefono: form.telefono,
          dni: form.dni,
          ciudad: form.ciudad,
          nombre_negocio: form.nombreNegocio,
          ruc: form.ruc,
          tipo_negocio: form.tipoNegocio,
          tiempo_operando: form.tiempoOperando,
          ventas_mensuales: form.ventasMensuales,
          tiene_ruc: form.tieneRUC,
          experiencia_importando: form.experienciaImportando,
          frecuencia_importacion: form.frecuenciaImportacion,
          plazo_venta: form.plazoVenta,
          tiene_compradores: form.tieneCompradoresConfirmados,
          como_conociste: form.comoConociste,
          comentarios: form.comentarios,
        });
      } catch {}
    }
    setSubmitted(true);
  };

  const inicial = monto * 0.3;
  const financiado = monto * 0.7;

  // Slider with images
  const slides = [
    {
      headline: "Cuando otros te dicen que no, nosotros confiamos en ti",
      sub: "Financia tu importacion con solo el 30% de inicial y paga el resto cuando vendas tu mercaderia. iPhones, maquinaria, tecnologia y mas.",
      cta: "Solicitar financiamiento",
      badge: "Confiamos en ti.",
      bg: "from-trust-blue to-blue-900",
      img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80",
    },
    {
      headline: "iPhones desde S/550 directo de USA",
      sub: "Importa iPhones originales desde Estados Unidos con precios mayoristas. Rentabilidad del 30-40% en cada venta. Solo pagas el 30% de inicial.",
      cta: "Ver productos",
      badge: "Desde S/550",
      bg: "from-blue-800 to-trust-blue",
      img: "https://images.unsplash.com/photo-1591337676887-a217a6c8c589?w=800&q=80",
    },
    {
      headline: "Maquinaria, SmartFilm y Pantallas LED desde China",
      sub: "Maquinas de latas, SmartFilm inteligente y pantallas LED. Productos de alta demanda con importacion grupal para reducir costos.",
      cta: "Explorar catalogo",
      badge: "Importacion grupal",
      bg: "from-trust-blue to-trust-light",
      img: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
    },
    {
      headline: "Tu negocio merece crecer con respaldo",
      sub: "Evaluamos tu solicitud en 48 horas. Sin burocracia, sin complicaciones. Solo resultados para tu negocio.",
      cta: "Postula ahora",
      badge: "Rapido y facil.",
      bg: "from-indigo-900 to-trust-blue",
      img: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80",
    },
  ];

  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const prevSlideNav = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 6000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  // WhatsApp number (Peru format)
  const whatsappNumber = "51999999999";
  const whatsappMessage = encodeURIComponent("Hola! Me interesa el financiamiento de importaciones de Trust Finance.");

  return (
    <div className="min-h-screen">
      {/* NAV */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
              <span className="text-white font-bold text-base sm:text-lg">T</span>
            </div>
            <span className="text-lg sm:text-xl font-bold text-trust-dark">
              Trust <span className="text-trust-blue">Finance</span>
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#productos" className="hover:text-trust-blue transition-colors">Productos</a>
            <a href="#como-funciona" className="hover:text-trust-blue transition-colors">Como funciona</a>
            <a href="#beneficios" className="hover:text-trust-blue transition-colors">Beneficios</a>
            <a href="#simulador" className="hover:text-trust-blue transition-colors">Simulador</a>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <Link href="/dashboard" className="px-3 sm:px-5 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all hover:shadow-lg hover:shadow-trust-blue/25 flex items-center gap-2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] sm:text-xs font-bold">{user.nombre[0]}</div>
                Mi cuenta
              </Link>
            ) : (
              <>
                <Link href="/login" className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-trust-blue transition-colors hidden sm:block">
                  Iniciar sesion
                </Link>
                <Link href="/registro" className="px-4 sm:px-6 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all hover:shadow-lg hover:shadow-trust-blue/25">
                  Registrate
                </Link>
              </>
            )}
            {/* Mobile menu button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={mobileMenu ? "M18 6L6 18M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#productos" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 hover:text-trust-blue py-2">Productos</a>
            <a href="#como-funciona" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 hover:text-trust-blue py-2">Como funciona</a>
            <a href="#beneficios" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 hover:text-trust-blue py-2">Beneficios</a>
            <a href="#simulador" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-gray-600 hover:text-trust-blue py-2">Simulador</a>
            {!user && (
              <Link href="/login" onClick={() => setMobileMenu(false)} className="block text-sm font-medium text-trust-blue py-2">Iniciar sesion</Link>
            )}
          </div>
        )}
      </nav>

      {/* HERO SLIDER */}
      <section className="pt-[64px] sm:pt-[72px] relative overflow-hidden">
        <div className="relative h-[480px] sm:h-[520px] md:h-[580px]">
          {slides.map((slide, i) => (
            <div
              key={i}
              className={`absolute inset-0 transition-all duration-700 ease-in-out ${i === currentSlide ? "opacity-100 translate-x-0" : i < currentSlide ? "opacity-0 -translate-x-full" : "opacity-0 translate-x-full"}`}
            >
              <div className={`h-full bg-gradient-to-r ${slide.bg} relative`}>
                {/* Background image with overlay */}
                <div className="absolute inset-0">
                  <img
                    src={slide.img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30"></div>
                </div>

                {/* Decorative elements */}
                <div className="absolute top-10 right-[15%] w-24 h-24 sm:w-32 sm:h-32 md:w-48 md:h-48 border-2 border-white/10 rounded-full hidden sm:block"></div>
                <div className="absolute bottom-20 right-[10%] w-16 h-16 sm:w-20 sm:h-20 md:w-32 md:h-32 border-2 border-white/10 rounded-full hidden sm:block"></div>
                <div className="absolute top-[40%] right-[25%] hidden lg:block">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl px-6 py-4 shadow-xl">
                    <span className="text-trust-blue font-bold text-lg">{slide.badge}</span>
                  </div>
                </div>

                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center relative z-10">
                  <div className="max-w-lg sm:max-w-xl">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-tight mb-4 sm:mb-6">
                      {slide.headline}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 mb-6 sm:mb-8 leading-relaxed">
                      {slide.sub}
                    </p>
                    <button
                      onClick={() => {
                        if (i === 1 || i === 2) {
                          document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
                        } else {
                          setShowForm(true);
                          setStep("info");
                        }
                      }}
                      className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-trust-blue rounded-xl text-sm sm:text-lg font-semibold hover:shadow-xl transition-all transform hover:-translate-y-0.5 inline-block"
                    >
                      {slide.cta}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Slider arrows */}
          <button onClick={prevSlideNav} className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all z-10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button onClick={nextSlide} className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-all z-10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-2 sm:gap-3 z-10">
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrentSlide(i)} className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${i === currentSlide ? "bg-white w-6 sm:w-8" : "bg-white/40 hover:bg-white/60"}`} />
            ))}
          </div>
        </div>

        {/* STATS BAR */}
        <div className="bg-white border-b border-gray-100 py-4 sm:py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-0 md:divide-x divide-gray-200">
            {[
              { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", num: "+$500K", label: "en financiamiento otorgado" },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", num: "+200", label: "importadores financiados" },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", num: "3 anos", label: "respaldando negocios" },
              { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064", num: "Global", label: "importaciones de todo el mundo" },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 md:justify-center md:px-4">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-trust-blue/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#002bb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={stat.icon} /></svg>
                </div>
                <div>
                  <div className="text-lg sm:text-xl md:text-2xl font-extrabold text-trust-blue">{stat.num}</div>
                  <div className="text-[10px] sm:text-xs text-gray-500">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTOS / CATALOGO */}
      <section id="productos" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 bg-trust-blue/10 text-trust-blue px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-4">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              Importacion Grupal - Febrero 2026
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-trust-dark mb-3 sm:mb-4">Productos disponibles para importar</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto">Estos son los productos que puedes importar con Trust. Solo pagas el 30% de inicial y el resto cuando vendas.</p>
          </div>

          {/* Product Categories */}
          <div className="grid sm:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">

            {/* iPhones */}
            <div className="bg-gradient-to-br from-trust-gray to-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600&q=80"
                  alt="iPhones"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">iPhones (USA)</h3>
                  <p className="text-blue-200 text-xs sm:text-sm mt-1">iPhones y Accesorios originales</p>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-trust-blue font-bold text-xs sm:text-sm">Desde S/550</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-xs sm:text-sm max-h-[220px] sm:max-h-[280px] overflow-y-auto pr-2">
                  {[
                    ["iPhone 11 128GB", "S/ 550"],
                    ["iPhone 11 Pro 64GB", "S/ 599"],
                    ["iPhone 11 Pro Max", "S/ 750"],
                    ["iPhone 12 64GB", "S/ 700"],
                    ["iPhone 12 128GB", "S/ 790"],
                    ["iPhone 12 Pro 128GB", "S/ 890"],
                    ["iPhone 12 Pro Max 128GB", "S/ 1,090"],
                    ["iPhone 12 Pro Max 256GB", "S/ 1,190"],
                    ["iPhone 13 128GB", "S/ 1,090"],
                    ["iPhone 13 256GB", "S/ 1,190"],
                    ["iPhone 13 Pro 128GB", "S/ 1,390"],
                    ["iPhone 13 Pro 256GB", "S/ 1,490"],
                    ["iPhone 13 Pro Max 128GB", "S/ 1,690"],
                    ["iPhone 13 Pro Max 256GB", "S/ 1,790"],
                    ["iPhone 14 128GB", "S/ 1,290"],
                    ["iPhone 14 Pro 128GB", "S/ 1,490"],
                    ["iPhone 14 Pro 256GB", "S/ 1,590"],
                    ["iPhone 14 Pro Max 128GB", "S/ 1,890"],
                    ["iPhone 14 Pro Max 256GB", "S/ 1,990"],
                    ["iPhone 15 128GB", "S/ 1,490"],
                    ["iPhone 15 Pro 128GB", "S/ 1,690"],
                    ["iPhone 15 Pro 256GB", "S/ 1,790"],
                    ["iPhone 15 Pro Max 256GB", "S/ 2,090"],
                    ["iPhone 16 128GB", "S/ 1,790"],
                    ["iPhone 16 Pro 128GB", "S/ 2,290"],
                    ["iPhone 16 Pro Max 256GB", "S/ 2,490"],
                  ].map(([model, price], idx) => (
                    <div key={idx} className="flex justify-between items-center py-1.5 sm:py-2 px-2 sm:px-3 rounded-lg hover:bg-trust-blue/5 transition-colors">
                      <span className="text-gray-700 font-medium text-[10px] sm:text-xs">{model}</span>
                      <span className="text-trust-blue font-bold text-[10px] sm:text-xs whitespace-nowrap ml-1">{price}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Rentabilidad estimada</span>
                    <div className="text-base sm:text-lg font-extrabold text-green-600">30-40%</div>
                  </div>
                  <button onClick={() => { setShowForm(true); setStep("info"); updateField("productoImportar", "iPhones (USA)"); updateField("paisOrigen", "usa"); }} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all">
                    Solicitar
                  </button>
                </div>
              </div>
            </div>

            {/* Maquina de Latas */}
            <div className="bg-gradient-to-br from-trust-gray to-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1567103472667-6898f3a79cf2?w=600&q=80"
                  alt="Maquina de Latas"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">Maquina de Latas</h3>
                  <p className="text-amber-200 text-xs sm:text-sm mt-1">Selladora de latas + latas PET</p>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-amber-700 font-bold text-xs sm:text-sm">S/ 1,400</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">Maquina Selladora de Latas</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Ideal para bebidas, jugos, cocteles</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 1,400</div>
                  </div>
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">Latas PET (unidad)</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Latas transparentes para envasado</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 0.20</div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Rentabilidad estimada</span>
                    <div className="text-base sm:text-lg font-extrabold text-green-600">50-70%</div>
                  </div>
                  <button onClick={() => { setShowForm(true); setStep("info"); updateField("productoImportar", "Maquina de Latas + Latas PET"); updateField("paisOrigen", "china"); }} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all">
                    Solicitar
                  </button>
                </div>
              </div>
            </div>

            {/* SmartFilm */}
            <div className="bg-gradient-to-br from-trust-gray to-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80"
                  alt="SmartFilm"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">SmartFilm</h3>
                  <p className="text-purple-200 text-xs sm:text-sm mt-1">Pelicula inteligente para vidrios</p>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-purple-700 font-bold text-xs sm:text-sm">Desde S/ 4,500</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">Rollo de 50 metros</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Transparente a opaco con electricidad</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 4,500</div>
                  </div>
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">Rollo de 100 metros</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Mejor precio por metro</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 8,900</div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Rentabilidad estimada</span>
                    <div className="text-base sm:text-lg font-extrabold text-green-600">40-60%</div>
                  </div>
                  <button onClick={() => { setShowForm(true); setStep("info"); updateField("productoImportar", "SmartFilm"); updateField("paisOrigen", "china"); }} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all">
                    Solicitar
                  </button>
                </div>
              </div>
            </div>

            {/* Pantallas LED */}
            <div className="bg-gradient-to-br from-trust-gray to-white rounded-2xl sm:rounded-3xl border border-gray-100 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 sm:h-56 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1542744094-24638eff58bb?w=600&q=80"
                  alt="Pantallas LED"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                  <h3 className="text-xl sm:text-2xl font-extrabold text-white">Pantallas LED</h3>
                  <p className="text-cyan-200 text-xs sm:text-sm mt-1">Pantallas publicitarias y decorativas</p>
                </div>
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1">
                  <span className="text-cyan-700 font-bold text-xs sm:text-sm">Desde S/ 900/m2</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">M2 Pantalla Plana</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Para interiores y exteriores</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 900</div>
                  </div>
                  <div className="flex justify-between items-center py-3 sm:py-4 px-4 sm:px-5 bg-white rounded-xl sm:rounded-2xl border border-gray-100">
                    <div>
                      <div className="font-bold text-trust-dark text-sm sm:text-base">M2 Pantalla Flexible</div>
                      <div className="text-[10px] sm:text-xs text-gray-500">Adaptable a superficies curvas</div>
                    </div>
                    <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">S/ 1,300</div>
                  </div>
                </div>
                <div className="mt-4 sm:mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] sm:text-xs text-gray-500">Rentabilidad estimada</span>
                    <div className="text-base sm:text-lg font-extrabold text-green-600">35-50%</div>
                  </div>
                  <button onClick={() => { setShowForm(true); setStep("info"); updateField("productoImportar", "Pantallas LED"); updateField("paisOrigen", "china"); }} className="px-4 sm:px-6 py-2 sm:py-2.5 bg-trust-blue text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-trust-blue/90 transition-all">
                    Solicitar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Importacion Grupal Info */}
          <div className="bg-gradient-to-r from-trust-blue to-blue-800 rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
              <img
                src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=400&q=60"
                alt=""
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8 items-center relative z-10">
              <div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white mb-3 sm:mb-4">Que es la Importacion Grupal?</h3>
                <p className="text-blue-100 leading-relaxed mb-4 text-sm sm:text-base">Al importar en grupo, los costos de aduana, almacenaje, handling, visto bueno, transporte y flete se dividen entre todos los participantes segun el tamano de su pedido. Esto reduce significativamente tus costos.</p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {["Almacenaje compartido", "Flete dividido", "Aduana en grupo", "Transporte incluido"].map((tag, i) => (
                    <span key={i} className="px-2 sm:px-3 py-1 sm:py-1.5 bg-white/10 text-white text-[10px] sm:text-xs font-medium rounded-full">{tag}</span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">30%</div>
                  <div className="text-blue-200 text-xs sm:text-sm mt-1">Tu inicial</div>
                </div>
                <div className="bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">70%</div>
                  <div className="text-blue-200 text-xs sm:text-sm mt-1">Trust financia</div>
                </div>
                <div className="bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-white">48h</div>
                  <div className="text-blue-200 text-xs sm:text-sm mt-1">Evaluacion</div>
                </div>
                <div className="bg-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-5 text-center">
                  <div className="text-2xl sm:text-3xl font-extrabold text-green-300">30-40%</div>
                  <div className="text-blue-200 text-xs sm:text-sm mt-1">Rentabilidad</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIOS / CONFIANZA - People section */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-trust-gray">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-trust-dark mb-3">Importadores que confiaron en nosotros</h2>
            <p className="text-sm sm:text-base text-gray-500 max-w-2xl mx-auto">Historias reales de emprendedores que hicieron crecer su negocio con Trust Finance</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
            {[
              {
                name: "Carlos Rodriguez",
                role: "Importador de iPhones - Lima",
                quote: "Gracias a Trust pude importar 50 iPhones con solo el 30% de inicial. Las ventas fueron increibles y pague el 70% en menos de 3 semanas.",
                img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
              },
              {
                name: "Maria Fernandez",
                role: "Emprendedora - Arequipa",
                quote: "La importacion grupal me permitio acceder a maquinaria que nunca hubiera podido comprar sola. Ahora mi negocio de jugos crece cada mes.",
                img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80",
              },
              {
                name: "Jorge Mendoza",
                role: "Distribuidor de tecnologia - Trujillo",
                quote: "El proceso fue rapido y transparente. En 48 horas ya tenia la aprobacion y pude hacer mi primera importacion de pantallas LED.",
                img: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm hover:shadow-lg transition-all">
                <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <img
                    src={testimonial.img}
                    alt={testimonial.name}
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-trust-blue/20"
                  />
                  <div>
                    <div className="font-bold text-trust-dark text-sm sm:text-base">{testimonial.name}</div>
                    <div className="text-[10px] sm:text-xs text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed text-sm sm:text-base italic">&ldquo;{testimonial.quote}&rdquo;</p>
                <div className="flex gap-1 mt-4">
                  {[1,2,3,4,5].map(s => (
                    <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#002bb2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-trust-dark mb-3 sm:mb-4">Como funciona</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto">Un proceso simple y transparente para financiar tus importaciones</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-8">
            {[
              { icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", title: "1. Postula", desc: "Llena el formulario con los datos de tu negocio y la importacion que deseas realizar.", img: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=300&q=80" },
              { icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", title: "2. Evaluacion", desc: "Nuestro equipo evalua tu solicitud en un plazo maximo de 48 horas habiles.", img: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=300&q=80" },
              { icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z", title: "3. Paga el 30%", desc: "Una vez aprobado, solo depositas el 30% del valor total de la importacion.", img: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=300&q=80" },
              { icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4", title: "4. Recibe y vende", desc: "Recibe tu mercaderia y paga el 70% restante con las ganancias de tus ventas.", img: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=300&q=80" },
            ].map((item, i) => (
              <div key={i} className="relative bg-trust-gray rounded-xl sm:rounded-2xl overflow-hidden hover:shadow-xl transition-all group">
                <div className="h-28 sm:h-36 overflow-hidden">
                  <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4 sm:p-6">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center mb-3 sm:mb-4 -mt-9 sm:-mt-12 relative z-10 shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                  </div>
                  <h3 className="text-sm sm:text-lg md:text-xl font-bold text-trust-dark mb-1 sm:mb-3">{item.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-[10px] sm:text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section id="beneficios" className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-b from-trust-gray to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-trust-dark mb-3 sm:mb-4">Por que elegir Trust Finance</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-500 max-w-2xl mx-auto">Beneficios disenados para importadores que quieren crecer</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
            {[
              { icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z", title: "Solo 30% de inicial", desc: "Accede a tus productos pagando unicamente el 30% del costo total." },
              { icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", title: "Paga cuando vendas", desc: "No te presionamos con cuotas fijas. Pagas cuando ya hayas vendido." },
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", title: "Proceso seguro", desc: "Toda la operacion esta respaldada con contratos claros y transparentes." },
              { icon: "M13 10V3L4 14h7v7l9-11h-7z", title: "Respuesta rapida", desc: "Evaluamos tu solicitud en maximo 48 horas habiles." },
              { icon: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064", title: "Importa de cualquier pais", desc: "Financiamos importaciones de China, USA, Europa y todo el mundo." },
              { icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z", title: "Asesoria personalizada", desc: "Te acompanamos en todo el proceso con asesores especializados." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-gray-100 hover:border-trust-light/50 hover:shadow-lg transition-all">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-trust-blue/10 flex items-center justify-center mb-3 sm:mb-5">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#002bb2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon} /></svg>
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-trust-dark mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-gray-500 leading-relaxed text-[10px] sm:text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIMULADOR */}
      <section id="simulador" className="py-16 sm:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-trust-dark mb-3 sm:mb-4">Simula tu financiamiento</h2>
            <p className="text-sm sm:text-base md:text-lg text-gray-500">Mueve el slider para ver cuanto necesitas de inicial</p>
          </div>
          <div className="bg-gradient-to-br from-trust-gray to-white rounded-2xl sm:rounded-3xl p-6 sm:p-10 border border-gray-100">
            <label className="block text-xs sm:text-sm font-semibold text-gray-600 mb-2 sm:mb-3">Monto total de importacion (USD)</label>
            <div className="flex items-center gap-2 sm:gap-4 mb-4">
              <span className="text-xl sm:text-2xl font-bold text-gray-400">$</span>
              <input
                type="number"
                min={1000}
                max={500000}
                step={100}
                value={monto}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (val >= 0) setMonto(val);
                }}
                className="w-full px-3 sm:px-5 py-3 sm:py-4 text-xl sm:text-3xl font-extrabold text-trust-dark border-2 border-gray-200 rounded-xl sm:rounded-2xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-center bg-white"
                placeholder="5000"
              />
            </div>
            <input
              type="range"
              min={1000}
              max={100000}
              step={500}
              value={monto > 100000 ? 100000 : monto}
              onChange={(e) => setMonto(Number(e.target.value))}
              className="w-full h-2 sm:h-3 bg-gray-200 rounded-full appearance-none cursor-pointer accent-trust-blue"
            />
            <div className="flex justify-between text-[10px] sm:text-xs text-gray-400 mt-1 mb-4">
              <span>$1,000</span>
              <span>$100,000</span>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-green-100">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Tu inicial (30%)</div>
                <div className="text-xl sm:text-3xl font-extrabold text-green-600">${inicial.toLocaleString()}</div>
              </div>
              <div className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center border border-blue-100">
                <div className="text-xs sm:text-sm font-medium text-gray-500 mb-1">Trust financia (70%)</div>
                <div className="text-xl sm:text-3xl font-extrabold text-trust-blue">${financiado.toLocaleString()}</div>
              </div>
            </div>
            <button
              onClick={() => { setShowForm(true); setStep("info"); setForm(prev => ({ ...prev, montoSolicitado: monto.toString() })); }}
              className="w-full mt-6 sm:mt-8 py-3 sm:py-4 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg hover:shadow-xl hover:shadow-trust-blue/25 transition-all"
            >
              Solicitar este financiamiento
            </button>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 bg-gradient-to-br from-trust-blue to-trust-light relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=1200&q=60"
            alt=""
            className="w-full h-full object-cover opacity-15"
          />
        </div>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 border-2 border-white rounded-full"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 border-2 border-white rounded-full"></div>
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white mb-4 sm:mb-6">Listo para hacer crecer tu negocio?</h2>
          <p className="text-base sm:text-lg md:text-xl text-white/80 mb-8 sm:mb-10">Postula ahora y recibe una respuesta en menos de 48 horas</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => { setShowForm(true); setStep("info"); }}
              className="px-8 sm:px-10 py-3 sm:py-4 bg-white text-trust-blue rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold hover:shadow-2xl transition-all transform hover:-translate-y-0.5"
            >
              Postular ahora
            </button>
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 sm:px-10 py-3 sm:py-4 bg-green-500 text-white rounded-xl sm:rounded-2xl text-base sm:text-lg font-bold hover:bg-green-600 hover:shadow-2xl transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Escribenos por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 bg-trust-dark">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-trust-blue to-trust-light flex items-center justify-center">
                <span className="text-white font-bold text-sm">T</span>
              </div>
              <span className="text-white font-bold">Trust Finance</span>
            </div>
            <div className="flex items-center gap-4 sm:gap-6">
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-green-400 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <a href="https://trustworld.store" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </a>
            </div>
            <p className="text-gray-400 text-xs sm:text-sm">&copy; 2026 Trust Finance. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOATING BUTTON */}
      <a
        href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all group"
        aria-label="Chat por WhatsApp"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
        {/* Tooltip */}
        <span className="absolute right-full mr-3 bg-white text-gray-800 text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Chatea con nosotros
        </span>
        {/* Pulse animation */}
        <span className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20"></span>
      </a>

      {/* MODAL FORMULARIO */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {submitted ? (
              <div className="p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><path d="M20 6L9 17l-5-5" /></svg>
                </div>
                <h3 className="text-2xl sm:text-3xl font-extrabold text-trust-dark mb-3 sm:mb-4">Solicitud enviada!</h3>
                <p className="text-gray-500 text-sm sm:text-lg mb-6 sm:mb-8">Gracias {form.nombre}, hemos recibido tu solicitud. Nuestro equipo te contactara en un plazo maximo de 48 horas habiles al numero {form.telefono}.</p>
                <button onClick={() => { setShowForm(false); setSubmitted(false); }} className="px-6 sm:px-8 py-2.5 sm:py-3 bg-trust-blue text-white rounded-xl font-semibold hover:bg-trust-blue/90 transition-all text-sm sm:text-base">
                  Cerrar
                </button>
              </div>
            ) : (
              <div className="p-5 sm:p-8">
                <div className="flex items-center justify-between mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-2xl font-bold text-trust-dark">Solicitar financiamiento</h3>
                  <button onClick={() => setShowForm(false)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Progress */}
                <div className="mb-6 sm:mb-8">
                  <div className="flex justify-between text-[10px] sm:text-xs font-medium text-gray-400 mb-2">
                    {["Datos personales", "Negocio", "Importacion", "Financiero", "Confirmar"].map((label, i) => (
                      <span key={i} className={i <= stepIndex ? "text-trust-blue" : ""}>{label}</span>
                    ))}
                  </div>
                  <div className="h-1.5 sm:h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-trust-blue to-trust-light rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>

                {/* Step: Info Personal */}
                {step === "info" && (
                  <div className="space-y-4 sm:space-y-5">
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Nombre *</label>
                        <input type="text" value={form.nombre} onChange={e => updateField("nombre", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Tu nombre" />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Apellido *</label>
                        <input type="text" value={form.apellido} onChange={e => updateField("apellido", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Tu apellido" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Correo electronico *</label>
                      <input type="email" value={form.email} onChange={e => updateField("email", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="correo@ejemplo.com" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Telefono / WhatsApp *</label>
                        <input type="tel" value={form.telefono} onChange={e => updateField("telefono", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="+51 999 999 999" />
                      </div>
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">DNI / CE *</label>
                        <input type="text" value={form.dni} onChange={e => updateField("dni", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="12345678" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Ciudad *</label>
                      <input type="text" value={form.ciudad} onChange={e => updateField("ciudad", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Lima, Arequipa, etc." />
                    </div>
                  </div>
                )}

                {/* Step: Negocio */}
                {step === "negocio" && (
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Nombre del negocio *</label>
                      <input type="text" value={form.nombreNegocio} onChange={e => updateField("nombreNegocio", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="Mi Empresa SAC" />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Tienes RUC? *</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {["Si, tengo RUC", "No, soy persona natural"].map(opt => (
                          <button key={opt} onClick={() => updateField("tieneRUC", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all ${form.tieneRUC === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    {form.tieneRUC === "Si, tengo RUC" && (
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Numero de RUC</label>
                        <input type="text" value={form.ruc} onChange={e => updateField("ruc", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="20XXXXXXXXX" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Tipo de negocio *</label>
                      <select value={form.tipoNegocio} onChange={e => updateField("tipoNegocio", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white text-sm">
                        <option value="">Selecciona una opcion</option>
                        <option value="retail">Retail / Tienda fisica</option>
                        <option value="ecommerce">E-commerce / Tienda online</option>
                        <option value="mayorista">Mayorista / Distribuidor</option>
                        <option value="mixto">Mixto (fisico + online)</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Tiempo operando *</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {["Menos de 6 meses", "6 meses - 1 ano", "1 - 3 anos", "Mas de 3 anos"].map(opt => (
                          <button key={opt} onClick={() => updateField("tiempoOperando", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all ${form.tiempoOperando === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Ventas mensuales promedio (USD) *</label>
                      <select value={form.ventasMensuales} onChange={e => updateField("ventasMensuales", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white text-sm">
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
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Que producto deseas importar? *</label>
                      <select value={form.productoImportar} onChange={e => updateField("productoImportar", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white text-sm">
                        <option value="">Selecciona un producto</option>
                        <option value="iPhones (USA)">iPhones (USA) - Desde S/550</option>
                        <option value="Maquina de Latas + Latas PET">Maquina de Latas + Latas PET - S/1,400</option>
                        <option value="SmartFilm">SmartFilm - Desde S/4,500</option>
                        <option value="Pantallas LED">Pantallas LED - Desde S/900/m2</option>
                        <option value="Otro">Otro producto (especificar en comentarios)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Pais de origen *</label>
                      <select value={form.paisOrigen} onChange={e => updateField("paisOrigen", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white text-sm">
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
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Experiencia importando *</label>
                      <div className="grid grid-cols-1 gap-2 sm:gap-3">
                        {["Es mi primera importacion", "He importado 1-3 veces", "He importado 4-10 veces", "Importo regularmente (+10 veces)"].map(opt => (
                          <button key={opt} onClick={() => updateField("experienciaImportando", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all text-left ${form.experienciaImportando === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Con que frecuencia planeas importar? *</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {["Solo esta vez", "Cada 2-3 meses", "Mensualmente", "Aun no lo se"].map(opt => (
                          <button key={opt} onClick={() => updateField("frecuenciaImportacion", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all ${form.frecuenciaImportacion === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step: Financiero */}
                {step === "financiero" && (
                  <div className="space-y-4 sm:space-y-5">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Monto total de importacion (USD) *</label>
                      <input type="number" value={form.montoSolicitado} onChange={e => updateField("montoSolicitado", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all text-sm" placeholder="5000" />
                    </div>
                    {form.montoSolicitado && (
                      <div className="bg-trust-gray rounded-xl sm:rounded-2xl p-4 sm:p-6">
                        <div className="grid grid-cols-2 gap-4 text-center">
                          <div>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Tu inicial (30%)</div>
                            <div className="text-lg sm:text-2xl font-extrabold text-green-600">${(Number(form.montoSolicitado) * 0.3).toLocaleString()}</div>
                          </div>
                          <div>
                            <div className="text-[10px] sm:text-xs font-medium text-gray-400 mb-1">Trust financia (70%)</div>
                            <div className="text-lg sm:text-2xl font-extrabold text-trust-blue">${(Number(form.montoSolicitado) * 0.7).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">En cuanto tiempo estimas vender la mercaderia? *</label>
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        {["Menos de 1 mes", "1-2 meses", "2-3 meses", "Mas de 3 meses"].map(opt => (
                          <button key={opt} onClick={() => updateField("plazoVenta", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all ${form.plazoVenta === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Ya tienes compradores confirmados? *</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                        {["Si, ya tengo compradores", "Parcialmente, algunos", "No, pero tengo experiencia vendiendo", "No, es un mercado nuevo para mi"].map(opt => (
                          <button key={opt} onClick={() => updateField("tieneCompradoresConfirmados", opt)} className={`px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border text-xs sm:text-sm font-medium transition-all text-left ${form.tieneCompradoresConfirmados === opt ? "border-trust-blue bg-trust-blue/5 text-trust-blue" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Como conociste Trust Finance?</label>
                      <select value={form.comoConociste} onChange={e => updateField("comoConociste", e.target.value)} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all bg-white text-sm">
                        <option value="">Selecciona una opcion</option>
                        <option value="redes-sociales">Redes sociales</option>
                        <option value="referido">Referido por alguien</option>
                        <option value="google">Busqueda en Google</option>
                        <option value="trustworld">Pagina de Trust World</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-1.5">Comentarios adicionales</label>
                      <textarea value={form.comentarios} onChange={e => updateField("comentarios", e.target.value)} rows={3} className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:border-trust-blue focus:ring-2 focus:ring-trust-blue/10 transition-all resize-none text-sm" placeholder="Algo mas que debamos saber..."></textarea>
                    </div>
                  </div>
                )}

                {/* Step: Confirmacion */}
                {step === "confirmacion" && (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-trust-gray rounded-xl sm:rounded-2xl p-4 sm:p-6">
                      <h4 className="font-bold text-trust-dark mb-3 sm:mb-4 text-sm sm:text-base">Resumen de tu solicitud</h4>
                      <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
                        <div className="flex justify-between"><span className="text-gray-500">Nombre:</span><span className="font-medium">{form.nombre} {form.apellido}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="font-medium">{form.email}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Telefono:</span><span className="font-medium">{form.telefono}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Negocio:</span><span className="font-medium">{form.nombreNegocio}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Producto:</span><span className="font-medium">{form.productoImportar}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Pais origen:</span><span className="font-medium">{form.paisOrigen}</span></div>
                        <hr className="border-gray-200" />
                        <div className="flex justify-between"><span className="text-gray-500">Monto total:</span><span className="font-bold text-base sm:text-lg">${Number(form.montoSolicitado || 0).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Tu inicial (30%):</span><span className="font-bold text-green-600">${(Number(form.montoSolicitado || 0) * 0.3).toLocaleString()}</span></div>
                        <div className="flex justify-between"><span className="text-gray-500">Trust financia (70%):</span><span className="font-bold text-trust-blue">${(Number(form.montoSolicitado || 0) * 0.7).toLocaleString()}</span></div>
                      </div>
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-lg sm:rounded-xl p-3 sm:p-4 text-xs sm:text-sm text-blue-700">
                      <strong>Nota:</strong> Al enviar esta solicitud, nuestro equipo revisara tu informacion y te contactara en un plazo maximo de 48 horas habiles para continuar con el proceso.
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
                  {stepIndex > 0 ? (
                    <button onClick={prevStep} className="px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-200 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all">
                      Atras
                    </button>
                  ) : <div />}
                  {step === "confirmacion" ? (
                    <button onClick={handleSubmit} className="px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-trust-blue to-trust-light text-white rounded-lg sm:rounded-xl font-semibold hover:shadow-lg hover:shadow-trust-blue/25 transition-all text-xs sm:text-sm">
                      Enviar solicitud
                    </button>
                  ) : (
                    <button onClick={nextStep} className="px-6 sm:px-8 py-2.5 sm:py-3 bg-trust-blue text-white rounded-lg sm:rounded-xl font-semibold hover:bg-trust-blue/90 transition-all text-xs sm:text-sm">
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

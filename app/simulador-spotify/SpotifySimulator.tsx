"use client";

import { useState } from "react";

const fmt = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtK = (n: number) => {
  if (n >= 1000000) return "$" + (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return "$" + (n / 1000).toFixed(1) + "k";
  return "$" + Math.round(n);
};
const fmtN = (n: number) => {
  if (n >= 1000000) return (n / 1000000).toFixed(2) + "M";
  if (n >= 1000) return Math.round(n / 1000) + "k";
  return Math.round(n).toString();
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800;900&family=Barlow:wght@300;400;500;600&display=swap');
.tgf-sim{
  --navy:#040d2b; --navy-mid:#071244; --navy-light:#0c1f6e;
  --cyan:#00c8f0; --cyan-glow:rgba(0,200,240,0.18); --cyan-dim:rgba(0,200,240,0.08);
  --white:#ffffff; --gray:#a0aec0; --gray-dim:rgba(160,174,192,0.15); --border:rgba(0,200,240,0.2);
  font-family:'Barlow',sans-serif; background:var(--navy); color:var(--white);
  min-height:100vh; overflow-x:hidden; position:relative;
}
.tgf-sim *{box-sizing:border-box;margin:0;padding:0}
.tgf-sim::before{
  content:''; position:fixed; inset:0;
  background-image:linear-gradient(rgba(0,200,240,0.04) 1px, transparent 1px),linear-gradient(90deg, rgba(0,200,240,0.04) 1px, transparent 1px);
  background-size:40px 40px; pointer-events:none; z-index:0;
}
.tgf-sim .wrap{position:relative;z-index:1;padding:0 1.5rem 2rem;max-width:960px;margin:0 auto}
.tgf-sim .header{display:flex;align-items:center;justify-content:space-between;padding:1.25rem 0 1rem;border-bottom:1px solid var(--border);margin-bottom:1.75rem}
.tgf-sim .logo{display:flex;align-items:center;gap:10px}
.tgf-sim .logo-icon{width:38px;height:38px;background:var(--cyan);border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden}
.tgf-sim .logo-icon svg{width:22px;height:22px;fill:var(--navy)}
.tgf-sim .logo-text{line-height:1}
.tgf-sim .logo-text .brand{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:22px;letter-spacing:0.02em;color:var(--white)}
.tgf-sim .logo-text .brand span{color:var(--cyan)}
.tgf-sim .logo-text .sub{font-size:9px;letter-spacing:0.18em;color:var(--gray);text-transform:uppercase;margin-top:1px}
.tgf-sim .header-badge{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:var(--cyan);border:1px solid var(--border);padding:4px 12px;border-radius:2px;background:var(--cyan-dim)}
.tgf-sim .hero-label{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:600;letter-spacing:0.2em;text-transform:uppercase;color:var(--cyan);margin-bottom:.5rem}
.tgf-sim .hero-title{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(28px,5vw,42px);line-height:1;text-transform:uppercase;margin-bottom:.4rem}
.tgf-sim .hero-title span{color:var(--cyan)}
.tgf-sim .hero-desc{font-size:13px;color:var(--gray);margin-bottom:1.5rem;max-width:520px;line-height:1.5}
.tgf-sim .controls{background:var(--navy-mid);border:1px solid var(--border);border-radius:4px;padding:1.25rem 1.5rem;margin-bottom:1.5rem;position:relative;overflow:hidden}
.tgf-sim .controls::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg, var(--cyan), rgba(0,200,240,0))}
.tgf-sim .controls-title{font-family:'Barlow Condensed',sans-serif;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:var(--cyan);margin-bottom:1rem}
.tgf-sim .ctrl-row{display:flex;align-items:center;gap:12px;margin-bottom:.8rem}
.tgf-sim .ctrl-row:last-child{margin-bottom:0}
.tgf-sim .ctrl-row label{font-size:12px;color:var(--gray);min-width:185px;letter-spacing:0.02em}
.tgf-sim input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:3px;background:rgba(0,200,240,0.2);border-radius:2px;outline:none}
.tgf-sim input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:14px;height:14px;background:var(--cyan);border-radius:50%;cursor:pointer;box-shadow:0 0 8px rgba(0,200,240,0.6)}
.tgf-sim input[type=range]::-moz-range-thumb{width:14px;height:14px;background:var(--cyan);border:none;border-radius:50%;cursor:pointer;box-shadow:0 0 8px rgba(0,200,240,0.6)}
.tgf-sim input[type=number]{width:80px;font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;padding:4px 8px;border-radius:3px;border:1px solid var(--border);background:var(--navy-light);color:var(--cyan);text-align:center}
.tgf-sim .readout{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:700;color:var(--cyan);min-width:55px;text-align:right}
.tgf-sim .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem}
.tgf-sim .card{background:var(--navy-mid);border:1px solid var(--border);border-radius:4px;padding:1.25rem;position:relative;overflow:hidden}
.tgf-sim .card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px}
.tgf-sim .card-free::before{background:linear-gradient(90deg,#4a5568,rgba(74,85,104,0))}
.tgf-sim .card-premium::before{background:linear-gradient(90deg,var(--cyan),rgba(0,200,240,0))}
.tgf-sim .card-corner{position:absolute;top:0;right:0;font-family:'Barlow Condensed',sans-serif;font-size:9px;font-weight:700;letter-spacing:0.15em;padding:3px 10px;text-transform:uppercase}
.tgf-sim .card-free .card-corner{background:#1a2035;color:#718096}
.tgf-sim .card-premium .card-corner{background:rgba(0,200,240,0.15);color:var(--cyan)}
.tgf-sim .card-title{font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:20px;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:2px}
.tgf-sim .card-sub{font-size:11px;color:var(--gray);letter-spacing:0.04em;margin-bottom:1rem}
.tgf-sim .metric-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:1rem}
.tgf-sim .metric{background:rgba(0,0,0,0.25);border:1px solid rgba(0,200,240,0.1);border-radius:3px;padding:.65rem .75rem;text-align:center}
.tgf-sim .metric .mlabel{font-size:10px;color:var(--gray);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px}
.tgf-sim .metric .mval{font-family:'Barlow Condensed',sans-serif;font-size:22px;font-weight:800;line-height:1}
.tgf-sim .mval.cyan{color:var(--cyan)}
.tgf-sim .mval.dimw{color:#718096}
.tgf-sim .divider{border:none;border-top:1px solid rgba(0,200,240,0.1);margin:.75rem 0}
.tgf-sim .row{display:flex;justify-content:space-between;align-items:center;font-size:12px;padding:3px 0}
.tgf-sim .row .rl{color:var(--gray)}
.tgf-sim .row .ra{font-family:'Barlow Condensed',sans-serif;font-size:14px;font-weight:700}
.tgf-sim .card-free .row .ra{color:#a0aec0}
.tgf-sim .card-premium .row .ra{color:var(--cyan)}
.tgf-sim .annual-bar{display:flex;gap:8px;margin-top:1rem}
.tgf-sim .ann{flex:1;border-radius:3px;padding:.65rem;text-align:center}
.tgf-sim .ann .al{font-size:10px;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:3px}
.tgf-sim .ann .av{font-family:'Barlow Condensed',sans-serif;font-size:16px;font-weight:800}
.tgf-sim .ann-free{background:rgba(74,85,104,0.2);border:1px solid rgba(74,85,104,0.3)}
.tgf-sim .ann-free .al{color:#718096}
.tgf-sim .ann-free .av{color:#a0aec0}
.tgf-sim .ann-prem{background:rgba(0,200,240,0.08);border:1px solid var(--border)}
.tgf-sim .ann-prem .al{color:rgba(0,200,240,0.7)}
.tgf-sim .ann-prem .av{color:var(--cyan)}
.tgf-sim .cta{background:linear-gradient(135deg,var(--navy-light),var(--navy-mid));border:1px solid var(--border);border-radius:4px;padding:1.5rem;text-align:center;margin-bottom:1.5rem;position:relative;overflow:hidden}
.tgf-sim .cta::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,rgba(0,200,240,0),var(--cyan),rgba(0,200,240,0))}
.tgf-sim .cta h3{font-family:'Barlow Condensed',sans-serif;font-weight:900;font-size:clamp(20px,3vw,26px);text-transform:uppercase;line-height:1.05;margin-bottom:.5rem}
.tgf-sim .cta h3 span{color:var(--cyan)}
.tgf-sim .cta p{font-size:13px;color:var(--gray);max-width:460px;margin:0 auto 1.1rem;line-height:1.5}
.tgf-sim .cta a{display:inline-block;font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:15px;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;color:var(--navy);background:var(--cyan);padding:.8rem 1.8rem;border-radius:3px;box-shadow:0 0 22px rgba(0,200,240,0.35);transition:transform .15s ease}
.tgf-sim .cta a:hover{transform:translateY(-1px)}
.tgf-sim .footer-note{font-size:10px;color:rgba(160,174,192,0.5);line-height:1.6;border-top:1px solid var(--border);padding-top:1rem;margin-top:.5rem}
.tgf-sim .footer-brand{display:flex;align-items:center;justify-content:space-between;margin-top:.75rem;flex-wrap:wrap;gap:8px}
.tgf-sim .footer-brand span{font-family:'Barlow Condensed',sans-serif;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(0,200,240,0.4)}
.tgf-sim .glow-dot{display:inline-block;width:6px;height:6px;background:var(--cyan);border-radius:50%;box-shadow:0 0 6px var(--cyan);margin-right:6px;vertical-align:middle}
@media(max-width:640px){.tgf-sim .grid2{grid-template-columns:1fr}.tgf-sim .ctrl-row label{min-width:130px}}
`;

export default function SpotifySimulator() {
  const [devices, setDevices] = useState(60);
  const [hours, setHours] = useState(20);
  const [songLen, setSongLen] = useState(3);

  const clampDevices = (v: number) =>
    setDevices(Math.min(2000, Math.max(10, Number.isNaN(v) ? 60 : v)));

  const streamsPerDay = Math.floor((hours * 60) / songLen);
  const totalDay = devices * streamsPerDay;
  const totalMonth = totalDay * 30;

  const fMin = 0.0008, fAvg = 0.00088, fMax = 0.001;
  const pMin = 0.004, pAvg = 0.005, pMax = 0.006;

  return (
    <div className="tgf-sim">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="wrap">
        {/* HEADER */}
        <div className="header">
          <div className="logo">
            <div className="logo-icon">
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C9.5 2 7.5 3.5 6.5 5.5C5 5.2 3.5 6 3 7.5C2.5 9 3.2 10.5 4.5 11.2C4.2 12 4 12.8 4 13.5C4 17.1 7.6 20 12 20C16.4 20 20 17.1 20 13.5C20 12.8 19.8 12 19.5 11.2C20.8 10.5 21.5 9 21 7.5C20.5 6 19 5.2 17.5 5.5C16.5 3.5 14.5 2 12 2ZM10 13C9.4 13 9 12.6 9 12C9 11.4 9.4 11 10 11C10.6 11 11 11.4 11 12C11 12.6 10.6 13 10 13ZM14 13C13.4 13 13 12.6 13 12C13 11.4 13.4 11 14 11C14.6 11 15 11.4 15 12C15 12.6 14.6 13 14 13ZM12 17C10.7 17 9.6 16.4 9 15.5H15C14.4 16.4 13.3 17 12 17Z" />
              </svg>
            </div>
            <div className="logo-text">
              <div className="brand">TRUST <span>SERIES</span></div>
              <div className="sub">Genfarmer · Peru</div>
            </div>
          </div>
          <div className="header-badge">Simulador de Royalties 2026</div>
        </div>

        {/* HERO */}
        <div className="hero-label"><span className="glow-dot" />Automatización · Monetización · Marketing Digital</div>
        <h1 className="hero-title">Calcula tu <span>rentabilidad</span><br />en Spotify</h1>
        <p className="hero-desc">Proyecta tus ingresos según el tipo de cuenta y número de dispositivos activos en tu BoxPhoneFarm. Datos basados en tasas reales de pago 2026.</p>

        {/* CONTROLS */}
        <div className="controls">
          <div className="controls-title"><span className="glow-dot" />Configuración del Farm</div>
          <div className="ctrl-row">
            <label htmlFor="tgf-devices">Dispositivos activos</label>
            <input id="tgf-devices" type="range" min={10} max={2000} step={10}
              value={devices} onChange={(e) => setDevices(parseInt(e.target.value))} />
            <input type="number" min={10} max={2000} value={devices}
              onChange={(e) => clampDevices(parseInt(e.target.value))} />
          </div>
          <div className="ctrl-row">
            <label htmlFor="tgf-hours">Horas de stream por día</label>
            <input id="tgf-hours" type="range" min={4} max={24} step={1}
              value={hours} onChange={(e) => setHours(parseInt(e.target.value))} />
            <span className="readout">{hours} h</span>
          </div>
          <div className="ctrl-row">
            <label htmlFor="tgf-songlen">Duración promedio canción</label>
            <input id="tgf-songlen" type="range" min={2} max={5} step={0.5}
              value={songLen} onChange={(e) => setSongLen(parseFloat(e.target.value))} />
            <span className="readout">{songLen} min</span>
          </div>
        </div>

        {/* CARDS */}
        <div className="grid2">
          {/* FREE */}
          <div className="card card-free">
            <div className="card-corner">USA FREE</div>
            <div className="card-title">Cuentas Gratuitas</div>
            <div className="card-sub">Ad-supported · $0.0008 – $0.001 / stream</div>
            <div className="metric-grid">
              <div className="metric"><div className="mlabel">Streams / día</div><div className="mval dimw">{fmtN(totalDay)}</div></div>
              <div className="metric"><div className="mlabel">Streams / mes</div><div className="mval dimw">{fmtN(totalMonth)}</div></div>
              <div className="metric"><div className="mlabel">Ganancia / día</div><div className="mval dimw">{fmt(totalDay * fAvg)}</div></div>
              <div className="metric"><div className="mlabel">Ganancia / mes</div><div className="mval dimw">{fmt(totalMonth * fAvg)}</div></div>
            </div>
            <div className="divider" />
            <div className="row"><span className="rl">Rate mínimo ($0.0008)</span><span className="ra">{fmt(totalMonth * fMin)}</span></div>
            <div className="row"><span className="rl">Rate promedio ($0.00088)</span><span className="ra">{fmt(totalMonth * fAvg)}</span></div>
            <div className="row"><span className="rl">Rate máximo ($0.001)</span><span className="ra">{fmt(totalMonth * fMax)}</span></div>
            <div className="divider" />
            <div className="row"><span className="rl">Tras fee DistroKid (9%)</span><span className="ra">{fmt(totalMonth * fAvg * 0.91)}</span></div>
            <div className="row"><span className="rl">Tras fee TuneCore (15%)</span><span className="ra">{fmt(totalMonth * fAvg * 0.85)}</span></div>
            <div className="annual-bar">
              <div className="ann ann-free"><div className="al">Anual mín.</div><div className="av">{fmtK(totalMonth * fMin * 12)}</div></div>
              <div className="ann ann-free"><div className="al">Anual máx.</div><div className="av">{fmtK(totalMonth * fMax * 12)}</div></div>
            </div>
          </div>

          {/* PREMIUM */}
          <div className="card card-premium">
            <div className="card-corner">USA + EU PREMIUM</div>
            <div className="card-title">Cuentas Premium</div>
            <div className="card-sub">Paid subscribers · $0.004 – $0.006 / stream</div>
            <div className="metric-grid">
              <div className="metric"><div className="mlabel">Streams / día</div><div className="mval cyan">{fmtN(totalDay)}</div></div>
              <div className="metric"><div className="mlabel">Streams / mes</div><div className="mval cyan">{fmtN(totalMonth)}</div></div>
              <div className="metric"><div className="mlabel">Ganancia / día</div><div className="mval cyan">{fmt(totalDay * pAvg)}</div></div>
              <div className="metric"><div className="mlabel">Ganancia / mes</div><div className="mval cyan">{fmt(totalMonth * pAvg)}</div></div>
            </div>
            <div className="divider" />
            <div className="row"><span className="rl">Rate mínimo ($0.004)</span><span className="ra">{fmt(totalMonth * pMin)}</span></div>
            <div className="row"><span className="rl">Rate promedio ($0.005)</span><span className="ra">{fmt(totalMonth * pAvg)}</span></div>
            <div className="row"><span className="rl">Rate máximo ($0.006)</span><span className="ra">{fmt(totalMonth * pMax)}</span></div>
            <div className="divider" />
            <div className="row"><span className="rl">Tras fee DistroKid (9%)</span><span className="ra">{fmt(totalMonth * pAvg * 0.91)}</span></div>
            <div className="row"><span className="rl">Tras fee TuneCore (15%)</span><span className="ra">{fmt(totalMonth * pAvg * 0.85)}</span></div>
            <div className="annual-bar">
              <div className="ann ann-prem"><div className="al">Anual mín.</div><div className="av">{fmtK(totalMonth * pMin * 12)}</div></div>
              <div className="ann ann-prem"><div className="al">Anual máx.</div><div className="av">{fmtK(totalMonth * pMax * 12)}</div></div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="cta">
          <h3>Estos números los genera <span>GenFarmer</span></h3>
          <p>El simulador usa tasas reales de operadores activos. GenFarmer automatiza el streaming 24/7 en tu granja de dispositivos y multiplica las cuentas. Empezá gratis.</p>
          <a href="/oferta">Montar mi granja con GenFarmer →</a>
        </div>

        {/* FOOTER */}
        <div className="footer-note">
          * Tasas 2026: Free USA $0.0008–0.001 (ad-supported). Premium USA/EU $0.004–0.006 (mercados de alto valor). Un stream se contabiliza a los 30 segundos de reproducción. Estimaciones antes de impuestos y costos operativos (proxies, energía, GenFarmer $27/mes). Rentabilidad proyectada por TRUST · GenFarmer según datos reales de operadores activos.
        </div>
        <div className="footer-brand">
          <span>Trust Series · Genfarmer · Peru © 2026</span>
          <span>Automatización · Monetización · Marketing Digital</span>
        </div>
      </div>
    </div>
  );
}

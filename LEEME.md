# 🤖 FarmMind AI — Guía de Instalación

---

## ⚡ Paso 1 — Abre la terminal en la carpeta del proyecto

**En Mac:**
1. Abre "Terminal" (búscala en Spotlight con Cmd+Space)
2. Escribe `cd ` (con espacio) y arrastra la carpeta `farmmind` a la terminal
3. Presiona Enter

**En Windows:**
1. Abre la carpeta `farmmind` en el Explorador de archivos
2. Haz clic en la barra de direcciones, escribe `cmd` y presiona Enter

---

## ⚡ Paso 2 — Instala Node.js (solo si no lo tienes)

Verifica si ya lo tienes:
```
node --version
```
Si ves un número como `v20.x.x` → ya lo tienes ✅
Si da error → descárgalo en **https://nodejs.org** (versión LTS)

---

## ⚡ Paso 3 — Instala dependencias

```
npm install
```

---

## ⚡ Paso 4 — Crea el archivo .env.local con tu API Key

### 🔑 Primero obtén tu clave de Anthropic:
1. Ve a **https://console.anthropic.com/**
2. Inicia sesión o crea cuenta
3. Ve a "API Keys" → "Create Key"
4. Copia la clave (empieza con `sk-ant-...`)

### 📄 Luego crea el archivo .env.local:

**En Mac (terminal):**
```bash
cp .env.local.example .env.local
```
Luego ábrelo con TextEdit y reemplaza `sk-ant-xxxxx` con tu clave real.

**En Windows (CMD):**
```cmd
copy .env.local.example .env.local
```
Luego ábrelo con el Bloc de notas y reemplaza `sk-ant-xxxxx` con tu clave real.

**En cualquier sistema (alternativa manual):**
1. Crea un archivo nuevo llamado `.env.local` en la carpeta `farmmind`
2. Escribe esto adentro:
```
ANTHROPIC_API_KEY=sk-ant-TU-CLAVE-AQUI
```

---

## ⚡ Paso 5 — Corre la app

```
npm run dev
```

Luego abre tu navegador en: **http://localhost:3000** 🚀

---

## ✅ Lo que funciona (Fase 1)
- Chat con FarmMind AI especializado en granjas de bots
- Respuestas en streaming (tiempo real)
- UI dark theme profesional
- Sidebar con estado del agente
- Acciones rápidas predefinidas
- Experto en: GenFarmer, Xiaowei, proxies, shadowban, warmup

## 🔜 Próximas fases
- Día 2: System prompt avanzado + historial de conversación
- Día 3: Login + deploy público en Vercel
- Fase 2: Tools reales (rotar proxies, pausar campañas)

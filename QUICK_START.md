# 🚀 Quick Start - BIAN API Generator

## Setup Local Rápido (2 minutos) - macOS con Homebrew 🍺

```bash
# 1. Clonar y setup automatizado con Homebrew
git clone <tu-repo>
cd bian-gtc
./setup-local.sh

# El script automáticamente:
# - Instala Homebrew (si no está presente)
# - Instala Node.js, Git, MongoDB, Railway CLI
# - Configura archivos .env con JWT secret generado
# - Instala dependencias del proyecto

# 2. Configurar credenciales (solo estas 3)
# backend/.env: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, OPENAI_API_KEY
# frontend/.env.local: VITE_GOOGLE_CLIENT_ID

# 3. Iniciar desarrollo
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

**Aplicación local:** http://localhost:5173
**Backend API:** http://localhost:10000

---

## Despliegue Railway (1 minuto)

```bash
# Despliegue automatizado (instala Railway CLI via Homebrew si es necesario)
./deploy-railway.sh

# Configurar variables en Railway Dashboard:
# Backend: MONGODB_URI, GOOGLE_CLIENT_*, OPENAI_API_KEY, JWT_SECRET
# Frontend: VITE_API_URL, VITE_GOOGLE_CLIENT_ID
```

---

## 🔐 Credenciales Necesarias

### MongoDB Atlas (Gratis)
- URI: `mongodb+srv://user:pass@cluster.mongodb.net/bian-api-generator`

### Google OAuth (Gratis)
- Console: https://console.cloud.google.com
- Client ID: `abc123.apps.googleusercontent.com`
- Client Secret: `GOCSPX-abc123`

### OpenAI API (Pago)
- Platform: https://platform.openai.com/api-keys
- API Key: `sk-abc123...`

### JWT Secret (Generar)
```bash
openssl rand -base64 64
```

---

## 📋 URLs para Configurar

### Desarrollo Local
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:10000`

### Producción Railway
- Frontend: `https://tu-app.up.railway.app`
- Backend: `https://tu-backend.up.railway.app`

---

## 🆘 Problemas Comunes

**Error de CORS:** Verificar `VITE_API_URL` en frontend
**Error OAuth:** Verificar URLs en Google Console
**Error MongoDB:** Verificar whitelist de IPs (usar 0.0.0.0/0)
**Error OpenAI:** Verificar API key y límites

---

**🔴 NUNCA subir archivos .env al repositorio** 
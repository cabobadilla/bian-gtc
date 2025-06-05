# 🚀 Plan de Despliegue: Local y Railway
## Manteniendo Credenciales Seguras en Todo Momento

---

## 📋 Resumen del Plan

### Fase 1: Configuración Local Segura
1. ✅ Configurar variables de entorno locales (nunca en repositorio)
2. ✅ Instalar y configurar MongoDB local o Atlas
3. ✅ Configurar credenciales de Google OAuth y OpenAI
4. ✅ Probar funcionalidad completa localmente

### Fase 2: Despliegue en Railway
1. ✅ Crear proyecto en Railway
2. ✅ Configurar variables de entorno en Railway Dashboard
3. ✅ Configurar archivos de despliegue
4. ✅ Desplegar y verificar funcionamiento

---

## 🔒 FASE 1: CONFIGURACIÓN LOCAL SEGURA

### 1.1 Preparación de Archivos de Entorno (NUNCA SUBEN A GITHUB)

**Backend Environment (.env)**
```bash
# 📁 Crear: backend/.env (¡NUNCA SUBIR A GITHUB!)
# 🔧 Variables de Entorno para BIAN API Generator

# 🗄️ MongoDB (Opción 1: Local)
MONGODB_URI=mongodb://localhost:27017/bian-api-generator

# 🗄️ MongoDB (Opción 2: Atlas - RECOMENDADO)
MONGODB_URI=mongodb+srv://[TU_USUARIO]:[TU_PASSWORD]@[TU_CLUSTER].mongodb.net/bian-api-generator?retryWrites=true&w=majority

# 🔑 Google OAuth2 Credentials (Console: https://console.cloud.google.com)
GOOGLE_CLIENT_ID=[TU_CLIENT_ID].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[TU_CLIENT_SECRET]

# 🤖 OpenAI API Key (Platform: https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-[TU_API_KEY]

# 🔐 JWT Secret (Generar clave aleatoria mínimo 64 caracteres)
JWT_SECRET=[CLAVE_SUPER_SEGURA_64_CHARS_MINIMO]

# ⚙️ Configuración Local
NODE_ENV=development
DEBUG=ON
PORT=10000
```

**Frontend Environment (.env.local)**
```bash
# 📁 Crear: frontend/.env.local (¡NUNCA SUBIR A GITHUB!)
# Variables de entorno para frontend local

# Backend API URL (local)
VITE_API_URL=http://localhost:10000

# Google OAuth Client ID (mismo que backend)
VITE_GOOGLE_CLIENT_ID=[TU_CLIENT_ID].apps.googleusercontent.com
```

### 1.2 Verificar Configuración de Seguridad

**Verificar .gitignore**
```bash
# Debe incluir (ya configurado):
.env
.env.local
.env.production
.env.development
*.env
node_modules/
```

### 1.3 Setup Automatizado

**🍺 Usar script de setup con Homebrew (RECOMENDADO para macOS):**
```bash
./setup-local.sh
```

Este script automáticamente:
- ✅ Instala Homebrew si no está presente
- ✅ Instala Node.js, Git, MongoDB, Railway CLI via Homebrew
- ✅ Configura archivos de entorno con JWT secret generado
- ✅ Instala dependencias del proyecto
- ✅ Verifica configuración de seguridad

**O instalación manual:**

**Terminal 1 - Backend:**
```bash
cd backend
npm install
cp ../env.example .env
# 🔴 EDITAR .env con tus credenciales reales
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm install
cp env.example .env.local
# 🔴 EDITAR .env.local con tus credenciales reales
npm run dev
```

### 1.4 Configuración de MongoDB

**Opción A: MongoDB Local**
```bash
# macOS (Homebrew)
brew install mongodb-community
brew services start mongodb-community

# La URI será: mongodb://localhost:27017/bian-api-generator
```

**Opción B: MongoDB Atlas (RECOMENDADO)**
1. Ir a https://cloud.mongodb.com
2. Crear cluster gratuito
3. Configurar usuario de base de datos
4. Obtener connection string
5. Agregar IP a whitelist (0.0.0.0/0 para desarrollo)

### 1.5 Configuración de Google OAuth

**Pasos en Google Cloud Console:**
1. Ir a https://console.cloud.google.com
2. Crear nuevo proyecto o seleccionar existente
3. Habilitar Google+ API
4. Ir a "Credentials" > "Create Credentials" > "OAuth 2.0 Client ID"
5. Configurar JavaScript origins:
   - `http://localhost:5173` (desarrollo)
   - `https://[tu-app].up.railway.app` (producción)
6. Configurar redirect URIs:
   - `http://localhost:10000/auth/google/callback` (desarrollo)
   - `https://[tu-backend].up.railway.app/auth/google/callback` (producción)

### 1.6 Configuración de OpenAI

**Obtener API Key:**
1. Ir a https://platform.openai.com/api-keys
2. Crear nueva API key
3. Copiar key (empieza con `sk-`)
4. Configurar límites de uso para seguridad

---

## 🚀 FASE 2: DESPLIEGUE EN RAILWAY

### 2.1 Preparación de Railway

**Crear cuenta y proyecto:**
1. Ir a https://railway.app
2. Conectar con GitHub
3. Crear nuevo proyecto
4. Conectar repositorio bian-gtc

### 2.2 Configuración de Variables de Entorno en Railway

**⚠️ IMPORTANTE: Configurar variables EN RAILWAY DASHBOARD (nunca en código)**

**Variables para Backend Service:**
```
MONGODB_URI=mongodb+srv://[TU_USUARIO]:[TU_PASSWORD]@[TU_CLUSTER].mongodb.net/bian-api-generator?retryWrites=true&w=majority
GOOGLE_CLIENT_ID=[TU_CLIENT_ID].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[TU_CLIENT_SECRET]
OPENAI_API_KEY=sk-[TU_API_KEY]
JWT_SECRET=[CLAVE_SUPER_SEGURA_64_CHARS_MINIMO]
NODE_ENV=production
DEBUG=OFF
PORT=10000
```

**Variables para Frontend Service:**
```
VITE_API_URL=https://[tu-backend-url].up.railway.app
VITE_GOOGLE_CLIENT_ID=[TU_CLIENT_ID].apps.googleusercontent.com
```

### 2.3 Archivos de Configuración Railway

**Archivos creados (estos SÍ van al repositorio):**

1. **`railway.json`** - Configuración principal del proyecto
2. **`backend/railway.json`** - Configuración específica del backend
3. **`frontend/railway.json`** - Configuración específica del frontend

Estos archivos ya están configurados correctamente y no contienen credenciales.

### 2.4 Despliegue Automatizado

**Usar script de despliegue (RECOMENDADO):**
```bash
./deploy-railway.sh
```

**O despliegue manual:**
```bash
# Instalar Railway CLI
npm install -g @railway/cli

# Login a Railway
railway login

# Conectar proyecto
railway init  # nuevo proyecto
# o
railway link  # proyecto existente

# Desplegar
railway up
```

### 2.5 Post-Despliegue

**Pasos después del despliegue:**
1. 🌐 Ir al Railway Dashboard
2. 🔧 Configurar todas las variables de entorno
3. 🔗 Obtener URLs de los servicios desplegados
4. 🔄 Actualizar Google OAuth con las nuevas URLs
5. 🧪 Probar la aplicación desplegada

---

## 🔐 CHECKLIST DE SEGURIDAD

### ✅ Antes de cualquier commit:
- [ ] Verificar que .env no está en staging: `git status`
- [ ] Verificar .gitignore incluye archivos de entorno
- [ ] No hay credenciales hardcoded en código
- [ ] Variables sensibles solo en dashboards de servicios

### ✅ Variables que NUNCA van al repositorio:
- [ ] MONGODB_URI
- [ ] GOOGLE_CLIENT_SECRET
- [ ] OPENAI_API_KEY
- [ ] JWT_SECRET
- [ ] Cualquier password o token

### ✅ Configuración OAuth actualizada:
- [ ] URLs de desarrollo en Google Console
- [ ] URLs de producción en Google Console
- [ ] Redirect URIs correctos para ambos entornos

---

## 🛠️ COMANDOS RÁPIDOS

### Desarrollo Local:
```bash
# Setup automatizado
./setup-local.sh

# Manual
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

### Despliegue Railway:
```bash
# Despliegue automatizado
./deploy-railway.sh

# Manual
railway login
railway up
```

### Verificar seguridad:
```bash
# Verificar que no hay archivos .env en git
git ls-files | grep -E "\.env"
# (No debe devolver nada)

# Verificar .gitignore
cat .gitignore | grep -E "\.env"
# (Debe mostrar patrones de exclusión)
```

### Generar JWT Secret seguro:
```bash
# macOS/Linux
openssl rand -base64 64

# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

---

## 📞 SOPORTE Y TROUBLESHOOTING

### Problemas comunes:
1. **Error CORS**: Verificar VITE_API_URL en frontend
2. **Error OAuth**: Verificar URLs en Google Console
3. **Error MongoDB**: Verificar conexión y whitelist de IPs
4. **Error OpenAI**: Verificar API key y límites de uso

### Logs útiles:
```bash
# Backend logs (local)
npm run dev

# Railway logs
railway logs --service [service-name]

# Verificar variables de entorno
railway variables
```

### URLs importantes:
- **Railway Dashboard**: https://railway.app/dashboard
- **Google Cloud Console**: https://console.cloud.google.com
- **MongoDB Atlas**: https://cloud.mongodb.com
- **OpenAI Platform**: https://platform.openai.com

---

**🔴 RECORDATORIO CRÍTICO:**
**NUNCA subir archivos .env al repositorio. Siempre usar dashboards de servicios para variables sensibles.** 
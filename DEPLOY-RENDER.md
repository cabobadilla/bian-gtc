# 🚀 Guía de Despliegue en Render

## 📋 Prerrequisitos

✅ **Cuentas y Servicios Requeridos:**
- [ ] Cuenta en [Render](https://render.com) (gratuita)
- [ ] MongoDB Atlas configurado
- [ ] Google OAuth configurado  
- [ ] OpenAI API Key

## 🎯 Arquitectura de Despliegue

**2 Servicios en Render:**
- 🔧 **bian-gtc-backend**: API Node.js (Web Service)
- 🎨 **bian-gtc-frontend**: React SPA (Static Site)

## 🚀 Pasos de Despliegue

### 1. 📝 Crear Servicios en Render

1. Ve a [Render Dashboard](https://dashboard.render.com)
2. Conecta tu repositorio GitHub: `cabobadilla/bian-gtc`
3. Render detectará automáticamente el archivo `render.yaml`
4. Haz clic en **"Apply"** para crear ambos servicios

### 2. 🔐 Configurar Variables de Entorno

#### **Backend Service (bian-gtc-backend)**

Ve a Settings → Environment y configura:

```bash
# Base de datos
MONGODB_URI=mongodb+srv://[usuario]:[password]@[cluster].mongodb.net/bian-api-generator

# Autenticación Google
GOOGLE_CLIENT_ID=[tu-client-id].apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-[tu-client-secret]

# OpenAI
OPENAI_API_KEY=sk-[tu-api-key]

# Seguridad
JWT_SECRET=[genera-una-clave-segura-de-64-caracteres]

# ✅ Estas ya están configuradas en render.yaml:
NODE_ENV=production
DEBUG=OFF
PORT=10000
FRONTEND_URL=https://bian-gtc-frontend.onrender.com
```

#### **Frontend Service (bian-gtc-frontend)**

```bash
# API Backend
VITE_API_URL=https://bian-gtc-backend.onrender.com

# Google OAuth (mismo que backend)
VITE_GOOGLE_CLIENT_ID=[mismo-client-id-del-backend]
```

### 3. 🔧 Configurar Google OAuth

En [Google Cloud Console](https://console.cloud.google.com):

1. Ve a **APIs & Services** → **Credentials**
2. Edita tu **OAuth 2.0 Client ID**
3. Agrega a **Authorized redirect URIs**:
   ```
   https://bian-gtc-backend.onrender.com/auth/google/callback
   ```
4. Agrega a **Authorized JavaScript origins**:
   ```
   https://bian-gtc-frontend.onrender.com
   https://bian-gtc-backend.onrender.com
   ```

### 4. 🌐 URLs de Producción

Una vez desplegado:

- **Frontend**: https://bian-gtc-frontend.onrender.com
- **Backend API**: https://bian-gtc-backend.onrender.com
- **Health Check**: https://bian-gtc-backend.onrender.com/api/health

## 🔑 Generador de JWT Secret

```bash
# Generar JWT Secret seguro
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

## 🛠️ Plan Gratuito de Render

✅ **Incluye:**
- 750 horas/mes por servicio
- Sleep automático después de 15 min inactividad
- SSL gratuito
- Deploy automático desde GitHub

⚠️ **Limitaciones:**
- Cold start (hasta 30s) después del sleep
- 1 CPU compartida
- 512MB RAM

## 🔍 Verificación Post-Despliegue

1. **Health Check**: https://bian-gtc-backend.onrender.com/api/health
2. **Frontend**: Debe cargar la aplicación React
3. **Login Google**: Debe funcionar correctamente
4. **APIs**: Dashboard debe mostrar datos

## 🚨 Troubleshooting

### Error común: Build failed
```bash
# Verificar logs en Render Dashboard
# Común: dependencias faltantes o variables mal configuradas
```

### Error: Cannot connect to MongoDB
```bash
# Verificar MONGODB_URI en variables de entorno
# Verificar whitelist de IPs en MongoDB Atlas (0.0.0.0/0 para Render)
```

### Error: Google OAuth failed
```bash
# Verificar redirect URIs en Google Console
# Verificar GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET
```

## 📝 Notas Importantes

- ⏰ **Build time**: ~3-5 minutos por servicio
- 🔄 **Auto-deploy**: Configurado desde `main` branch
- 💤 **Sleep**: Servicios gratuitos duermen tras 15 min inactividad  
- 🌍 **CORS**: Ya configurado para producción

## 🎯 Siguiente Paso

Una vez configuradas las variables de entorno, Render ejecutará automáticamente el deploy. Los servicios estarán disponibles en las URLs mencionadas arriba. 
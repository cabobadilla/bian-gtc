# 🏦 BIAN API Generator

**Generador inteligente de APIs bancarias** basado en estándares BIAN (Banking Industry Architecture Network) con asistencia de inteligencia artificial.

> 🚀 **Lista para producción**: Desplegada en [Render.com](https://render.com) con arquitectura escalable y segura.

## ✨ Características Principales

- **🤖 IA Integrada**: OpenAI ChatGPT para generación inteligente de APIs
- **🏛️ Estándares BIAN**: Cumplimiento automático con BIAN v12
- **🔐 Autenticación OAuth2**: Integración segura con Google
- **🏢 Multi-empresa**: Soporte para múltiples organizaciones
- **📝 Versionado Completo**: Control de versiones automático
- **📊 Dashboard Analítico**: Métricas en tiempo real
- **📖 Documentación**: Swagger UI integrado

## 🏗️ Arquitectura

### Stack Tecnológico
- **Frontend**: React 18 + Vite + Material-UI
- **Backend**: Node.js + Express + MongoDB Atlas
- **IA**: OpenAI GPT-4o-mini
- **Autenticación**: JWT + Google OAuth2
- **Despliegue**: Render.com (Servicio Unificado)

### Arquitectura de Despliegue
```
https://bian-gtc.onrender.com
├── Frontend (React SPA)
├── /api/* (Backend API)
├── /api/docs (Swagger UI)
└── /api/health (Health Check)
```

## 🚀 Despliegue en Render.com

### Configuración Automática

El proyecto está configurado para **despliegue automático** en Render.com usando `render.yaml`:

1. **Fork del Repositorio**
   ```bash
   # Clonar tu fork
   git clone https://github.com/TU-USUARIO/bian-gtc.git
   cd bian-gtc
   ```

2. **Crear Servicio en Render.com**
   - Conectar cuenta de GitHub en [render.com](https://render.com)
   - **New** → **Blueprint**
   - Seleccionar repositorio `bian-gtc`
   - Render detectará automáticamente `render.yaml`

3. **Configurar Variables de Entorno**
   
   En el dashboard de Render.com, configurar estas **variables secretas**:

   | Variable | Valor de Ejemplo | Descripción |
   |----------|------------------|-------------|
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/bian-api` | MongoDB Atlas connection string |
   | `GOOGLE_CLIENT_ID` | `123456-abc.apps.googleusercontent.com` | Google OAuth Client ID |
   | `GOOGLE_CLIENT_SECRET` | `GOCSPX-abc123...` | Google OAuth Secret |
   | `OPENAI_API_KEY` | `sk-abc123...` | OpenAI API Key |
   | `JWT_SECRET` | `tu-clave-super-segura-de-64-caracteres-minimo` | JWT signing secret |

### Configuración de Servicios Externos

#### 🔑 Google OAuth2
1. **Google Cloud Console** → [console.cloud.google.com](https://console.cloud.google.com)
2. **APIs & Services** → **Credentials** → **Create OAuth 2.0 Client ID**
3. **Authorized redirect URIs**:
   ```
   https://bian-gtc.onrender.com/api/auth/google/callback
   ```
4. **Authorized JavaScript origins**:
   ```
   https://bian-gtc.onrender.com
   ```

#### 🗄️ MongoDB Atlas
1. **Crear cluster gratuito** en [mongodb.com/atlas](https://mongodb.com/atlas)
2. **Network Access** → **Add IP Address** → `0.0.0.0/0` (Allow from anywhere)
3. **Database Access** → **Add Database User** → Crear usuario con contraseña
4. **Connect** → **Connect your application** → Copiar connection string

#### 🤖 OpenAI API
1. **Obtener API Key** en [platform.openai.com](https://platform.openai.com)
2. **API Keys** → **Create new secret key**
3. La key comienza con `sk-`

## 📁 Estructura del Proyecto

```
bian-gtc/
├── 🎨 frontend/           # React Application
│   ├── src/
│   │   ├── components/    # UI Components
│   │   ├── pages/         # Application Pages
│   │   ├── services/      # API Services
│   │   └── store/         # State Management
│   └── package.json
├── ⚙️ backend/            # Node.js API
│   ├── src/
│   │   ├── controllers/   # Request Controllers
│   │   ├── models/        # MongoDB Models
│   │   ├── routes/        # API Routes
│   │   ├── services/      # Business Logic
│   │   └── config/        # Configurations
│   └── package.json
├── 📋 render.yaml         # Render.com Config
└── 📖 README.md
```

## 🌐 URLs de Producción

| Servicio | URL | Descripción |
|----------|-----|-------------|
| **Aplicación Principal** | `https://bian-gtc.onrender.com` | Frontend completo |
| **API Backend** | `https://bian-gtc.onrender.com/api` | API REST |
| **Documentación** | `https://bian-gtc.onrender.com/api/docs` | Swagger UI |
| **Health Check** | `https://bian-gtc.onrender.com/api/health` | Status del servidor |

## 🔍 Monitoreo y Mantenimiento

### Health Checks Automáticos
Render.com monitorea automáticamente el endpoint `/api/health` cada 30 segundos.

### Logs en Tiempo Real
```bash
# Ver logs del servicio en Render.com Dashboard
# Navigate to: bian-gtc service → Logs tab
```

### Métricas Disponibles
- **Performance**: Response times, throughput
- **Errors**: Error rates y stack traces
- **Resources**: CPU, memory usage
- **API Usage**: Requests por endpoint

## 📋 Checklist de Despliegue

### ✅ Pre-Despliegue
- [ ] Fork del repositorio realizado
- [ ] Variables de entorno configuradas en Render.com
- [ ] Google OAuth configurado con URLs correctas
- [ ] MongoDB Atlas configurado y accesible
- [ ] OpenAI API key válida y con créditos

### ✅ Post-Despliegue
- [ ] Servicio `bian-gtc` desplegado sin errores
- [ ] Health check responde: `https://bian-gtc.onrender.com/api/health`
- [ ] Frontend carga correctamente
- [ ] Login con Google funciona
- [ ] Crear empresa funciona
- [ ] Búsqueda BIAN funciona
- [ ] API Docs accesibles

## 🔧 Comandos de Utilidad

### Verificar Status
```bash
# Health check
curl https://bian-gtc.onrender.com/api/health

# API response test
curl https://bian-gtc.onrender.com/api/bian/popular
```

### Deploy Manual (si es necesario)
```bash
# Trigger manual deploy
git commit --allow-empty -m "Trigger deploy"
git push origin main
```

## 🛠️ Desarrollo Local (Opcional)

<details>
<summary>Click para ver instrucciones de desarrollo local</summary>

### Prerrequisitos
- Node.js 18+
- Git

### Setup Rápido
```bash
# Backend
cd backend
npm install
# Crear .env con variables locales
npm run dev

# Frontend (terminal separado)
cd frontend
npm install
# Crear .env.local con VITE_API_URL=http://localhost:10000/api
npm run dev
```

### URLs Desarrollo
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:10000`
- Docs: `http://localhost:10000/api/docs`

</details>

## 🐛 Troubleshooting

### Problemas Comunes

**❌ Error 404 en APIs**
- Verificar que el servicio `bian-gtc` esté activo
- Comprobar health check: `/api/health`

**❌ Error de OAuth Google**
- Verificar redirect URIs en Google Console
- Confirmar `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`

**❌ Error de MongoDB**
- Verificar `MONGODB_URI` connection string
- Comprobar que Atlas permite conexiones desde `0.0.0.0/0`

**❌ Error de OpenAI**
- Verificar `OPENAI_API_KEY` válida
- Confirmar que tienes créditos disponibles

### Logs de Debug
```bash
# Ver logs detallados en Render.com Dashboard
# Los logs incluyen:
# 🏗️ Build process
# 🚀 Server startup
# 📄 Request logs
# ❌ Error traces
```

## 🤝 Contribución

1. **Fork** el repositorio
2. **Crear rama**: `git checkout -b feature/nueva-funcionalidad`
3. **Commit**: `git commit -m 'Agregar nueva funcionalidad'`
4. **Push**: `git push origin feature/nueva-funcionalidad`
5. **Pull Request** al repositorio principal

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para detalles.

## 🆘 Soporte

- **📧 Issues**: [GitHub Issues](https://github.com/cabobadilla/bian-gtc/issues)
- **📖 Documentación**: API docs en `/api/docs`
- **🔍 Logs**: Render.com dashboard para debug

---

> 💡 **Tip**: Para la mejor experiencia, usa el servicio unificado `bian-gtc` que combina frontend y backend en una sola URL. 
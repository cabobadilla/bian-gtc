# Generador de APIs BIAN Personalizadas

Una aplicación web moderna para crear APIs personalizadas basadas en estándares BIAN (Banking Industry Architecture Network) con asistencia de inteligencia artificial.

## 🏗️ Arquitectura

### Frontend
- **Framework**: React 18 con Vite
- **UI Library**: Material-UI + styled-components
- **Estado**: Zustand + React Query
- **Autenticación**: OAuth2 con Google
- **Despliegue**: Render.com (Static Site)

### Backend
- **Framework**: Node.js + Express.js
- **Base de Datos**: MongoDB Atlas
- **Autenticación**: JWT + Passport.js
- **IA**: OpenAI ChatGPT para enriquecimiento semántico
- **Documentación**: Swagger/OpenAPI automática
- **Despliegue**: Render.com (Web Service)

## 🚀 Funcionalidades

- **🔐 Autenticación Segura**: OAuth2 con Google + JWT
- **🏢 Multi-empresa**: Soporte para múltiples organizaciones
- **👥 Sistema de Roles**: Admin, Editor, Viewer con permisos granulares
- **🤖 IA Integrada**: OpenAI para enriquecimiento automático de APIs
- **📚 Cumplimiento BIAN**: Validación automática con estándares BIAN v12
- **📝 Control de Versiones**: Sistema completo de versionado de APIs
- **📊 Dashboard Analítico**: Métricas y gestión centralizada
- **🔄 Colaboración**: Sistema de colaboradores con comentarios y sugerencias
- **📖 Documentación**: Swagger UI integrado para testing

## 📁 Estructura del Proyecto

```
bian-gtc/
├── frontend/              # Aplicación React
│   ├── src/
│   │   ├── components/    # Componentes reutilizables
│   │   ├── pages/         # Páginas de la aplicación
│   │   ├── services/      # Servicios API
│   │   ├── store/         # Estado global (Zustand)
│   │   ├── hooks/         # React hooks personalizados
│   │   └── utils/         # Utilidades
│   ├── public/
│   ├── package.json
│   └── vite.config.js
├── backend/               # API Node.js
│   ├── src/
│   │   ├── controllers/   # Controladores
│   │   ├── models/        # Modelos de MongoDB
│   │   ├── routes/        # Rutas de la API
│   │   ├── middleware/    # Middlewares
│   │   ├── services/      # Servicios (OpenAI, etc.)
│   │   ├── config/        # Configuraciones
│   │   └── utils/         # Utilidades
│   └── package.json
├── docs/                  # Documentación
├── render.yaml           # Configuración de Render.com
└── README.md
```

## 🚀 Despliegue en Render.com

### Opción 1: Despliegue Automático (Recomendado)

El proyecto incluye un archivo `render.yaml` que configura automáticamente ambos servicios.

1. **Conectar Repositorio**:
   - Ve a [render.com](https://render.com) y crea una cuenta
   - Conecta tu cuenta de GitHub
   - Selecciona "New" → "Blueprint"
   - Conecta el repositorio `bian-gtc`
   - Render detectará automáticamente el archivo `render.yaml`

2. **Configurar Variables de Entorno**:
   En el dashboard de Render, configura estas variables para ambos servicios:

   **Backend Service (bian-api-backend)**:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bian-api-generator
   GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=tu-google-client-secret
   OPENAI_API_KEY=sk-...
   JWT_SECRET=tu-jwt-secret-super-seguro-de-al-menos-32-caracteres
   NODE_ENV=production
   PORT=10000
   ```

   **Frontend Service (bian-api-frontend)**:
   ```
   VITE_API_URL=https://bian-api-backend.onrender.com
   VITE_GOOGLE_CLIENT_ID=tu-google-client-id.apps.googleusercontent.com
   ```

3. **Desplegar**: Render iniciará el build automáticamente

### Opción 2: Configuración Manual

Si prefieres configurar manualmente cada servicio:

#### Backend Service

1. **Crear Web Service**:
   - New → Web Service
   - Connect GitHub → Seleccionar repositorio `bian-gtc`
   
2. **Configuración del Servicio**:
   ```
   Name: bian-api-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: backend
   Runtime: Node
   Build Command: npm install
   Start Command: npm start
   ```

3. **Variables de Entorno**: (Ver lista arriba)

4. **Plan**: Free tier para desarrollo, Starter ($7/mes) para producción

#### Frontend Service

1. **Crear Static Site**:
   - New → Static Site
   - Connect GitHub → Seleccionar repositorio `bian-gtc`

2. **Configuración del Servicio**:
   ```
   Name: bian-api-frontend
   Branch: main
   Root Directory: frontend
   Build Command: npm install && npm run build
   Publish Directory: frontend/dist
   ```

3. **Variables de Entorno**: (Ver lista arriba)

4. **Plan**: Free tier disponible para static sites

### Configuración de Google OAuth2

1. **Google Cloud Console**:
   - Ve a [console.cloud.google.com](https://console.cloud.google.com)
   - Crea un nuevo proyecto o selecciona uno existente
   - Habilita "Google+ API"

2. **Crear Credenciales OAuth2**:
   - Credenciales → Crear credenciales → ID de cliente OAuth 2.0
   - Tipo de aplicación: Aplicación web
   
3. **URLs Autorizadas**:
   ```
   JavaScript origins:
   - https://bian-api-frontend.onrender.com
   - http://localhost:3000 (para desarrollo)

   Redirect URIs:
   - https://bian-api-backend.onrender.com/api/auth/google/callback
   - http://localhost:10000/api/auth/google/callback (para desarrollo)
   ```

### MongoDB Atlas Setup

1. **Crear Cluster**:
   - Ve a [mongodb.com/atlas](https://mongodb.com/atlas)
   - Crea un cluster gratuito (M0 Sandbox)

2. **Configurar Acceso**:
   - Database Access → Add New Database User
   - Network Access → Add IP Address → Allow access from anywhere (0.0.0.0/0)

3. **Obtener Connection String**:
   - Connect → Connect your application
   - Copy connection string y reemplaza `<password>` con tu contraseña

### OpenAI API Key

1. **Obtener API Key**:
   - Ve a [platform.openai.com](https://platform.openai.com)
   - API Keys → Create new secret key
   - Copia la key (comienza con `sk-`)

## 🛠️ Desarrollo Local

### Prerrequisitos

- Node.js 18+
- MongoDB Atlas account
- Google Cloud Console project
- OpenAI API account

### Backend Setup

```bash
cd backend
npm install
```

Crear archivo `.env`:
```
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
OPENAI_API_KEY=sk-...
JWT_SECRET=tu-secret-local
NODE_ENV=development
PORT=10000
```

Ejecutar:
```bash
npm run dev  # Con nodemon para hot reload
npm start    # Producción
```

### Frontend Setup

```bash
cd frontend
npm install
```

**Para desarrollo local**, crear archivo `.env.local`:
```
VITE_API_URL=http://localhost:10000
```

> **Nota**: En producción (Render.com), el frontend usa automáticamente `https://bian-api-backend.onrender.com` sin necesidad de configurar variables de entorno.

Ejecutar:
```bash
npm run dev    # Desarrollo con hot reload
npm run build  # Build para producción
```

## 📚 Documentación

### API Documentation
Una vez desplegado, la documentación Swagger estará disponible en:
- **Producción**: `https://bian-api-backend.onrender.com/api/docs`
- **Desarrollo**: `http://localhost:10000/api/docs`

### Guía de Usuario
Ver [docs/user-guide.md](./docs/user-guide.md) para instrucciones detalladas de uso.

## 🔧 Scripts Disponibles

### Backend
```bash
npm start       # Iniciar servidor de producción
npm run dev     # Desarrollo con nodemon
npm test        # Ejecutar tests
```

### Frontend
```bash
npm run dev     # Servidor de desarrollo
npm run build   # Build para producción
npm run preview # Preview del build
npm run lint    # Linter ESLint
```

## 🌐 URLs de la Aplicación

### Producción
- **Frontend**: `https://bian-api-frontend.onrender.com`
- **Backend API**: `https://bian-api-backend.onrender.com`
- **API Docs**: `https://bian-api-backend.onrender.com/api/docs`
- **Health Check**: `https://bian-api-backend.onrender.com/api/health`

### Desarrollo
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:10000`
- **API Docs**: `http://localhost:10000/api/docs`

## 🔍 Monitoreo y Logs

### Render.com Dashboard
- Ve al dashboard de Render para monitorear:
  - Deploy status y logs
  - Performance metrics
  - Error tracking
  - Resource usage

### Health Checks
- **Backend**: `GET /api/health`
- **Response**: Status, timestamp, version, environment

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error de CORS**:
   - Verificar que las URLs en `CORS_ORIGIN` sean correctas
   - Comprobar variables de entorno del frontend

2. **OAuth2 Error**:
   - Verificar redirect URIs en Google Console
   - Confirmar client ID/secret

3. **MongoDB Connection**:
   - Verificar connection string
   - Comprobar whitelist de IPs en Atlas

4. **Build Failures**:
   - Revisar logs en Render dashboard
   - Verificar versiones de Node.js
   - Comprobar variables de entorno

### Comandos de Debug

```bash
# Ver logs del backend
curl https://bian-api-backend.onrender.com/api/health

# Verificar variables de entorno
echo $MONGODB_URI

# Test de conexión local
npm run dev
```

## 🤝 Contribución

1. Fork el repositorio
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🆘 Soporte

Para soporte técnico:
- 📧 Email: [tu-email@ejemplo.com]
- 📱 Issues: [GitHub Issues](https://github.com/cabobadilla/bian-gtc/issues)
- 📖 Docs: [User Guide](./docs/user-guide.md) 
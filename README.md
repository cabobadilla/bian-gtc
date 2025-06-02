# Generador de APIs BIAN Personalizadas

Una aplicación web moderna para crear APIs personalizadas basadas en estándares BIAN (Banking Industry Architecture Network).

## 🏗️ Arquitectura

### Frontend
- **Framework**: React 18 con Vite
- **Autenticación**: OAuth2 con Google
- **UI**: Material-UI + styled-components
- **Despliegue**: Render.com (Static Site)

### Backend
- **Framework**: Node.js + Express.js
- **Base de Datos**: MongoDB Atlas
- **IA**: OpenAI ChatGPT para enriquecimiento semántico
- **Documentación**: Swagger/OpenAPI
- **Despliegue**: Render.com (Web Service)

## 🚀 Funcionalidades

- **Multi-empresa**: Soporte para múltiples empresas y usuarios
- **Login con Google**: Autenticación OAuth2 segura
- **Dashboard personalizado**: Gestión de APIs por usuario
- **Editor de APIs**: Personalización de definiciones OpenAPI
- **IA integrada**: Enriquecimiento automático con ChatGPT
- **Swagger UI**: Documentación y testing interactivo
- **Versionado**: Control de versiones de APIs

## 📁 Estructura del Proyecto

```
bian-gtc/
├── frontend/          # Aplicación React
│   ├── src/
│   ├── public/
│   └── package.json
├── backend/           # API Node.js
│   ├── src/
│   ├── models/
│   └── package.json
├── docs/             # Documentación
└── render.yaml       # Configuración de Render.com
```

## 🛠️ Desarrollo

### Variables de Entorno Requeridas

**Backend:**
```
MONGODB_URI=mongodb+srv://...
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-api-key
JWT_SECRET=your-jwt-secret
NODE_ENV=production
```

**Frontend:**
```
VITE_API_URL=https://your-backend-url.onrender.com
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## 🚀 Despliegue en Render.com

La aplicación está configurada para despliegue automático en Render.com usando el archivo `render.yaml`.

1. Conecta tu repositorio de GitHub a Render.com
2. Configura las variables de entorno
3. El despliegue será automático en cada push

## 📖 Documentación de Usuario

Ver [Guía de Usuario](./docs/user-guide.md) para instrucciones detalladas de uso.

## 🔧 Tecnologías Utilizadas

- React 18 + Vite
- Node.js + Express
- MongoDB Atlas
- OpenAI API
- Google OAuth2
- Swagger UI
- Material-UI 
# 🍺 Setup con Homebrew para macOS

## ¿Por qué Homebrew?

Homebrew es el gestor de paquetes más confiable para macOS y garantiza:
- ✅ Instalaciones consistentes y actualizadas
- ✅ Gestión automática de dependencias
- ✅ Fácil actualización y mantenimiento
- ✅ Compatibilidad con Mac Intel y Apple Silicon (M1/M2)

---

## Software que se Instala Automáticamente

### 🔧 Dependencias Principales
- **Homebrew** - Si no está instalado
- **Node.js** - Versión LTS más reciente
- **Git** - Para control de versiones
- **Railway CLI** - Para despliegue en Railway

### 🗄️ Base de Datos (Opcional)
- **MongoDB Community Edition** - Para desarrollo local
  - Se pregunta si quieres instalarlo (opcional)
  - Se configura como servicio automático
  - Atlas sigue siendo la opción recomendada

### 🛠️ Herramientas Útiles
- **jq** - Procesador JSON para debugging
- **curl** - Cliente HTTP (usualmente ya presente)

---

## Configuración Automática

### 📁 Archivos Creados
- `backend/.env` - Con JWT secret generado automáticamente
- `frontend/.env.local` - Configurado para desarrollo local
- `.gitignore` - Actualizado con protecciones de seguridad

### 🔐 Seguridad Automática
- JWT secret de 64 caracteres generado con `openssl`
- Archivos `.env` excluidos del repositorio
- Variables de entorno configuradas para desarrollo local

---

## Compatibilidad

### ✅ Mac Intel (x86_64)
- Homebrew se instala en `/usr/local/`
- Todas las dependencias funcionan perfectamente

### ✅ Apple Silicon (M1/M2)
- Homebrew se instala en `/opt/homebrew/`
- PATH configurado automáticamente
- Compatibilidad nativa ARM64

---

## Uso Rápido

```bash
# Setup completo en un comando
./setup-local.sh

# Todo se instala y configura automáticamente
# Solo necesitas configurar 3-4 credenciales después
```

---

## Credenciales Que Debes Configurar Manualmente

Después del setup automático, solo necesitas configurar:

### 1. Google OAuth (Gratis)
```bash
# En backend/.env:
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-tu-client-secret

# En frontend/.env.local:
VITE_GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
```

### 2. OpenAI API (Pago)
```bash
# En backend/.env:
OPENAI_API_KEY=sk-tu-api-key
```

### 3. MongoDB Atlas (Gratis) - Solo si no instalaste MongoDB local
```bash
# En backend/.env:
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bian-api-generator
```

---

## Ventajas del Setup Automatizado

### 🚀 Velocidad
- Setup completo en 2-3 minutos
- No necesitas instalar nada manualmente
- JWT secret generado automáticamente

### 🔒 Seguridad
- Configuración de seguridad automática
- Archivos sensibles protegidos
- Variables de entorno separadas correctamente

### 🛠️ Consistencia
- Mismo entorno para todos los desarrolladores
- Versiones compatibles garantizadas
- Configuración estandarizada

---

**🎯 Resultado: Un entorno de desarrollo completo y seguro en minutos** 
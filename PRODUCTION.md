# 🚀 BIAN API Generator - Producción

> Configuración optimizada para despliegue en Render.com

## ⚡ Despliegue Rápido

### 1. Fork & Deploy
```bash
# 1. Fork este repositorio en GitHub
# 2. Conectar a Render.com → New Blueprint
# 3. Seleccionar repositorio → Auto-deploy con render.yaml
```

### 2. Variables de Entorno en Render.com
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/bian-api
GOOGLE_CLIENT_ID=123456-abc.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123...
OPENAI_API_KEY=sk-abc123...
JWT_SECRET=tu-clave-super-segura-64-caracteres-minimo
```

### 3. URLs Resultantes
- **App**: `https://bian-gtc.onrender.com`
- **API**: `https://bian-gtc.onrender.com/api`
- **Docs**: `https://bian-gtc.onrender.com/api/docs`
- **Health**: `https://bian-gtc.onrender.com/api/health`

## 🏗️ Arquitectura Unificada

```
bian-gtc.onrender.com
├── Frontend (React SPA)
├── Backend (Express API)
├── Static Files Serving
└── Health Monitoring
```

## ✅ Checklist de Verificación

### Pre-Deploy
- [ ] Variables configuradas en Render.com
- [ ] Google OAuth URLs correctas
- [ ] MongoDB Atlas accesible
- [ ] OpenAI API key válida

### Post-Deploy
- [ ] Health check OK: `/api/health`
- [ ] Frontend carga
- [ ] Login Google funciona
- [ ] APIs BIAN responden

## 🔧 Optimizaciones Incluidas

### Frontend
- **Chunking optimizado**: Vendor, MUI, Router separados
- **Sourcemaps deshabilitados**: Para producción
- **Auto-detección de API URL**: Sin configuración manual
- **Minificación terser**: Archivos más pequeños

### Backend
- **Archivos estáticos**: Frontend servido desde backend
- **Health checks**: Monitoreo automático
- **Logging detallado**: Para debugging
- **Timeouts optimizados**: AI (12s), Search (60s)

### Render.com
- **Build optimizado**: Verificaciones automáticas
- **Error handling**: Fallos detectados automáticamente
- **Single service**: Un solo punto de entrada
- **Auto-scaling**: Según demanda

## 🐛 Troubleshooting Rápido

```bash
# Verificar status
curl https://bian-gtc.onrender.com/api/health

# Ver logs
# Render.com Dashboard → bian-gtc → Logs

# Re-deploy manual
git commit --allow-empty -m "Re-deploy" && git push
```

## 📊 Métricas

### Performance Targets
- **Build time**: < 5 minutos
- **Response time**: < 200ms (API)
- **Uptime**: > 99.5%
- **Memory usage**: < 512MB

### Monitoring
- Health checks cada 30s
- Error rates tracking
- Response time metrics
- Resource usage alerts

---

> 💡 **Tip**: Este setup está optimizado para el plan gratuito de Render.com con auto-scaling según demanda. 
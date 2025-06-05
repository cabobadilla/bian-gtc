#!/bin/bash

# 🚀 Script de Despliegue Railway para BIAN API Generator
# Guía paso a paso para desplegar de forma segura

set -e  # Exit on any error

echo "🚀 Guía de Despliegue en Railway"
echo "🔒 Manteniendo credenciales seguras en todo momento"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️  $1${NC}"
}

# Check if railway CLI is installed
print_step "Verificando Railway CLI..."
if ! command -v railway &> /dev/null; then
    print_warning "Railway CLI no encontrado. Instalando..."
    
    # Try Homebrew first (preferred for macOS)
    if command -v brew &> /dev/null; then
        print_step "Instalando Railway CLI via Homebrew..."
        brew install railway
        print_success "Railway CLI instalado via Homebrew"
    elif command -v npm &> /dev/null; then
        print_step "Instalando Railway CLI via npm..."
        npm install -g @railway/cli
        print_success "Railway CLI instalado via npm"
    else
        print_error "No se encontró brew ni npm. Instala Node.js o Homebrew primero"
        exit 1
    fi
else
    print_success "Railway CLI encontrado"
fi

# Login to Railway
print_step "Verificando autenticación en Railway..."
if ! railway whoami &> /dev/null; then
    print_warning "No autenticado en Railway. Iniciando sesión..."
    railway login
    print_success "Autenticado en Railway"
else
    current_user=$(railway whoami)
    print_success "Autenticado como: $current_user"
fi

echo ""
print_step "🔐 CONFIGURACIÓN DE CREDENCIALES"
print_warning "IMPORTANTE: Las credenciales se configuran en Railway Dashboard, NO en código"
echo ""

print_info "Variables que necesitarás configurar en Railway Dashboard:"
echo "📊 Backend Service:"
echo "  • MONGODB_URI=mongodb+srv://[usuario]:[password]@[cluster].mongodb.net/bian-api-generator"
echo "  • GOOGLE_CLIENT_ID=[tu-client-id].apps.googleusercontent.com"
echo "  • GOOGLE_CLIENT_SECRET=GOCSPX-[tu-client-secret]"
echo "  • OPENAI_API_KEY=sk-[tu-api-key]"
echo "  • JWT_SECRET=[clave-super-segura-64-chars]"
echo "  • NODE_ENV=production"
echo "  • DEBUG=OFF"
echo "  • PORT=10000"
echo ""
echo "🌐 Frontend Service:"
echo "  • VITE_API_URL=https://[tu-backend-url].up.railway.app"
echo "  • VITE_GOOGLE_CLIENT_ID=[mismo-que-backend]"
echo ""

# Generate JWT Secret helper
print_step "🔑 Generador de JWT Secret seguro:"
jwt_secret=$(openssl rand -base64 64 | tr -d '\n')
echo "JWT_SECRET generado: $jwt_secret"
echo "(Copia este valor para usar en Railway Dashboard)"
echo ""

print_step "📋 Lista de verificación pre-despliegue:"
echo "✅ MongoDB Atlas configurado con usuario y whitelist"
echo "✅ Google OAuth configurado con URLs de Railway"
echo "✅ OpenAI API Key con límites configurados"
echo "✅ JWT Secret generado (arriba)"
echo ""

read -p "¿Continuar con el despliegue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Despliegue cancelado. Prepara las credenciales y ejecuta nuevamente."
    exit 0
fi

# Create or connect to Railway project
print_step "Configurando proyecto Railway..."
if [ ! -f ".railway/project.json" ]; then
    print_warning "No hay proyecto Railway configurado"
    read -p "¿Crear nuevo proyecto? (y) o conectar existente (n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        railway init
        print_success "Nuevo proyecto Railway creado"
    else
        railway link
        print_success "Conectado a proyecto Railway existente"
    fi
else
    print_success "Proyecto Railway ya configurado"
fi

# Check git status
print_step "Verificando estado del repositorio..."
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Hay cambios sin commit. Committeando cambios..."
    git add .
    git status
    read -p "¿Confirmar commit de estos cambios? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git commit -m "feat: Railway deployment configuration"
        print_success "Cambios committeados"
    else
        print_error "Commit requerido para despliegue"
        exit 1
    fi
fi

# Deploy
print_step "🚀 Iniciando despliegue en Railway..."
print_warning "Recuerda configurar las variables de entorno en Railway Dashboard antes del primer despliegue"

railway up

print_success "¡Despliegue iniciado!"
echo ""
print_step "📋 Próximos pasos:"
echo "1. 🌐 Ve al Railway Dashboard: https://railway.app/dashboard"
echo "2. 🔧 Configura variables de entorno en cada servicio"
echo "3. 🔗 Actualiza URLs de Google OAuth con las nuevas URLs de Railway"
echo "4. 🧪 Prueba la aplicación desplegada"
echo ""
print_warning "IMPORTANTE: Configura las variables de entorno ANTES de que la app arranque"
print_info "URLs del proyecto aparecerán en Railway Dashboard una vez completado el build"
echo ""
print_success "¡Despliegue en Railway completado! 🎉" 
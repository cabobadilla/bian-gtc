#!/bin/bash

# 🚀 Script de Setup Local para BIAN API Generator
# Mantiene todas las credenciales seguras y fuera del repositorio
# Instala software usando Homebrew en macOS

set -e  # Exit on any error

echo "🚀 Iniciando setup local de BIAN API Generator..."
echo "🔒 Manteniendo credenciales seguras en todo momento"
echo "🍺 Usando Homebrew para instalaciones en macOS"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if running in correct directory
if [ ! -f "package.json" ] && [ ! -d "backend" ] && [ ! -d "frontend" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto bian-gtc"
    exit 1
fi

print_step "Verificando e instalando dependencias del sistema con Homebrew..."

# Check for Homebrew
if ! command -v brew &> /dev/null; then
    print_warning "Homebrew no encontrado. Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add Homebrew to PATH for M1/M2 Macs
    if [[ $(uname -m) == "arm64" ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    else
        echo 'eval "$(/usr/local/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/usr/local/bin/brew shellenv)"
    fi
    
    print_success "Homebrew instalado correctamente"
else
    print_success "Homebrew encontrado"
    # Update Homebrew
    print_step "Actualizando Homebrew..."
    brew update
fi

# Install Node.js via Homebrew
if ! command -v node &> /dev/null; then
    print_step "Instalando Node.js via Homebrew..."
    brew install node
    print_success "Node.js instalado via Homebrew"
else
    # Check Node version
    node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        print_warning "Node.js versión $(node -v) es muy antigua. Actualizando a versión LTS..."
        brew upgrade node
        print_success "Node.js actualizado"
    else
        print_success "Node.js $(node -v) ya instalado y actualizado"
    fi
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    print_error "npm no encontrado después de instalar Node.js"
    exit 1
fi

print_success "npm $(npm -v) disponible"

# Install Git if not present
if ! command -v git &> /dev/null; then
    print_step "Instalando Git via Homebrew..."
    brew install git
    print_success "Git instalado via Homebrew"
else
    print_success "Git $(git --version | cut -d' ' -f3) ya instalado"
fi

# Install MongoDB (optional for local development)
print_step "Verificando MongoDB para desarrollo local..."
if ! command -v mongod &> /dev/null; then
    read -p "¿Instalar MongoDB localmente? (recomendado usar Atlas) (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Instalando MongoDB Community Edition via Homebrew..."
        brew tap mongodb/brew
        brew install mongodb-community
        print_success "MongoDB Community Edition instalado"
        
        print_step "Configurando MongoDB como servicio..."
        brew services start mongodb-community
        print_success "MongoDB iniciado como servicio"
        
        print_warning "MongoDB local disponible en: mongodb://localhost:27017"
    else
        print_info "MongoDB local no instalado. Usarás MongoDB Atlas (recomendado)"
    fi
else
    print_success "MongoDB ya está instalado"
    # Start MongoDB service if not running
    if ! brew services list | grep mongodb-community | grep started &> /dev/null; then
        print_step "Iniciando servicio MongoDB..."
        brew services start mongodb-community
        print_success "MongoDB iniciado"
    fi
fi

# Install Railway CLI
print_step "Verificando Railway CLI para despliegue..."
if ! command -v railway &> /dev/null; then
    print_step "Instalando Railway CLI via npm..."
    npm install -g @railway/cli
    print_success "Railway CLI instalado"
else
    print_success "Railway CLI ya instalado"
fi

# Install other useful tools
print_step "Instalando herramientas adicionales útiles..."

# Install jq for JSON processing
if ! command -v jq &> /dev/null; then
    print_step "Instalando jq (procesador JSON)..."
    brew install jq
    print_success "jq instalado"
else
    print_success "jq ya instalado"
fi

# Install curl if not present (usually pre-installed on macOS)
if ! command -v curl &> /dev/null; then
    print_step "Instalando curl..."
    brew install curl
    print_success "curl instalado"
else
    print_success "curl ya disponible"
fi

print_success "Todas las dependencias del sistema instaladas correctamente!"
echo ""

# Install backend dependencies
print_step "Instalando dependencias del backend..."
cd backend
npm install
print_success "Dependencias del backend instaladas"

# Setup backend environment
if [ ! -f ".env" ]; then
    print_step "Configurando archivo de entorno del backend..."
    cp ../env.example .env
    
    # Generate a secure JWT secret
    jwt_secret=$(openssl rand -base64 64 | tr -d '\n')
    
    # Update .env with generated JWT secret and local MongoDB if installed
    if command -v mongod &> /dev/null; then
        sed -i '' "s|MONGODB_URI=.*|MONGODB_URI=mongodb://localhost:27017/bian-api-generator|g" .env
        print_info "Configurado para usar MongoDB local"
    fi
    
    # Set generated JWT secret
    sed -i '' "s|JWT_SECRET=.*|JWT_SECRET=$jwt_secret|g" .env
    
    # Set development environment
    sed -i '' "s|NODE_ENV=.*|NODE_ENV=development|g" .env
    sed -i '' "s|PORT=.*|PORT=10000|g" .env
    
    print_success "Archivo backend/.env creado con configuración inicial"
    print_warning "Variables que aún necesitas configurar manualmente:"
    echo "  • GOOGLE_CLIENT_ID (obtener de Google Cloud Console)"
    echo "  • GOOGLE_CLIENT_SECRET (obtener de Google Cloud Console)"
    echo "  • OPENAI_API_KEY (obtener de OpenAI Platform)"
    if ! command -v mongod &> /dev/null; then
        echo "  • MONGODB_URI (usar MongoDB Atlas)"
    fi
    echo ""
else
    print_success "Archivo backend/.env ya existe"
fi

cd ..

# Install frontend dependencies
print_step "Instalando dependencias del frontend..."
cd frontend
npm install
print_success "Dependencias del frontend instaladas"

# Setup frontend environment
if [ ! -f ".env.local" ]; then
    print_step "Configurando archivo de entorno del frontend..."
    
    # Create frontend env with local backend URL
    cat > .env.local << EOF
# Frontend Environment Variables (NUNCA SUBIR A GITHUB)
# Backend API URL (local development)
VITE_API_URL=http://localhost:10000

# Google OAuth Client ID (obtener de Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=[TU_CLIENT_ID].apps.googleusercontent.com
EOF
    
    print_success "Archivo frontend/.env.local configurado para desarrollo local"
    print_warning "Necesitas configurar VITE_GOOGLE_CLIENT_ID con tu Client ID real"
else
    print_success "Archivo frontend/.env.local ya existe"
fi

cd ..

# Generate JWT Secret if needed
print_step "Verificando configuración de seguridad..."

# Check .gitignore
if grep -q "\.env" .gitignore; then
    print_success "Archivos .env protegidos en .gitignore"
else
    print_warning "Agregando protección de archivos .env a .gitignore"
    cat >> .gitignore << EOF

# Environment files (NEVER commit)
.env
.env.local
.env.production
.env.development
*.env

# Railway
.railway/

# MongoDB data (if using local)
data/
EOF
    print_success "Protecciones de seguridad agregadas a .gitignore"
fi

print_success "Setup local completado con Homebrew!"
echo ""
print_step "🔧 Software instalado via Homebrew:"
echo "  ✅ Node.js $(node -v)"
echo "  ✅ npm $(npm -v)"
echo "  ✅ Git $(git --version | cut -d' ' -f3)"
if command -v mongod &> /dev/null; then
    echo "  ✅ MongoDB Community Edition"
fi
echo "  ✅ Railway CLI"
echo "  ✅ jq (JSON processor)"
echo "  ✅ curl"
echo ""

print_step "📁 Archivos de configuración creados:"
echo "  ✅ backend/.env (con JWT secret generado)"
echo "  ✅ frontend/.env.local"
echo "  ✅ .gitignore actualizado"
echo ""

print_step "🔑 Próximos pasos para configurar credenciales:"
echo "1. 🌐 Google Cloud Console (https://console.cloud.google.com):"
echo "   - Crear proyecto OAuth"
echo "   - Obtener Client ID y Client Secret"
echo "   - Configurar en backend/.env y frontend/.env.local"
echo ""
echo "2. 🤖 OpenAI Platform (https://platform.openai.com/api-keys):"
echo "   - Crear API Key"
echo "   - Configurar en backend/.env"
echo ""
if ! command -v mongod &> /dev/null; then
    echo "3. 🗄️  MongoDB Atlas (https://cloud.mongodb.com):"
    echo "   - Crear cluster gratuito"
    echo "   - Obtener connection string"
    echo "   - Configurar en backend/.env"
    echo ""
fi

print_warning "RECUERDA: Nunca subas archivos .env al repositorio"
echo ""
print_step "🚀 Comandos para iniciar desarrollo:"
echo "Terminal 1: cd backend && npm run dev"
echo "Terminal 2: cd frontend && npm run dev"
echo ""
print_success "¡Listo para desarrollo local seguro con Homebrew! 🍺🔒" 
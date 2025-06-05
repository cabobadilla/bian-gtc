#!/bin/bash

echo "🔄 Reiniciando servidores de desarrollo..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes con colores
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detener procesos existentes
print_status "Deteniendo procesos existentes..."

# Matar procesos de npm y node relacionados con el proyecto
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null
pkill -f "vite.*frontend" 2>/dev/null

# Esperar un momento para que los procesos terminen
sleep 2

print_success "Procesos detenidos"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Crear logs directory si no existe
mkdir -p logs

# Función para iniciar el backend
start_backend() {
    print_status "Iniciando backend..."
    cd backend
    
    if [ ! -f "package.json" ]; then
        print_error "No se encontró package.json en el directorio backend"
        return 1
    fi
    
    # Iniciar backend en background y guardar PID
    npm run dev > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > ../logs/backend.pid
    
    print_success "Backend iniciado (PID: $BACKEND_PID)"
    print_status "Log del backend: logs/backend.log"
    
    cd ..
}

# Función para iniciar el frontend
start_frontend() {
    print_status "Esperando 3 segundos para que el backend se inicie..."
    sleep 3
    
    print_status "Iniciando frontend..."
    cd frontend
    
    if [ ! -f "package.json" ]; then
        print_error "No se encontró package.json en el directorio frontend"
        return 1
    fi
    
    # Iniciar frontend en background y guardar PID
    npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../logs/frontend.pid
    
    print_success "Frontend iniciado (PID: $FRONTEND_PID)"
    print_status "Log del frontend: logs/frontend.log"
    
    cd ..
}

# Función para mostrar el estado
show_status() {
    echo ""
    print_status "Estado de los servidores:"
    
    if [ -f "logs/backend.pid" ]; then
        BACKEND_PID=$(cat logs/backend.pid)
        if ps -p $BACKEND_PID > /dev/null 2>&1; then
            print_success "✅ Backend corriendo (PID: $BACKEND_PID) - http://localhost:10000"
        else
            print_error "❌ Backend no está corriendo"
        fi
    fi
    
    if [ -f "logs/frontend.pid" ]; then
        FRONTEND_PID=$(cat logs/frontend.pid)
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_success "✅ Frontend corriendo (PID: $FRONTEND_PID) - http://localhost:5173"
        else
            print_error "❌ Frontend no está corriendo"
        fi
    fi
    
    echo ""
    print_status "Para ver los logs en tiempo real:"
    echo "  Backend:  tail -f logs/backend.log"
    echo "  Frontend: tail -f logs/frontend.log"
    
    echo ""
    print_status "Para detener los servidores:"
    echo "  ./stop-dev.sh"
}

# Ejecutar las funciones
start_backend
if [ $? -eq 0 ]; then
    start_frontend
    if [ $? -eq 0 ]; then
        show_status
        print_success "🚀 Servidores iniciados correctamente!"
    else
        print_error "Error iniciando el frontend"
        exit 1
    fi
else
    print_error "Error iniciando el backend"
    exit 1
fi 
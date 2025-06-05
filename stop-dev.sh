#!/bin/bash

echo "🛑 Deteniendo servidores de desarrollo..."

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

# Función para detener un proceso por PID
stop_process() {
    local pid_file=$1
    local process_name=$2
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Deteniendo $process_name (PID: $pid)..."
            kill $pid
            sleep 2
            
            # Verificar si el proceso sigue corriendo
            if ps -p $pid > /dev/null 2>&1; then
                print_warning "$process_name no respondió a SIGTERM, usando SIGKILL..."
                kill -9 $pid
                sleep 1
            fi
            
            # Verificar una vez más
            if ps -p $pid > /dev/null 2>&1; then
                print_error "No se pudo detener $process_name"
                return 1
            else
                print_success "$process_name detenido correctamente"
                rm -f "$pid_file"
                return 0
            fi
        else
            print_warning "$process_name no estaba corriendo"
            rm -f "$pid_file"
            return 0
        fi
    else
        print_warning "No se encontró archivo PID para $process_name"
        return 0
    fi
}

# Detener backend
stop_process "logs/backend.pid" "Backend"

# Detener frontend
stop_process "logs/frontend.pid" "Frontend"

# Matar cualquier proceso remanente relacionado con el proyecto
print_status "Limpiando procesos remanentes..."
pkill -f "npm run dev" 2>/dev/null
pkill -f "npm start" 2>/dev/null
pkill -f "node.*backend" 2>/dev/null
pkill -f "vite.*frontend" 2>/dev/null

print_success "✅ Todos los servidores han sido detenidos"

# Limpiar archivos de log si se desea
read -p "¿Deseas limpiar los archivos de log? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rm -f logs/*.log
    print_success "Archivos de log limpiados"
fi 
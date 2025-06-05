#!/bin/bash

# 🔒 Script de Verificación de Seguridad
# Asegura que no se suban archivos sensibles al repositorio

set -e

echo "🔒 Verificando seguridad antes del commit..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_check() {
    echo -e "${BLUE}🔍 $1${NC}"
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

# Check for sensitive files in staging area
print_check "Verificando archivos en staging area..."

sensitive_staged=$(git diff --cached --name-only | grep -E "\.(env|key|pem|crt|secret|credentials)" || true)
if [ -n "$sensitive_staged" ]; then
    print_error "Archivos sensibles encontrados en staging:"
    echo "$sensitive_staged"
    echo ""
    print_error "ACCIÓN REQUERIDA: Remover estos archivos del staging:"
    echo "git reset HEAD <archivo>"
    exit 1
else
    print_success "No hay archivos sensibles en staging area"
fi

# Check for .env files
print_check "Verificando archivos .env..."

env_files_found=$(find . -name "*.env*" -not -path "./node_modules/*" -not -path "./.git/*" || true)
if [ -n "$env_files_found" ]; then
    print_warning "Archivos .env encontrados (deben estar en .gitignore):"
    echo "$env_files_found"
    
    # Check if they're being tracked
    tracked_env=$(echo "$env_files_found" | xargs git ls-files -- 2>/dev/null || true)
    if [ -n "$tracked_env" ]; then
        print_error "PELIGRO: Archivos .env están siendo trackeados por git:"
        echo "$tracked_env"
        echo ""
        print_error "ACCIÓN REQUERIDA: Remover del tracking:"
        echo "git rm --cached <archivo>"
        exit 1
    else
        print_success "Archivos .env están correctamente ignorados"
    fi
else
    print_success "No se encontraron archivos .env"
fi

# Check for hardcoded secrets in code
print_check "Verificando secretos hardcodeados en código..."

# Patterns to search for
secret_patterns=(
    "sk-[a-zA-Z0-9]{48}"                    # OpenAI API keys
    "GOCSPX-[a-zA-Z0-9_-]{28}"            # Google OAuth client secrets
    "['\"][a-zA-Z0-9+/]{64,}['\"]"        # Base64 encoded secrets (JWT secrets)
    "AIza[0-9A-Za-z_-]{35}"               # Google API keys
    "client_secret['\"]?\s*[:=]\s*['\"][^'\"]+['\"]" # OAuth client secrets
)

found_secrets=false
for pattern in "${secret_patterns[@]}"; do
    # Skip documentation files and example files
    matches=$(git diff --cached -- ':!*.md' ':!*example*' ':!*template*' | grep -E "$pattern" || true)
    if [ -n "$matches" ]; then
        if [ "$found_secrets" = false ]; then
            print_error "Secretos hardcodeados encontrados en el código:"
            found_secrets=true
        fi
        echo "Patrón: $pattern"
        echo "$matches"
        echo ""
    fi
done

# Special check for MongoDB URIs with real credentials (not examples)
mongodb_matches=$(git diff --cached -- ':!*.md' ':!*example*' | grep -E "mongodb\+srv://[^'\"\[]+:[^'\"\[]+@" || true)
if [ -n "$mongodb_matches" ]; then
    # Check if it contains placeholder text
    if ! echo "$mongodb_matches" | grep -qE "\[(TU_|YOUR_|USUARIO|PASSWORD|CLUSTER)\]"; then
        if [ "$found_secrets" = false ]; then
            print_error "Secretos hardcodeados encontrados en el código:"
            found_secrets=true
        fi
        echo "MongoDB URI con credenciales reales encontrada:"
        echo "$mongodb_matches"
        echo ""
    fi
fi

if [ "$found_secrets" = true ]; then
    print_error "ACCIÓN REQUERIDA: Remover secretos hardcodeados del código"
    print_error "Usar variables de entorno en su lugar"
    exit 1
else
    print_success "No se encontraron secretos hardcodeados"
fi

# Check for sensitive file patterns in content
print_check "Verificando patrones sensibles en archivos nuevos..."

sensitive_content=$(git diff --cached | grep -iE "(password|secret|key|token|credential)" | grep -v "# " || true)
if [ -n "$sensitive_content" ]; then
    print_warning "Contenido potencialmente sensible encontrado:"
    echo "$sensitive_content"
    echo ""
    print_warning "Revisar manualmente que no contiene credenciales reales"
else
    print_success "No se encontró contenido potencialmente sensible"
fi

# Check for large files
print_check "Verificando archivos grandes..."

large_files=$(git diff --cached --name-only | xargs -I {} sh -c 'if [ -f "{}" ]; then echo "$(wc -c < "{}"):{}" ; fi' | awk -F: '$1 > 1048576 {print $2}' || true)
if [ -n "$large_files" ]; then
    print_warning "Archivos grandes encontrados (>1MB):"
    echo "$large_files"
    echo ""
    print_warning "Considerar si estos archivos deben estar en el repositorio"
else
    print_success "No hay archivos excesivamente grandes"
fi

# Check .gitignore is up to date
print_check "Verificando .gitignore..."

if [ -f ".gitignore" ]; then
    if grep -q "\.env" .gitignore && grep -q "\.railway" .gitignore; then
        print_success ".gitignore contiene protecciones básicas"
    else
        print_warning ".gitignore podría necesitar actualizaciones"
    fi
else
    print_error ".gitignore no encontrado"
    exit 1
fi

# Final summary
echo ""
print_success "🛡️  Verificación de seguridad completada"
echo ""
print_check "Resumen de verificaciones:"
echo "  ✅ No hay archivos sensibles en staging"
echo "  ✅ Archivos .env están ignorados"
echo "  ✅ No hay secretos hardcodeados"
echo "  ✅ .gitignore está configurado"
echo ""
print_success "✨ Seguro para hacer commit!"
echo ""
print_warning "Recordatorio: Nunca subas credenciales reales al repositorio"
print_warning "Usa siempre variables de entorno o dashboards de servicios" 
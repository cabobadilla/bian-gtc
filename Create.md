# Generador de APIs BIAN Personalizadas

## 1. Arquitectura Técnica

### Frontend

* **Framework:** React
* **Despliegue:** Aplicación estática en Render.com
* **Funciones clave:**

  * Login con Google
  * Panel de control de APIs del usuario
  * Editor de APIs personalizadas
  * Swagger UI embebido

### Backend

* **Lenguaje:** Node.js con Express.js
* **Despliegue:** Web service en Render.com
* **Funciones:**

  * Gestión de usuarios y empresas
  * Conexión con MongoDB Atlas
  * Integración con ChatGPT para enriquecimiento semántico
  * Generación dinámica de documentación Swagger

### API Documentation

* **Formato:** OpenAPI (Swagger)
* **Librerías:** `swagger-ui-express`, `swagger-jsdoc`

---

## 2. Seguridad

* **Autenticación:** OAuth2 con Google

  * Login y registro con Google
  * Asociación de usuarios con empresas
  * Librería sugerida: `passport-google-oauth20`

---

## 3. Base de Datos

* **Motor:** MongoDB Atlas
* **Esquemas:**

  * `User`: email, nombre, empresaId
  * `Empresa`: nombre, ID, lista de usuarios
  * `APIDefinition`: empresaId, nombreAPI, version, openAPIJson
  * `BIANReferenceAPI`: nombre, descripción, métodos, json, versión

---

## 4. Integración con GenAI

* **Modelo:** ChatGPT 3.5
* **Usos:**

  * Enriquecimiento y traducción de descripciones BIAN
  * Generación de ejemplos prácticos (EN/ES)
  * Explicaciones en lenguaje natural

---

## 5. Objetivo General

* Soportar múltiples empresas y usuarios
* Facilitar la creación de APIs personalizadas a partir de estándares BIAN
* Permitir modificar campos opcionales en las definiciones OpenAPI
* Versionar cada definición creada y desplegar un Swagger correspondiente

---

## 6. Funcionalidades Detalladas

### 6.1 Login

* Registro y login con Google
* Validación y asociación con empresa existente

### 6.2 Dashboard

* Listado de APIs creadas por el usuario
* Botón para crear nueva API
* Acceso a Swagger UI de cada API
* Botón de regreso a dashboard visible siempre

### 6.3 Crear Nueva API

* Buscar API BIAN de referencia por nombre o función
* Ver descripción enriquecida (EN/ES) y métodos disponibles
* Usar ChatGPT para explicar ejemplos de uso

### 6.4 Personalización

* Edición de campos opcionales en definición OpenAPI
* Personalización de descripciones y estructuras
* Guardar como nueva API con versión incremental
* Formato de nombre: `BIAN_API_nombreEmpresa`

### 6.5 Visualización y Prueba

* Cargar definición en Swagger UI
* Permitir pruebas con datos de ejemplo
* Opciones para editar y regresar al dashboard

---

## 7. Documentación para Usuarios

* Guía de uso paso a paso:

  * Cómo registrarse
  * Cómo crear y editar APIs
  * Cómo buscar APIs BIAN y entenderlas
  * Cómo probar una API creada
* Formato Markdown, también accesible en la app

# 📝 Guía de Usuario — NotasApp

## 📌 Propósito

**NotasApp** es una aplicación para gestionar recordatorios y tareas personales.  
Permite crear notas con texto, fecha y prioridad; filtrarlas; completarlas; editarlas y borrarlas.  
Incluye un **Panel Diario** en ventana emergente para consultar solo las notas del día.

---

## 🖥️ Requisitos del sistema

La aplicación necesita:

- Un **navegador moderno** (Chrome, Firefox, Edge…)
- **Ventanas emergentes permitidas**
- **localStorage** habilitado
- **sessionStorage** habilitado
- **Cookies** habilitadas

> Sin estos elementos, funciones como guardar notas, recordar el formulario o cambiar de tema dejarán de funcionar.

---

## 🧭 Tareas principales

### ➕ Añadir una nota

1. Escribe el texto.
2. Selecciona una fecha válida.
3. Elige una prioridad (1 = baja, 2 = media, 3 = alta).
4. Pulsa **Añadir**.

La nota se guarda automáticamente en `localStorage`.

---

### 🔍 Filtrar notas

La barra superior permite seleccionar:

- **Hoy** → notas con fecha del día actual
- **Semana** → notas hasta 7 días después
- **Todas** → todas las notas

El filtro activo se mantiene al recargar la página.

---

### ☑️ Completar / Desmarcar notas

Cada nota incluye un botón:

- **Completar** → marca la nota como realizada
- **Editar** → edita la nota
- **Desmarcar** → vuelve a estado pendiente

---

### ✏️ Editar notas (edición inline)

Al pulsar **Editar**:

- La tarjeta se convierte en un formulario editable.
- Puedes modificar texto, fecha y prioridad.
- Botones disponibles:
  - **Guardar** → aplica cambios
  - **Cancelar** → descarta cambios

---

### 🗑️ Borrar notas

- Pulsa **Borrar**
- Confirma la acción
- La nota desaparece

---

### 📁 Abrir Panel Diario

Botón: **Abrir Panel Diario**  
Abre una ventana emergente mostrando solo las notas filtradas del día.

> ⚠️ Si no se abre → habilita los pop-ups del navegador.

---

## 🎨 Preferencias del usuario

### 🌓 Tema claro / oscuro

Botón **Tema** → alterna entre modo claro y oscuro.  
El valor se guarda en una cookie llamada `tema`.

### 🖥️ Modo pantalla completa

Botón **Pantalla Completa** → activa o desactiva el modo fullscreen.

---

## 💾 Persistencia de datos

### 📍 LocalStorage — almacenamiento permanente

Las notas se guardan en: "notasApp:data".

El contenido permanece incluso si cierras el navegador.

---

### 📌 Snapshots (historial de versiones)

Cada cambio en las notas crea un snapshot:

- Se guardan con clave: notasApp:hist:YYYY-MM-DDTHH:MM:SS.sssZ

- Solo se conservan las **últimas 5** versiones.
- Se pueden restaurar desde el selector de snapshots.

---

### 🗂️ SessionStorage — almacenamiento temporal

Se usa para recordar:

- Contenido del formulario (texto, fecha, prioridad)
- Filtro activo durante la sesión

Se borra al cerrar la pestaña.

---

### 🍪 Cookies

Guardan:

- **Idioma del navegador** (`idioma`)
- **Tema seleccionado** (`tema`)

---

## ⚠️ Problemas comunes y soluciones

### ❌ El Panel Diario no se abre

**Causa:** pop-ups bloqueados  
**Solución:** habilitar ventanas emergentes para este sitio

---

### ❌ Las notas no se guardan

**Posibles causas:**

- Navegador en modo incógnito
- localStorage bloqueado
- Configuración de privacidad estricta

---

### ❌ Fecha no válida

Una fecha es inválida si:

- El año no tiene **4 dígitos**
- Es anterior a hoy
- Es más de **2 años** después de la fecha actual

---

### ❌ Idioma incorrecto

La app usa el idioma del navegador y lo guarda en la cookie `idioma`.  
Cambia el idioma del navegador o borra la cookie para refrescarlo.

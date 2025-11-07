# NotasApp — DWEC U3 (Plantilla mínima)

**Objetivo**: implementar los RF acordados (objetos nativos; `navigator.language`; filtros por `location.hash`; generación de HTML; viewport/scroll/pantalla completa cuando proceda; `window.open`+comunicación controlada; persistencia elegida y justificada; depuración/documentación).

## Instrucciones rápidas

1. Abrir `src/index.html` en un navegador moderno.
2. Completar la lógica según los RF (ver enunciado de la UD).
3. Añadir evidencias de depuración (capturas) en este README o en la carpeta que decidas.

## Justificación de persistencia (rellenar)

- Mecanismo elegido: Cookies ✔ / Web Storage - LocalStorage ✔
- Motivo: Cookies para datos sencillos como el idioma del navegador. Con una expiración de 30 días.
  LocalStorage para guardar notas, convertidas previamente en JSON.

## Matriz RA–CE (referenciar funciones/flujo)

- Objetos nativos → Math, String, Date, Number, Array
- Interacción navegador (`navigator`, `location.hash`) → Con navigator, window y filtros de hash por URL.
- Persistencia → LocalStorage para almacenar datos en JSON y cookies para almacenamiento de datos simples.
- Depuración y documentación → Trello para la organización, GitHub para el repositorio, chatGpt para documentación.

© 2025-10-27 — DWEC

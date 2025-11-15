// DWEC U3 — Gestor de notas PLUS

/** @typedef {{ id:string, texto:string, fecha:string, prioridad:number, completada?:boolean }} Nota */

//Se inicializa el estado global en un objeto
const estado = {
  notas: /** @type {Nota[]} */ ([]),
  filtro: obtenerFiltroDesdeHash(), //Se inicializa leyendo el hash actual con obtenerFiltro...()
};

//1. INICIACIÓN DEL DOM:

/**
 * Espera a que esté listo (elementos ya creados) y registra eventos de la interfaz.
 * Render muestra el estado inicial.
 */
document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("listaNotas")
    .addEventListener("click", delegarAccionNota);

  //Entra en el nav y selecciona todos los elementos que tengan atributo data-hash
  document.querySelectorAll("nav [data-hash]").forEach((btn) => {
    btn.addEventListener("click", () => {
      //Selecciona con el boton y asigna el atributo del boton pulsado
      location.hash = btn.getAttribute("data-hash");
    });
  });
  //
  document.getElementById("formNota").addEventListener("submit", onSubmitNota);
  //Abrir panel diario
  document
    .getElementById("btnPanelDiario")
    .addEventListener("click", abrirPanelDiario);
  //Pantalla completa
  document
    .getElementById("btnFullscreen")
    .addEventListener("click", alternarPantallaCompleta);

  //La pagina mantiene el ultimo filtro activo si se recarga
  const filtroGuardado = localStorage.getItem("filtro");
  if (filtroGuardado) location.hash = filtroGuardado;

  guardarIdioma(); //Guardar idioma en una cookie
  cargarNotas(); //Cargar notas desde localStorage
  render();
});

/**
 * Actualiza el filtro, lo guarda en localStorage y renderiza las notas segun URL actual
 */
window.addEventListener("hashchange", () => {
  estado.filtro = obtenerFiltroDesdeHash();
  localStorage.setItem("filtro", estado.filtro);
  render();
});

//2. GESTIÓN DE NOTAS (CRUD)

/**
 * Crea una nota a partir del texto, una fecha y una prioridad.
 * @param {string} texto Texto de la nota. Se recorta con trim() y se valida que no este vacio.
 * @param {Date} fecha  Fecha asociada. Se convierte en obj Date y luego a formato ISO(yyyy-mm-dd).
 * @param {number} prioridad Nivel de prioridad(1=baja, 2=media, 3=alta). Se normaliza rango 1-3.
 * @returns {Nota} Nuevo obj Nota con ID unico, texto, fecha y prioridad validos.
 * @throws {Error} Si el texto esta vacio o la fecha no es valida.
 */
function crearNota(texto, fecha, prioridad) {
  const t = String(texto).trim(); //Texto
  const f = new Date(fecha); //Fecha
  const p = Math.max(1, Math.min(3, Number(prioridad) || 1)); //Prioridad
  if (!t || Number.isNaN(f.getTime()))
    throw new Error("Datos de nota inválidos");

  const anio = f.getFullYear();
  const anioActual = new Date().getFullYear();

  // Validar que el año tenga 4 dígitos
  if (fecha.split("-")[0].length !== 4) {
    throw new Error("El año debe tener 4 dígitos (por ejemplo, 2025)");
  }

  // Validar rango de años permitido (desde el actual hasta 2 años después)
  if (anio < anioActual) {
    throw new Error(`La fecha no puede ser anterior a ${anioActual}`);
  }
  if (anio > anioActual + 2) {
    throw new Error(
      `Solo se permiten recordatorios hasta el año ${anioActual + 2}`
    );
  }

  // Validar que la fecha no sea anterior a hoy
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  if (f < hoy) {
    throw new Error("La fecha no puede ser anterior a hoy");
  }

  //Objeto Nota
  return {
    id: "n" + Math.random().toString(36).slice(2),
    texto: t,
    fecha: f.toISOString().slice(0, 10),
    prioridad: p,
  };
}

/**
 * @returns Solo 3 valores permitidos (hoy, semana, todas). Si no usa #todas por defecto
 */
function obtenerFiltroDesdeHash() {
  const h = (location.hash || "#todas").toLowerCase();
  return ["#hoy", "#semana", "#todas"].includes(h) ? h : "#todas";
}

/**
 * Filtra las notas segun el filtro activoen en el estado global
 * - #hoy: devuelve solo las notas con la fecha actual.
 * - #semana: devuelve las notas con fecha en los proximos 7 dias.
 * - #todas u otro valor: devuelve todas las notas sin filtrar.
 * @param {Nota[]} notas Arr completo de notas a evaluar.
 * @returns {Nota[]} Nuevo arr con las notas que cumplen el filtro activo.
 */
function filtrarNotas(notas) {
  const hoy = new Date(); //Fecha actual
  const ymd = hoy.toISOString().slice(0, 10); //Formato YYYY-MM-DD. Recorta hora.

  //Filtro 1: solo las fechas de hoy
  if (estado.filtro === "#hoy") return notas.filter((n) => n.fecha === ymd);

  //Filtro 2: proximos 7 dias incluyendo hoy
  if (estado.filtro === "#semana") {
    const fin = new Date(hoy);
    fin.setDate(hoy.getDate() + 7);
    return notas.filter(
      (n) => new Date(n.fecha) >= hoy && new Date(n.fecha) <= fin
    );
  }
  //Filtro 3: cualquier otro valor
  return notas;
}

/**
 *Devuelve una nueva lista de notas ordenadas por prioridad, fecha y texto.
 * -Mayor prioridad primero (descendente).
 * -Fechas mas antiguas primero (ascendente).
 * -Orden alfabetico si prioridad y fechas son iguales.
 * @param {Nota[]} notas Arr original de notas a ordenar.
 * @returns {Nota[]} Nuevo arr ordenado sin modificar el original.
 */
function ordenarNotas(notas) {
  //Spread operator (Copia de arr)
  return [...notas].sort(
    //orden desc por prioridad
    (a, b) =>
      //Si igual a prioridad, orden desc por fecha
      b.prioridad - a.prioridad ||
      new Date(a.fecha) - new Date(b.fecha) ||
      //Si igual fecha, orden alfabetico por texto
      a.texto.localeCompare(b.texto)
  );
}

/**
 * Formatea una fecha a formato legible segun el idioma del navegador.
 * @param {string|number|Date} ymd Fecha en formato ISO
 * @returns {string} Fecha formateada segun la config regional del usuario
 */
function formatearFecha(ymd) {
  const d = new Date(ymd);
  return new Intl.DateTimeFormat(navigator.language || "es-ES", {
    dateStyle: "medium",
  }).format(d);
}

/**
 * Controlador del evento de envio del form de notas.
 *  - Previene la recarga por defecto.
 *  - Lee y valida los datos del formulario.
 *  - Crea una nueva nota y la agrega al estado global.
 *  - Limpia el formulario y vuelve a renderizar la lista.
 * @param {SubmitEvent} e Evento de envio de formulario
 * @returns {void}
 */
function onSubmitNota(e) {
  e.preventDefault(); //Evita la recarga de la pagina
  //Lee los valores del form
  const texto = document.getElementById("txtTexto").value;
  const fecha = document.getElementById("txtFecha").value;
  const prioridad = document.getElementById("selPrioridad").value;
  try {
    const nota = crearNota(texto, fecha, prioridad); //CrearNota para validar y crear una nota
    estado.notas.push(nota); //Agrega notas al estado global
    guardarNotas(); //Guardamos en localStorage
    e.target.reset(); //limpia el form
    mostrarMensaje("Nota creada correctamente", "ok");
    render(); //Actualiar lista
    // Desplazar al área de notas
    document.getElementById("listTitle").scrollIntoView({ behavior: "smooth" });
    // Mostrar mensaje visual
    mostrarMensaje("Nota creada correctamente", "ok");
  } catch (err) {
    alert(err.message);
  }
}

/**
 *Controla las acciones de cada nota (borrar, completar, marcar, desmarcar).
 * - Identifica la nota mediante data-acc.
 * - Si la accion es borrar, solicita confirmacion y la elimina.
 * - Si es completar, marca la nota como completada.
 * - Puede marcarse y desmarcarse.
 * - Siempre vuelve a renderizar la vista actual.
 * @param {click} e Evento click en un boton de accion
 */
function delegarAccionNota(e) {
  const btn = e.target.closest("button[data-acc]");
  if (!btn) {
    return;
  }

  const acc = btn.dataset.acc;
  const id = btn.dataset.id;

  const idx = estado.notas.findIndex((n) => n.id === id);
  if (idx < 0) return;

  if (acc === "borrar") {
    if (confirm("¿Desea borrar la nota?")) {
      estado.notas.splice(idx, 1);
      mostrarMensaje("Nota borrada", "ok");
    }
  }

  if (acc === "completar") {
    estado.notas[idx].completada = true;
    mostrarMensaje("Nota marcada como completada", "ok");
  }

  if (acc === "descompletar") {
    estado.notas[idx].completada = false;
    mostrarMensaje("Nota desmarcada", "info");
  }

  //Guardar en localStorage
  guardarNotas();
  //Actualiza vista
  render();
}

//3. PERSISTENCIA LOCAL

/**
 * Guarda el estado actual de las notas en localStorage.
 * Convierte el array de obj a JSON antes de almacenarlo.
 * @returns {void}
 */
function guardarNotas() {
  try {
    const datos = JSON.stringify(estado.notas);
    localStorage.setItem("notas", datos); //Conversion a json
  } catch (err) {
    console.error("Error al guardar notas: ", err);
  }
}

/**
 * Carga notas almacenadas en localStorage (si existen).
 * Intenta convertir el json guardado en un arr de obj Nota.
 * Si no hay datos validos, devuelve arr vacio
 * @returns {void}
 */
function cargarNotas() {
  try {
    const datos = localStorage.getItem("notas");
    if (datos) {
      estado.notas = JSON.parse(datos);
    }
  } catch (err) {
    console.warn("Error al cargar notas, array vacío por defecto", err);
    estado.notas = [];
  }
}

/**
 * Guarda el idioma del navegador en una cookie por 30 dias
 */
function guardarIdioma(dias = 30) {
  const fecha = new Date();
  fecha.setTime(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
  document.cookie = `idioma=${encodeURIComponent(
    navigator.language
  )}; expires=${fecha.toUTCString()}; path=/`;
}

/**
 * Elimima todas las notas guardadas, cambia el arr notas a uno vacio y renderiza nueva vista.
 * @returns {void}
 */
function limpiarDatos() {
  if (confirm("¿Eliminar todas las notas guardadas?")) {
    localStorage.removeItem("notas");
    estado.notas = [];
    render();
  }
}

//Evento limpiarDatos
document.getElementById("btnLimpiar").addEventListener("click", limpiarDatos);

//4. RENDERIZADO

function render() {
  const cont = document.getElementById("listaNotas"); //Recoge el contenedor principal
  cont.innerHTML = ""; //Limpia el contenido previo

  const tpl = document.getElementById("nota-template"); //Seleccionar el template de nota

  const fragment = document.createDocumentFragment(); //Crear fragmento (donde van las notas previo al DOM)

  const visibles = ordenarNotas(filtrarNotas(estado.notas)); //Obtiene las notas filtradas y ordenadas

  //Recorre las notas y usa template para completarlas
  for (const n of visibles) {
    const clone = tpl.content.cloneNode(true); //Clonar el template
    const card = clone.querySelector(".nota"); //Seleccionar la clase .nota del template
    card.classList.add(`prioridad-${n.prioridad}`); //Aplica clase segun prioridad. Añade, no sobreescribe
    //Estado de la nota
    if (n.completada) {
      card.classList.add("completada");
    }

    //TEXTO
    const textoNota = card.querySelector('[data-campo="texto"]');
    textoNota.textContent = n.texto;

    //FECHA
    const fechaNota = card.querySelector('[data-campo="fecha"]');
    fechaNota.textContent = formatearFecha(n.fecha);
    fechaNota.setAttribute("datetime", n.fecha); //Valor ISO (accesibilidad)

    //BTN COMPLETAR/DESCOMPLETAR
    const btnAccion = card.querySelector('[data-acc="completar"]'); //Recoger btn

    if (n.completada) {
      btnAccion.textContent = "Desmarcar";
      btnAccion.dataset.acc = "descompletar";
    } else {
      btnAccion.textContent = "Completar";
      btnAccion.dataset.acc = "completar";
    }

    btnAccion.dataset.id = n.id;

    //BTN BORRAR
    const btnBorrar = card.querySelector('[data-acc="borrar"]');
    btnBorrar.dataset.id = n.id;

    fragment.appendChild(clone); //Insertar clone al fragment
  }
  //Insertar fragmento al DOM real
  cont.appendChild(fragment);
}

//5. EVENTOS DE PANTALLA
/**
 *
 */
function alternarPantallaCompleta() {
  if (!document.fullscreenElement) {
    document.documentElement
      .requestFullscreen()
      .catch(() =>
        mostrarMensaje("No se puede activar pantalla completa", "error")
      );
  } else {
    document.exitFullscreen();
  }
}

/**
 * Muestra en consola el tamaño actual del viewport (ancho x alto).
 * Se ejecuta cada vez que el usuario redimensiona la ventana.
 * @returns
 * // Al cambiar el tamaño de la ventana:
 * // "Viewport actual: 1366x768"
 */
function mostrarTamanoViewport() {
  const ancho = window.innerWidth;
  const alto = window.innerHeight;
  console.log(`Viewport actual: ${ancho}x${alto}`);
}
window.addEventListener("resize", mostrarTamanoViewport);
window.addEventListener("hashchange", () => {
  //add
  estado.filtro = obtenerFiltroDesdeHash();
  render();
});

//6. COMUNICACIÓN ENTRE VENTANAS

/**
 * Abre una ventana secundaria (panel diario) y le envia las notas actuales.
 * - Si es navegador bloquea la ventana, muestra una aviso.
 * - Envia un objeto 'snapshot' con las notas filtradas mediante postMessage().
 * - Usa un pequeño retardo para garantizar que el panel este cargado.
 * @returns {void}
 */
function abrirPanelDiario() {
  //Abre una ventana emergente panel.html
  const ref = window.open("panel.html", "PanelDiario", "width=420,height=560");
  //Si el navegador bloquea el popup, avisar
  if (!ref) {
    alert("Pop-up bloqueado. Permita ventanas emergentes.");
    return;
  }
  //Crea una "instantánea" del estado actual de las notas (objeto con tipo y datos)
  const snapshot = { tipo: "SNAPSHOT", notas: filtrarNotas(estado.notas) };
  //Despues de un retardo de 400ms, envia la snapshot a panel.html con postMessage
  setTimeout(() => {
    try {
      ref.postMessage(snapshot, "*");
    } catch {}
  }, 400);
}

/**
 * Escucha mensajes entrantes desde panel.html.
 * - Si el mensaje indidca tipo 'borrado', elimina la nota con ese id.
 * - Actualiza el estado y vuelve a renderizar la lista.
 * @param {MessageEvent} ev Evento de mensaje recibido por postMessage().
 * @returns {void}
 */
window.addEventListener("message", (ev) => {
  if (!ev.data || typeof ev.data !== "object") return;
  if (ev.data.tipo === "BORRADO") {
    const id = ev.data.id;
    estado.notas = estado.notas.filter((n) => n.id !== id);
    render();
  }
});

//7. UTILIDADES

/**
 * Muestra un mensaje visual temporal en la esquina inferior derecha.
 *
 * - Crea el contenedor si no existe.
 * - Cambia el color según el tipo de mensaje.
 * - Se desvanece automáticamente tras unos segundos.
 *
 * @param {string} texto - Texto del mensaje que se mostrará al usuario.
 * @param {"info"|"ok"|"error"} [tipo="info"] - Tipo de mensaje:
 *   - `"ok"` → Verde (éxito)
 *   - `"error"` → Rojo (error)
 *   - `"info"` → Verde por defecto
 *
 * @example
 * mostrarMensaje("Nota creada correctamente", "ok");
 * mostrarMensaje("Error al crear la nota", "error");
 */
function mostrarMensaje(texto, tipo = "info") {
  let caja = document.getElementById("mensaje");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "mensaje";
    caja.style.position = "fixed";
    caja.style.bottom = "10px";
    caja.style.right = "10px";
    caja.style.padding = "10px 15px";
    caja.style.borderRadius = "8px";
    caja.style.color = "white";
    caja.style.fontWeight = "bold";
    caja.style.transition = "opacity 0.5s";
    document.body.appendChild(caja);
  }
  caja.textContent = texto;
  caja.style.backgroundColor = tipo === "error" ? "crimson" : "seagreen";
  caja.style.opacity = "1";
  setTimeout(() => (caja.style.opacity = "0"), 2000);
}

/**
 * Previene inyecciones de script o HTML al mostrar texto
 * @param {string} s Texto a mostrar
 * @returns {string} Texto seguro para insertar en innerHTML
 */
function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        c
      ])
  );
}

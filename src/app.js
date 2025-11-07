// DWEC U3 — Gestor de notas

/** @typedef {{ id:string, texto:string, fecha:string, prioridad:number, completada?:boolean }} Nota */

//Se inicializa el estado global en un objeto
const estado = {
  notas: /** @type {Nota[]} */ ([]),
  filtro: obtenerFiltroDesdeHash(), //Se inicializa leyendo el hash actual con obtenerFiltro...()
};

/**
 * Iniciación del DOM: Espera a que esté listo (elementos ya creados) y registra eventos de la interfaz.
 * Render muestra el estado inicial
 */
document.addEventListener("DOMContentLoaded", () => {
  //Entra en el nav y selecciona todos los elementos que tengan atributo data-hash
  document.querySelectorAll("nav [data-hash]").forEach((btn) => {
    btn.addEventListener("click", () => {
      //Selecciona con el boton y asigna el atributo del boton pulsado
      location.hash = btn.getAttribute("data-hash");
    });
  });
  document.getElementById("formNota").addEventListener("submit", onSubmitNota);
  document
    .getElementById("btnPanelDiario")
    .addEventListener("click", abrirPanelDiario);

  //La pagina mantiene el ultimo filtro activo si se recarga
  const filtroGuardado = localStorage.getItem("filtro");
  if (filtroGuardado) location.hash = filtroGuardado;

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

/**
 * Crea una nota a partir del texto, una fecha y una prioridad.
 * @param {string} texto Texto de la nota. Se recorta con trim() y se valida que no este vacio.
 * @param {Date} fecha  Fecha asociada. Se convierte en obj Date y luego a formato ISO(yyyy-mm-dd).
 * @param {number} prioridad Nivel de prioridad(1=baja, 2=media, 3=alta). Se normaliza rango 1-3.
 * @returns {Nota} Nueva nota con ID unico, texto, fecha y prioridad validos.
 * @throws {Error} Si el texto esta vacio o la fecha no es valida.
 */
function crearNota(texto, fecha, prioridad) {
  const t = String(texto).trim();
  const p = Math.max(1, Math.min(3, Number(prioridad) || 1));
  const f = new Date(fecha);
  if (!t || Number.isNaN(f.getTime()))
    throw new Error("Datos de nota inválidos");
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
 *Reconstruye dinamicamente la lista de notas en el DOM:
 * - Limpia el contenedor principal (#listaNotas).
 * - Filtra y ordena las notas actuales segun el estado global.
 * - Crea elementos article con encabezado, fecha y botones de accion.
 * - Asocia los eventos de los botones (completar y borrar) a cada nota.
 *  @returns {void}
 */
function render() {
  //Recoge el contenedor principal
  const cont = document.getElementById("listaNotas");
  cont.innerHTML = ""; //Limpia el contenido previo

  //Obtiene las notas filtradas y ordenadas
  const visibles = ordenarNotas(filtrarNotas(estado.notas));
  //Crea dinamicamente un article por cada nota visible
  for (const n of visibles) {
    const card = document.createElement("article");
    card.className = "nota";
    card.innerHTML = `
      <header>
        <strong>[P${n.prioridad}] ${escapeHtml(n.texto)}</strong>
        <time datetime="${n.fecha}">${formatearFecha(n.fecha)}</time>
      </header>
      <footer>
        <button data-acc="completar" data-id="${n.id}">Completar</button>
        <button data-acc="borrar" data-id="${n.id}">Borrar</button>
      </footer>
    `;
    cont.appendChild(card);
  }

  //Añade eventos a los botones dentro de las notas recien creadas
  cont
    .querySelectorAll("button[data-acc]")
    .forEach((btn) => btn.addEventListener("click", onAccionNota));
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
    alert("Nota creada"); //Aviso de confirmacion
    render(); //Actualiar lista
  } catch (err) {
    alert(err.message);
  }
}

/**
 *Controla las acciones de cada nota (borrar o completar).
 * - Identifica la nota mediante data-id.
 * - Si la accion es borrar, solicita confirmacion y la elimina.
 * - Si es completar, marca la nota como completada.
 * - Siempre vuelve a renderizar la vista actual.
 * @param {MouseEvent} e Evento click en un boton de accion
 * @returns
 */
function onAccionNota(e) {
  const btn = e.currentTarget;
  const id = btn.getAttribute("data-id"); //Identifica que nota es
  const acc = btn.getAttribute("data-acc"); //Accion 'borrar' o 'completar'

  const idx = estado.notas.findIndex((n) => n.id === id); //Busca la nota correspondiente en estado.notas
  if (idx < 0) return; //Si no encuentra la nota correspondoente al boton pulsado, sale

  //si es borrar, pide confirmacion y la borra
  if (acc === "borrar" && confirm("¿Borrar la nota?"))
    estado.notas.splice(idx, 1);

  //Si es completar, completada = true
  if (acc === "completar") estado.notas[idx].completada = true;

  //Guardar en localStorage
  guardarNotas();
  //Actualiza vista
  render();
}

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

//PERSISTENCIA LOCAL
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
 * Guarda una cookie simple con nombre y valor durante x dias.
 * @param {string} nombre
 * @param {string} valor
 * @param {number} dias
 */
function setCookie(nombre, valor, dias) {
  const fecha = new Date();
  fecha.setTime(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
  document.cookie = `${nombre}=${encodeURIComponent(
    valor
  )}; expires=${fecha.toUTCString()}; path=/`;
}

/**
 * Recupera una cookie por nombre.
 * @param {string} nombre
 */
function getCookie(nombre) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${nombre}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Guarda el idioma del navegador en una cookie.
 */
function guardarIdioma() {
  setCookie("idioma", navigator.language);
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

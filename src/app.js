// DWEC U3 — Gestor de notas PLUS

//1. ESTADO GLOBAL

/** @typedef {{ id:string, texto:string, fecha:string, prioridad:number, completada?:boolean }} Nota */

//Se inicializa el estado global en un objeto
const estado = {
  notas: /** @type {Nota[]} */ ([]),
  filtro: obtenerFiltroDesdeHash(), //Se inicializa leyendo el hash actual con obtenerFiltro...()
};

//2. UTILIDADES

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
 * Comprueba que la fecha sea válida
 * - El año no debe superar los 4 dígitos
 * - El año no debe ser menor que el año actual
 * - El año no debe superar los 2 próximos años desde el actual
 * - El día y el mes no puede ser abterior al día actual
 * @param {Date} fecha - fecha actual
 * @return {boolean} - devuelve true si cumple todos los requisitos
 */
function validarFecha(fecha) {
  const f = new Date(fecha);
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

  return true;
}

//3. FILTROS, ORDENACIÓN Y FORMATEOS

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

//4. CRUD DE NOTAS (crear, editar, borrar)

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

  //Validacion básica
  if (!t || Number.isNaN(f.getTime()))
    throw new Error("Datos de nota inválidos");

  //Validacion de fecha usando funcion auxiliar
  validarFecha(fecha);

  //Objeto Nota
  return {
    id: "n" + Math.random().toString(36).slice(2),
    texto: t,
    fecha: f.toISOString().slice(0, 10),
    prioridad: p,
  };
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
    render(); //Actualiar lista
    // Desplazar al área de notas
    document.getElementById("listTitle").scrollIntoView({ behavior: "smooth" });
    // Mostrar mensaje visual
    mostrarMensaje("Nota creada correctamente", "ok");
  } catch (err) {
    alert(err.message);
  }
}

//5. DELEGACIÓN DE EVENTOS (completar, borrar, editar, guardar y cancelar)

/**
 *Controla las acciones de cada nota (borrar, completar, marcar, desmarcar).
 * - Identifica la nota mediante data-acc.
 * - Si la accion es borrar, solicita confirmacion y la elimina.
 * - Si es completar, marca la nota como completada.
 * - Puede marcarse y desmarcarse.
 * - Si es editar, llama a la funcion iniciarEdicion()
 * - (En modo edición) Si es guardar, llama a la funcion guardarEdicion()
 * - (En modo edición) Si es cancelar, llama a la funcion cancelarEdicion()
 * - Siempre vuelve a renderizar la vista actual.
 * @param {click} e Evento click en un boton de accion
 */
function delegarAccionNota(e) {
  const btn = e.target.closest("button[data-acc]");
  if (!btn) {
    return;
  }

  //Seleccionarmos la accion y el id a traves de data-*
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
  //Dependiendo de la accion, ejecuta su funcion correspondiente
  if (acc === "editar") return iniciarEdicion(id, btn);
  if (acc === "guardar") return guardarEdicion(id, btn);
  if (acc === "cancelar") return cancelarEdicion(id, btn);

  //Guardar en localStorage
  guardarNotas();
  //Actualiza vista
  render();
}

//6. EDICIÓN INLINE

/**
 * Entra en el modo edición del recordatorio
 * Diseño inline("full inline replacement")
 */
function iniciarEdicion(id, btn) {
  const notaEd = btn.closest(".nota");
  if (!notaEd) return;
  notaEd.classList.add("editando");

  //Obtener nota desde estado
  const nota = estado.notas.find((n) => n.id === id);
  if (!nota) return;

  //Crear inputs
  notaEd.innerHTML = `
  <label>
      <input class="edit-txt" required maxlength="200" value="${escapeHtml(
        nota.texto
      )}">
    </label>
    <label>
      <input class="edit-fecha" type="date" required value="${nota.fecha}">
    </label>
    <label>
      <select class="edit-prio">
        <option value="1"${nota.prioridad == 1 ? " selected" : ""}>Baja</option>
        <option value="2"${
          nota.prioridad == 2 ? " selected" : ""
        }>Media</option>
        <option value="3"${nota.prioridad == 3 ? " selected" : ""}>Alta</option>
      </select>
    </label>
    <div>
      <button data-acc="guardar" data-id="${id}">Guardar</button>
      <button data-acc="cancelar" data-id="${id}">Cancelar</button>
    </div>`;

  notaEd.querySelector(".edit-txt").focus();
}
/**
 * Guarda los cambios realizados en el modo edicion
 * @param
 */
function guardarEdicion(id, btn) {
  const notaEl = btn.closest(".nota");
  const txt = notaEl.querySelector(".edit-txt");
  const fecha = notaEl.querySelector(".edit-fecha");
  const prio = notaEl.querySelector(".edit-prio");

  if (!txt.checkValidity()) {
    txt.setAttribute("aria-invalid", "true");
    txt.reportValidity();
    return;
  } else {
    txt.removeAttribute("aria-invalid");
  }

  try {
    validarFecha(fecha.value);
  } catch (err) {
    fecha.setAttribute("aria-invalid", "true");
    fecha.reportValidity();
    alert(err.message);
    return;
  }
  fecha.removeAttribute("aria-invalid");

  //Actualizar estado
  const idx = estado.notas.findIndex((n) => n.id === id);
  if (idx < 0) return;

  estado.notas[idx].texto = txt.value.trim();
  estado.notas[idx].fecha = fecha.value;
  estado.notas[idx].prioridad = Number(prio.value);

  //Guardar y render
  guardarNotas();
  mostrarMensaje("Nota actualizada", "ok");
  render();
}
/**
 * Devuelve la nota sin realizar ningun cambio
 */
function cancelarEdicion(id, btn) {
  render();
}

//7. PERSISTENCIA local/session

/**
 * Guarda el estado actual de las notas en localStorage.
 * Guarda snapshot
 * @returns {void}
 */
function guardarNotas() {
  try {
    //Localstorage
    const datos = JSON.stringify(estado.notas);
    localStorage.setItem("notasApp:data", datos);
    //Snapshot
    guardarSnapshot();
  } catch (err) {
    console.error("Error al guardar notas: ", err);
  }
}

/**
 * Guardar snapshot con formateo. Máx 5.
 */
function guardarSnapshot() {
  const ts = new Date().toISOString(); //timestamp

  localStorage.setItem(`notasApp:hist:${ts}`, JSON.stringify(estado.notas));

  const claves = Object.keys(localStorage)
    .filter((k) => k.startsWith("notasApp:hist:"))
    .sort()
    .reverse(); //Nuevas primero

  claves.slice(5).forEach((k) => localStorage.removeItem(k));
}

/**
 * Restaura desde localstorage
 * @param {*} ts Timestamp
 * @returns
 */
function restaurarSnapshot(ts) {
  const datos = JSON.parse(localStorage.getItem(`notasApp:hist:${ts}`));
  if (!datos) {
    alert("No existe ese snapshot");
    return;
  }
  //Actualizamos el estado global y la vista
  estado.notas = datos;
  guardarNotas();
  render();
}

/**
 * Carga en DOM la lista de los snapshot almacenados.
 */
function cargarListaSnapshots() {
  const sel = document.getElementById("selSnapshots");
  if (!sel) return;

  sel.innerHTML = "";

  const claves = Object.keys(localStorage)
    .filter((k) => k.startsWith("notasApp:hist:"))
    .sort()
    .reverse();

  claves.forEach((k) => {
    const opt = document.createElement("option");
    opt.value = k.replace("notasApp:hist:", "");
    opt.textContent = opt.value;
    sel.appendChild(opt);
  });
}

/**
 * Carga notas almacenadas en localStorage (si existen).
 * Intenta convertir el json guardado en un arr de obj Nota.
 * Si no hay datos validos, devuelve arr vacio
 * @returns {void}
 */
function cargarNotas() {
  try {
    const datos = localStorage.getItem("notasApp:data");
    if (datos) {
      estado.notas = JSON.parse(datos);
    }
  } catch (err) {
    console.warn("Error al cargar notas, array vacío por defecto", err);
    estado.notas = [];
  }
}

/**
 * Elimima todas las notas guardadas, cambia el arr notas a uno vacio y renderiza nueva vista.
 * @returns {void}
 */
function limpiarDatos() {
  if (confirm("¿Eliminar todas las notas guardadas?")) {
    localStorage.removeItem("notasApp:data");
    estado.notas = [];
    render();
  }
}

//8. RENDER (con template + fragment)

/**
 *
 */
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

    //BTN EDITAR
    const btnEditar = card.querySelector('[data-acc="editar"]');
    if (btnEditar) btnEditar.dataset.id = n.id;

    fragment.appendChild(clone); //Insertar clone al fragment
  }
  //Insertar fragmento al DOM real
  cont.appendChild(fragment);
}

//9. EVENTOS DE PANTALLA

/**
 * Alterna mediante un boton a pantall completa
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

//10. COMUNICACIÓN ENTRE VENTANAS

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

//11. INICIALIZACIÓN

/**
 * Espera a que esté listo (elementos ya creados) y registra eventos de la interfaz.
 * Render muestra el estado inicial.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Cargar lista de snapshots
  cargarListaSnapshots();

  // Restaurar snapshot
  document
    .getElementById("btnRestaurarSnapshot")
    ?.addEventListener("click", () => {
      const sel = document.getElementById("selSnapshots");
      if (!sel.value) {
        alert("Selecciona una snapshot");
        return;
      }
      restaurarSnapshot(sel.value);
      cargarListaSnapshots();
    });

  document
    .getElementById("listaNotas")
    .addEventListener("click", delegarAccionNota);

  //Evento limpiarDatos
  document.getElementById("btnLimpiar").addEventListener("click", limpiarDatos);

  //Entra en el nav y selecciona todos los elementos que tengan atributo data-hash
  document.querySelectorAll("nav [data-hash]").forEach((btn) => {
    btn.addEventListener("click", () => {
      //Selecciona con el boton y asigna el atributo del boton pulsado
      location.hash = btn.getAttribute("data-hash");
    });
  });

  //Evento de formulario nota
  document.getElementById("formNota").addEventListener("submit", onSubmitNota);

  //Abrir panel diario
  document
    .getElementById("btnPanelDiario")
    .addEventListener("click", abrirPanelDiario);

  //Pantalla completa
  document
    .getElementById("btnFullscreen")
    .addEventListener("click", alternarPantallaCompleta);

  //Tema pagina
  document.getElementById("btnTema")?.addEventListener("click", () => {
    const actual = document.body.dataset.tema === "oscuro" ? "claro" : "oscuro";
    document.body.dataset.tema = actual;
    document.cookie = `tema=${actual}; path=/; max-age=${60 * 60 * 24 * 30}`;
    mostrarMensaje("Tema cambiado", "info");
  });

  //La pagina mantiene el ultimo filtro activo si se recarga
  const filtroGuardado = localStorage.getItem("filtro");
  if (filtroGuardado) location.hash = filtroGuardado;

  //Si el usuario recarga no pierede lo escrito en el formulario
  const txt = document.getElementById("txtTexto");
  const fecha = document.getElementById("txtFecha");
  const prio = document.getElementById("selPrioridad");

  txt.value = sessionStorage.getItem("tmpTexto") || "";
  fecha.value = sessionStorage.getItem("tmpFecha") || "";
  prio.value = sessionStorage.getItem("tmpPrio") || "1";

  //Guardar en input events lo que el usuario escribe en el formulario
  txt.addEventListener("input", () =>
    sessionStorage.setItem("tmpTexto", txt.value)
  );
  fecha.addEventListener("input", () =>
    sessionStorage.setItem("tmpFecha", fecha.value)
  );
  prio.addEventListener("change", () =>
    sessionStorage.setItem("tmpPrio", prio.value)
  );

  guardarIdioma(); //Guardar idioma en una cookie
  cargarNotas(); //Cargar notas desde localStorage
  render();
});

//Evento para actualizar filtro, guardar en local y session, renderiza
window.addEventListener("hashchange", () => {
  estado.filtro = obtenerFiltroDesdeHash();
  localStorage.setItem("filtro", estado.filtro);
  sessionStorage.setItem("filtroActivo", estado.filtro);
  render();
});

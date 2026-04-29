/* ================================================================
   piso.js — Dashboard de Leads Piso Pélvico | Clínica Dra. Giovana
   ================================================================ */

const API_URL = "https://script.google.com/macros/s/AKfycbxrt7vurcQ-tKbKRt_ceu6L0Ew12nXdUHxTLZLCmHzwE-LXugjmSBK6HK54vlZYkFNd/exec";

const leadsContainer  = document.getElementById("leadsContainer");
const searchInput     = document.getElementById("searchInput");
const searchClear     = document.getElementById("searchClear");
const statusMessage   = document.getElementById("statusMessage");
const emptyState      = document.getElementById("emptyState");
const leadCountNumber = document.getElementById("leadCountNumber");

let todosLosLeads = [];

/* ────────────────────────────────────────────────────────────────
   1. INICIALIZACIÓN
──────────────────────────────────────────────────────────────── */
document.addEventListener("DOMContentLoaded", () => {
  cargarLeads();

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.trim();
    searchClear.hidden = query === "";
    filtrarTarjetas(query);
  });

  searchClear.addEventListener("click", () => {
    searchInput.value = "";
    searchClear.hidden = true;
    searchInput.focus();
    filtrarTarjetas("");
  });
});


/* ────────────────────────────────────────────────────────────────
   2. FETCH DE DATOS
──────────────────────────────────────────────────────────────── */
async function cargarLeads() {
  mostrarSpinner(true);

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const json = await response.json();
    if (json.status === "error") throw new Error(json.message);

    todosLosLeads = (json.data || []).reverse();
    mostrarSpinner(false);
    renderizarTarjetas(todosLosLeads);
    leadCountNumber.textContent = todosLosLeads.length;

  } catch (error) {
    console.error("Error al cargar leads:", error);
    mostrarError(`No se pudieron cargar los datos. (${error.message})`);
  }
}


/* ────────────────────────────────────────────────────────────────
   3. EXTRACCIÓN DE CAMPOS
──────────────────────────────────────────────────────────────── */
function extraerCampos(lead) {
  const nombre   = lead.nombre   || "";
  const telefono = limpiarTelefono(lead.telefono || "");
  const fecha    = lead.fecha    || "";
  const problemas  = lead.problemas  || "";
  const inversion  = lead.inversion  || "";
  const rapidez    = lead.rapidez    || "";
  const prolapso   = lead.prolapso   || "";

  return { nombre, telefono, fecha, problemas, inversion, rapidez, prolapso };
}


/* ────────────────────────────────────────────────────────────────
   4. LIMPIEZA DE TELÉFONO
──────────────────────────────────────────────────────────────── */
function limpiarTelefono(raw) {
  if (!raw) return "";
  let num = String(raw)
    .replace(/^[a-zA-Z]+:/i, "")
    .replace(/[\s()\-\.]/g, "")
    .trim();
  if (!num) return "";
  if (!num.startsWith("+")) {
    num = num.startsWith("591") ? `+${num}` : `+591${num}`;
  }
  return num;
}


/* ────────────────────────────────────────────────────────────────
   5. FORMATO DE FECHA
──────────────────────────────────────────────────────────────── */
function formatearFecha(raw) {
  if (!raw) return null;
  const fecha = new Date(raw);
  if (isNaN(fecha)) return String(raw);
  return fecha.toLocaleString("es-BO", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}


/* ────────────────────────────────────────────────────────────────
   6. LIMPIEZA DE TEXTO
──────────────────────────────────────────────────────────────── */
function limpiarTexto(raw) {
  if (!raw) return "";
  return raw
    .replace(/\(.*?\)/g, "")
    .replace(/[_\/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase());
}


/* ────────────────────────────────────────────────────────────────
   7. BADGE DE URGENCIA (basado en rapidez)
──────────────────────────────────────────────────────────────── */
function obtenerClaseUrgencia(rapidez) {
  if (!rapidez) return "desconocido";
  const t = rapidez.toLowerCase();
  if (t.includes("antes_posible") || t.includes("antes posible")) return "alto";
  if (t.includes("proximas")      || t.includes("próximas"))       return "medio";
  if (t.includes("mes")           || t.includes("planificando"))   return "bajo";
  return "desconocido";
}


/* ────────────────────────────────────────────────────────────────
   8. CONSTRUCCIÓN DE TARJETA
──────────────────────────────────────────────────────────────── */
function crearTarjeta(lead) {
  const { nombre, telefono, fecha, problemas, inversion, rapidez, prolapso } = extraerCampos(lead);

  const nombreMostrar   = nombre || "Sin nombre";
  const problemasLimpio = limpiarTexto(problemas);
  const inversionLimpia = limpiarTexto(inversion);
  const rapidezLimpia   = limpiarTexto(rapidez);
  const fechaLegible    = formatearFecha(fecha);
  const inicial         = nombreMostrar.charAt(0).toUpperCase();
  const claseUrgencia   = obtenerClaseUrgencia(rapidez);

  const labelBadge = {
    alto:        "Lo Antes Posible",
    medio:       "Próximas Semanas",
    bajo:        "Sin Prisa",
    desconocido: "—"
  }[claseUrgencia];

  const mensaje = `Hola ${nombreMostrar}, te escribimos de la clínica de la Dra. Giovana respecto a tu interés en el tratamiento de Piso Pélvico. ¿En qué podemos ayudarte?`;
  const waURL = telefono
    ? `https://wa.me/${telefono.replace("+", "")}?text=${encodeURIComponent(mensaje)}`
    : null;

  const article = document.createElement("article");
  article.className = "lead-card";
  article.dataset.nombre = nombreMostrar.toLowerCase();

  article.innerHTML = `
    <header class="card-header">
      <div class="card-avatar" aria-hidden="true">
        <span class="avatar-initial">${inicial}</span>
      </div>
      <div class="card-header-info">
        <h2 class="card-name">${escaparHTML(nombreMostrar)}</h2>
        ${fechaLegible ? `
          <time class="card-date">
            <i class="fa-regular fa-clock" aria-hidden="true"></i>
            ${fechaLegible}
          </time>` : ""}
      </div>
      <span class="card-interest-badge card-interest-badge--${claseUrgencia}">
        ${labelBadge}
      </span>
    </header>

    <div class="card-body">
      <div class="card-field">
        <span class="field-label">
          <i class="fa-solid fa-stethoscope" aria-hidden="true"></i>
          Problema Principal
        </span>
        <span class="field-value ${!problemasLimpio ? "field-value--empty" : ""}">
          ${escaparHTML(problemasLimpio) || "Sin información"}
        </span>
      </div>
      <div class="card-field">
        <span class="field-label">
          <i class="fa-solid fa-circle-dollar-to-slot" aria-hidden="true"></i>
          Inversión Dispuesta
        </span>
        <span class="field-value ${!inversionLimpia ? "field-value--empty" : ""}">
          ${escaparHTML(inversionLimpia) || "Sin información"}
        </span>
      </div>
      ${rapidezLimpia ? `
      <div class="card-field">
        <span class="field-label">
          <i class="fa-solid fa-calendar-check" aria-hidden="true"></i>
          Cuándo Quiere Empezar
        </span>
        <span class="field-value">
          ${escaparHTML(rapidezLimpia)}
        </span>
      </div>` : ""}
    </div>

    <footer class="card-footer">
      ${waURL
        ? `<a href="${waURL}" target="_blank" rel="noopener noreferrer" class="btn-whatsapp" aria-label="Contactar a ${escaparHTML(nombreMostrar)} por WhatsApp"><i class="fa-brands fa-whatsapp btn-whatsapp__icon" aria-hidden="true"></i><span class="btn-whatsapp__text">Contactar por WhatsApp</span></a>`
        : `<button class="btn-whatsapp" disabled style="opacity:0.45;cursor:not-allowed;"><i class="fa-solid fa-phone-slash btn-whatsapp__icon" aria-hidden="true"></i><span class="btn-whatsapp__text">Sin teléfono</span></button>`
      }
    </footer>
  `;

  return article;
}


/* ────────────────────────────────────────────────────────────────
   9. RENDERIZADO
──────────────────────────────────────────────────────────────── */
function renderizarTarjetas(leads) {
  leadsContainer.innerHTML = "";
  emptyState.hidden = true;

  if (!leads.length) {
    emptyState.hidden = false;
    return;
  }

  leads.forEach((lead, index) => {
    const tarjeta = crearTarjeta(lead);
    leadsContainer.appendChild(tarjeta);
    setTimeout(() => tarjeta.classList.add("card--visible"), index * 60);
  });
}


/* ────────────────────────────────────────────────────────────────
   10. FILTRADO
──────────────────────────────────────────────────────────────── */
function filtrarTarjetas(query) {
  const texto = query.toLowerCase().trim();
  const resultados = texto
    ? todosLosLeads.filter(lead => {
        const { nombre, telefono } = extraerCampos(lead);
        return nombre.toLowerCase().includes(texto) || telefono.includes(texto);
      })
    : todosLosLeads;

  renderizarTarjetas(resultados);
  leadCountNumber.textContent = resultados.length;
}


/* ────────────────────────────────────────────────────────────────
   11. HELPERS
──────────────────────────────────────────────────────────────── */
function mostrarSpinner(visible) {
  statusMessage.hidden = !visible;
  statusMessage.classList.remove("status-message--error");
  statusMessage.querySelector(".status-icon").className =
    "fa-solid fa-circle-notch fa-spin status-icon";
  statusMessage.querySelector(".status-text").textContent = "Cargando leads…";
}

function mostrarError(msg) {
  leadsContainer.innerHTML = "";
  statusMessage.hidden = false;
  statusMessage.classList.add("status-message--error");
  statusMessage.querySelector(".status-icon").className =
    "fa-solid fa-triangle-exclamation status-icon";
  statusMessage.querySelector(".status-text").textContent = msg;
}

function escaparHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

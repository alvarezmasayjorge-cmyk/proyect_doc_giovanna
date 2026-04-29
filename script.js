/* ================================================================
   script.js — Dashboard de Leads | Clínica Dra. Giovana
   VERSIÓN CORREGIDA: renderizado innerHTML + mapeo exacto de columnas
   ================================================================ */

const API_URL = "https://script.google.com/macros/s/AKfycbwHfhtqOQtF8DMSA2bmmnw6_n00q9VuYmzpV4TnTnzZvdQmbD3q0LJq1OykDicUjjwF/exec";

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
  if (!API_URL) {
    mostrarError("Configura la API_URL en script.js para cargar los leads.");
    return;
  }

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
   3. MAPEO DE CAMPOS
──────────────────────────────────────────────────────────────── */
function extraerCampos(lead) {
  const nombre =
    lead.nombre ||
    lead["nombre_completo"] ||
    lead["Nombre Completo"] ||
    lead["full_name"] ||
    "";

  const telefonoCrudo =
    lead.telefono ||
    lead["número_de_teléfono"] ||
    lead["Número"] ||
    lead["phone_number"] ||
    "";

  const telefono = limpiarTelefono(telefonoCrudo);
  const fecha = lead.fecha || lead["created_time"] || "";
  const interes = lead.interes || "";
  const inversion = lead.rango_inversion || "";

  return { nombre, telefono, fecha, interes, inversion };
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
   7. CLASE CSS DEL BADGE DE INTERÉS
──────────────────────────────────────────────────────────────── */
function obtenerClaseInteres(interes) {
  if (!interes) return "desconocido";
  const t = interes.toLowerCase();
  if (t.includes("muy_interesado") || t.includes("muy interesado") || t.includes("empezar_pronto")) return "alto";
  if (t.includes("interesado")     || t.includes("más_información") || t.includes("más información")) return "medio";
  if (t.includes("explorando")     || t.includes("solo_estoy")      || t.includes("consultando"))      return "bajo";
  return "desconocido";
}


/* ────────────────────────────────────────────────────────────────
   8. CONSTRUCCIÓN HTML DE UNA TARJETA
──────────────────────────────────────────────────────────────── */
function crearTarjeta(lead) {
  const { nombre, telefono, fecha, interes, inversion } = extraerCampos(lead);

  const nombreMostrar   = nombre   || "Sin nombre";
  const interesLimpio   = limpiarTexto(interes);
  const inversionLimpia = limpiarTexto(inversion);
  const fechaLegible    = formatearFecha(fecha);
  const inicial         = nombreMostrar.charAt(0).toUpperCase();
  const claseInteres    = obtenerClaseInteres(interes);

  const labelBadge = {
    alto:        "Muy Interesado",
    medio:       "Interesado",
    bajo:        "Explorando",
    desconocido: "—"
  }[claseInteres];

  const mensaje = `Hola ${nombreMostrar}, te escribimos de la clínica de la Dra. Giovana respecto a tu interés en Ozonoterapia. ¿En qué podemos ayudarte?`;
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
      <span class="card-interest-badge card-interest-badge--${claseInteres}">
        ${labelBadge}
      </span>
    </header>

    <div class="card-body">
      <div class="card-field">
        <span class="field-label">
          <i class="fa-solid fa-fire-flame-curved" aria-hidden="true"></i>
          Nivel de Interés
        </span>
        <span class="field-value ${!interesLimpio ? "field-value--empty" : ""}">
          ${escaparHTML(interesLimpio) || "Sin información"}
        </span>
      </div>
      <div class="card-field">
        <span class="field-label">
          <i class="fa-solid fa-circle-dollar-to-slot" aria-hidden="true"></i>
          Rango de Inversión
        </span>
        <span class="field-value ${!inversionLimpia ? "field-value--empty" : ""}">
          ${escaparHTML(inversionLimpia) || "Sin información"}
        </span>
      </div>
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
   9. RENDERIZADO DE TARJETAS
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
   10. FILTRADO EN TIEMPO REAL
──────────────────────────────────────────────────────────────── */
function filtrarTarjetas(query) {
  const texto = query.toLowerCase().trim();
  const resultados = texto
    ? todosLosLeads.filter(lead => {
        const { nombre, telefono } = extraerCampos(lead);
        return nombre.toLowerCase().includes(texto) ||
               telefono.includes(texto);
      })
    : todosLosLeads;

  renderizarTarjetas(resultados);
  leadCountNumber.textContent = resultados.length;
}


/* ────────────────────────────────────────────────────────────────
   11. HELPERS DE UI
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

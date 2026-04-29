/* ================================================================
   script.js — Dashboard de Leads | Clínica Dra. Giovana
   VERSIÓN CORREGIDA: renderizado innerHTML + mapeo exacto de columnas
   ================================================================ */

// ── Pega aquí la URL de tu Google Apps Script desplegado ──
const API_URL = "https://script.google.com/macros/s/AKfycbzQHYQ2QHzHUMgd2SE7_q8wOW4E3UOAx9Oik-bmQSAZQdHZE9qVZhWdUSJKzJRsOhee/exec";

// ── Referencias al DOM ──
const leadsContainer  = document.getElementById("leadsContainer");
const searchInput     = document.getElementById("searchInput");
const searchClear     = document.getElementById("searchClear");
const statusMessage   = document.getElementById("statusMessage");
const emptyState      = document.getElementById("emptyState");
const leadCountNumber = document.getElementById("leadCountNumber");

// Array global para filtrar sin repetir el fetch
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

    todosLosLeads = json.data || [];
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
   El Apps Script ya normaliza y entrega: nombre, telefono,
   fecha, interes, rango_inversion — pero por si acaso,
   también leemos las claves crudas del Sheet como fallback.
──────────────────────────────────────────────────────────────── */
function extraerCampos(lead) {
  // Nombre: el Apps Script entrega "nombre"; fallbacks crudos del Sheet
  const nombre =
    lead.nombre ||
    lead["nombre_completo"] ||
    lead["Nombre Completo"] ||
    lead["full_name"] ||
    "";

  // Teléfono: el Apps Script entrega "telefono"; fallbacks crudos
  const telefonoCrudo =
    lead.telefono ||
    lead["número_de_teléfono"] ||
    lead["Número"] ||
    lead["phone_number"] ||
    "";

  const telefono = limpiarTelefono(telefonoCrudo);

  // Fecha
  const fecha = lead.fecha || lead["created_time"] || "";

  // Interés — nombre exacto de la columna tal como viene del Sheet
  const interes =
    lead.interes ||
    lead["¿qué_tan_interesado/a_estás_en_iniciar_un_tratamiento_con_ozonoterapia?"] ||
    "";

  // Inversión — nombre exacto de la columna
  const inversion =
    lead.rango_inversion ||
    lead["¿en_qué_rango_de_inversión_te_sentirías_cómodo/a_para_mejorar_tu_salud_o_estética?"] ||
    "";

  return { nombre, telefono, fecha, interes, inversion };
}


/* ────────────────────────────────────────────────────────────────
   4. LIMPIEZA DE TELÉFONO
   Entrada real vista en el Sheet: "p:+59170810871"
──────────────────────────────────────────────────────────────── */
function limpiarTelefono(raw) {
  if (!raw) return "";

  let num = String(raw)
    .replace(/^[a-zA-Z]+:/i, "")  // Elimina prefijos: p:, tel:, mob:
    .replace(/[\s()\-\.]/g, "")   // Elimina espacios, paréntesis, guiones
    .trim();

  if (!num) return "";

  // Si no empieza con + asume Bolivia
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
   6. LIMPIEZA DE TEXTO DE INTERÉS / INVERSIÓN
   Convierte "muy_interesado/a_(quiero_empezar_pronto)"
   → "Muy Interesado"
──────────────────────────────────────────────────────────────── */
function limpiarTexto(raw) {
  if (!raw) return "";
  return raw
    .replace(/\(.*?\)/g, "")       // Elimina todo lo que esté entre paréntesis
    .replace(/[_\/]/g, " ")        // Guiones bajos y barras → espacio
    .replace(/\s+/g, " ")          // Espacios múltiples → uno
    .trim()
    // Capitaliza la primera letra de cada palabra
    .replace(/\b\w/g, l => l.toUpperCase());
}


/* ────────────────────────────────────────────────────────────────
   7. CLASE CSS DEL BADGE DE INTERÉS
──────────────────────────────────────────────────────────────── */
function obtenerClaseInteres(interes) {
  if (!interes) return "desconocido";
  const t = interes.toLowerCase();
  if (t.includes("muy_interesado") || t.includes("muy interesado") || t.includes("empezar_pronto")) return "alto";
  if (t.includes("interesado")     || t.includes("más_información") || t.includes("más información"))  return "medio";
  if (t.includes("explorando")     || t.includes("solo_estoy")      || t.includes("consultando"))       return "bajo";
  return "desconocido";
}


/* ────────────────────────────────────────────────────────────────
   8. CONSTRUCCIÓN HTML DE UNA TARJETA
   FIX CRÍTICO: se usa innerHTML sobre un <article> creado con
   createElement — el HTML se parsea correctamente como markup,
   no como texto plano.
──────────────────────────────────────────────────────────────── */
function crearTarjeta(lead) {
  const { nombre, telefono, fecha, interes, inversion } = extraerCampos(lead);

  const nombreMostrar    = nombre    || "Sin nombre";
  const interesLimpio    = limpiarTexto(interes);
  const inversionLimpia  = limpiarTexto(inversion);
  const fechaLegible     = formatearFecha(fecha);
  const inicial          = nombreMostrar.charAt(0).toUpperCase();
  const claseInteres     = obtenerClaseInteres(interes);

  // Etiqueta del badge según clase
  const labelBadge = {
    alto:         "Muy Interesado",
    medio:        "Interesado",
    bajo:         "Explorando",
    desconocido:  "—"
  }[claseInteres];

  // URL de WhatsApp — número sin "+"" en la URL
  const mensaje = `Hola ${nombreMostrar}, te escribimos de la clínica de la Dra. Giovana respecto a tu interés en Ozonoterapia. ¿En qué podemos ayudarte?`;
  const waURL   = telefono
    ? `https://wa.me/${telefono.replace("+", "")}?text=${encodeURIComponent(mensaje)}`
    : null;

  // Creamos el elemento y asignamos innerHTML —
  // esto hace que el navegador parsee el HTML real
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
        ? `
            <ahref="${waURL}"
             target="_blank"
             rel="noopener noreferrer"
             class="btn-whatsapp"
             aria-label="Contactar a ${escaparHTML(nombreMostrar)} por WhatsApp"
           >
             <i class="fa-brands fa-whatsapp btn-whatsapp__icon" aria-hidden="true"></i>
             <span class="btn-whatsapp__text">Contactar por WhatsApp</span>
           </a>`
        : `<button class="btn-whatsapp" disabled style="opacity:0.45;cursor:not-allowed;" aria-label="Sin teléfono disponible">
             <i class="fa-solid fa-phone-slash btn-whatsapp__icon" aria-hidden="true"></i>
             <span class="btn-whatsapp__text">Sin teléfono</span>
           </button>`
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
    // Animación escalonada de entrada
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

// Previene XSS con datos de Facebook
function escaparHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
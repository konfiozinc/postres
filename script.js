/* ============================================================
   Postres Snoopy — script.js
   - Carga y VALIDA data.json (sin inventar productos ni precios).
   - Carrito saneado: cantidades enteras 1..20, ids del catálogo y
     precios SIEMPRE tomados del catálogo (nunca de localStorage).
   - Pedido en tres estados explícitos:
       1) preparado        → mensaje armado, nada enviado
       2) whatsapp abierto → se abrió WhatsApp, el negocio aún no responde
       3) enviado por ti   → el cliente marcó que pulsó «Enviar»; queda
                             PENDIENTE DE CONFIRMACIÓN DEL NEGOCIO
     El carrito NO se vacía solo: solo con una acción explícita.
   ============================================================ */
"use strict";

const MAX_POR_ITEM = 20;
const CATALOGO_MINIMO = 1;

/* ---------------- utilidades puras (probadas en pruebas/nucleo.test.js) ---------------- */

function esObjeto(v) { return v && typeof v === "object" && !Array.isArray(v); }

function texto(v, max) {
  if (typeof v !== "string") return "";
  const t = v.trim().replace(/\s+/g, " ");
  return max ? t.slice(0, max) : t;
}

/** Precio válido: entero positivo en pesos. Devuelve null si no lo es. */
function precioValido(v) {
  const n = typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : Number(v);
  if (!Number.isFinite(n)) return null;
  if (!Number.isInteger(n)) return null;
  if (n <= 0 || n > 10000000) return null;
  return n;
}

/** Cantidad válida: entero 1..MAX_POR_ITEM. */
function cantidadValida(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < 1) return null;
  return Math.min(i, MAX_POR_ITEM);
}

/** Un producto solo existe si tiene id, nombre y precio válidos. */
function normalizarProducto(p) {
  if (!esObjeto(p)) return null;
  const id = texto(p.id, 60);
  const nombre = texto(p.nombre, 80);
  const precio = precioValido(p.precio);
  if (!id || !nombre || precio === null) return null;
  const imagen = typeof p.imagen === "string" ? p.imagen.trim() : "";
  return {
    id,
    nombre,
    nombreCompleto: texto(p.nombreCompleto || p.nombre, 120),
    descripcion: texto(p.descripcion, 200),
    precio,
    imagen: /^assets\/[\w./-]+$/.test(imagen) ? imagen : "",
    alergenos: Array.isArray(p.alergenos) ? p.alergenos.map((a) => texto(a, 30)).filter(Boolean) : [],
  };
}

/** Valida el documento completo de data.json. Nunca lanza. */
function validarCatalogo(json) {
  const avisos = [];
  if (!esObjeto(json)) return { ok: false, marca: null, contacto: null, redes: [], productos: [], avisos: ["data.json no es un objeto válido"] };

  const marcaRaw = esObjeto(json.marca) ? json.marca : {};
  const marca = {
    nombre: texto(marcaRaw.nombre, 80) || "Postres Snoopy",
    eslogan: texto(marcaRaw.eslogan, 160),
    ciudad: texto(marcaRaw.ciudad, 80),
  };
  if (!texto(marcaRaw.nombre, 80)) avisos.push("Falta el nombre de la marca; se usa el de respaldo.");

  const contactoRaw = esObjeto(json.contacto) ? json.contacto : {};
  const numero = texto(contactoRaw.whatsapp, 20).replace(/[^\d]/g, "");
  const contacto = { whatsapp: numero.length >= 10 ? numero : "" };
  if (!contacto.whatsapp) avisos.push("El WhatsApp del negocio falta o no es válido.");

  const redes = Array.isArray(json.redes)
    ? json.redes.filter(esObjeto).map((r) => ({
        id: texto(r.id, 30),
        nombre: texto(r.nombre, 40) || texto(r.id, 30),
        url: /^https?:\/\//i.test(String(r.url || "")) ? String(r.url).trim() : "",
      })).filter((r) => r.id)
    : [];

  const lista = Array.isArray(json.productos) ? json.productos : [];
  if (!Array.isArray(json.productos)) avisos.push("data.json no trae una lista de productos.");

  const productos = [], vistos = new Set();
  lista.forEach((p, i) => {
    const n = normalizarProducto(p);
    if (!n) { avisos.push("Producto #" + (i + 1) + " ignorado: faltan id, nombre o precio válido."); return; }
    if (vistos.has(n.id)) { avisos.push("Producto duplicado ignorado: " + n.id + "."); return; }
    vistos.add(n.id);
    if (!n.imagen) avisos.push("«" + n.nombre + "» no tiene una ruta de imagen válida.");
    productos.push(n);
  });

  const ok = productos.length >= CATALOGO_MINIMO && !!contacto.whatsapp;
  if (!productos.length) avisos.push("No hay ningún producto válido en data.json.");
  return { ok, marca, contacto, redes, productos, avisos };
}

/** Sanea lo que venga de localStorage: ids del catálogo y cantidades 1..20. */
function sanearCarrito(bruto, productos) {
  const ids = new Set(productos.map((p) => p.id));
  const mapa = new Map();
  if (Array.isArray(bruto)) {
    bruto.forEach((it) => {
      if (!esObjeto(it)) return;
      const id = texto(it.id, 60);
      if (!ids.has(id)) return;                       // producto inexistente: se descarta
      const c = cantidadValida(it.cantidad);
      if (c === null) return;                         // cantidad inválida: se descarta
      mapa.set(id, Math.min(MAX_POR_ITEM, (mapa.get(id) || 0) + c));
    });
  }
  return [...mapa.entries()].map(([id, cantidad]) => ({ id, cantidad }));
}

function precioDe(id, productos) {
  const p = productos.find((x) => x.id === id);
  return p ? p.precio : 0;
}

function calcularTotal(carrito, productos) {
  return carrito.reduce((s, c) => s + precioDe(c.id, productos) * c.cantidad, 0);
}

function contarProductos(carrito) {
  return carrito.reduce((s, c) => s + c.cantidad, 0);
}

/** Validación del formulario con mensajes concretos por campo. */
function validarFormulario(datos) {
  const errores = {};
  const nombre = texto(datos.nombre, 60);
  const telefono = String(datos.telefono || "").replace(/[^\d]/g, "");
  const direccion = texto(datos.direccion, 120);
  const notas = texto(datos.notas, 300);

  if (nombre.length < 2) errores.nombre = "Escribe tu nombre (mínimo 2 letras).";
  if (telefono.length < 10) errores.telefono = "El teléfono debe tener al menos 10 dígitos.";
  else if (telefono.length > 15) errores.telefono = "El teléfono tiene demasiados dígitos.";
  if (direccion.length < 6) errores.direccion = "Escribe la dirección de entrega (mínimo 6 caracteres).";
  if (notas.length > 300) errores.notas = "Las notas no pueden pasar de 300 caracteres.";

  return { ok: Object.keys(errores).length === 0, errores, limpio: { nombre, telefono, direccion, notas } };
}

function pesos(n) { return "$" + Number(n || 0).toLocaleString("es-CO"); }

/** Mensaje que se le entrega al cliente para que lo envíe él mismo. */
function construirMensaje(datos, carrito, productos, marca) {
  const lineas = carrito.map((c) => {
    const p = productos.find((x) => x.id === c.id);
    return "• " + c.cantidad + "× " + (p ? p.nombreCompleto || p.nombre : c.id) + " - " + pesos(precioDe(c.id, productos) * c.cantidad);
  });
  const partes = [
    "Hola, soy " + datos.nombre + ". Quiero:",
    lineas.join("\n"),
    "*Total de productos: " + pesos(calcularTotal(carrito, productos)) + "*",
    "Tel: " + datos.telefono,
    "Dirección: " + datos.direccion,
  ];
  if (datos.notas) partes.push("Notas: " + datos.notas);
  partes.push("(Envío y valor final por confirmar en el chat)");
  return partes.join("\n");
}

function urlWhatsApp(numero, mensaje) {
  const limpio = String(numero || "").replace(/[^\d]/g, "");
  return "https://wa.me/" + limpio + "?text=" + encodeURIComponent(mensaje);
}

/* ---------------- parte que toca el DOM ---------------- */

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CART_KEY = "snoopy-cart-v2";
let CATALOGO = { marca: { nombre: "Postres Snoopy" }, contacto: { whatsapp: "" }, redes: [], productos: [] };
let carrito = [];
let estadoPedido = "inicial"; // inicial | preparado | whatsapp | enviado
let mensajeActual = "";

async function cargarCatalogo() {
  let json = null;
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    json = await res.json();
  } catch (e) {
    console.warn("Postres Snoopy: no se pudo leer data.json —", e.message);
  }
  const v = validarCatalogo(json);
  CATALOGO = { marca: v.marca, contacto: v.contacto, redes: v.redes, productos: v.productos };

  const aviso = $("#catalogo-aviso");
  if (!v.ok) {
    aviso.hidden = false;
    aviso.className = "aviso-catalogo aviso-catalogo--error";
    aviso.textContent = "No pudimos cargar el catálogo en este momento. Escríbenos por WhatsApp y te contamos los sabores disponibles.";
  } else if (v.avisos.length) {
    aviso.hidden = false;
    aviso.className = "aviso-catalogo";
    aviso.textContent = "Algunos productos no se pudieron mostrar. Escríbenos si no encuentras el tuyo.";
    console.warn("Postres Snoopy · avisos del catálogo:", v.avisos);
  } else {
    aviso.hidden = true;
  }
  return v.ok;
}

function pintar() {
  pintarRedes();
  pintarGaleria();
  inyectarJSONLD();
  pintarFlotantes();
  carrito = sanearCarrito(leerCarrito(), CATALOGO.productos);
  guardarCarrito();
  pintarCarrito();
  document.title = CATALOGO.marca.nombre + " — " + (CATALOGO.marca.eslogan || "Postres");
}

function pintarRedes() {
  const conUrl = CATALOGO.redes.filter((r) => r.url);
  const nav = $(".quicknav");
  CATALOGO.redes.forEach((r) => {
    const el = document.getElementById("social-" + r.id);
    if (!el) return;
    if (!r.url) { el.hidden = true; return; }         // sin perfil: enlace oculto, nunca muerto
    el.hidden = false;
    el.href = r.url;
    el.setAttribute("aria-label", r.nombre);
    el.rel = "noopener";
    el.target = "_blank";
  });
  if (nav && nav.children.length === 1) nav.classList.add("quicknav--solo");
  return conUrl.length;
}

function pintarGaleria() {
  const gal = $("#galeria");
  if (!CATALOGO.productos.length) { gal.innerHTML = ""; return; }
  gal.innerHTML = CATALOGO.productos.map((p, i) => `
    <article class="prod" data-id="${esc(p.id)}">
      <div class="prod__figura">
        <img class="prod__img" src="${esc(p.imagen || "assets/logo/logo-200.webp")}" alt="${esc(p.nombre)}"
             width="720" height="900" loading="${i < 2 ? "eager" : "lazy"}" fetchpriority="${i === 0 ? "high" : "auto"}" decoding="async">
        ${p.alergenos.length ? `<p class="prod__alergenos">Alérgenos: ${esc(p.alergenos.join(", "))}</p>` : ""}
      </div>
      <div class="prod__body">
        <h3 class="prod__nombre">${esc(p.nombre)}</h3>
        <p class="prod__desc">${esc(p.descripcion)}</p>
        <div class="prod__pie">
          <span class="prod__precio">${pesos(p.precio)}</span>
          <div class="prod__qty" aria-label="Cantidad de ${esc(p.nombre)}">
            <button type="button" data-qty="-1" aria-label="Disminuir cantidad de ${esc(p.nombre)}">−</button>
            <span class="qty-val" aria-live="polite">1</span>
            <button type="button" data-qty="1" aria-label="Aumentar cantidad de ${esc(p.nombre)}">+</button>
          </div>
        </div>
        <button type="button" class="btn btn--primary btn--agregar" data-agregar="${esc(p.id)}">🛒 Agregar</button>
        <button type="button" class="btn--directo" data-directo="${esc(p.id)}">Pedir solo este →</button>
      </div>
    </article>`).join("");

  gal.querySelectorAll("[data-qty]").forEach((b) => {
    b.addEventListener("click", () => {
      const val = b.closest(".prod__qty").querySelector(".qty-val");
      const n = cantidadValida(parseInt(val.textContent, 10) + parseInt(b.dataset.qty, 10)) || 1;
      val.textContent = n;
    });
  });
  gal.querySelectorAll("[data-agregar]").forEach((b) => {
    b.addEventListener("click", () => {
      const cont = b.closest(".prod").querySelector(".qty-val");
      agregar(b.dataset.agregar, cantidadValida(parseInt(cont.textContent, 10)) || 1);
      b.textContent = "✓ Agregado";
      setTimeout(() => { b.textContent = "🛒 Agregar"; }, 1500);
    });
  });
  gal.querySelectorAll("[data-directo]").forEach((b) => {
    b.addEventListener("click", () => pedirDirecto(b.dataset.directo));
  });
}

function inyectarJSONLD() {
  if (!CATALOGO.productos.length) return;
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Postres de " + CATALOGO.marca.nombre,
    itemListElement: CATALOGO.productos.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "MenuItem",
        name: p.nombreCompleto,
        description: p.descripcion,
        offers: { "@type": "Offer", price: String(p.precio), priceCurrency: "COP" },
      },
    })),
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

function pintarFlotantes() {
  if (!$(".wa-float")) {
    const a = document.createElement("a");
    a.className = "wa-float";
    a.href = CATALOGO.contacto.whatsapp ? "https://wa.me/" + CATALOGO.contacto.whatsapp : "#";
    a.target = "_blank";
    a.rel = "noopener";
    a.setAttribute("aria-label", "Contactar por WhatsApp");
    a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-whatsapp"></use></svg>';
    document.body.appendChild(a);
  }
  const seccion = document.getElementById("pedido");
  const a = $(".wa-float");
  if (seccion && a && "IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((e) => a.classList.toggle("is-hidden", e.isIntersecting)), { threshold: 0.2 }).observe(seccion);
  }
}

/* ---- carrito ---- */
function leerCarrito() {
  try { return JSON.parse(localStorage.getItem(CART_KEY) || "[]"); }
  catch (e) { return []; }
}
function guardarCarrito() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(sanearCarrito(carrito, CATALOGO.productos))); }
  catch (e) { /* modo privado: seguimos en memoria */ }
}

function agregar(id, cantidad) {
  const p = CATALOGO.productos.find((x) => x.id === id);
  if (!p) return;
  const it = carrito.find((c) => c.id === id);
  if (it) it.cantidad = Math.min(MAX_POR_ITEM, it.cantidad + (cantidadValida(cantidad) || 1));
  else carrito.push({ id, cantidad: cantidadValida(cantidad) || 1 });
  carrito = sanearCarrito(carrito, CATALOGO.productos);
  guardarCarrito();
  pintarCarrito();
  toast("✅ Agregado al carrito");
}
function cambiarCantidad(id, delta) {
  const it = carrito.find((c) => c.id === id);
  if (!it) return;
  it.cantidad = it.cantidad + delta;
  if (it.cantidad <= 0) carrito = carrito.filter((c) => c.id !== id);
  carrito = sanearCarrito(carrito, CATALOGO.productos);
  guardarCarrito();
  pintarCarrito();
}
function quitar(id) {
  carrito = carrito.filter((c) => c.id !== id);
  guardarCarrito(); pintarCarrito();
}
function vaciarCarrito() {
  if (!carrito.length) { toast("El carrito ya está vacío"); return; }
  if (!window.confirm("¿Vaciar el carrito? Se quitarán los productos de tu pedido.")) return;
  carrito = []; guardarCarrito(); pintarCarrito(); reiniciarFlujo(); toast("Carrito vacío");
}

function pintarCarrito() {
  const lista = $("#drawer-items"), vacio = $("#drawer-vacio"), totales = $("#drawer-totales"), floatBtn = $("#cart-float");
  if (!lista) return;
  const total = calcularTotal(carrito, CATALOGO.productos);
  const n = contarProductos(carrito);

  lista.innerHTML = carrito.map((c) => {
    const p = CATALOGO.productos.find((x) => x.id === c.id);
    if (!p) return "";
    return `
      <li class="drawer__item">
        <img class="drawer__item-img" src="${esc(p.imagen || "assets/logo/logo-200.webp")}" alt="" width="56" height="56" loading="lazy">
        <div class="drawer__item-info">
          <p class="drawer__item-nombre">${esc(p.nombre)}</p>
          <span class="drawer__item-precio">${pesos(p.precio)} c/u · ${pesos(p.precio * c.cantidad)}</span>
        </div>
        <div class="drawer__qty" aria-label="Cantidad de ${esc(p.nombre)}">
          <button type="button" data-qty="-1" data-id="${esc(p.id)}" aria-label="Disminuir ${esc(p.nombre)}">−</button>
          <span class="qty-val" aria-live="polite">${c.cantidad}</span>
          <button type="button" data-qty="1" data-id="${esc(p.id)}" aria-label="Aumentar ${esc(p.nombre)}">+</button>
        </div>
        <button type="button" class="drawer__item-del" data-del="${esc(p.id)}" aria-label="Eliminar ${esc(p.nombre)} del carrito">×</button>
      </li>`;
  }).join("");

  vacio.hidden = carrito.length > 0;
  totales.hidden = carrito.length === 0;
  $("#drawer-subtotal").textContent = pesos(total);
  $("#drawer-total").textContent = pesos(total);

  if (floatBtn) {
    floatBtn.classList.toggle("is-hidden", carrito.length === 0);
    floatBtn.textContent = "🛒 " + n + (n === 1 ? " producto" : " productos") + " · " + pesos(total);
  }
  $("#btn-enviar").disabled = carrito.length === 0;
  pintarEstadoPedido();
}

/* ---- estados del pedido (nunca se afirma una entrega que no consta) ---- */
const TEXTOS_ESTADO = {
  inicial: "",
  preparado: "📝 Pedido preparado (todavía sin enviar).",
  whatsapp: "📲 WhatsApp abierto: el pedido no consta como enviado.",
  enviado: "✅ Marcado como enviado · pendiente de confirmación del negocio.",
};
function pintarEstadoPedido() {
  const el = $("#estado-pedido");
  if (el) el.textContent = TEXTOS_ESTADO[estadoPedido] || "";
  $("#paso-datos").hidden = estadoPedido !== "inicial";
  $("#paso-listo").hidden = estadoPedido !== "preparado";
  $("#paso-whatsapp").hidden = estadoPedido !== "whatsapp" && estadoPedido !== "enviado";
  $("#estado-enviado").hidden = estadoPedido !== "enviado";
  $("#btn-enviar").hidden = estadoPedido !== "inicial";
}
function reiniciarFlujo() { estadoPedido = "inicial"; mensajeActual = ""; pintarEstadoPedido(); pintarMensaje(""); }

function pintarMensaje(texto) {
  const pre = $("#mensaje-preview");
  if (!pre) return;
  pre.textContent = texto || "";
  const url = texto && CATALOGO.contacto.whatsapp ? urlWhatsApp(CATALOGO.contacto.whatsapp, texto) : "";
  ["#btn-abrir-wa", "#btn-reabrir-wa"].forEach((sel) => {
    const a = $(sel);
    if (!a) return;
    if (url) { a.href = url; a.removeAttribute("aria-disabled"); }
    else { a.href = "#"; a.setAttribute("aria-disabled", "true"); }
  });
  const reabrir = $("#btn-reabrir-wa");
  if (reabrir) { reabrir.textContent = "Abrir WhatsApp de nuevo"; reabrir.href = url || "#"; }
}

function mostrarError(campo, mensaje) {
  const input = document.getElementById("c-" + campo);
  const err = document.getElementById("err-" + campo);
  if (err) err.textContent = mensaje || "";
  if (input) input.classList.toggle("is-invalid", !!mensaje);
}
function limpiarErrores() { ["nombre", "telefono", "direccion", "notas"].forEach((c) => mostrarError(c, "")); }

function prepararPedido() {
  const msg = $("#pedido-msg");
  if (!carrito.length) { msg.className = "pedido__msg err"; msg.textContent = "Tu carrito está vacío. Agrega postres primero."; return; }
  if (!CATALOGO.contacto.whatsapp) { msg.className = "pedido__msg err"; msg.textContent = "Falta el WhatsApp del negocio en la configuración."; return; }

  const v = validarFormulario({
    nombre: $("#c-nombre").value,
    telefono: $("#c-telefono").value,
    direccion: $("#c-direccion").value,
    notas: $("#c-notas").value,
  });
  ["nombre", "telefono", "direccion", "notas"].forEach((c) => mostrarError(c, v.errores[c] || ""));
  if (!v.ok) {
    msg.className = "pedido__msg err";
    msg.textContent = "Revisa los campos marcados para continuar.";
    const primero = document.querySelector(".is-invalid");
    if (primero) primero.focus();
    return;
  }

  mensajeActual = construirMensaje(v.limpio, carrito, CATALOGO.productos, CATALOGO.marca);
  estadoPedido = "preparado";
  pintarMensaje(mensajeActual);
  pintarEstadoPedido();
  msg.className = "pedido__msg ok";
  msg.textContent = "Pedido preparado. Revisa el mensaje y ábrelo en WhatsApp cuando quieras enviarlo.";
  const btn = $("#btn-abrir-wa");
  if (btn) btn.focus();
}

function marcarWhatsappAbierto() {
  estadoPedido = "whatsapp";
  pintarEstadoPedido();
  const msg = $("#pedido-msg");
  msg.className = "pedido__msg";
  msg.textContent = "Se abrió WhatsApp. El pedido no consta como enviado hasta que pulses «Enviar» allí.";
}

/* ---- pedir un solo producto (no afirma envío) ---- */
function pedirDirecto(id) {
  const p = CATALOGO.productos.find((x) => x.id === id);
  if (!p || !CATALOGO.contacto.whatsapp) { toast("Producto no disponible"); return; }
  const texto = "Hola, quiero pedir: 1× " + (p.nombreCompleto || p.nombre) + " - " + pesos(p.precio) + ". (Envío por confirmar)";
  const url = urlWhatsApp(CATALOGO.contacto.whatsapp, texto);
  toast("Abriendo WhatsApp… el pedido no consta hasta que lo envíes");
  window.open(url, "_blank", "noopener");
}

/* ---- toast ---- */
let toastTimer = null;
function toast(texto) {
  let t = $("#toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = texto;
  t.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-visible"), 2400);
}

/* ---- drawer ---- */
let drawerTrigger = null;
function abrirDrawer() {
  const overlay = $("#drawer-overlay"), drawer = $("#drawer");
  drawerTrigger = document.activeElement;
  overlay.hidden = false; drawer.hidden = false;
  requestAnimationFrame(() => { overlay.classList.add("is-open"); drawer.classList.add("is-open"); });
  document.body.classList.add("con-drawer");
  setTimeout(() => { const f = estadoPedido === "inicial" ? $("#c-nombre") : $("#drawer-cerrar"); if (f) f.focus(); }, 320);
}
function cerrarDrawer() {
  const overlay = $("#drawer-overlay"), drawer = $("#drawer");
  overlay.classList.remove("is-open"); drawer.classList.remove("is-open");
  document.body.classList.remove("con-drawer");
  setTimeout(() => {
    overlay.hidden = true; drawer.hidden = true;
    if (drawerTrigger && drawerTrigger.focus) drawerTrigger.focus();
  }, 300);
}
function drawerAbierto() { const d = $("#drawer"); return d && !d.hidden && d.classList.contains("is-open"); }

/* ---- hero: partículas (sin video, porque no existe el archivo) ---- */
/* Partículas del encabezado.
   Cada emoji se dibuja UNA vez en un lienzo fuera de pantalla y luego se copia con drawImage:
   dibujar texto (sobre todo emoji) en cada fotograma era lo que disparaba el trabajo del hilo
   principal. Además se limita a ~20 fps, hay menos partículas y no arranca hasta que la página
   terminó de cargar. */
function crearParticulas() {
  const canvas = $("#hero-particles"), hero = $(".hero");
  if (!canvas || !hero || !canvas.getContext) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (navigator.connection && navigator.connection.saveData) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const movil = window.matchMedia("(max-width: 480px)").matches;
  const N = movil ? 5 : 8;
  const FPS = 20;
  const frutas = ["🍓", "🫐", "🍒", "❤️"];
  const chispas = ["#e63950", "#ffb6c1"];
  const sprites = new Map();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  function sprite(emoji, tam) {
    const clave = emoji + "|" + tam;
    let c = sprites.get(clave);
    if (c) return c;
    const lado = Math.ceil(tam * 1.5);
    c = document.createElement("canvas");
    c.width = Math.ceil(lado * dpr);
    c.height = Math.ceil(lado * dpr);
    const x = c.getContext("2d");
    x.scale(dpr, dpr);
    x.font = tam + "px sans-serif";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(emoji, lado / 2, lado / 2);
    sprites.set(clave, c);
    return c;
  }

  let W = 0, H = 0, partes = [], chispa = [], visible = true;

  const redimensionar = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  redimensionar();
  window.addEventListener("resize", redimensionar);

  const nueva = (y) => {
    const tam = Math.round((16 + Math.random() * 12) / 4) * 4;   // tamaños en múltiplos de 4: reutiliza sprites
    return {
      x: Math.random() * W, y: y == null ? H + 40 : y,
      vx: (Math.random() - 0.5) * 0.4, vy: 0.3 + Math.random() * 0.5,
      tam, sprite: sprite(frutas[(Math.random() * frutas.length) | 0], tam),
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.03,
      op: 0.3 + Math.random() * 0.4,
    };
  };
  const explotar = (p) => {
    const n = movil ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6, v = 1.4 + Math.random() * 2;
      chispa.push({ x: p.x, y: p.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, tam: 2 + Math.random() * 2, color: chispas[i % 2], vida: 1 });
    }
  };
  for (let i = 0; i < N; i++) partes.push(nueva(Math.random() * H));
  if ("IntersectionObserver" in window) new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(hero);

  let ultimo = 0;
  (function loop(t) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    if (t && t - ultimo < 1000 / FPS) return;
    ultimo = t || 0;
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      p.y -= p.vy; p.x += p.vx; p.rot += p.vr;
      if (p.y < 50) { explotar(p); partes[i] = nueva(); continue; }
      const lado = p.tam * 1.5;
      ctx.save();
      ctx.globalAlpha = p.op;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.drawImage(p.sprite, -lado / 2, -lado / 2, lado, lado);
      ctx.restore();
    }
    for (let i = chispa.length - 1; i >= 0; i--) {
      const s2 = chispa[i];
      s2.x += s2.vx; s2.y += s2.vy; s2.vy += 0.06 * 2; s2.vida -= 0.05;
      if (s2.vida <= 0) { chispa.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, s2.vida); ctx.fillStyle = s2.color;
      ctx.beginPath(); ctx.arc(s2.x, s2.y, s2.tam, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  })();
}

function initScrollSpy() {
  const items = [...document.querySelectorAll(".tabbar a")];
  if (!items.length || !("IntersectionObserver" in window)) return;
  const activar = (href) => items.forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === href));
  items.forEach((a) => a.addEventListener("click", () => activar(a.getAttribute("href"))));
  const conTab = new Set(items.map((a) => (a.getAttribute("href") || "").slice(1)));
  const secciones = [...document.querySelectorAll("section[id]")].filter((s) => conTab.has(s.id));
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) activar("#" + e.target.id); });
  }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
  secciones.forEach((s) => observer.observe(s));
}

function initEventos() {
  $("#btn-abrir-carrito").addEventListener("click", abrirDrawer);
  $("#cart-float").addEventListener("click", abrirDrawer);
  $("#drawer-cerrar").addEventListener("click", cerrarDrawer);
  $("#drawer-overlay").addEventListener("click", cerrarDrawer);

  $("#drawer-items").addEventListener("click", (e) => {
    const q = e.target.closest("[data-qty][data-id]");
    if (q) { cambiarCantidad(q.dataset.id, parseInt(q.dataset.qty, 10)); return; }
    const del = e.target.closest("[data-del]");
    if (del) quitar(del.dataset.del);
  });

  $("#btn-enviar").addEventListener("click", prepararPedido);
  $("#btn-vaciar").addEventListener("click", vaciarCarrito);
  $("#btn-volver-datos").addEventListener("click", () => { estadoPedido = "inicial"; pintarEstadoPedido(); pintarMensaje(""); });
  $("#btn-abrir-wa").addEventListener("click", () => {
    if (!mensajeActual) { estadoPedido = "preparado"; }
    marcarWhatsappAbierto();
  });
  $("#btn-reabrir-wa").addEventListener("click", marcarWhatsappAbierto);
  $("#btn-marco-enviado").addEventListener("click", () => {
    estadoPedido = "enviado";
    pintarEstadoPedido();
    const msg = $("#pedido-msg");
    msg.className = "pedido__msg ok";
    msg.textContent = "Gracias. El pedido queda pendiente hasta que el negocio lo confirme en el chat.";
    toast("Marcado como enviado · pendiente de confirmación del negocio");
  });

  ["nombre", "telefono", "direccion", "notas"].forEach((c) => {
    const el = document.getElementById("c-" + c);
    if (el) el.addEventListener("input", () => mostrarError(c, ""));
  });

  document.addEventListener("keydown", (e) => {
    if (!drawerAbierto()) return;
    if (e.key === "Escape") { cerrarDrawer(); return; }
    if (e.key === "Tab") {
      const drawer = $("#drawer");
      const f = [...drawer.querySelectorAll("button, input, textarea, a[href]")].filter((x) => !x.hidden && x.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
}

/* Arranque del sitio (se omite cuando el archivo se carga desde Node para las pruebas). */
if (typeof document !== "undefined") {
  /* Las partículas empiezan después del evento load: no compiten con el primer render. */
  window.addEventListener("load", () => setTimeout(crearParticulas, 700), { once: true });
  document.addEventListener("DOMContentLoaded", async () => {
    $("#anio").textContent = new Date().getFullYear();
    initScrollSpy();
    initEventos();
    limpiarErrores();
    await cargarCatalogo();
    carrito = sanearCarrito(leerCarrito(), CATALOGO.productos);
    pintar();
    pintarEstadoPedido();
  });
}

/* Exportado solo para las pruebas automatizadas en Node. */
if (typeof module !== "undefined" && module.exports) {
  module.exports = { validarCatalogo, normalizarProducto, sanearCarrito, calcularTotal, contarProductos, validarFormulario, construirMensaje, urlWhatsApp, precioValido, cantidadValida, MAX_POR_ITEM };
}

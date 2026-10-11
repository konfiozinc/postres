/* ============================================================
   Postres Snoopy — script.js
   - Carga data.json (con respaldo embebido si falla la petición).
   - Renderiza la galería y el <select> de sabores.
   - Construye el mensaje de WhatsApp dinámicamente.
   - Guarda el último pedido en localStorage.
   ============================================================ */
"use strict";

// Respaldo por si data.json no carga (p. ej. abriendo el HTML con file://).
// Debe coincidir con data.json; si editas los productos ahí, edita también aquí.
const FALLBACK = {
  marca: { nombre: "Postres Snoopy", eslogan: "Postres con amor, hechos para consentirte" },
  contacto: { whatsapp: "573009981576" },
  redes: [
    { id: "instagram", nombre: "Instagram", url: "" },
    { id: "tiktok",     nombre: "TikTok",     url: "" },
    { id: "facebook",   nombre: "Facebook",   url: "" },
    { id: "whatsapp",   nombre: "WhatsApp",   url: "https://wa.me/573009981576" }
  ],
  productos: [
    { id: "fresas-crema",     nombre: "Fresas con crema",     descripcion: "Fresas frescas con crema suave, sencillas y deliciosas.", precio: 15000, imagen: "assets/postre-fresas-crema.webp", ingredientes: ["fresas", "crema", "azúcar"], alergenos: ["lácteos"] },
    { id: "fresas-chocolate", nombre: "Fresas con chocolate", descripcion: "Con lluvia de chocolate y trocitos crocantes.", precio: 17000, imagen: "assets/postre-fresas-chocolate.webp", ingredientes: ["fresas", "crema", "chocolate"], alergenos: ["lácteos"] },
    { id: "fresas-caramelo",  nombre: "Caramelo y galleta",   descripcion: "Con salsa de caramelo y galleta crocante desmenuzada.", precio: 17000, imagen: "assets/postre-fresas-caramelo.webp", ingredientes: ["fresas", "crema", "caramelo", "galleta"], alergenos: ["lácteos", "gluten"] },
    { id: "fresas-nutella",   nombre: "Fresas con Nutella",   descripcion: "Crema de avellanas y chispas de chocolate.", precio: 18000, imagen: "assets/postre-fresas-nutella.webp", ingredientes: ["fresas", "crema", "crema de avellanas", "chispas de chocolate"], alergenos: ["lácteos", "frutos secos"] },
    { id: "fresas-oreo",      nombre: "Fresas con Oreo",      descripcion: "Crema batida y galletas Oreo trituradas con lluvia de chocolate.", precio: 18000, imagen: "assets/postre-fresas-oreo.webp", ingredientes: ["fresas", "crema batida", "Oreo", "chocolate"], alergenos: ["lácteos", "gluten"] },
    { id: "fresas-mango",     nombre: "Fresas con mango",     descripcion: "Trozos de mango, crema y un toque de maracuyá.", precio: 18000, imagen: "assets/postre-fresas-mango.webp", ingredientes: ["fresas", "mango", "crema", "maracuyá"], alergenos: ["lácteos"] }
  ]
};

const $ = (s) => document.querySelector(s);
const pesos = (n) => "$" + Number(n).toLocaleString("es-CO");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

let DATA = FALLBACK;

async function cargarDatos() {
  try {
    const res = await fetch("data.json", { cache: "no-cache" });
    if (res.ok) DATA = await res.json();
  } catch (e) {
    console.warn("Postres Snoopy: data.json no disponible, uso respaldo embebido.", e);
  }
  pintar();
}

function pintar() {
  pintarRedes();
  pintarGaleria();
  pintarControlesCarrusel();
  pintarSelect();
  inyectarJSONLD();
  pintarFlotante();
  document.title = DATA.marca.nombre + " — " + DATA.marca.eslogan;
}

/* ---- Botón flotante de WhatsApp (se oculta cuando el form está visible) ---- */
function pintarFlotante() {
  const a = document.createElement("a");
  a.className = "wa-float";
  a.href = "https://wa.me/" + DATA.contacto.whatsapp + "?text=" + encodeURIComponent("Hola, quiero hacer un pedido 😊");
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "Pedir por WhatsApp");
  a.innerHTML = '<svg class="ico" aria-hidden="true"><use href="#i-whatsapp"></use></svg>';
  document.body.appendChild(a);

  const seccion = document.getElementById("pedido");
  if (seccion && "IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => a.classList.toggle("is-hidden", e.isIntersecting));
    }, { threshold: 0.2 });
    io.observe(seccion);
  }
}

/* ---- Redes (quick nav): solo se enlaza la url que exista; las vacías quedan en "#" ---- */
function pintarRedes() {
  DATA.redes.forEach((r) => {
    const el = document.getElementById("social-" + r.id);
    if (el) {
      el.href = r.url || "#";
      el.classList.toggle("is-placeholder", !r.url && r.id !== "whatsapp");
      el.setAttribute("aria-label", r.nombre);
    }
  });
}

/* ---- Galería de productos ---- */
function pintarGaleria() {
  const gal = document.getElementById("galeria");
  gal.innerHTML = DATA.productos.map((p) => `
    <article class="prod">
      <img class="prod__img" src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" width="600" height="450"
           onerror="this.style.display='none';this.parentNode.querySelector('.prod__ph').style.display='flex'">
      <span class="prod__ph" aria-hidden="true" style="display:none">🍓</span>
      <div class="prod__body">
        <h3 class="prod__nombre">${esc(p.nombre)}</h3>
        <p class="prod__desc">${esc(p.descripcion)}</p>
        <p class="prod__meta">Alérgenos: ${esc((p.alergenos || []).join(", ")) || "ninguno"}</p>
        <div class="prod__pie">
          <span class="prod__precio">${pesos(p.precio)}</span>
          <button type="button" class="btn btn--primary" data-pedir="${esc(p.id)}">Pedir</button>
        </div>
        <div class="prod__compartir">
          <button type="button" class="btn btn--ghost" data-compartir="${esc(p.id)}" aria-label="Compartir ${esc(p.nombre)} por WhatsApp">↗ Compartir</button>
        </div>
      </div>
    </article>`).join("");

  gal.querySelectorAll("[data-pedir]").forEach((b) => {
    b.addEventListener("click", () => {
      const sel = document.getElementById("p-sabor");
      sel.value = b.dataset.pedir;
      document.getElementById("pedido").scrollIntoView({ behavior: "smooth" });
      document.getElementById("p-cantidad").focus({ preventScroll: true });
    });
  });

  // Compartir un postre concreto por WhatsApp
  gal.querySelectorAll("[data-compartir]").forEach((b) => {
    b.addEventListener("click", () => {
      const p = DATA.productos.find((x) => x.id === b.dataset.compartir);
      if (!p) return;
      const url = "https://wa.me/" + DATA.contacto.whatsapp + "?text=" +
        encodeURIComponent("Mira este postre: " + p.nombre + " — " + pesos(p.precio));
      window.open(url, "_blank", "noopener");
    });
  });
}

/* ---- Controles del carrusel: flechas, dots y autoplay ---- */
function pintarControlesCarrusel() {
  const gal = document.getElementById("galeria");
  const dots = document.getElementById("car-dots");
  const prev = document.getElementById("car-prev");
  const next = document.getElementById("car-next");
  if (!gal || !dots || !prev || !next) return;

  const cards = [...gal.children];
  if (!cards.length) return;
  const GAP = 14; // debe coincidir con .galeria { gap }
  const paso = () => cards[0].getBoundingClientRect().width + GAP;

  // Un dot por tarjeta
  dots.innerHTML = "";
  cards.forEach((c, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "car-dot";
    b.setAttribute("role", "tab");
    b.setAttribute("aria-label", "Ir a la diapositiva " + (i + 1));
    b.addEventListener("click", () =>
      c.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }));
    dots.appendChild(b);
  });

  // Flechas
  prev.addEventListener("click", () => gal.scrollBy({ left: -paso(), behavior: "smooth" }));
  next.addEventListener("click", () => gal.scrollBy({ left: paso(), behavior: "smooth" }));

  // Dot activo: la tarjeta cuyo centro está más cerca del centro visible
  const actualizar = () => {
    const centro = gal.getBoundingClientRect().left + gal.clientWidth / 2;
    let idx = 0, mejor = Infinity;
    cards.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - centro);
      if (d < mejor) { mejor = d; idx = i; }
    });
    [...dots.children].forEach((d, i) => d.classList.toggle("is-active", i === idx));
  };
  gal.addEventListener("scroll", actualizar, { passive: true });
  window.addEventListener("resize", actualizar);
  actualizar();

  // Autoplay: se omite si el usuario prefiere menos movimiento
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let timer = null;
  const arrancar = () => {
    if (timer) return;
    timer = setInterval(() => {
      const fin = gal.scrollWidth - gal.clientWidth;
      if (gal.scrollLeft >= fin - 4) gal.scrollTo({ left: 0, behavior: "smooth" });
      else gal.scrollBy({ left: paso(), behavior: "smooth" });
    }, 4000);
  };
  const parar = () => { if (timer) { clearInterval(timer); timer = null; } };

  arrancar();
  gal.addEventListener("mouseenter", parar);
  gal.addEventListener("mouseleave", arrancar);
  gal.addEventListener("focusin", parar);
  gal.addEventListener("focusout", arrancar);
  document.addEventListener("visibilitychange", () => {
    document.hidden ? parar() : arrancar();
  });
}

/* ---- Select de sabores (desde data.json) ---- */
function pintarSelect() {
  const sel = document.getElementById("p-sabor");
  sel.innerHTML = '<option value="">Selecciona un sabor</option>' +
    DATA.productos.map((p) => `<option value="${esc(p.id)}">${esc(p.nombre)} — ${pesos(p.precio)}</option>`).join("");
}

/* ---- JSON-LD de productos (MenuItem) para SEO ---- */
function inyectarJSONLD() {
  const ld = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Postres de " + DATA.marca.nombre,
    "itemListElement": DATA.productos.map((p, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "item": {
        "@type": "MenuItem",
        "name": p.nombre,
        "description": p.descripcion,
        "offers": { "@type": "Offer", "price": String(p.precio), "priceCurrency": "COP" }
      }
    }))
  };
  const s = document.createElement("script");
  s.type = "application/ld+json";
  s.textContent = JSON.stringify(ld);
  document.head.appendChild(s);
}

/* ---- Formulario → WhatsApp ---- */
function enviarPedido(ev) {
  ev.preventDefault();
  const msg = document.getElementById("pedido-msg");
  const datos = Object.fromEntries(new FormData(ev.target).entries());

  const faltantes = [];
  if (!datos.nombre) faltantes.push("nombre");
  if (!datos.telefono) faltantes.push("teléfono");
  if (!datos.sabor) faltantes.push("sabor");
  if (!datos.direccion) faltantes.push("dirección");

  if (faltantes.length) {
    msg.className = "pedido__msg err";
    msg.textContent = "Falta completar: " + faltantes.join(", ") + ".";
    return;
  }

  const producto = DATA.productos.find((p) => p.id === datos.sabor);
  const sabor = producto ? producto.nombre : datos.sabor;
  const partes = [
    "Hola, soy " + datos.nombre.trim(),
    "Tel: " + datos.telefono.trim(),
    "Quiero " + datos.cantidad + " × " + sabor,
    "Dirección: " + datos.direccion.trim()
  ];
  if (datos.notas.trim()) partes.push("Notas: " + datos.notas.trim());

  const texto = partes.join(". ") + ".";
  const url = "https://wa.me/" + DATA.contacto.whatsapp + "?text=" + encodeURIComponent(texto);

  // Respaldo del pedido por si el usuario recarga antes de confirmar en WhatsApp.
  try {
    localStorage.setItem("ps-snoopy-ultimo-pedido", JSON.stringify({ ...datos, fecha: new Date().toISOString() }));
  } catch (e) { /* modo privado: se ignora */ }

  msg.className = "pedido__msg ok";
  msg.innerHTML = 'Abriendo WhatsApp… Si no abre, <a href="' + url + '" target="_blank" rel="noopener">toca aquí</a>.';
  window.open(url, "_blank", "noopener");
}

/* ---- Hero: si el video falla, ocultarlo para que se vea el degradado ---- */
function vigilarVideo() {
  const v = document.getElementById("heroVideo");
  if (!v) return;
  const ocultar = () => { v.style.display = "none"; };
  v.addEventListener("error", ocultar, { once: true });
  const src = v.querySelector("source");
  if (src) src.addEventListener("error", ocultar, { once: true });
}

/* ---- Arranque ---- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("anio").textContent = new Date().getFullYear();
  document.getElementById("form-pedido").addEventListener("submit", enviarPedido);
  vigilarVideo();
  cargarDatos();
});

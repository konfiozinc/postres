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
    { id: "crema",     nombre: "Fresas con crema",     nombreCompleto: "Fresas con crema",     descripcion: "Fresas frescas y crema suave", precio: 10000, imagen: "assets/postre-fresas-crema.webp", alergenos: ["Lácteos"] },
    { id: "chocolate", nombre: "Fresas con chocolate", nombreCompleto: "Fresas con chocolate", descripcion: "Chocolate y trocitos crocantes", precio: 10000, imagen: "assets/postre-fresas-chocolate.webp", alergenos: ["Lácteos"] },
    { id: "caramelo",  nombre: "Caramelo y galleta",   nombreCompleto: "Caramelo y galleta",   descripcion: "Caramelo y galleta crocante", precio: 10000, imagen: "assets/postre-fresas-caramelo.webp", alergenos: ["Lácteos", "gluten"] },
    { id: "maracuya",  nombre: "Maracuyá",             nombreCompleto: "Caramelo, crema y maracuyá", descripcion: "Caramelo con maracuyá", precio: 8000, imagen: "assets/postre-fresas-maracuya.webp", alergenos: ["Lácteos"] },
    { id: "oreo",      nombre: "Oreo",                 nombreCompleto: "Caramelo, crema y Oreo", descripcion: "Caramelo con Oreo", precio: 8000, imagen: "assets/postre-fresas-oreo.webp", alergenos: ["Lácteos", "gluten"] },
    { id: "mango",     nombre: "Mango",                nombreCompleto: "Caramelo, crema y mango", descripcion: "Caramelo con mango", precio: 8000, imagen: "assets/postre-fresas-mango.webp", alergenos: ["Lácteos"] }
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
  inyectarJSONLD();
  pintarFlotante();
  cargarCarrito();
  pintarCarrito();
  document.title = DATA.marca.nombre + " — " + DATA.marca.eslogan;
}

/* ---- Botón flotante de WhatsApp (se oculta cuando el form está visible) ---- */
function pintarFlotante() {
  const a = document.createElement("a");
  a.className = "wa-float";
  a.href = "https://wa.me/" + DATA.contacto.whatsapp + "?text=" + encodeURIComponent("Hola, quiero hacer un pedido 😊");
  a.target = "_blank";
  a.rel = "noopener";
  a.setAttribute("aria-label", "Contactar por WhatsApp");
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
      <img class="prod__img" src="${esc(p.imagen)}" alt="${esc(p.nombre)}" loading="lazy" width="720" height="960"
           onerror="this.style.display='none';this.parentNode.querySelector('.prod__ph').style.display='flex'">
      <span class="prod__ph" aria-hidden="true" style="display:none">🍓</span>
      <div class="prod__body">
        <h3 class="prod__nombre">${esc(p.nombre)}</h3>
        <p class="prod__desc">${esc(p.descripcion)}</p>
        <p class="prod__meta">Alérgenos: ${esc((p.alergenos || []).join(", ")) || "ninguno"}</p>
        <div class="prod__pie">
          <span class="prod__precio">${pesos(p.precio)}</span>
          <div class="prod__qty" aria-label="Cantidad de ${esc(p.nombre)}">
            <button type="button" data-qty="-1" aria-label="Disminuir cantidad de ${esc(p.nombre)}">−</button>
            <span class="qty-val">1</span>
            <button type="button" data-qty="1" aria-label="Aumentar cantidad de ${esc(p.nombre)}">+</button>
          </div>
        </div>
        <button type="button" class="btn btn--primary btn--agregar" data-agregar="${esc(p.id)}">🛒 Agregar</button>
        <button type="button" class="btn--directo" data-directo="${esc(p.id)}">Pedir solo este →</button>
      </div>
    </article>`).join("");

  // Selector de cantidad dentro de cada tarjeta
  gal.querySelectorAll("[data-qty]").forEach((b) => {
    b.addEventListener("click", () => {
      const val = b.closest(".prod__qty").querySelector(".qty-val");
      const n = Math.min(20, Math.max(1, parseInt(val.textContent, 10) + parseInt(b.dataset.qty, 10)));
      val.textContent = n;
    });
  });

  // Agregar al carrito
  gal.querySelectorAll("[data-agregar]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.agregar;
      const qty = parseInt(b.closest(".prod").querySelector(".qty-val").textContent, 10);
      agregarAlCarrito(id, qty);
      const orig = b.textContent;
      b.textContent = "✓ Agregado";
      setTimeout(() => { b.textContent = orig; }, 1500);
    });
  });

  // Pedir solo este producto (respaldo directo)
  gal.querySelectorAll("[data-directo]").forEach((b) => {
    b.addEventListener("click", () => pedirDirecto(b.dataset.directo));
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
        "name": p.nombreCompleto,
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

/* ---- Carrito: estado, persistencia y drawer ---- */
let carrito = [];
let carritoMemoria = [];
const CART_KEY = "snoopy-cart";

function productoDe(id) { return DATA.productos.find((p) => p.id === id); }
function itemDe(id) { return carrito.find((c) => c.id === id); }
function totalCarrito() {
  return carrito.reduce((s, c) => s + (productoDe(c.id) ? productoDe(c.id).precio : 0) * c.cantidad, 0);
}
function contarProductos() {
  return carrito.reduce((s, c) => s + c.cantidad, 0);
}

function cargarCarrito() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    carrito = raw ? JSON.parse(raw) : [];
  } catch (e) {
    carrito = carritoMemoria;
  }
}
function guardarCarrito() {
  try { localStorage.setItem(CART_KEY, JSON.stringify(carrito)); }
  catch (e) { carritoMemoria = carrito.slice(); }
}

function agregarAlCarrito(id, cantidad) {
  const item = itemDe(id);
  if (item) item.cantidad += cantidad;
  else carrito.push({ id, cantidad });
  guardarCarrito();
  pintarCarrito();
  toast("✅ Agregado al carrito");
}
function cambiarCantidad(id, delta) {
  const item = itemDe(id);
  if (!item) return;
  item.cantidad += delta;
  if (item.cantidad <= 0) carrito = carrito.filter((c) => c.id !== id);
  guardarCarrito();
  pintarCarrito();
}
function quitarDelCarrito(id) {
  carrito = carrito.filter((c) => c.id !== id);
  guardarCarrito();
  pintarCarrito();
}
function vaciarCarrito() {
  if (!carrito.length) return;
  if (!window.confirm("¿Vaciar el carrito?")) return;
  carrito = [];
  guardarCarrito();
  pintarCarrito();
}

function pintarCarrito() {
  const lista = document.getElementById("drawer-items");
  const vacio = document.getElementById("drawer-vacio");
  const totales = document.getElementById("drawer-totales");
  const floatBtn = document.getElementById("cart-float");
  if (!lista) return;

  const total = totalCarrito();
  const n = contarProductos();

  lista.innerHTML = carrito.map((c) => {
    const p = productoDe(c.id);
    if (!p) return "";
    return `
      <li class="drawer__item">
        <img class="drawer__item-img" src="${esc(p.imagen)}" alt="${esc(p.nombre)}" width="48" height="48">
        <div class="drawer__item-info">
          <p class="drawer__item-nombre">${esc(p.nombre)}</p>
          <span class="drawer__item-precio">${pesos(p.precio * c.cantidad)}</span>
        </div>
        <div class="drawer__qty">
          <button type="button" data-qty="-1" data-id="${esc(p.id)}" aria-label="Disminuir cantidad de ${esc(p.nombre)}">−</button>
          <span class="qty-val">${c.cantidad}</span>
          <button type="button" data-qty="1" data-id="${esc(p.id)}" aria-label="Aumentar cantidad de ${esc(p.nombre)}">+</button>
        </div>
        <button type="button" class="drawer__item-del" data-del="${esc(p.id)}" aria-label="Eliminar ${esc(p.nombre)} del carrito">×</button>
      </li>`;
  }).join("");

  vacio.hidden = carrito.length > 0;
  totales.hidden = carrito.length === 0;
  document.getElementById("drawer-subtotal").textContent = pesos(total);
  document.getElementById("drawer-total").textContent = pesos(total);

  if (floatBtn) {
    floatBtn.classList.toggle("is-hidden", carrito.length === 0);
    floatBtn.innerHTML = "🛒 " + n + (n === 1 ? " producto" : " productos") + " · " + pesos(total);
  }
}

/* ---- Drawer: abrir/cerrar ---- */
let drawerTrigger = null;
function abrirDrawer() {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("drawer");
  drawerTrigger = document.activeElement;
  overlay.hidden = false;
  drawer.hidden = false;
  requestAnimationFrame(() => {
    overlay.classList.add("is-open");
    drawer.classList.add("is-open");
  });
  setTimeout(() => { const f = document.getElementById("c-nombre"); if (f) f.focus(); }, 320);
}
function cerrarDrawer() {
  const overlay = document.getElementById("drawer-overlay");
  const drawer = document.getElementById("drawer");
  overlay.classList.remove("is-open");
  drawer.classList.remove("is-open");
  setTimeout(() => {
    overlay.hidden = true;
    drawer.hidden = true;
    if (drawerTrigger && drawerTrigger.focus) drawerTrigger.focus();
  }, 300);
}

/* ---- Toast ---- */
let toastTimer = null;
function toast(texto) {
  let t = document.getElementById("toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "toast";
    t.className = "toast";
    document.body.appendChild(t);
  }
  t.textContent = texto;
  t.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("is-visible"), 1800);
}

/* ---- Pedir solo este producto (respaldo directo) ---- */
function pedirDirecto(id) {
  const p = productoDe(id);
  if (!p) return;
  const texto = "Hola, quiero hacer un pedido 😊\n\n• 1× " + p.nombreCompleto + " - " + pesos(p.precio);
  window.open("https://wa.me/" + DATA.contacto.whatsapp + "?text=" + encodeURIComponent(texto), "_blank", "noopener");
}

/* ---- Enviar pedido del carrito por WhatsApp ---- */
function enviarPedidoCarrito() {
  const msg = document.getElementById("pedido-msg");

  if (!carrito.length) {
    msg.className = "pedido__msg err";
    msg.textContent = "Tu carrito está vacío. Agrega postres primero.";
    return;
  }

  const nombre = document.getElementById("c-nombre").value.trim();
  const telefono = document.getElementById("c-telefono").value.trim();
  const direccion = document.getElementById("c-direccion").value.trim();
  const notas = document.getElementById("c-notas").value.trim();

  const faltantes = [];
  if (!nombre) faltantes.push("nombre");
  if (!telefono) faltantes.push("teléfono");
  if (!direccion) faltantes.push("dirección");
  if (faltantes.length) {
    msg.className = "pedido__msg err";
    msg.textContent = "Falta completar: " + faltantes.join(", ") + ".";
    return;
  }

  const lineas = carrito.map((c) => {
    const p = productoDe(c.id);
    return "• " + c.cantidad + "× " + (p ? p.nombreCompleto : c.id) + " - " + pesos((p ? p.precio : 0) * c.cantidad);
  });
  const partes = [
    "Hola, soy " + nombre + ". Quiero:",
    lineas.join("\n"),
    "Total: " + pesos(totalCarrito()),
    "Tel: " + telefono,
    "Dirección: " + direccion
  ];
  if (notas) partes.push("Notas: " + notas);

  const url = "https://wa.me/" + DATA.contacto.whatsapp + "?text=" + encodeURIComponent(partes.join("\n"));
  msg.className = "pedido__msg ok";
  msg.innerHTML = 'Abriendo WhatsApp… Si no abre, <a href="' + url + '" target="_blank" rel="noopener">toca aquí</a>.';
  window.open(url, "_blank", "noopener");
}

/* ---- Init: listeners del carrito/drawer ---- */
function initCarrito() {
  const abrir = document.getElementById("btn-abrir-carrito");
  const float = document.getElementById("cart-float");
  const cerrar = document.getElementById("drawer-cerrar");
  const overlay = document.getElementById("drawer-overlay");
  const enviar = document.getElementById("btn-enviar");
  const vaciar = document.getElementById("btn-vaciar");
  const items = document.getElementById("drawer-items");

  if (abrir) abrir.addEventListener("click", abrirDrawer);
  if (float) float.addEventListener("click", abrirDrawer);
  if (cerrar) cerrar.addEventListener("click", cerrarDrawer);
  if (overlay) overlay.addEventListener("click", cerrarDrawer);
  if (enviar) enviar.addEventListener("click", enviarPedidoCarrito);
  if (vaciar) vaciar.addEventListener("click", vaciarCarrito);

  if (items) {
    items.addEventListener("click", (e) => {
      const qtyBtn = e.target.closest("[data-qty][data-id]");
      if (qtyBtn) { cambiarCantidad(qtyBtn.dataset.id, parseInt(qtyBtn.dataset.qty, 10)); return; }
      const delBtn = e.target.closest("[data-del]");
      if (delBtn) quitarDelCarrito(delBtn.dataset.del);
    });
  }

  document.addEventListener("keydown", (e) => {
    const drawer = document.getElementById("drawer");
    if (!drawer.classList.contains("is-open")) return;
    if (e.key === "Escape") { cerrarDrawer(); return; }
    if (e.key === "Tab") {
      const focusables = drawer.querySelectorAll("button, input, textarea, a[href]");
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    }
  });
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

/* ---- Partículas flotantes del hero: frutas que suben y explotan (canvas) ---- */
function crearParticulas() {
  const canvas = document.getElementById("hero-particles");
  const hero = document.querySelector(".hero");
  if (!canvas || !hero) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const movil = window.matchMedia("(max-width: 480px)").matches;
  const N = movil ? 8 : 12;
  const frutas = ["🍓", "🫐", "🍒", "❤️"];
  const chispas = ["#e63950", "#ffb6c1"];

  let W = 0, H = 0, partes = [], chispa = [], visible = true;

  const redimensionar = () => {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  redimensionar();
  window.addEventListener("resize", redimensionar);

  const nueva = (y) => ({
    x: Math.random() * W,
    y: y == null ? H + 40 : y,
    vx: (Math.random() - 0.5) * 0.4,
    vy: 0.35 + Math.random() * 0.6,
    tam: 16 + Math.random() * 14,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.03,
    emoji: frutas[(Math.random() * frutas.length) | 0],
    op: 0.4 + Math.random() * 0.5
  });

  const explotar = (p) => {
    const n = movil ? 5 : 7;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      const v = 1.5 + Math.random() * 2.5;
      chispa.push({
        x: p.x, y: p.y,
        vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        tam: 2 + Math.random() * 3,
        color: chispas[i % 2],
        vida: 1
      });
    }
  };

  for (let i = 0; i < N; i++) partes.push(nueva(Math.random() * H));

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; }, { threshold: 0 });
    io.observe(hero);
  }

  (function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    ctx.clearRect(0, 0, W, H);

    for (let i = 0; i < partes.length; i++) {
      const p = partes[i];
      p.y -= p.vy;
      p.x += p.vx;
      p.rot += p.vr;

      if (p.y < 50) { explotar(p); partes[i] = nueva(); continue; }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = p.op;
      ctx.font = p.tam + "px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.emoji, 0, 0);
      ctx.restore();
    }

    for (let i = chispa.length - 1; i >= 0; i--) {
      const s = chispa[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.06;
      s.vida -= 0.025;
      if (s.vida <= 0) { chispa.splice(i, 1); continue; }
      ctx.globalAlpha = Math.max(0, s.vida);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.tam, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  })();
}

/* ---- Scroll-spy: marca el tab activo según la sección visible ---- */
function initScrollSpy() {
  const items = [...document.querySelectorAll(".tabbar a")];
  if (!items.length || !("IntersectionObserver" in window)) return;

  const activar = (href) => {
    items.forEach((a) => a.classList.toggle("activo", a.getAttribute("href") === href));
  };

  // Feedback inmediato al tocar (el scroll suave ya viene del CSS).
  items.forEach((a) => a.addEventListener("click", () => activar(a.getAttribute("href"))));

  // Solo se observan las secciones que tienen su tab correspondiente.
  const conTab = new Set(items.map((a) => (a.getAttribute("href") || "").slice(1)));
  const secciones = [...document.querySelectorAll("section[id], footer[id]")]
    .filter((s) => conTab.has(s.id));

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) activar("#" + e.target.id);
    });
  }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });

  secciones.forEach((s) => observer.observe(s));
}

/* ---- Arranque ---- */
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("anio").textContent = new Date().getFullYear();
  vigilarVideo();
  crearParticulas();
  initScrollSpy();
  initCarrito();
  cargarDatos();
});

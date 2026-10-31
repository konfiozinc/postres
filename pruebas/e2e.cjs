/* ============================================================
   Pruebas de extremo a extremo de Postres Snoopy (Playwright).
   Requiere Playwright instalado; es una herramienta de desarrollo.
   Ejecutar:  node pruebas/e2e.cjs [--solo-visual]
   Variables: RCL_CHROMIUM = ruta al ejecutable de Chromium.
   ============================================================ */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

const RAIZ = path.join(__dirname, "..");
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml" };
const PUERTO = 8095;
const VIEWS = [[375, 812], [768, 1024], [1440, 900], [1920, 1080]];

let ok = 0, ko = 0;
const chk = (nombre, cond, extra) => { cond ? ok++ : ko++; console.log((cond ? "  PASS  " : "  FALLA ") + nombre + (extra ? "  (" + extra + ")" : "")); };

function cargarPlaywright() {
  const rutas = [
    process.env.PLAYWRIGHT_PATH,
    "C:/Users/usuario29/Documents/KONFIO_ZINC/6-LANDING-PAGES/RedCaliNet/admin/node_modules/@playwright/test",
    "playwright",
    "@playwright/test",
  ].filter(Boolean);
  for (const r of rutas) { try { return require(r); } catch (e) { /* siguiente */ } }
  throw new Error("No se encontró Playwright. Instálalo o define PLAYWRIGHT_PATH.");
}

function servir() {
  return new Promise((res) => {
    const s = http.createServer((q, w) => {
      let u = decodeURIComponent(q.url.split("?")[0]);
      if (u === "/favicon.ico") { w.writeHead(204); return w.end(); }
      if (u === "/") u = "/index.html";
      const f = path.join(RAIZ, u);
      fs.readFile(f, (e, b) => {
        if (e) { w.writeHead(404); return w.end("404"); }
        w.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" });
        w.end(b);
      });
    });
    s.listen(PUERTO, () => res(s));
  });
}

(async () => {
  const { chromium } = cargarPlaywright();
  const srv = await servir();
  const navegador = await chromium.launch(process.env.RCL_CHROMIUM ? { executablePath: process.env.RCL_CHROMIUM } : {});
  const URL = "http://127.0.0.1:" + PUERTO + "/";

  /* ---------- 1. distribución en los cuatro tamaños ---------- */
  console.log("=== 1. Distribución y contenido");
  for (const [w, h] of VIEWS) {
    const p = await navegador.newPage({ viewport: { width: w, height: h } });
    const errores = [], fallos = [];
    p.on("console", (m) => { if (m.type() === "error") errores.push(m.text().slice(0, 90)); });
    p.on("response", (r) => { if (r.status() >= 400) fallos.push(r.status() + " " + r.url()); });
    await p.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); } });
    await p.waitForTimeout(900);
    const m = await p.evaluate(() => {
      const cont = document.querySelector(".contenedor").getBoundingClientRect();
      const cards = [...document.querySelectorAll(".prod")];
      const rects = cards.map((c) => c.getBoundingClientRect());
      const dentro = (r) => r.width > 0 && r.left >= -1 && r.right <= window.innerWidth + 1;
      const botones = [...document.querySelectorAll("button, .btn")].map((b) => b.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0).map((r) => Math.round(r.height));
      const imgs = [...document.querySelectorAll(".prod__img")].map((i) => ({ ok: i.complete && i.naturalWidth > 0, alto: Math.round(i.getBoundingClientRect().height) }));
      const tab = document.querySelector(".tabbar");
      return {
        contenedor: Math.round(cont.width),
        tarjetas: cards.length,
        columnas: new Set(rects.map((r) => Math.round(r.left))).size,
        tarjetaAncho: rects[0] ? Math.round(rects[0].width) : 0,
        fotoAlto: imgs[0] ? imgs[0].alto : 0,
        fotosOk: imgs.filter((i) => i.ok).length,
        overflowX: document.documentElement.scrollWidth - window.innerWidth,
        fuera: rects.filter((r) => !dentro(r)).length,
        tapMinimo: botones.length ? Math.min(...botones) : 0,
        tabbarVisible: tab ? getComputedStyle(tab).display !== "none" : false,
        intro: document.querySelector(".hero__titulo") ? document.querySelector(".hero__titulo").textContent.trim() : "",
      };
    });
    console.log("\n--- " + w + "x" + h);
    chk("6 productos visibles", m.tarjetas === 6, String(m.tarjetas));
    chk("fotos cargadas 6/6", m.fotosOk === 6, m.fotosOk + "/6 · alto " + m.fotoAlto + "px");
    chk("contenedor <= 1200 px", m.contenedor <= 1200, m.contenedor + "px · " + m.columnas + " col · tarjeta " + m.tarjetaAncho + "px");
    chk("sin desbordamiento horizontal", m.overflowX <= 0 && m.fuera === 0, m.overflowX + "px · " + m.fuera + " fuera");
    chk("objetivos táctiles >= 44 px", m.tapMinimo >= 44, m.tapMinimo + "px");
    chk("navegación según tamaño", w >= 900 ? !m.tabbarVisible : m.tabbarVisible, "tabbar " + (m.tabbarVisible ? "visible" : "oculta"));
    chk("sin errores de consola", errores.filter((e) => !/favicon/.test(e)).length === 0, errores.slice(0, 1).join("") || "ninguno");
    chk("sin recursos 404", fallos.filter((f) => !f.includes("favicon")).length === 0, fallos.slice(0, 1).join("") || "ninguno");
    await p.screenshot({ path: "C:/KZ-EVIDENCIA/kz-snoopy/despues-" + w + "x" + h + ".png", fullPage: true });
    await p.close();
  }

  /* ---------- 2. carrito y flujo de pedido ---------- */
  console.log("\n=== 2. Carrito y flujo de pedido (nunca afirma envío)");
  const p = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await p.addInitScript(() => {
    window.__abiertas = [];
    window.open = (u) => { window.__abiertas.push(u); return { closed: false }; };
    window.confirm = () => true;
  });
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForSelector(".prod");

  await p.evaluate(() => {
    const cards = [...document.querySelectorAll(".prod")];
    cards[0].querySelector('[data-qty="1"]').click();
    cards[0].querySelector('[data-qty="1"]').click();   // cantidad 3
    cards[0].querySelector("[data-agregar]").click();
    cards[1].querySelector("[data-agregar]").click();
  });
  await p.click("#cart-float");
  await p.waitForTimeout(500);
  const c1 = await p.evaluate(() => ({
    lineas: document.querySelectorAll(".drawer__item").length,
    subtotal: document.querySelector("#drawer-subtotal").textContent.trim(),
    total: document.querySelector("#drawer-total").textContent.trim(),
    enCaja: document.querySelector("#drawer").getBoundingClientRect().width <= window.innerWidth + 1,
  }));
  chk("dos líneas en el carrito", c1.lineas === 2, String(c1.lineas));
  chk("subtotal = 3×10.000 + 1×10.000 = $40.000", c1.subtotal.replace(/[^0-9]/g, "") === "40000", c1.subtotal + " / " + c1.total);
  chk("el carrito cabe en pantalla", c1.enCaja);

  await p.click("#btn-enviar");
  await p.waitForTimeout(300);
  const erroresForm = await p.evaluate(() => ({
    mensajes: [...document.querySelectorAll(".campo__error")].map((e) => e.textContent.trim()).filter(Boolean),
    pasoListo: !document.querySelector("#paso-listo").hidden,
  }));
  chk("valida los campos obligatorios", erroresForm.mensajes.length >= 3 && !erroresForm.pasoListo, erroresForm.mensajes.length + " errores");

  await p.fill("#c-nombre", "Ana");
  await p.fill("#c-telefono", "123");
  await p.fill("#c-direccion", "Calle 10 #5-20, Bello");
  await p.click("#btn-enviar");
  await p.waitForTimeout(200);
  const telMal = await p.evaluate(() => document.querySelector("#err-telefono").textContent.trim());
  chk("rechaza teléfono inválido", /10 dígitos/.test(telMal), telMal);

  await p.fill("#c-telefono", "3001112233");
  await p.click("#btn-enviar");
  await p.waitForTimeout(400);
  const c2 = await p.evaluate(() => ({
    listo: !document.querySelector("#paso-listo").hidden,
    datos: !document.querySelector("#paso-datos").hidden,
    mensaje: document.querySelector("#mensaje-preview").textContent,
    estado: document.querySelector("#estado-pedido").textContent.trim(),
    lineas: document.querySelectorAll(".drawer__item").length,
    href: document.querySelector("#btn-abrir-wa").getAttribute("href"),
  }));
  chk("pasa a «pedido preparado»", c2.listo && !c2.datos);
  chk("el mensaje lleva el pedido y el total", /Hola, soy Ana/.test(c2.mensaje) && /Total de productos/.test(c2.mensaje) && c2.mensaje.includes("40.000"));
  chk("no afirma que el pedido fue enviado", !/enviado|recibido/i.test(c2.estado + " " + c2.mensaje), c2.estado);
  chk("el carrito NO se vació solo", c2.lineas === 2, c2.lineas + " líneas");
  chk("enlace de WhatsApp correcto", /^https:\/\/wa\.me\/573009981576\?text=/.test(c2.href), (c2.href || "").slice(0, 42));

  const [popup] = await Promise.all([
    p.waitForEvent("popup", { timeout: 8000 }).catch(() => null),
    p.click("#btn-abrir-wa"),
  ]);
  await p.waitForTimeout(400);
  const urlPopup = popup ? popup.url() : "";
  if (popup) await popup.close().catch(() => {});
  const c3 = await p.evaluate(() => ({
    abiertas: window.__abiertas.length,
    estado: document.querySelector("#estado-whatsapp").textContent.trim(),
    marcado: !document.querySelector("#paso-whatsapp").hidden,
    lineas: document.querySelectorAll(".drawer__item").length,
  }));
  chk("abre WhatsApp en una pestaña nueva con el pedido", /(wa\.me\/573009981576|api\.whatsapp\.com\/send\/\?phone=573009981576)/.test(urlPopup), urlPopup.slice(0, 55) || "sin pestaña");
  chk("avisa que aún no se ha enviado", /no se envía hasta/i.test(c3.estado), c3.estado.slice(0, 60));
  chk("el carrito sigue intacto", c3.lineas === 2);

  await p.click("#btn-marco-enviado");
  await p.waitForTimeout(300);
  const c4 = await p.evaluate(() => ({
    enviado: !document.querySelector("#estado-enviado").hidden,
    texto: document.querySelector("#estado-enviado").textContent.trim(),
    lineas: document.querySelectorAll(".drawer__item").length,
  }));
  chk("estado «enviado por ti · pendiente de confirmación»", c4.enviado && /pendiente de confirmación/i.test(c4.texto), c4.texto.slice(0, 60));
  chk("el carrito sigue intacto hasta acción explícita", c4.lineas === 2);

  await p.click("#btn-vaciar");
  await p.waitForTimeout(400);
  const c5 = await p.evaluate(() => ({ lineas: document.querySelectorAll(".drawer__item").length, vacio: !document.querySelector("#drawer-vacio").hidden }));
  chk("vaciar carrito funciona con acción explícita", c5.lineas === 0 && c5.vacio);
  await p.close();

  /* ---------- 3. carrito manipulado en localStorage ---------- */
  console.log("\n=== 3. Manipulación de localStorage");
  const p3 = await navegador.newPage({ viewport: { width: 390, height: 844 } });
  await p3.goto(URL, { waitUntil: "domcontentloaded" });
  await p3.evaluate(() => {
    localStorage.setItem("snoopy-cart-v2", JSON.stringify([
      { id: "crema", cantidad: 999 },          // se acota a 20
      { id: "inventado", cantidad: 4 },        // se descarta
      { id: "oreo", cantidad: -3 },            // se descarta
      { id: "maracuya", cantidad: "2" },       // se acepta 2
    ]));
  });
  await p3.reload({ waitUntil: "networkidle" });
  await p3.waitForSelector(".prod");
  await p3.click("#cart-float");
  await p3.waitForTimeout(400);
  const m3 = await p3.evaluate(() => ({
    lineas: [...document.querySelectorAll(".drawer__item")].map((li) => li.querySelector(".drawer__item-nombre").textContent.trim() + "×" + li.querySelector(".qty-val").textContent.trim()),
    total: document.querySelector("#drawer-total").textContent.trim(),
    guardado: localStorage.getItem("snoopy-cart-v2"),
  }));
  chk("descarta productos inventados y cantidades inválidas", m3.lineas.length === 2 && !m3.lineas.some((l) => /inventado|oreo/.test(l)), m3.lineas.join(" · "));
  chk("acota la cantidad máxima", m3.lineas.some((l) => /×20$/.test(l)));
  chk("total recalculado con precios del catálogo", m3.total.replace(/[^0-9]/g, "") === String(20 * 10000 + 2 * 8000), m3.total);
  chk("el almacenamiento queda saneado", !/999|inventado|-3/.test(m3.guardado || ""), String(m3.guardado).slice(0, 60));
  await p3.close();

  /* ---------- 4. catálogo caído ---------- */
  console.log("\n=== 4. Catálogo no disponible");
  const p4 = await navegador.newPage({ viewport: { width: 900, height: 900 } });
  await p4.route("**/data.json", (r) => r.abort());
  await p4.goto(URL, { waitUntil: "networkidle" });
  await p4.waitForTimeout(800);
  const m4 = await p4.evaluate(() => ({
    aviso: document.querySelector("#catalogo-aviso").hidden === false,
    texto: document.querySelector("#catalogo-aviso").textContent.trim(),
    tarjetas: document.querySelectorAll(".prod").length,
    hero: !!document.querySelector(".hero__titulo"),
    pie: !!document.querySelector(".footer"),
  }));
  chk("avisa que no pudo cargar el catálogo", m4.aviso && /No pudimos cargar el catálogo/.test(m4.texto));
  chk("no inventa productos", m4.tarjetas === 0, String(m4.tarjetas));
  chk("la interfaz sigue en pie", m4.hero && m4.pie);
  await p4.close();

  await navegador.close();
  srv.close();
  console.log("\nRESULTADO KZ-SNOOPY-002: PASS " + ok + " · FALLA " + ko);
  process.exit(ko ? 3 : 0);
})().catch((e) => { console.error("ERROR: " + e.message + "\n" + (e.stack || "").slice(0, 300)); process.exit(2); });

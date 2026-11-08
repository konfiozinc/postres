/* ============================================================
   Pruebas automáticas del núcleo de Postres Snoopy
   Ejecutar: node --test pruebas/
   No necesita dependencias: usa el runner incluido en Node.
   ============================================================ */
"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const nucleo = require("../script.js");

const RUTA_DATOS = path.join(__dirname, "..", "data.json");
const DATOS = JSON.parse(fs.readFileSync(RUTA_DATOS, "utf8"));

/* ---------- precios ---------- */
test("precioValido: solo enteros positivos razonables", () => {
  assert.strictEqual(nucleo.precioValido(8000), 8000);
  assert.strictEqual(nucleo.precioValido("10000"), 10000);
  assert.strictEqual(nucleo.precioValido(0), null);
  assert.strictEqual(nucleo.precioValido(-5000), null);
  assert.strictEqual(nucleo.precioValido("abc"), null);
  assert.strictEqual(nucleo.precioValido(12.5), null);
  assert.strictEqual(nucleo.precioValido(99999999), null);
  assert.strictEqual(nucleo.precioValido(undefined), null);
});

test("cantidadValida: acota entre 1 y MAX_POR_ITEM", () => {
  assert.strictEqual(nucleo.cantidadValida(1), 1);
  assert.strictEqual(nucleo.cantidadValida(2.9), 2);
  assert.strictEqual(nucleo.cantidadValida(999), nucleo.MAX_POR_ITEM);
  assert.strictEqual(nucleo.cantidadValida(0), null);
  assert.strictEqual(nucleo.cantidadValida(-3), null);
  assert.strictEqual(nucleo.cantidadValida("x"), null);
});

/* ---------- catálogo ---------- */
test("el data.json real es válido y conserva los precios oficiales", () => {
  const v = nucleo.validarCatalogo(DATOS);
  assert.strictEqual(v.ok, true);
  assert.strictEqual(v.productos.length, DATOS.productos.length);
  DATOS.productos.forEach((original) => {
    const p = v.productos.find((x) => x.id === original.id);
    assert.ok(p, "falta el producto " + original.id);
    assert.strictEqual(p.precio, original.precio, "el precio de " + original.id + " cambió");
    assert.strictEqual(p.nombre, original.nombre);
  });
});

test("validarCatalogo: rechaza documentos sin productos", () => {
  const vacio = nucleo.validarCatalogo({ productos: [] });
  assert.strictEqual(vacio.ok, false);
  assert.ok(vacio.avisos.length > 0);

  const roto = nucleo.validarCatalogo(null);
  assert.strictEqual(roto.ok, false);
});

test("validarCatalogo: descarta productos inválidos sin romper el resto", () => {
  const doc = {
    marca: { nombre: "Prueba" },
    contacto: { whatsapp: "573001112233" },
    redes: [],
    productos: [
      { id: "ok", nombre: "Postre bueno", precio: 5000, imagen: "assets/a.webp" },
      { id: "sin-precio", nombre: "Sin precio", precio: 0 },
      { id: "negativo", nombre: "Negativo", precio: -100 },
      { nombre: "Sin id", precio: 3000 },
      { id: "ok", nombre: "Duplicado", precio: 4000 },
      { id: "sin-imagen", nombre: "Sin imagen", precio: 7000, imagen: "../../etc/passwd" },
    ],
  };
  const v = nucleo.validarCatalogo(doc);
  assert.strictEqual(v.ok, true);
  assert.deepStrictEqual(v.productos.map((p) => p.id), ["ok", "sin-imagen"]);
  assert.strictEqual(v.productos[1].imagen, "", "una ruta de imagen no permitida se descarta");
  assert.ok(v.avisos.length >= 4);
});

test("validarCatalogo: exige un WhatsApp válido", () => {
  const v = nucleo.validarCatalogo({ marca: { nombre: "X" }, contacto: { whatsapp: "" }, productos: [{ id: "a", nombre: "A", precio: 1000 }] });
  assert.strictEqual(v.ok, false);
});

/* ---------- carrito manipulado ---------- */
test("sanearCarrito: neutraliza manipulación de localStorage", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  const sucio = [
    { id: productos[0].id, cantidad: 2 },
    { id: productos[0].id, cantidad: 3 },        // duplicado → se suma
    { id: "producto-inventado", cantidad: 5 },   // id inexistente → fuera
    { id: productos[1].id, cantidad: -4 },       // negativo → fuera
    { id: productos[2].id, cantidad: 0 },        // cero → fuera
    { id: productos[3].id, cantidad: 999 },      // exceso → se acota
    { id: productos[4].id, cantidad: "3" },      // texto numérico → 3
    "basura",
    null,
  ];
  const limpio = nucleo.sanearCarrito(sucio, productos);
  assert.strictEqual(limpio.find((c) => c.id === productos[0].id).cantidad, 5);
  assert.ok(!limpio.some((c) => c.id === "producto-inventado"));
  assert.ok(!limpio.some((c) => c.id === productos[1].id || c.id === productos[2].id));
  assert.strictEqual(limpio.find((c) => c.id === productos[3].id).cantidad, nucleo.MAX_POR_ITEM);
  assert.strictEqual(limpio.find((c) => c.id === productos[4].id).cantidad, 3);
  assert.strictEqual(limpio.length, 3);
});

test("sanearCarrito: entradas no válidas devuelven carrito vacío", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  assert.deepStrictEqual(nucleo.sanearCarrito(null, productos), []);
  assert.deepStrictEqual(nucleo.sanearCarrito('{"id":"x"}', productos), []);
  assert.deepStrictEqual(nucleo.sanearCarrito("no-json", productos), []);
});

test("el total se calcula con los precios del catálogo, no con los del navegador", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  const carrito = [{ id: productos[0].id, cantidad: 2, precio: 1 }];  // precio falso inyectado
  assert.strictEqual(nucleo.calcularTotal(carrito, productos), productos[0].precio * 2);
  assert.strictEqual(nucleo.calcularTotal([{ id: "no-existe", cantidad: 3 }], productos), 0);
});

test("contarProductos suma cantidades", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  assert.strictEqual(nucleo.contarProductos([{ id: productos[0].id, cantidad: 2 }, { id: productos[1].id, cantidad: 3 }]), 5);
  assert.strictEqual(nucleo.contarProductos([]), 0);
});

/* ---------- formulario ---------- */
test("validarFormulario: exige nombre, teléfono y dirección", () => {
  const vacio = nucleo.validarFormulario({ nombre: "", telefono: "", direccion: "", notas: "" });
  assert.strictEqual(vacio.ok, false);
  assert.ok(vacio.errores.nombre && vacio.errores.telefono && vacio.errores.direccion);

  const corto = nucleo.validarFormulario({ nombre: "A", telefono: "123", direccion: "Calle" });
  assert.strictEqual(corto.ok, false);

  const bueno = nucleo.validarFormulario({ nombre: "Ana", telefono: "300 111 2233", direccion: "Calle 10 #5-20, Bello", notas: "Sin azúcar" });
  assert.strictEqual(bueno.ok, true);
  assert.strictEqual(bueno.limpio.telefono, "3001112233");
  assert.strictEqual(bueno.limpio.direccion, "Calle 10 #5-20, Bello");
});

test("validarFormulario: el teléfono debe tener entre 10 y 15 dígitos", () => {
  assert.ok(nucleo.validarFormulario({ nombre: "Ana", telefono: "300111223", direccion: "Calle 10 #5-20" }).errores.telefono);
  assert.ok(nucleo.validarFormulario({ nombre: "Ana", telefono: "1".repeat(16), direccion: "Calle 10 #5-20" }).errores.telefono);
  assert.strictEqual(nucleo.validarFormulario({ nombre: "Ana", telefono: "3001112233", direccion: "Calle 10 #5-20" }).ok, true);
});

/* ---------- mensaje y enlace ---------- */
/* KZ-MENU-004 · el mensaje usa el formato de factura de los menús: encabezado, código,
   detalle con subtotales, total en negrita y nota de confirmación. */
test("construirMensaje: formato de factura con código, subtotales y total en negrita", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  const carrito = [{ id: productos[0].id, cantidad: 2 }, { id: productos[3].id, cantidad: 1 }];
  const datos = { nombre: "Ana", telefono: "3001112233", direccion: "Calle 10 #5-20", notas: "Para las 6 pm" };
  const msg = nucleo.construirMensaje(datos, carrito, productos, { nombre: "Postres Snoopy" }, "ABCDEFGH2345");
  const total = productos[0].precio * 2 + productos[3].precio;
  const pesos = (n) => "$" + n.toLocaleString("es-CO");

  assert.ok(msg.startsWith("🛍️ *NUEVO PEDIDO EN POSTRES SNOOPY*"), "encabezado con el nombre del negocio");
  assert.ok(msg.includes("📝 Código: *ABCDEFGH2345*"), "código de consulta en negrita");
  assert.ok(msg.includes("*DETALLE:*"), "rótulo del detalle");
  assert.ok(msg.includes("▪️ 2x " + productos[0].nombreCompleto + " — " + pesos(productos[0].precio * 2)), "línea con subtotal");
  assert.ok(msg.includes("▪️ 1x " + productos[3].nombreCompleto + " — " + pesos(productos[3].precio)), "segunda línea con subtotal");
  assert.ok(msg.includes("💵 *TOTAL A PAGAR: " + pesos(total) + "*"), "total en negrita");
  assert.ok(msg.includes("⚠️ _El valor y disponibilidad quedan pendientes de confirmación del negocio._"), "nota de confirmación");
  assert.ok(msg.includes("Ana") && msg.includes("3001112233") && msg.includes("Calle 10 #5-20"), "datos de entrega");
  assert.ok(msg.includes("Para las 6 pm"), "notas del cliente");
  assert.ok(!/enviado|recibido|confirmado por el negocio/i.test(msg), "el mensaje no debe afirmar que ya fue enviado");
});

test("construirMensaje: sin notas no imprime la línea de notas", () => {
  const productos = nucleo.validarCatalogo(DATOS).productos;
  const msg = nucleo.construirMensaje({ nombre: "Ana", telefono: "3001112233", direccion: "Calle 10 #5-20", notas: "" }, [{ id: productos[0].id, cantidad: 1 }], productos, { nombre: "Postres Snoopy" }, "ABCDEFGH2345");
  assert.ok(!msg.includes("📝 Para las 6 pm"));
  assert.ok((msg.match(/📝/g) || []).length === 1, "solo el emoji del código, sin notas");
});

test("codigoDePedido: doce caracteres del alfabeto seguro y renovable", () => {
  const a = nucleo.codigoDePedido();
  assert.strictEqual(a.length, 12);
  assert.match(a, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  const b = nucleo.codigoDePedido(true);
  assert.match(b, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  assert.notStrictEqual(a, b, "renovar entrega un código distinto");
  // En Node no hay sessionStorage: el código se genera en cada llamada. En el navegador se
  // conserva durante la sesión (lo comprueba la prueba de navegador, no esta).
});

test("urlWhatsApp: arma el enlace con el texto codificado", () => {
  const url = nucleo.urlWhatsApp("57 300-998-1576", "Hola, soy Ana. Quiero 2× postre");
  assert.ok(url.startsWith("https://wa.me/573009981576?text="));
  assert.strictEqual(decodeURIComponent(url.split("?text=")[1]), "Hola, soy Ana. Quiero 2× postre");
});

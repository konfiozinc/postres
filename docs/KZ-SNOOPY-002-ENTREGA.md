# KZ-SNOOPY-002 — Entrega de corrección y rediseño

**Proyecto:** Postres Snoopy · **Repositorio:** `konfiozinc/postres` · **Rama de trabajo:** `kz-snoopy-002`
**Fecha:** 2-nov-2026 · **Estado:** implementado, probado y **sin publicar** (a la espera de autorización)

---

## 1. Archivos modificados

| Archivo | Cambio |
|---|---|
| `index.html` | Reescrito. Se eliminó el `<video>` que apuntaba a `assets/hero.mp4` (inexistente), se añadió título visible en la portada, sección de privacidad, aviso de catálogo y el flujo del pedido en tres pasos dentro del carrito. |
| `styles.css` | Reescrito. Contenedor amplio, rejilla responsive, objetivos táctiles de 44 px, carrito como hoja inferior/lateral, contraste AA, altura fija de la portada. |
| `script.js` | Reescrito. Validación de `data.json`, carrito saneado, validación de formulario campo a campo y pedido en tres estados con confirmación explícita. |
| `README.md` | Actualizado al comportamiento real (flujo, validaciones, imágenes, pruebas). |
| `pruebas/nucleo.test.js` | **Nuevo.** 15 pruebas del núcleo con `node --test` (sin dependencias). |
| `pruebas/e2e.cjs` | **Nuevo.** 55 comprobaciones de extremo a extremo con Playwright. |
| `docs/KZ-SNOOPY-002-ENTREGA.md` | **Nuevo.** Este documento. |
| `docs/capturas/*.jpg` | **Nuevo.** Capturas antes/después en los cuatro tamaños. |
| `data.json` | **Sin cambios.** Verificado: `git diff main -- data.json` sale vacío. |
| `assets/` | **Sin cambios.** |

Productos y precios intactos: `crema` $10.000 · `chocolate` $10.000 · `caramelo` $10.000 · `maracuya` $8.000 · `oreo` $8.000 · `mango` $8.000.

## 2. Hallazgos corregidos

### P1 · Pedido por WhatsApp

| Antes | Ahora |
|---|---|
| Al pulsar «Pedir por WhatsApp» el sitio decía «✅ Pedido enviado. ¡Gracias!» | Tres estados explícitos: **pedido preparado** → **WhatsApp abierto** → **enviado por ti · pendiente de confirmación del negocio** |
| El carrito se vaciaba automáticamente 1 s después de abrir WhatsApp | **No se vacía nunca solo**; solo con «Vaciar carrito» y confirmación |
| Daba por hecho que el negocio recibió el pedido | Nunca afirma recepción: el texto dice que la confirmación llega por WhatsApp |
| El mensaje no aclaraba el envío | Se añade «(Envío y valor final por confirmar en el chat)» |

### P1 · Carrito

- Se **sanean** los datos de `localStorage`: ids inexistentes, cantidades negativas, cero, texto o duplicados se descartan; el máximo es **20 por producto**.
- Los **precios se toman siempre del catálogo**; un precio inyectado en el navegador se ignora (probado).
- El total se recalcula con el catálogo en cada pintado.

### P1 · Catálogo

- `data.json` se **valida** antes de usarse: tipo de documento, marca, contacto, redes y cada producto (id, nombre, precio entero positivo, ruta de imagen permitida).
- Productos inválidos o duplicados se descartan **sin romper el resto** y el sitio avisa.
- Si no hay ningún producto válido o falla la petición: **no se inventa nada**; se muestra un aviso y se ofrece WhatsApp. La interfaz sigue en pie.
- Se eliminó el respaldo embebido con copia de productos (era una segunda fuente que podía desincronizarse de `data.json`).

### FASE 3 · Calidad

- **Video inexistente:** se eliminó la referencia a `assets/hero.mp4` (daba 404 en cada carga).
- **Enlaces sociales:** los que no tienen URL en `data.json` **no se muestran** (antes eran `href="#"` muertos).
- **Formularios:** validación por campo con mensajes concretos (nombre ≥2, teléfono 10–15 dígitos, dirección ≥6, notas ≤300) y `aria-invalid`/mensajes `role="alert"`.
- **Privacidad:** sección propia en lenguaje llano y aviso en el pie aclarando que los datos van solo en el mensaje de WhatsApp y que el carrito vive en el navegador.
- **Pruebas automatizadas:** ver §3.

## 3. Pruebas ejecutadas

### Pruebas del núcleo (`node --test pruebas/nucleo.test.js`) — **15/15 PASS**

Precios, cantidades, catálogo real (conserva los 6 productos y sus precios), catálogo roto, productos inválidos y duplicados, WhatsApp inválido, manipulación de `localStorage`, total con precio falso, formulario (campos vacíos, teléfono corto/largo), mensaje y enlace de WhatsApp.

### Pruebas de extremo a extremo (`node pruebas/e2e.cjs`) — **58/58 PASS**

- **Distribución en 375×812, 768×1024, 1440×900 y 1920×1080:** 6 productos, 6/6 fotos, contenedor ≤1200 px, sin desbordamiento horizontal, todos los objetivos táctiles ≥44 px, navegación según tamaño, sin errores de consola ni 404.
- **Flujo del pedido:** validación de campos (3 errores con el formulario vacío), rechazo de teléfono inválido, paso a «preparado» con mensaje y total correctos ($40.000 para 3+1 unidades), **carrito intacto**, enlace a WhatsApp correcto, apertura en pestaña nueva, aviso de que no se ha enviado, marcado «ya lo envié» y vaciado **solo** por acción explícita.
- **Manipulación de `localStorage`:** se descartan producto inventado y cantidad negativa, se acota a 20 y el total se recalcula ($216.000).
- **Catálogo caído:** aviso visible, **0 productos inventados**, interfaz en pie.

### Pruebas de seguridad — **3/3 PASS**

- **Inyección en el formulario:** con etiquetas HTML y de script en nombre, dirección y notas, **no se ejecuta código** (0 banderas activadas) y **no se crean nodos** desde esos textos.
- **Vista previa:** el mensaje se muestra como texto literal, nunca interpretado como HTML.
- **Sin pedidos reales:** durante toda la batería no se abrió ni una pestaña de WhatsApp (0 aperturas).

## 4. Capturas antes/después

En `docs/capturas/` (8 imágenes, página completa):

| Tamaño | Antes | Después |
|---|---|---|
| 375×812 | `antes-375x812.jpg` | `despues-375x812.jpg` |
| 768×1024 | `antes-768x1024.jpg` | `despues-768x1024.jpg` |
| 1440×900 | `antes-1440x900.jpg` | `despues-1440x900.jpg` |
| 1920×1080 | `antes-1920x1080.jpg` | `despues-1920x1080.jpg` |

Medidas que se ven en las capturas:

| Viewport | Contenedor | Tarjetas | Foto | Botón mínimo |
|---|---|---|---|---|
| 375 | 375 → 375 px | 1 col · 339 px (igual) | **337 → 421 px** | **10 → 44 px** |
| 768 | **560 → 768 px** | **1 → 2 col · 165 → 347 px** | **163 → 431 px** | **10 → 44 px** |
| 1440 | **560 → 1200 px** | **1 → 4 col · 165 → 270 px** | **163 → 334 px** | **10 → 44 px** |
| 1920 | **560 → 1200 px** | **1 → 4 col · 165 → 270 px** | **163 → 334 px** | **10 → 44 px** |

## 5. Resultados Lighthouse

Lighthouse 13.5.0, Chromium del entorno, servidor local.

| | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| **Antes · móvil** | 46 | 93 | 96 | 100 | 3.054 ms | 4.011 ms | 0 | 5.648 ms |
| **Después · móvil** | **49** | **100** | **100** | 100 | 3.013 ms | 3.932 ms | **0** | 4.455 ms |
| **Antes · escritorio** | 98 | 93 | 96 | 100 | 844 ms | 884 ms | 0,031 | 0 ms |
| **Después · escritorio** | 98 | **100** | **100** | 100 | 856 ms | 948 ms | **0,003** | 0 ms |

Notas honestas: el rendimiento móvil se mantiene bajo (49) por la CPU emulada de Lighthouse y el trabajo de tipografías/canvas; en escritorio es 98. El CLS bajó de 0,031 a 0,003 al fijar la altura de la portada y ocultar desde el marcado los iconos sociales sin URL. La accesibilidad sube a 100 y las buenas prácticas a 100 en ambos perfiles.

## 6. Commits

Rama `kz-snoopy-002`, **subida a GitHub** (`origin/kz-snoopy-002`). `main` **no** se tocó y el sitio **no** se publicó:

- `git log origin/kz-snoopy-002` (3 commits):

1. *fix(kz-snoopy-002): pedido por WhatsApp en tres estados sin vaciado automático, validación de catálogo y carrito, rediseño responsive con contraste AA, pruebas y entrega*
2. *test(kz-snoopy-002): pruebas de seguridad del formulario (sin inyección, sin pedidos reales) y recuento final en el informe*
3. *docs(kz-snoopy-002): informe con pruebas de seguridad y recuento definitivo*

Archivos del commit: `index.html`, `styles.css`, `script.js`, `README.md`, `pruebas/nucleo.test.js`, `pruebas/e2e.cjs`, `docs/KZ-SNOOPY-002-ENTREGA.md` y `docs/capturas/` (8 imágenes).

## 7. Riesgos pendientes

1. **La confirmación del negocio no existe como dato:** el sitio no tiene backend ni panel (prohibido por esta misión), así que «pendiente de confirmación» es el estado máximo alcanzable. Si se quiere confirmación real, hace falta un canal verificable (WhatsApp Business API o backend) **con aprobación previa**.
2. **Fotos y portada son placeholders** del repositorio. No se sustituyeron porque no hay material real autorizado.
3. **No hay video:** la referencia se eliminó. Si se consigue, conviene un `hero.mp4` corto (10–30 s) y su `poster`.
4. **Dependencia de Google Fonts** (red externa). Si se cae, el sitio usa la tipografía del sistema: no rompe, pero cambia el aspecto.
5. **Rendimiento móvil 49:** el TBT es alto por el canvas de partículas y la carga de fuentes. Se puede reducir quitando partículas o sirviendo fuentes locales.
6. **Privacidad:** el texto es informativo y en lenguaje llano; si el negocio crece o añade analítica, requiere una política formal revisada legalmente.
7. **`tools/`** sigue sin versionar (pesos y PNG de trabajo del cliente). No se tocó.

## 8. Recomendación de publicación

**Recomiendo publicar**, porque los hallazgos P1 están corregidos y todo está verificado (15 pruebas de núcleo, 58 de extremo a extremo y cuatro tamaños), y porque la versión actual **sí afirma un envío que no puede verificar**. Pasos sugeridos, una vez el CTO autorice:

1. `git push origin kz-snoopy-002` y revisión de la rama.
2. Merge a `main` (fast-forward o `--no-ff`).
3. `git push origin main` → GitHub Pages publica solo.
4. Verificar en producción: `https://konfiozinc.github.io/postres/` en móvil y escritorio; preparar un pedido de prueba **sin pulsar «Enviar»** en WhatsApp.
5. Si algo falla, `git revert` del merge devuelve la versión anterior (el sitio antiguo queda en el historial).

Queda **una decisión de negocio** antes o después de publicar: qué hacer con «Haz tu pedido» mientras el envío sea manual. La versión actual lo explica en la propia interfaz, que es lo mínimo honesto.

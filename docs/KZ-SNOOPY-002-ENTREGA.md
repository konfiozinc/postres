# KZ-SNOOPY-002 — Entrega de corrección y rediseño

**Proyecto:** Postres Snoopy · **Repositorio:** `konfiozinc/postres` · **Rama de trabajo:** `kz-snoopy-002`
**Fecha:** 2-nov-2026 · **Estado:** **PUBLICADO** en `main` (`89564c9`) y verificado en producción

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

## 5. Resultados Lighthouse y revisión de la supuesta regresión

**Método de la comparación:** mismo binario (Lighthouse 13.5.0), mismo navegador (Chromium del entorno),
mismo servidor (con **gzip** y caché, para parecerse a GitHub Pages), mismo preset, `--throttling-method=simulate`,
**dos corridas por configuración** y mediana. `main` se sirvió desde un worktree de `git` con la versión publicada.

### ¿Existía la regresión de 88 → 49?

**No.** En condiciones idénticas, la versión publicada (`main`) ya puntuaba **49–50 en móvil**, no 88.
El 88 no se reproduce con ninguna combinación probada en móvil; lo más parecido es el escritorio de `main` (84–87).
Las cifras iniciales que reporté (46 / 98) se tomaron con un servidor **sin compresión**, así que tampoco eran comparables entre sí.

### Comparación final (idénticas condiciones, mediana de 2 corridas)

| Configuración | Rendimiento | A11y | Prácticas | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `main` · móvil | **49–50** | 93 | 96 | 100 | 2.879 ms | 3.634 ms | **9.612 ms** | 0 |
| rama · móvil (antes de optimizar) | 52–52 | 100 | 100 | 100 | 2.863 ms | 3.727 ms | 3.947–6.111 ms | 0 |
| **rama · móvil (final)** | **81–81** | **100** | **100** | 100 | 2.872 ms | 3.857 ms | **0 ms** | **0** |
| `main` · escritorio | **84** (87/81) | 93 | 96 | 100 | 814 ms | 814 ms | 239 ms | 0,034 |
| **rama · escritorio (final)** | **99–99** | **100** | **100** | 100 | 800 ms | 840 ms | **0 ms** | **0,002** |
| producción publicada (`main`) · móvil | 52–52 | 93 | 96 | 100 | 3.089 ms | 3.089 ms | 5.439 ms | 0 |

### Causas encontradas y corregidas

1. **El canvas de partículas era el culpable del TBT.** El informe de Lighthouse atribuía a `script.js` **9,8 s** de trabajo del hilo principal con solo 0,3 s de evaluación de script: cada fotograma dibujaba emojis con `fillText`, lo más caro que existe para el hilo principal. Ahora cada emoji se dibuja **una sola vez** en un lienzo fuera de pantalla y se copia con `drawImage`; además baja a **20 fps**, hay menos partículas en móvil y la animación **arranca 700 ms después del evento `load`**, cuando la página ya está pintada. Resultado: **TBT de 9.612 ms a 0 ms**.
2. **Fotografías:** la portada se precarga con `fetchpriority="high"` y las **dos primeras tarjetas** cargan con `loading="eager"` y prioridad alta (el resto sigue en diferido). Las imágenes conservan `width`/`height` y proporción fija, así que no generan saltos.
3. **Fuentes:** se probó cargarlas de forma asíncrona; subía a 66 puntos pero **introducía CLS de 0,310** con red simulada, así que se dejó la carga bloqueante: con el canvas ya resuelto, no cuesta rendimiento y mantiene **CLS 0**.
4. **Estabilidad visual:** portada de altura fija y contenido superpuesto desde la entrega anterior; CLS final **0,002**.

Se conservan íntegras las mejoras de seguridad (tres estados del pedido, carrito saneado, catálogo validado), accesibilidad (**100**) y responsive (cuatro tamaños verificados).

Las pruebas funcionales se repitieron tras las optimizaciones: **15/15** del núcleo y **58/58** de extremo a extremo.

### Resultados en la URL publicada (`https://konfiozinc.github.io/postres/`)

Medidos con el mismo método, dos corridas cada uno, ya en GitHub Pages:

| Configuración | Rendimiento | A11y | Prácticas | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| **Producción · móvil** | **82–83** | 100 | 100 | 100 | 3.149/3.117 ms | 3.437/3.426 ms | **0 ms** | **0** |
| **Producción · escritorio** | **97–97** | 100 | 100 | 100 | 923/904 ms | 1.048/1.113 ms | **0 ms** | **0,003** |

Comparado con la versión anterior ya publicada: móvil **52 → 82** y escritorio **84–87 → 97**.

### Verificación funcional en producción — **40/40**

- Catálogo: **6 productos** con nombres y precios originales (10.000 ×3, 8.000 ×3), HTTP 200, sin errores de consola ni recursos faltantes.
- Carrito: suma correcta (3 uds = $30.000); con `localStorage` manipulado se descarta el producto inventado, la cantidad negativa, y 999 se acota a **20** con total recalculado a $200.000 desde el catálogo.
- Flujo de WhatsApp: teléfono inválido rechazado, «pedido preparado» sin afirmar envío, **carrito intacto**, apertura de WhatsApp con el mensaje, aviso de que no se ha enviado, estado **pendiente de confirmación del negocio** y vaciado **solo** por acción explícita.
- Responsive en 375, 768, 1440 y 1920: 1/2/4/4 columnas, contenedor ≤1200 px, 0 px de desbordamiento, objetivos táctiles ≥44 px, navegación correcta y consola limpia en los cuatro.
## 6. Commits

Rama `kz-snoopy-002`, **subida a GitHub** (`origin/kz-snoopy-002`). `main` **no** se tocó y el sitio **no** se publicó:

- `git log origin/kz-snoopy-002` lista los commits de la rama, con mensajes descriptivos.
- El primero contiene el cambio funcional (pedido, validación, rediseño); los siguientes añaden las pruebas de seguridad y este informe.

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

**Publicado el 2-nov-2026** tras la autorización del CTO, porque los hallazgos P1 están corregidos y todo está verificado (15 pruebas de núcleo, 58 de extremo a extremo y cuatro tamaños), y porque la versión anterior **afirmaba un envío que no podía verificar**. Procedimiento ejecutado:

1. Verificación de la rama remota: `origin/kz-snoopy-002` contenía `7c7262a` y `main` no tenía cambios divergentes.
2. Integración con **`git merge --no-ff`** → commit de integración `89564c9`; historial completo conservado.
3. `git push origin main` → GitHub Pages publicó solo.
4. Verificación en producción: **40/40** comprobaciones funcionales, de seguridad y de responsive, más Lighthouse móvil y escritorio (§5).
5. **Reversión si hiciera falta:** `git revert -m 1 89564c9 && git push origin main` restaura la versión anterior en un par de minutos, sin tocar `data.json`.

URL comprobada: **https://konfiozinc.github.io/postres/** · Sigue en pie **una decisión de negocio**: mientras el envío sea manual, el sitio no puede confirmar que el negocio recibió el pedido y lo dice explícitamente en la interfaz. Una confirmación real requeriría un canal verificable (WhatsApp Business API o backend) con autorización aparte.

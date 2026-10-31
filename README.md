# Postres Snoopy 🍓

Landing page **mobile-first** para "Postres Snoopy": postres y fresas con crema, con pedido por **WhatsApp Business**.

## 📁 Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura, SEO (meta, Open Graph, JSON-LD del negocio) y textos |
| `styles.css` | Estilos: paleta fresa/crema, Fredoka + Poppins, rejilla responsive |
| `script.js` | Carga y **valida** `data.json`, pinta la galería, sanea el carrito y arma el pedido |
| `data.json` | **Todo lo editable**: productos, precios, redes y número de WhatsApp |
| `assets/` | Imágenes `.webp` (logo, hero y fotos de cada postre) |
| `pruebas/` | Pruebas automatizadas (`nucleo.test.js` y `e2e.cjs`) |

## 🧾 Cómo funciona el pedido (importante)

El pedido pasa por **tres estados separados** y el sitio **nunca afirma que el negocio recibió algo**:

1. **Pedido preparado** — se valida el formulario y se arma el mensaje. Todavía no se envió nada.
2. **WhatsApp abierto** — el cliente pulsa «Abrir WhatsApp»; el mensaje aparece escrito en el chat, pero **no se envía** hasta que el propio cliente pulsa «Enviar» allí.
3. **Enviado por ti · pendiente de confirmación** — si el cliente marca «Ya envié el mensaje», el sitio lo registra como *pendiente de confirmación del negocio*: la confirmación real llega por WhatsApp.

Detalles que conviene conocer:

- El **carrito no se vacía solo**. Solo se vacía con el botón «Vaciar carrito» (con confirmación).
- Los **precios siempre salen del catálogo** (`data.json`). Si alguien manipula el `localStorage`, se descartan productos inexistentes y cantidades no válidas, y se acota a **20 unidades por producto**.
- El envío **no** se calcula en el sitio: se confirma en el chat.
- Si `data.json` falla o trae datos inválidos, **no se inventan productos**: se muestra un aviso y se sigue ofreciendo el WhatsApp.

## 🚀 Desplegar en GitHub Pages

1. Sube estos archivos a la rama `main` del repositorio `konfiozinc/postres`.
2. `Settings → Pages → Source: Deploy from a branch → main / (root)`.
3. La URL es `https://konfiozinc.github.io/postres/`.

> ⚠️ Si el repo se llama distinto de `postres`, cambia el `canonical`, `og:url` y `og:image` en `index.html`.

## 📱 Probar localmente

`data.json` se carga con `fetch()`, así que abrir `index.html` con doble clic (`file://`) no funciona. Levanta un servidor:

```bash
# dentro de la carpeta del proyecto
python -m http.server 8080
# abre http://localhost:8080
```

## ✏️ Cómo editar (sin tocar código)

Todo se edita en **`data.json`**:

- **Productos:** array `productos` (`nombre` corto para la tarjeta, `nombreCompleto` para el mensaje, `descripcion`, `precio` en pesos, `alergenos`, `imagen`).
  Un producto sin `id`, sin `nombre` o con precio 0/negativo **se ignora** (y el sitio avisa).
- **WhatsApp:** `contacto.whatsapp` — número en formato internacional **sin `+`** (ej. `"573009981576"`). Si falta, el sitio avisa y no permite preparar el pedido.
- **Redes:** array `redes` — mientras `url` esté vacía, ese icono **no se muestra** (así no hay enlaces muertos). Al poner la URL, aparece.

## 🖼️ Imágenes

| Archivo | Qué poner |
|---|---|
| `assets/hero-banner.webp` | Imagen de portada (fondo del encabezado). |
| `assets/postre-*.webp` | Foto de cada postre, proporción **4:5**. |
| `assets/logo/*.webp` | Logo y favicons. |

> El video del hero (`assets/hero.mp4`) **no existe** en el repositorio, así que la referencia se eliminó: el encabezado usa solo la imagen. Si más adelante hay video, se puede volver a añadir un `<video>` con su `poster`.

## 🧪 Pruebas automatizadas

```bash
# pruebas del núcleo (validación de catálogo, carrito, formulario y mensaje)
node --test pruebas/nucleo.test.js

# pruebas de extremo a extremo (requiere Playwright)
node pruebas/e2e.cjs
```

## 🔒 Privacidad

El nombre, teléfono, dirección y notas viajan **solo en el mensaje de WhatsApp** que el cliente envía al negocio: no se guardan en ningún servidor de este sitio. El carrito se guarda en el navegador del cliente para no perder la selección y se puede borrar con «Vaciar carrito». En la página hay una sección «Tus datos y tu privacidad» con el mismo texto en lenguaje llano.

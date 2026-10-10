# Postres Snoopy 🍓

Landing page **mobile-first** para "Postres Snoopy": postres y fresas con crema, con pedido directo por **WhatsApp Business**.

## 📁 Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Estructura y SEO (meta, Open Graph, JSON-LD del negocio) |
| `styles.css` | Estilos (paleta fresa/crema, Fredoka + Poppins) |
| `script.js` | Carga `data.json`, pinta la galería y arma el pedido por WhatsApp |
| `data.json` | **Todo lo editable**: productos, precios, redes y número de WhatsApp |
| `assets/` | Imágenes `.webp` + `hero.mp4` (los archivos actuales son placeholders de relleno) |

## 🚀 Desplegar en GitHub Pages

1. Sube estos archivos a la rama `main` del repositorio `konfiozinc/postres`.
2. `Settings → Pages → Source: Deploy from a branch → main / (root)`.
3. Guarda. La URL es `https://konfiozinc.github.io/postres/`.

> ⚠️ Si el repo se llama distinto de `postres`, cambia el `canonical`, `og:url` y `og:image` en `index.html`.

## 📱 Probar localmente

`data.json` se carga con `fetch()`, así que abrir `index.html` con doble clic (`file://`) puede fallar por CORS. Dos opciones:

- Sube a GitHub Pages (recomendado), o
- Levanta un servidor local:
  ```bash
  # dentro de la carpeta del proyecto
  python -m http.server 8080
  # abre http://localhost:8080
  ```

La app tiene un **respaldo embebido** en `script.js`: si `data.json` no carga, se muestran los productos igual, pero los cambios que hagas en `data.json` no se verían hasta servirla por HTTP.

## ✏️ Cómo editar (sin tocar código)

Todo se edita en **`data.json`**:

- **Productos:** array `productos` (nombre, descripción, `precio` en pesos, `ingredientes`, `alergenos`, `imagen`).
- **WhatsApp:** `contacto.whatsapp` — número en formato internacional **sin `+`** (ej. `"573009981576"`).
- **Redes:** array `redes` — deja `"url": ""` mientras no exista el perfil; cuando lo crees, pon la URL completa.

> Si agregas/quitas productos, recuerda también el array `FALLBACK` en `script.js` (es la copia de respaldo).

## 🖼️ Reemplazar los placeholders por contenido real

Los archivos de `assets/` son **degradados de relleno**. Sustitúyelos por los reales, con el mismo nombre:

| Archivo | Qué poner |
|---|---|
| `assets/hero.mp4` | Video corto (vertical, ~10–30 s, sin audio o con audio) para el fondo del hero. **Si no existe, el sitio usa el degradado + poster automáticamente.** |
| `assets/hero-poster.webp` | Imagen 1200×630 que se ve mientras carga el video. |
| `assets/postre-*.webp` | Foto de cada postre (proporción 4:3). Nombres: `postre-fresas-crema.webp`, `postre-fresas-chocolate.webp`, `postre-fresas-caramelo.webp`, `postre-fresas-nutella.webp`, `postre-fresas-oreo.webp`, `postre-fresas-mango.webp`. |

Para pasar de JPG/PNG a WebP puedes usar [Squoosh](https://squoosh.app) o cualquier conversor.

## ✅ Cómo funciona el pedido

1. El cliente llena nombre, teléfono, sabor, cantidad y dirección.
2. `script.js` valida los obligatorios y arma:
   ```
   Hola, soy {nombre}. Tel: {telefono}. Quiero {cantidad} × {sabor}. Dirección: {direccion}. Notas: {notas}.
   ```
3. Abre `https://wa.me/573009981576?text=...` con el mensaje prellenado.
4. El pedido se guarda en `localStorage` (`ps-snoopy-ultimo-pedido`) por si el cliente recarga antes de confirmar.

## 🔒 Privacidad

Al enviar el pedido, los datos van directo al chat de WhatsApp; no se guardan en ningún servidor propio. Si el negocio crece y se añade un backend o analítica, publica una política de privacidad y pide consentimiento explícito.

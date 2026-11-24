# Página de entrada y rutas web de MUTATIO

## Objetivo
Separé la presentación pública del acceso al mundo interactivo. La raíz del sitio (`/`) muestra la página de entrada de MUTATIO y la ruta `/juego` entrega la aplicación NEXUS existente.

## Servidor
Express sirve los recursos estáticos desde `public/`. La ruta `/juego` responde con `public/game.html`; las demás rutas web no API devuelven `public/index.html`. La API conserva el prefijo `/api`.

## Archivos
- `public/index.html`: página pública de entrada.
- `public/css/landing.css`: estilos adaptables de la entrada.
- `public/js/landing.js`: movimiento visual ligero, desactivado con movimiento reducido.
- `public/game.html`: interfaz existente del juego.
- `server/index.js`: rutas de entrada y juego.

## Ejecución
```bash
npm install
npm start
```
- Entrada: `http://127.0.0.1:4050/`
- Juego: `http://127.0.0.1:4050/juego`

## Validación pendiente
Ejecutar en el entorno Node.js del proyecto y comprobar HTTP 200 para ambas rutas, los archivos CSS/JS y los endpoints de API. La modificación de código no equivale a una prueba de ejecución.

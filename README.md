# MUTATIO — NEXUS

Red social de **mundos persistentes**. Primer universo: **NEXUS**. Primer mundo: **Cuba — El legado de la isla**.

No es un juego con red social añadida: es un mundo compartido donde las decisiones colectivas cambian indicadores, el mapa y la historia.

## Arranque local

```bash
npm install
npm start
# http://127.0.0.1:4050
```

## Entrada web\n\nLa ruta `/` sirve la página pública de presentación de MUTATIO. El acceso principal dirige a `/juego`, donde se carga la aplicación NEXUS existente. Express sirve ambas páginas y sus recursos desde `public/`; no se necesita un servidor estático adicional.\n\n## Experiencia visual

El mapa del mundo utiliza Three.js 0.180.0 mediante import map y jsDelivr. Incluye escena 3D estilizada de Cuba, relieve, vegetación, ciudades, rutas, marcadores de regiones, iluminación, agua animada y cámara orbital. La capa 3D representa el estado que entrega el backend; no contiene reglas económicas ni autoridad sobre el juego.

Controles: arrastrar para rotar, rueda para zoom, clic en los marcadores para seleccionar regiones y botón para reiniciar la cámara.

## Qué hay implementado

- Introducción cinematográfica (omitible)
- Mapa 3D interactivo de Cuba con Three.js
- Comunidades, recursos, indicadores y reglas centralizadas en servidor
- Propuestas, votos, resolución con costes CBN y riesgos
- Ledger CBN (saldo + historial; **no es dinero real**)
- Feed social generado desde acontecimientos
- API `/api/v1/*` + health check
- Tests de reglas (`npm test`)

## Documentación

Ver carpeta `docs/`.

## Nota legal sobre CBN

CBN es **unidad interna del juego**. No hay wallets reales, depósitos, retiros ni promesa de rentabilidad.

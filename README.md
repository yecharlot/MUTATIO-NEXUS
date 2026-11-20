# MUTATIO — NEXUS

Red social de **mundos persistentes**. Primer universo: **NEXUS**. Primer mundo: **Cuba — El legado de la isla**.

No es un juego con red social añadida: es un mundo compartido donde las decisiones colectivas cambian indicadores, el mapa y la historia.

## URL pública

Tras el despliegue en Render: ver `docs/DespliegueRender.md`.

## Arranque local

```bash
npm install
npm start
# http://127.0.0.1:4050
```

## Qué hay implementado

- Introducción cinematográfica (omitible)
- Mapa isométrico 2D ligado al estado del mundo
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

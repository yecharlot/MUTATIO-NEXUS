# Arquitectura

## Capas

- **public/** — HTML/CSS/JS (presentación). No confío reglas de negocio aquí.
- **server/routes** — API HTTP versionada (`/api/v1`).
- **server/services** — dominio: `game.js` (casos de uso), `rules.js` (economía y resolución).
- **server/db** — SQLite en `MUTATIO_DATA_DIR` (MVP).
- **server/middleware** — JWT.

## Flujos

Registro/Login → JWT → Propuesta → Voto → Resolución (`rules.applyAction`) → Evento + Post + CBN ledger.

## Extensiones futuras (pendientes)

Hooks documentados hacia PrismaTEC-Core, LISPAI, Mind, Zyrion, RootCID: sin implementaciones ficticias en este MVP.

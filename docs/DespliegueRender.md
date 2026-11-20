# Despliegue Render

## Servicio

- Runtime: Node
- Build: `npm install --omit=dev`
- Start: `npm start`
- Health: `/api/health`
- `render.yaml` incluido

## Variables

- `PORT` — la asigna Render
- `JWT_SECRET` — obligatorio en producción (generar valor fuerte)
- `MUTATIO_DATA_DIR` — por defecto `/tmp/mutatio-data` en free (efímero)

## Limitación honesta

En plan **free** sin Postgres persistente, el SQLite en `/tmp` **se pierde al reiniciar**. Para datos durables: base Postgres gestionada y migrar el store (pendiente de endurecimiento).

## Rama

Desplegar desde `main` o `feat/genesis-playable` según el servicio.

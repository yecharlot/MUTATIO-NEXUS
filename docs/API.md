# API

Base: `/api`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/health` | no | Health |
| GET | `/v1/catalog` | no | Acciones y comunidades |
| GET | `/v1/world` | no | Estado del mundo |
| GET | `/v1/events` | no | Acontecimientos |
| GET | `/v1/proposals` | no | Propuestas |
| GET | `/v1/posts` | no | Feed social |
| POST | `/v1/auth/register` | no | Registro |
| POST | `/v1/auth/login` | no | Login → JWT |
| GET | `/v1/me` | Bearer | Perfil |
| GET | `/v1/me/cbn` | Bearer | Saldo + ledger |
| POST | `/v1/proposals` | Bearer | Crear propuesta |
| POST | `/v1/proposals/:id/vote` | Bearer | `{ "value": 1 \| -1 }` |
| POST | `/v1/proposals/:id/resolve` | Bearer | Resolver |
| POST | `/v1/posts/:id/comments` | Bearer | Comentar |

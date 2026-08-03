# Duel Backend

Node.js + Express + Socket.io server for:

- User presence (nickname registration)
- Friends list (add/remove, online status)
- Quick match queue
- Spectator match list and state relay hooks

## Run

```bash
npm install
npm run server
```

Default port: **3001** (override with `PORT` env var).

## API

- `GET /api/health` — server stats
- `GET /api/matches` — list matches available to spectate

Socket events: see `server.js`.

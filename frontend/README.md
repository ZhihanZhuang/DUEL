# Frontend modules

Game client lives at the repo root (`index.html`, `game.js`, etc.). This folder adds:

- `ai.js` — CPU AI with difficulty tiers and adaptive learning
- `multiplayer-client.js` — Socket.io client for matchmaking, friends, spectator
- `retro.css` — Pixel/retro UI theme

Load order is defined in `index.html`.

## Online simulation

The host runs combat at a fixed 60 Hz and sends approximately 30 snapshots per second.
Challengers and spectators interpolate snapshots with a 33 ms buffer. Actions still
travel to the host through the relay server, so server location and connection latency
matter. Obsolete snapshots are dropped under backpressure instead of accumulating.

Online matches use the host's arena selection and a shared 1280 × 720 logical canvas.
Resizing scales the display while preserving platforms, fighter positions, and collision
bounds. Snapshots preserve entity prototypes, nested attack data, and shared references.

After updating, restart the backend and reload every participant's page: snapshot
protocol version 2 requires matching clients. Run `npm test` for regression checks.

# Online Deployment

This project can run as one public Node service:

- Express serves the game files.
- Socket.io powers login, private rooms, quick match, chat, spectators, remote input, and host state sync.
- In local development the browser connects to `localhost:3001`.
- In production the browser connects to the same public origin by default.

## Local Test

```bash
npm install
npm run server
```

Open:

```text
http://localhost:3001/
```

## GitHub Login

Install or use GitHub CLI, then run:

```bash
gh auth login
```

Recommended choices:

```text
GitHub.com
HTTPS
Login with a web browser
```

After login, push:

```bash
git push origin main
```

If `gh` is not installed, install it first:

```bash
brew install gh
```

## Deploy On Render

Create a new Render Web Service from the GitHub repo.

Use these settings:

```text
Environment: Node
Build Command: npm install
Start Command: npm start
```

Optional environment variable:

```text
CORS_ORIGIN=https://your-render-app.onrender.com
```

If you leave `CORS_ORIGIN` unset, the server allows all origins, which is convenient for testing.

After deployment, open the Render URL and use `Online Play`.

## Deploy On Railway

Create a new Railway project from the GitHub repo.

Use:

```text
Install Command: npm install
Start Command: npm start
```

Railway provides `PORT` automatically. The game will use the same public URL for Socket.io.

## How To Test Online

1. Open the public game URL in two browser windows or two computers.
2. In both windows choose `Online Play`.
3. Enter different nicknames.
4. On one side click `Create Room`.
5. On the other side enter the room code and click `Join Room`.
6. Host clicks `START MATCH`.

For quick match, both players can click `Quick Match`.

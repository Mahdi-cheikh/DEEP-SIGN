# DEEP-SIGN

Real-time sign-language detection in your browser. A production-style full-stack
app built around MediaPipe Hands: the React front-end streams webcam frames to a
FastAPI back-end over WebSocket, the back-end extracts hand landmarks, classifies
them, and sends the result back. Confident detections are persisted to each user's
account so they can review their session history.

> Replaces the original sketch (TensorFlow + SSD MobileNet training scripts) with
> a clean, working, end-to-end implementation that requires **no training data**
> to get started.

---

## Features

- **Real-time webcam detection** over a single authenticated WebSocket
- **MediaPipe Hands** for 21-point hand landmark extraction (CPU, no GPU needed)
- **Geometry-based classifier** recognising A, B, C, D, F, I, L, O, V, W, Y, plus
  HELLO, THUMBS_UP, OK, FIST, PEACE, ROCK, CALL, POINT
- **User accounts** with JWT auth (signup / login / me)
- **Per-user history** with summary stats (top sign, totals, last seen)
- **REST + WebSocket** APIs, OpenAPI docs at `/docs`
- **SQLite** by default, swappable to Postgres via `DATABASE_URL`
- **Dockerfile** for backend + frontend, plus a `docker-compose.yml` for one-command boot

## Architecture

```
┌──────────────┐  WebSocket frames  ┌────────────────────┐  MediaPipe Hands  ┌────────────────────────┐
│  React UI    │ ─────────────────▶ │  FastAPI server    │ ───────────────▶ │  Geometric classifier  │
│ (Vite + TW)  │ ◀───── JSON ────── │  + SQLite (auth/   │ ◀── label/conf── │  (21-landmark rules)   │
└──────────────┘                    │   history)         │                  └────────────────────────┘
                                    └────────────────────┘
```

Folder layout:

```
DEEP-SIGN/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── main.py          ASGI entry point
│   │   ├── config.py        env-driven settings
│   │   ├── database.py      SQLAlchemy engine + session
│   │   ├── models.py        ORM models (User, Detection)
│   │   ├── schemas.py       Pydantic request/response models
│   │   ├── security.py      JWT + password hashing
│   │   ├── routers/
│   │   │   ├── auth.py      signup / login / me
│   │   │   ├── detect.py    POST /detect/image + WS /detect/ws
│   │   │   └── history.py   list / stats / clear
│   │   └── services/
│   │       └── detector.py  MediaPipe Hands + rule-based classifier
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/                React 18 SPA
│   ├── src/
│   │   ├── api/client.js          fetch + WS helpers
│   │   ├── context/AuthContext.jsx  token persistence + me()
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── WebcamDetector.jsx   ⭐ the centerpiece
│   │   └── pages/
│   │       ├── Landing.jsx
│   │       ├── Login.jsx · Signup.jsx
│   │       ├── Detect.jsx
│   │       └── History.jsx
│   ├── tailwind.config.js · vite.config.js · index.html
│   ├── Dockerfile · nginx.conf
│   └── package.json
└── docker-compose.yml
```

## Quick start (local dev)

You need Python 3.10+ and Node 18+.

### 1. Backend

```bash
cd backend
python -m venv .venv
# Windows:        .venv\Scripts\activate
# macOS / Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env       # then edit SECRET_KEY etc.
uvicorn app.main:app --reload
```

The API now lives at `http://localhost:8000` — open `/docs` for Swagger UI.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` and `/ws-api` to the backend,
so there's no CORS dance during development.

## Quick start (Docker)

```bash
docker compose up --build
# Frontend:  http://localhost:5173
# Backend:   http://localhost:8000
```

## API at a glance

| Method | Path                      | Auth | Description                                    |
| ------ | ------------------------- | ---- | ---------------------------------------------- |
| POST   | `/api/auth/signup`        | —    | Create account, returns JWT                    |
| POST   | `/api/auth/login`         | —    | OAuth2-style login (`username` = email)        |
| GET    | `/api/auth/me`            | ✅    | Current user                                   |
| POST   | `/api/detect/image`       | ✅    | Single image → `{sign, confidence, …}`         |
| WS     | `/api/detect/ws?token=…`  | ✅    | Stream JPEG data-URL frames, get JSON results  |
| GET    | `/api/history/`           | ✅    | Recent detections (limit, offset)              |
| GET    | `/api/history/stats`      | ✅    | Totals & top sign                              |
| DELETE | `/api/history/`           | ✅    | Wipe this user's history                       |

## How the detector works

`backend/app/services/detector.py` runs MediaPipe Hands on each frame, then
checks which fingers are extended (per-finger tip-vs-PIP distance from the wrist,
with a special-case horizontal check for the thumb). The resulting 5-bit pattern
maps onto a curated table of common signs. A pinch test (thumb-tip to index-tip
distance, normalised by hand size) detects **OK** and **C**.

This deterministic approach works zero-shot and runs in real time on CPU. To
upgrade to a trained model, replace `_classify()` with calls to your own
classifier — feed it the flattened 42-D landmark vector and you're done.

## Production notes

- Set a strong `SECRET_KEY` and store it as a deployment secret.
- Lock `CORS_ORIGINS` to your actual frontend origin.
- Swap SQLite for Postgres in production (`DATABASE_URL=postgresql+psycopg://…`).
- Put the WebSocket behind a TLS-terminating proxy (nginx, Caddy, Cloudflare).
- Rate-limit `/auth/login` and `/detect/image` (e.g. with slowapi or a reverse-proxy).

## License

MIT

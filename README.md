# DEEP-SIGN

Real-time sign-language detection that runs entirely in your browser.

A serverless full-stack app: React + Vite on the frontend, **MediaPipe Hands
running client-side in WebAssembly** for inference, **Supabase** for auth and
detection history. Deploys to **Vercel** in a single click.

> Replaces the original sketch (TensorFlow + SSD MobileNet training scripts).
> No model training, no Python backend, no servers — webcam frames never leave
> your computer.

---

## How it works

```
┌─────────────────────────────────────────────────────┐         ┌────────────────────┐
│  Browser (React + Vite, deployed on Vercel)         │         │  Supabase          │
│  ─────────────────────────────────────────────────  │  HTTPS  │  ────────────────  │
│  • UI + routing                                     │ ──────▶ │  Auth (email/pw)   │
│  • Webcam capture (getUserMedia)                    │         │  Postgres          │
│  • @mediapipe/tasks-vision (WASM hand landmarker)   │         │   └─ detections    │
│  • Rule-based classifier (geometry over landmarks)  │         │   Row-Level Sec.   │
│  • Supabase JS client                               │         │                    │
└─────────────────────────────────────────────────────┘         └────────────────────┘
```

When you click **Start**, the browser:
1. Asks for webcam access.
2. Loads the MediaPipe Hand Landmarker WASM bundle (~3 MB, cached after first load).
3. Runs the model on each video frame at ~30 fps.
4. Feeds 21 hand landmarks through a deterministic geometry classifier
   (`src/lib/classifier.js`) that recognises 13+ ASL letters/gestures.
5. After ~0.5 s of a stable sign, inserts a row into Supabase via the JS client.
6. Row-Level Security on the `detections` table makes sure users only see their own.

Recognised signs: `HELLO`, `THUMBS_UP`, `OK`, `FIST`, `PEACE`, `ROCK`, `CALL`,
`POINT`, plus letters `A`, `B`, `C`, `D`, `F`, `I`, `L`, `V`, `W`, `Y`.

## Folder layout

```
DEEP-SIGN/
├── frontend/                React 18 SPA (deploys to Vercel)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── supabase.js     Supabase JS client
│   │   │   └── classifier.js   Geometry-based sign classifier
│   │   ├── context/AuthContext.jsx   Supabase auth wrapper
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── WebcamDetector.jsx    MediaPipe + classifier glue
│   │   └── pages/
│   │       ├── Landing.jsx · Login.jsx · Signup.jsx
│   │       └── Detect.jsx · History.jsx
│   ├── tailwind.config.js · vite.config.js · vercel.json
│   ├── package.json · .env.example
└── supabase/
    └── migrations/
        └── 0001_init.sql        detections table + RLS policies
```

## Quick start (local)

You need Node 18+ and a free Supabase project.

1. **Create your Supabase project** at https://supabase.com → **New project**.
2. **Run the migration**: open the SQL Editor and paste in `supabase/migrations/0001_init.sql`, then click **Run**.
3. **Disable email confirmation (optional, for quick testing)**: Authentication → Providers → Email → toggle **Confirm email** off.
4. **Grab your keys**: Project Settings → API. Copy the **Project URL** and the **anon public** key.
5. **Configure the frontend**:
   ```bash
   cd frontend
   cp .env.example .env.local
   # edit .env.local — paste your URL + anon key
   npm install
   npm run dev
   ```
6. Open http://localhost:5173, sign up, then go to **Detect**.

> First time you open the detect page, the browser pulls the ~3 MB MediaPipe WASM
> bundle. Subsequent visits are instant.

## Deploying

See [`DEPLOY.md`](./DEPLOY.md) for the full Vercel + Supabase walkthrough.

## Why this architecture?

| Concern        | Before (FastAPI + Render)          | Now (Supabase + Vercel)              |
| -------------- | ---------------------------------- | ------------------------------------ |
| Inference      | Server-side MediaPipe + WebSocket  | Client-side WASM, no network round-trip |
| Cost           | Render free tier sleeps after 15 m | Vercel + Supabase free, no cold start |
| Privacy        | Frames streamed to server          | Frames never leave the browser       |
| Cold start     | ~30 s when waking                  | None                                 |
| Ops surface    | Docker, env vars, CORS, disks      | One env file, one SQL migration      |

## License

MIT

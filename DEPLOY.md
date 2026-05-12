# Deploying DEEP-SIGN to Render

Render hosts both the FastAPI backend and the React frontend on the same account. This guide walks through every step.

> Estimated time: 10–15 minutes. No credit card required for the free plan.

---

## 0. Prerequisites

- A free Render account: <https://render.com>
- Git installed on your machine
- Your GitHub repo: <https://github.com/Mahdi-cheikh/DEEP-SIGN>

---

## 1. Push the project to GitHub

The repo currently only contains a README. Replace it with the full project:

```bash
cd C:\Users\mehed\Desktop\DEEP-SIGN

git init
git branch -M main
git remote add origin https://github.com/Mahdi-cheikh/DEEP-SIGN.git

# Fetch the existing remote so we can overwrite it cleanly
git fetch origin
git add .
git commit -m "feat: full-stack rewrite with FastAPI backend + React frontend"

# Force-push because we are replacing the remote's history
git push -u origin main --force
```

> If your default GitHub auth is HTTPS, you'll be prompted for a Personal Access Token (PAT). Create one at <https://github.com/settings/tokens> with `repo` scope.

---

## 2. Create the Render Blueprint

A `render.yaml` blueprint at the repo root provisions everything in one shot.

1. Log in to <https://dashboard.render.com>.
2. Click **New +** → **Blueprint**.
3. Connect your GitHub account if you haven't already, then pick **Mahdi-cheikh/DEEP-SIGN**.
4. Render reads `render.yaml` and shows two services:
   - `deep-sign-api`   – backend (FastAPI + MediaPipe)
   - `deep-sign-web`   – frontend (React, served by nginx)
5. Click **Apply**.

Render now builds both Docker images. The backend build takes 4–6 minutes the first time (MediaPipe is a large dependency). The frontend takes 1–2 minutes.

---

## 3. Wire up the URLs

After the first build, Render assigns each service a public URL such as:

- Backend:  `https://deep-sign-api.onrender.com`
- Frontend: `https://deep-sign-web.onrender.com`

If your URLs differ from the placeholders in `render.yaml`, update the env vars:

1. Open **deep-sign-api** → **Environment** → set `CORS_ORIGINS` to your frontend URL.
2. Open **deep-sign-web** → **Environment** → set `BACKEND_URL` to your backend URL.
3. Each service will automatically redeploy when you save.

---

## 4. Test it

Open the frontend URL, sign up for an account, and click **Start** on the detect page. The browser will ask for webcam permission, and within a second you should see hand-landmark dots appear on the video and the detected sign on the right.

Try these gestures to verify the classifier:

| Gesture                              | Expected label |
| ------------------------------------ | -------------- |
| Open palm, all fingers extended      | `HELLO`        |
| Index + middle finger up, V shape    | `PEACE / V`    |
| Thumb + pinky out, other folded      | `CALL / Y`     |
| Thumb + index forming an O           | `OK`           |
| Closed fist                          | `FIST / A`     |

---

## 5. Going to production for real

When you're ready to harden the deployment:

- **Upgrade the backend plan** from Free → Starter ($7/mo). The free tier sleeps after 15 minutes of inactivity, which causes a slow cold start on the first request.
- **Use Postgres** instead of SQLite. In Render: **New +** → **PostgreSQL** → copy the connection string into the backend's `DATABASE_URL` env var (it will look like `postgresql://...`). Then add `psycopg[binary]` to `backend/requirements.txt`.
- **Add a custom domain** in the **deep-sign-web** service settings, then update `CORS_ORIGINS` on the backend to include the new domain.
- **Rotate `SECRET_KEY`** — Render generates a strong one on first deploy; only rotate it if it leaks.
- **Set up logs/alerts**: enable Render's log streaming to your preferred destination, or wire up Sentry by adding `sentry-sdk[fastapi]` to requirements and initialising it in `app/main.py`.

---

## Local development still works

Nothing in this deployment changes the local workflow:

```bash
# Backend
cd backend && python -m venv .venv && source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend (in another terminal)
cd frontend && npm install && npm run dev
```

Or, with Docker:

```bash
docker compose up --build
```

---

## Troubleshooting

**Build fails with `mediapipe` install error.**
MediaPipe ships pre-built wheels only for Python 3.10–3.12. The provided `Dockerfile` already uses `python:3.11-slim`, so this shouldn't happen on Render. If you customise the image, stick to those Python versions.

**WebSocket never connects (`Live` badge stays grey).**
Check the browser console — most likely the frontend can't reach `BACKEND_URL`. Verify the env var in the **deep-sign-web** service. Render serves both HTTP and WSS on the same domain, so no extra config is required.

**`401 Unauthorized` after a deploy.**
The JWT secret changed (e.g. you rotated `SECRET_KEY`). Sign out in the browser and sign back in to get a fresh token.

**Cold starts.**
On the free plan, the backend sleeps after 15 min idle and takes ~30 s to wake. Upgrade to Starter for always-on.

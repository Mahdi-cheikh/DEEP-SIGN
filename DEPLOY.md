# Deploying DEEP-SIGN to Vercel + Supabase

10 minutes, two free accounts, zero credit cards.

---

## 0. Prerequisites

- A GitHub account (you already have one).
- A free Supabase account: https://supabase.com
- A free Vercel account: https://vercel.com — sign up with GitHub for the easiest flow.

---

## 1. Create the Supabase project

1. Go to https://supabase.com/dashboard and click **New project**.
2. Pick:
   - **Name**: anything (e.g. `deep-sign`)
   - **Database password**: let Supabase generate one (you don't need to remember it for this app)
   - **Region**: closest to your users
   - **Plan**: Free
3. Click **Create new project**. Wait ~1 minute for provisioning.

## 2. Run the schema migration

1. Open the **SQL Editor** in the left sidebar.
2. Click **+ New query**.
3. Open `supabase/migrations/0001_init.sql` from this repo, copy its contents, paste them into the editor, and click **Run** (or Ctrl/Cmd + Enter).
4. You should see "Success. No rows returned." — that's a clean apply.

This creates the `detections` table and the three Row-Level Security policies that ensure users can only see/insert/delete their own rows.

## 3. (Optional) Disable email confirmation for fast testing

By default, Supabase sends a confirmation email on signup. For local testing it's annoying. To skip it:

1. **Authentication** → **Providers** → **Email**
2. Toggle **Confirm email** off → **Save**

You can re-enable this later for production.

## 4. Copy the project URL + anon key

1. **Project Settings** (gear icon, bottom-left) → **API**
2. Copy:
   - **Project URL** — looks like `https://abcdefghij.supabase.co`
   - **Project API keys → anon public** — a long `eyJ...` JWT

Keep this page open; you'll paste these into Vercel in a moment.

## 5. Deploy the frontend on Vercel

1. Go to https://vercel.com/new
2. Click **Import** next to **Mahdi-cheikh/DEEP-SIGN**. (If it's not in the list, click **Adjust GitHub App Permissions** and grant Vercel access to the repo.)
3. On the **Configure Project** screen:
   - **Framework Preset**: Vite (auto-detected)
   - **Root Directory**: click **Edit** and set this to `frontend`
   - **Build Command** / **Output Directory** / **Install Command** are picked up from `vercel.json` — leave them.
4. Expand **Environment Variables** and add both:

   | Name                       | Value                                           |
   | -------------------------- | ----------------------------------------------- |
   | `VITE_SUPABASE_URL`        | (the Project URL from step 4)                   |
   | `VITE_SUPABASE_ANON_KEY`   | (the anon public key from step 4)               |

5. Click **Deploy**. Vercel builds the app (~1 minute) and gives you a URL like `https://deep-sign-mahdi-cheikh.vercel.app`.

## 6. Tell Supabase about your Vercel URL

Supabase needs to know where signup confirmation emails should redirect to.

1. Back in Supabase: **Authentication** → **URL Configuration**.
2. **Site URL**: paste your Vercel URL (e.g. `https://deep-sign-mahdi-cheikh.vercel.app`).
3. **Redirect URLs**: add the same URL + `/**` (e.g. `https://deep-sign-mahdi-cheikh.vercel.app/**`).
4. **Save**.

## 7. Try it!

Open your Vercel URL, click **Get started**, create an account, then go to **Detect** → **Start**. Allow webcam access. The first time the page loads the MediaPipe WASM bundle (~3 MB), then you'll see hand-landmark dots appear over the video and the detected sign on the right.

Try:

| Gesture                              | Expected label |
| ------------------------------------ | -------------- |
| Open palm, all fingers extended      | `HELLO`        |
| Index + middle finger up, V shape    | `PEACE / V`    |
| Thumb + pinky out, others folded     | `CALL / Y`     |
| Thumb tip touching index tip         | `OK`           |
| Closed fist                          | `FIST / A`     |

Held for ~0.5 seconds, each will appear in your **History** page.

---

## Custom domain

In Vercel: **Project → Settings → Domains** → add your domain. Vercel handles SSL automatically. Then return to step 6 and add the new origin to Supabase's allowed URLs.

## Future deploys

Vercel auto-deploys on every push to `main`. Just `git push` and the next visit pulls the new build.

---

## Troubleshooting

**Signup says "Email rate limit exceeded".**
Free Supabase plans cap auth emails at ~3/hour. Either wait, or disable email confirmation (step 3) for testing.

**"Missing Supabase env vars" warning in console.**
The Vercel env vars didn't apply. Check Project → Settings → Environment Variables, ensure both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` exist for the Production environment, then **Redeploy** from the Deployments tab.

**Webcam stays black on production but works locally.**
The site must be served over HTTPS for `getUserMedia` to work. Vercel always serves HTTPS, so this normally means the user denied permission — check the camera icon in the browser address bar.

**MediaPipe model fails to load.**
The model is fetched from `storage.googleapis.com`. If you're behind a network that blocks that domain, the model file won't load. Mirror the `.task` file somewhere you can reach and update `MODEL_URL` in `frontend/src/components/WebcamDetector.jsx`.

**History page is empty even though detections work.**
Confirm the SQL migration ran (step 2). In Supabase: **Table Editor** → look for the `detections` table. If it's missing, paste `0001_init.sql` into SQL Editor and click Run.

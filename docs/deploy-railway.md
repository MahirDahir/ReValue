# Deploying ReValue to Railway

## Prerequisites
- GitHub repo pushed (Railway deploys from GitHub)
- Railway account at https://railway.app

## Step 1 — Create Railway Project

1. Go to railway.app → **New Project** → **Deploy from GitHub repo**
2. Select this repository

## Step 2 — Add PostgreSQL

1. In the project dashboard click **+ New** → **Database** → **PostgreSQL**
2. Railway auto-sets `DATABASE_URL` — note it for later

## Step 3 — Deploy the Backend

1. Click **+ New** → **GitHub Repo** → select this repo
2. Set **Root Directory** to `backend`
3. Railway will detect the Dockerfile automatically
4. Under **Variables**, add:
   ```
   SECRET_KEY=<generate: python -c "import secrets; print(secrets.token_hex(32))">
   ALLOWED_ORIGINS=https://<your-frontend-url>.railway.app
   DATABASE_URL=<copied from PostgreSQL service above>
   DEBUG=false
   ```
5. Deploy — Railway runs `entrypoint.sh` which runs Alembic migrations then starts uvicorn

## Step 4 — Deploy the Frontend

1. Click **+ New** → **GitHub Repo** → select this repo again
2. Set **Root Directory** to `web`
3. Under **Variables**, add:
   ```
   VITE_API_URL=https://<your-backend-url>.railway.app/api
   ```
4. Deploy

## Step 5 — Wire Up CORS

1. Go back to the **backend** service
2. Update `ALLOWED_ORIGINS` to the actual frontend URL Railway assigned
3. Redeploy the backend

## Environment Variables Reference

| Variable | Service | Example |
|---|---|---|
| `SECRET_KEY` | backend | 64-char hex string |
| `DATABASE_URL` | backend | auto-set by Railway Postgres plugin |
| `ALLOWED_ORIGINS` | backend | `https://revalue-web.railway.app` |
| `DEBUG` | backend | `false` |
| `VITE_API_URL` | frontend (build arg) | `https://revalue-backend.railway.app/api` |

## Future: Kubernetes Migration

The Docker images built for Railway are the same ones used in Kubernetes.
Migration path: Railway → export images to ECR/GCR → write Helm charts → deploy to EKS/GKE.

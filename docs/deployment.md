# Deployment Guide (VPS)

Deploy the whole platform on a single VPS (e.g. DigitalOcean/Hetzner/Vultr).
Everything — API, worker, workspaces, logs, file generation — runs server-side.

## Option A — Docker Compose (recommended)

Prereqs: Docker + Docker Compose on the VPS.

```bash
git clone <your-repo> ai-agent-office && cd ai-agent-office
cp .env.example .env            # review DATABASE_URL, CORS_ORIGINS
docker compose up -d --build    # db + api + worker + web
```

- Web: `http://<vps-ip>:3000`  ·  API: `http://<vps-ip>:8000`
- Set `web.NEXT_PUBLIC_API_URL` (in `docker-compose.yml`) to your **public**
  API URL (e.g. `https://api.yourdomain.com`) before building for production.

## Option B — Manual (systemd)

### 1. PostgreSQL
```bash
sudo -u postgres createuser ai_office --pwprompt
sudo -u postgres createdb ai_office -O ai_office
psql "postgresql://ai_office:***@localhost:5432/ai_office" -f database/schema.sql
psql "postgresql://ai_office:***@localhost:5432/ai_office" -f database/seed.sql   # optional
```

### 2. API (FastAPI)
```bash
cd server && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="postgresql+psycopg://ai_office:***@localhost:5432/ai_office"
export CORS_ORIGINS="https://app.yourdomain.com"
uvicorn api.main:app --host 0.0.0.0 --port 8000
```
Run under systemd or `pm2`/`supervisor`. Add a worker unit:
`python -m worker.main`.

### 3. Web (Next.js)
```bash
cd apps/web && npm install
echo "NEXT_PUBLIC_API_URL=https://api.yourdomain.com" > .env.local
npm run build && npm start   # serves on :3000
```

## Nginx reverse proxy

```nginx
# /etc/nginx/sites-available/ai-agent-office
server {
    listen 80;
    server_name app.yourdomain.com;

    # Next.js frontend
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # FastAPI backend
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket activity feed (must upgrade the connection)
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;
    }
}
```

Enable + TLS:
```bash
sudo ln -s /etc/nginx/sites-available/ai-agent-office /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.yourdomain.com -d api.yourdomain.com
```

> Because the browser talks to the API directly, `NEXT_PUBLIC_API_URL` must be
> the **public** API host (`https://api.yourdomain.com`) and that host must be
> in the backend's `CORS_ORIGINS` (use the app host there).

## Post-deploy checklist
- [ ] `GET /health` returns `{ ok: true }`.
- [ ] Companies load in the web app; creating one persists.
- [ ] Department creation rejects a 16th floor (422) and duplicate floors (409).
- [ ] Activity Feed shows “Live (WebSocket)” (proxy upgrade works).
- [ ] Workspace “Create / Sync” scaffolds the file tree (mock).
- [ ] `AUTO_SEED` off in production once you have real data.
- [ ] Real AI keys / execution remain disabled until you implement the seams.

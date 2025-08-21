# Chess.com-Style Schach – v3 (Online über Render, performant)

**Neu in v3**
- Deutlich weniger Lag: Engine-Pool mit Queue, Caching & Throttling
- Eval-Bar optimiert (Debounce, nur bei Bot & optionaler Toggle)
- Bots mit **ELO 400–2500** (12 Stufen), Stockfish optional + starker Fallback
- UI: Brett drehen, Undo (bot-aware), Neustart, Board-Size-Slider, Premove, Legal-Dots, Move-Highlights
- Render-Blueprint: `render.yaml` im Repo-Root

## Schnellstart (lokal)
```bash
# Server
cd server && npm install && npm run dev
# Client (neues Terminal)
cd client && npm install && npm run dev
# -> http://localhost:5173
```

## Produktion lokal (ein Prozess)
```bash
cd client && npm run build
cd ../server && npm install && npm run copy-client && npm run start
# -> http://localhost:8080
```

## Deploy via Render (Blueprint)
1. `render.yaml` liegt im Repo-Root.  
2. Push zu GitHub (siehe unten).  
3. In Render: **Blueprints → New Blueprint Instance** → Repo/Branch wählen → **Apply**.

### Render erwartet
- **Root Directory**: `server`
- **Build Command**: `npm run build:all`
- **Start Command**: `npm run start`
- **Health Check**: `/api/health`
- Node 18/20 (per `engines` fixiert)

## GitHub Upload
```bash
git init
git add .
git commit -m "schach v3"
git branch -M main
git remote add origin https://github.com/<DEIN_USER>/<DEIN_REPO>.git
git push -u origin main
```

## Online spielen
- App öffnen → **„Neues Online-Spiel“** (Raum-ID entsteht) → Link teilen.  
- Oder **„Gegen Bot“** (ELO wählen).  
- **Eval** optional einschalten (Toggle), standardmäßig aus in PvP.

## Performance-Schalter
- Bot-Levels in `server/src/engine/bots.js` (movetime/depth/skill)
- Eval-Endpoint Throttle/Caching in `server/src/engine/engineManager.js`
- Client-Eval Debounce/Toggle in `client/src/App.jsx`

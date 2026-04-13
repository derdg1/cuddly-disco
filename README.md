# PrePress Studio

Professionelle PDF-Prepress-Bearbeitungs-App, ähnlich wie Esko Automation Engine oder Hybrid Software PackZ/CloudFront.

## Features

- **PDF Upload & Vorschau** – Multi-Page-Vorschau mit Zoom
- **Preflight** – Prüfung gegen PDF/X-3, PDF/X-4 und Standard-Druckprofil
  - Bildauflösung (DPI), fehlende Schriften, Anschnitt, RGB-Bilder, Transparenzen, Überdrucken
- **Separationsvorschau** – CMYK-Einzelkanäle als Graustufen-Overlay
- **Tintendeckung** – Berechnung pro Kanal und Seite (mit TAC-Warnung > 320%)
- **Druckmarken** – Schnittmarken, Passermarken, CMYK-Farbbalken
- **Step & Repeat** – N×M Ausschießen mit konfigurierbarem Bogenformat
- **Farbkonvertierung** – RGB→CMYK, PDF/X-3, PDF/X-4
- **React Flow Workflow-Editor** – Visuelle Automation-Pipelines per Drag & Drop
  - FileInput → Preflight → ColorConvert → AddMarks → Imposition → Output
- **Job-Queue** – Asynchrone Verarbeitung mit Status-Tracking

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| Workflow-Editor | **React Flow v12** |
| UI | Tailwind CSS + Radix UI |
| State | Zustand |
| Backend | Python FastAPI |
| PDF-Verarbeitung | PyMuPDF (fitz) + pikepdf |
| Job-Queue | Celery + Redis |
| Datenbank | SQLite (via SQLAlchemy async) |

## CI/CD Pipeline

### Übersicht

```
Push auf main
     │
     ├─► CI (.github/workflows/ci.yml)
     │     ├── Frontend: TypeCheck + ESLint + Production Build
     │     ├── Backend:  Syntax + Import Check
     │     └── Docker:   Build Test (beide Images, kein Push)
     │
     └─► CD (.github/workflows/cd.yml)  ← nur wenn CI grün
           ├── Backend Image  → ghcr.io/derdg1/cuddly-disco/prepress-backend:latest
           ├── Frontend Image → ghcr.io/derdg1/cuddly-disco/prepress-frontend:latest
           └── Portainer Webhook → Stack automatisch neu deployen
```

### GitHub Secrets einrichten

In GitHub → **Settings → Secrets and variables → Actions**:

| Secret | Wert | Woher |
|--------|------|-------|
| `PORTAINER_WEBHOOK_BACKEND` | Webhook-URL | Portainer → Services → backend → Webhooks |
| `PORTAINER_WEBHOOK_FRONTEND` | Webhook-URL | Portainer → Services → frontend → Webhooks |

Automatisches Deploy aktivieren:
**Settings → Variables → New variable** → `PORTAINER_ENABLED` = `true`

### Portainer: Webhook einrichten

1. Stack deployen (einmalig manuell, siehe unten)
2. In Portainer: **Services → prepress-backend → Webhooks aktivieren → URL kopieren**
3. URL als `PORTAINER_WEBHOOK_BACKEND` Secret in GitHub hinterlegen
4. Gleiches für `prepress-frontend`

→ Ab jetzt: Jeder Push auf `main` baut neue Images und triggert Portainer-Redeploy automatisch.

---

## Deployment

### Portainer (empfohlen)

**Schritt 1 – Stack anlegen:**
1. Portainer öffnen → **Stacks** → **Add stack**
2. Name: `prepress-studio`
3. **Build method**: Repository
4. Repository URL: `https://github.com/derdg1/cuddly-disco`
5. Repository reference: `claude/pdf-prepress-app-ahzRy`
6. Compose path: `docker-compose.yml`

**Schritt 2 – Umgebungsvariablen (optional):**

| Variable | Standardwert | Beschreibung |
|----------|-------------|-------------|
| `APP_PORT` | `80` | Öffentlicher Port der Web-App |
| `API_PORT` | `8000` | Öffentlicher Port der API |
| `SECRET_KEY` | `change-me-...` | **Ändern!** Zufälliger Hex-Key |
| `MAX_UPLOAD_SIZE_MB` | `500` | Max. PDF-Uploadgröße in MB |

**Schritt 3 – Deploy Stack** klicken.

Die App ist dann erreichbar unter `http://<SERVER-IP>:80`
API-Docs unter `http://<SERVER-IP>:8000/docs`

---

### Lokale Entwicklung (Hot-Reload)

```bash
docker-compose -f docker-compose.dev.yml up --build
```

- Frontend mit Hot-Reload: http://localhost:5173
- Backend mit Auto-Reload: http://localhost:8000
- API-Docs: http://localhost:8000/docs

### Ohne Docker (manuell)

**Backend:**
```bash
cd backend
pip install -r requirements.txt
mkdir -p data uploads outputs
uvicorn app.main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Celery Worker (für Workflow-Jobs):**
```bash
# Redis separat starten
redis-server

cd backend
celery -A app.workers.tasks worker --loglevel=info
```

### Produktion bauen & Images taggen

```bash
# Images bauen
docker build -t prepress-backend:latest ./backend
docker build -t prepress-frontend:latest ./frontend

# Optional: In private Registry pushen
docker tag prepress-backend:latest registry.example.com/prepress-backend:latest
docker push registry.example.com/prepress-backend:latest
```

## API Endpoints

```
POST   /api/files/upload              PDF hochladen
GET    /api/files                     Dateien auflisten
GET    /api/files/{id}/preview/{page} Seitenvorschau (PNG)
GET    /api/files/{id}/separation/{page}/{channel}  Separation
GET    /api/files/{id}/ink-coverage/{page}  Tintendeckung

POST   /api/preflight/run             Preflight starten
GET    /api/process/marks             Druckmarken hinzufügen
POST   /api/process/impose            Step & Repeat
POST   /api/process/color-convert     Farbkonvertierung
GET    /api/process/download/{file}   Output herunterladen

GET    /api/workflows                 Workflow-Liste
POST   /api/workflows                 Workflow erstellen
GET    /api/workflows/{id}            Workflow laden
PUT    /api/workflows/{id}            Workflow speichern
POST   /api/workflows/{id}/run        Workflow ausführen

GET    /api/jobs                      Job-Liste
GET    /api/jobs/{id}                 Job-Status
GET    /api/jobs/{id}/download        Output-PDF
```

## Workflow-Editor

Der React Flow Editor ermöglicht es, Verarbeitungs-Pipelines visuell aufzubauen:

```
📁 FileInput → 🔍 Preflight ──OK──→ ✂️ AddMarks → 📐 Imposition → 📤 Output
                      │
                   Fehler──→ 📤 Fehler-Report
```

### Verfügbare Nodes
- **FileInput** – PDF-Quelle
- **Preflight** – Konfigurierbare Druckprüfung (OK/Fehler-Ausgänge)
- **ColorConvert** – Farbkonvertierung (CMYK, PDF/X-3, PDF/X-4)
- **AddMarks** – Schnitt- und Passermarken
- **Imposition** – Step & Repeat Layout
- **InkCoverage** – Tintendeckungs-Bericht
- **Condition** – Bedingte Weiterleitung
- **Output** – Datei-Ausgabe

Workflows werden als JSON gespeichert und können auf beliebige PDF-Dateien angewendet werden.

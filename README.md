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

## Setup & Start

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
# API läuft auf http://localhost:8000
# Swagger-Docs: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# App läuft auf http://localhost:5173
```

### Mit Docker Compose (empfohlen)

```bash
docker-compose up --build
```

Dann öffnen:
- Frontend: http://localhost:5173
- API-Docs: http://localhost:8000/docs

### Redis + Celery Worker (optional, für Workflows)

```bash
# Redis starten (oder via docker-compose)
redis-server

# Worker starten
cd backend
celery -A app.workers.tasks worker --loglevel=info
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

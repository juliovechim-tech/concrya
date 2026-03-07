# ─────────────────────────────────────────────────────────────────────────────
# Stage 1 — build React/Vite frontend
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS fe
WORKDIR /fe
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2 — Python backend (serves frontend/dist as static files)
# ─────────────────────────────────────────────────────────────────────────────
FROM python:3.11-slim AS be
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY . .

# Copy compiled frontend into the path FastAPI serves at /app
COPY --from=fe /fe/dist ./frontend/dist

EXPOSE 8000

# Run Alembic migrations then start the API server
CMD ["bash", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]

FROM python:3.11-slim

WORKDIR /app

# System dependencies:
#   - fonts-dejavu-core: Unicode-capable fonts for PDF generation (ReportLab)
#   - curl: used by the docker-compose healthcheck against /api/health
RUN apt-get update && apt-get install -y --no-install-recommends \
        fonts-dejavu-core \
        curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-
#!/bin/bash
# reset_demo.sh — Reset Zest demo instance every hour
# Cron: 0 * * * * /opt/zest-demo/reset_demo.sh >> /var/log/zest-demo-reset.log 2>&1

set -e

DEMO_DIR="/opt/zest-demo"
SEED_DB="/opt/zest-demo/seed_data/zest.db"
SEED_UPLOADS="/opt/zest-demo/seed_data/uploads"
CONTAINER="zest_demo"

echo "$(date '+%Y-%m-%d %H:%M:%S') — Starting demo reset..."

# Stop the container gracefully
docker stop "$CONTAINER" 2>/dev/null || true

# Get volume mount paths
DATA_VOL=$(docker volume inspect zest-demo_zest_demo_data --format '{{ .Mountpoint }}' 2>/dev/null || echo "")
UPLOADS_VOL=$(docker volume inspect zest-demo_zest_demo_uploads --format '{{ .Mountpoint }}' 2>/dev/null || echo "")

if [ -z "$DATA_VOL" ]; then
    echo "ERROR: Could not find data volume. Is the compose stack running?"
    docker start "$CONTAINER" 2>/dev/null || true
    exit 1
fi

# Replace DB with clean seed copy
if [ -f "$SEED_DB" ]; then
    cp "$SEED_DB" "$DATA_VOL/zest.db"
    # Remove any journal files
    rm -f "$DATA_VOL/zest.db-journal" "$DATA_VOL/zest.db-wal" "$DATA_VOL/zest.db-shm"
    echo "  DB restored from seed."
else
    echo "  WARNING: No seed DB found at $SEED_DB"
fi

# Replace uploads with clean seed copy
if [ -d "$SEED_UPLOADS" ] && [ -n "$UPLOADS_VOL" ]; then
    rm -rf "$UPLOADS_VOL"/*
    cp -r "$SEED_UPLOADS"/* "$UPLOADS_VOL"/ 2>/dev/null || true
    echo "  Uploads restored from seed."
fi

# Restart the container
docker start "$CONTAINER"

echo "$(date '+%Y-%m-%d %H:%M:%S') — Demo reset complete."

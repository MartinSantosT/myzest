#!/bin/bash
# setup.sh — Initial setup for Zest demo on Hetzner (CloudPanel + Docker)
#
# Prerequisites:
#   - Docker + Docker Compose installed
#   - DNS A records pointing to this server:
#     myzest.app      → 178.156.138.225
#     demo.myzest.app → 178.156.138.225
#   - CloudPanel sites created:
#     demo.myzest.app → reverse proxy to http://127.0.0.1:8200
#     myzest.app      → static site serving landing page

set -e

DEMO_DIR="/opt/zest-demo"

echo "=== Zest Demo Setup ==="
echo ""

# 1. Check prerequisites
echo "1. Checking prerequisites..."
command -v docker >/dev/null 2>&1 || { echo "ERROR: Docker not installed. Run: curl -fsSL https://get.docker.com | sh"; exit 1; }
echo "   Docker: $(docker --version | head -1)"

# 2. Clone repo if needed
if [ ! -d "$DEMO_DIR" ]; then
    echo "2. Cloning repository..."
    git clone https://github.com/MartinSantosT/myzest.git "$DEMO_DIR"
else
    echo "2. Repository exists at $DEMO_DIR — pulling latest..."
    cd "$DEMO_DIR" && git pull
fi

cd "$DEMO_DIR"

# 3. Build and start Zest container
echo "3. Building and starting Zest demo container..."
cd demo-server
docker compose up -d --build

# 4. Wait for Zest to be ready
echo "4. Waiting for Zest to start..."
sleep 10

for i in {1..12}; do
    if curl -sf http://127.0.0.1:8200/api/health >/dev/null 2>&1; then
        echo "   Zest is healthy on port 8200!"
        break
    fi
    echo "   Waiting... ($i/12)"
    sleep 5
done

# 5. Run migrations
echo "5. Running database migrations..."
docker exec zest_demo python migrate.py 2>/dev/null || echo "   No migrations needed."

# 6. Seed demo data
echo "6. Seeding demo data..."
docker exec zest_demo python demo-server/seed_demo.py

# 7. Create seed backup for reset script
echo "7. Creating seed backup for automatic resets..."
mkdir -p "$DEMO_DIR/seed_data"
docker cp zest_demo:/app/data/zest.db "$DEMO_DIR/seed_data/zest.db"
docker cp zest_demo:/app/app/static/uploads "$DEMO_DIR/seed_data/" 2>/dev/null || mkdir -p "$DEMO_DIR/seed_data/uploads"
echo "   Seed backup saved to $DEMO_DIR/seed_data/"

# 8. Setup cron for automatic reset every 6 hours
echo "8. Setting up automatic reset (every 6 hours)..."
chmod +x "$DEMO_DIR/demo-server/reset_demo.sh"

CRON_CMD="0 */6 * * * $DEMO_DIR/demo-server/reset_demo.sh >> /var/log/zest-demo-reset.log 2>&1"
(crontab -l 2>/dev/null | grep -v "reset_demo.sh"; echo "$CRON_CMD") | crontab -
echo "   Cron job installed."

# 9. Copy landing page to CloudPanel site directory (if needed)
echo ""
echo "=== Setup Complete ==="
echo ""
echo "Verify:"
echo "  curl http://127.0.0.1:8200/api/health"
echo ""
echo "Once CloudPanel SSL is configured:"
echo "  Landing:  https://myzest.app"
echo "  Demo:     https://demo.myzest.app"
echo ""
echo "Demo credentials:"
echo "  Email:    demo@myzest.app"
echo "  Password: demo1234"
echo ""
echo "Reset: automatic every 6h | Manual: bash $DEMO_DIR/demo-server/reset_demo.sh"
echo ""
echo "NEXT STEPS:"
echo "  1. In CloudPanel, create static site 'myzest.app' pointing to $DEMO_DIR/landing/"
echo "  2. In CloudPanel, create reverse proxy 'demo.myzest.app' → http://127.0.0.1:8200"
echo "  3. Request Let's Encrypt SSL for both sites in CloudPanel"
echo "  4. Add demo photos via the UI (login as demo@myzest.app)"

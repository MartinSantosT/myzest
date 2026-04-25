# Zest — User Manual

> **Zest** is a self-hosted culinary diary that stores your recipes, memories, and the stories around the table. This manual covers everything you need to get started and make the most of every feature.

---

## Table of Contents

1. [Installation](#1-installation)
2. [First Steps](#2-first-steps)
3. [Recipes](#3-recipes)
4. [Categories & Tags](#4-categories--tags)
5. [Importing Recipes from URLs](#5-importing-recipes-from-urls)
6. [Ingredients & Portion Calculator](#6-ingredients--portion-calculator)
7. [What to Cook?](#7-what-to-cook)
8. [Shopping List](#8-shopping-list)
9. [Memories](#9-memories)
10. [Moment Cards](#10-moment-cards)
11. [Cookbooks](#11-cookbooks)
12. [Sharing](#12-sharing)
13. [PDF Export](#13-pdf-export)
14. [Settings & Profile](#14-settings--profile)
15. [Backups & Data](#15-backups--data)
16. [Dark Mode](#16-dark-mode)
17. [Keyboard Shortcuts](#17-keyboard-shortcuts)
18. [Troubleshooting](#18-troubleshooting)

---

## 1. Installation

### Requirements

- Docker and Docker Compose installed on your machine
- About 200 MB of disk space (image + dependencies)
- Any hardware: Raspberry Pi 4, NAS, old laptop, cloud VM — anything that runs Docker

### Quick Start

```bash
git clone https://github.com/MartinSantosT/myzest.git
cd myzest
cp .env.example .env
docker compose up -d
```

Open **http://localhost:8000** in your browser. That's it.

### First Launch — Register Your Account

There is no default account. The **first user that registers** automatically becomes the admin and receives 12 example recipes (with photos) to explore the app. Create your account from the registration form on first visit.

### Secure Your Instance

1. **Set a secret key** — Open `.env` and replace the placeholder for `ZEST_SECRET_KEY`. Generate one on your host with either:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# or, if you prefer not to depend on Python on the host:
openssl rand -base64 32
```

Paste the result as `ZEST_SECRET_KEY` in your `.env` file, then restart:

```bash
docker compose down && docker compose up -d
```

> **Important:** if you leave `ZEST_SECRET_KEY` empty (or set to one of the known insecure defaults like `zest-change-this-secret-in-production`), Zest will generate a random key on first boot and persist it in `data/.secret_key`. The container will log a warning until you set the key explicitly. JWT tokens stay valid across restarts because the key is reused from the file.

2. **Change your password whenever you want** — go to **Settings → Profile** in the app. The first user is the admin and there is no shared/default credential to rotate.

### Custom Port

Edit `docker-compose.yml` to change the port:

```yaml
ports:
  - "3000:8000"   # Access Zest on port 3000
```

### Reverse Proxy

If you're exposing Zest to your local network or the internet, place it behind a reverse proxy (Nginx, Caddy, Traefik, or Nginx Proxy Manager). See the README for an example Nginx configuration.

---

## 2. First Steps

When you first log in, Zest shows a brief onboarding experience:

1. **Welcome** — Introduction to Zest's philosophy
2. **Your recipes, your story** — How to create or import your first recipe
3. **Memories** — What makes Zest different: connecting photos and moments to recipes

You can skip the onboarding at any time, or click **"Create my first memory"** to jump right in.

### The Dashboard

After onboarding, you'll see the main dashboard with:

- **Recipe grid** — All your recipes displayed as cards with photos, ratings, and time estimates
- **Sidebar** (left) — Navigation between Recipes, What to Cook, Shopping List, Cookbooks, Memories, and Settings
- **Search bar** — Filter recipes by text, category, tag, or rating
- **+ New Recipe** button — Create a new recipe from scratch

---

## 3. Recipes

### Creating a Recipe

1. Click **+ New Recipe** (or the orange button in the top right)
2. Fill in the details:
   - **Title** (required)
   - **Description** — A short intro or story about the dish
   - **Prep Time & Cook Time** — In minutes
   - **Servings** — How many portions the recipe makes
   - **Photo** — Click the image area to upload a hero photo. You can add up to 4 photos total (1 hero + 3 additional)
3. **Ingredients** — Add one per row. Each ingredient has structured fields:
   - Quantity (number)
   - Unit (cups, grams, tbsp, etc.)
   - Name (the ingredient itself)
   - Note (optional: "finely chopped", "room temperature")
4. **Steps** — Add preparation steps in order. Drag to reorder if needed.
5. **Categories & Tags** — Assign categories and color-coded tags (see section 4)
6. Click **Save**

### Editing a Recipe

Click any recipe card to open its detail view, then click the **Edit** (pencil) button. All fields are editable. Changes are saved when you click **Save**.

### Deleting a Recipe

In the recipe detail view, click **Delete** (trash icon). You'll be asked to confirm. Deletion removes the recipe, its ingredients, steps, images, and any associated cookbook entries. Linked memories are preserved but their recipe association is removed.

### Rating & Favorites

- **Rating** — Click the stars (1–5) on any recipe card or in the detail view
- **Favorites** — Click the heart icon to toggle a recipe as favorite. Use the sidebar filter to view only favorites.

### Multi-Photo Support

Each recipe supports up to 4 photos: one hero image (displayed on the card) and 3 additional photos visible in the detail view. Click the "+" area below the hero image to add more photos.

---

## 4. Categories & Tags

### Categories

Categories are broad classifications for your recipes (e.g., "Mexican", "Desserts", "Soups", "Quick Meals").

- **Adding categories** — In the recipe modal, type in the category field. If it doesn't exist, Zest creates it automatically.
- **Autocomplete** — As you type, matching categories appear as suggestions.
- A recipe can belong to multiple categories.

### Tags

Tags are flexible, color-coded labels for cross-cutting concerns (e.g., "Spicy", "Kid-friendly", "Date night", "Meal prep").

- **Adding tags** — In the recipe modal, select existing tags or create new ones.
- **Custom colors** — Each tag has a color. Click the color swatch to change it.
- **Filtering** — Click any tag in the sidebar or recipe grid to filter by that tag. Multiple filters can be combined.

---

## 5. Importing Recipes from URLs

Zest includes a powerful 4-tier scraping engine that can extract recipes from virtually any cooking website.

### How to Import

1. Click the **"Import from URL"** option in the sidebar
2. Paste the URL of the recipe page
3. Click **Scrape**
4. Zest shows a preview with the extracted data: title, description, ingredients, steps, times, servings, and photo
5. Review and edit anything before saving
6. Click **Save** to add it to your collection

### How the Scraper Works

Zest tries four methods in order, using the first one that succeeds:

1. **recipe-scrapers** library — Supports 400+ popular cooking sites with site-specific parsers
2. **JSON-LD** — Reads structured data embedded in the page (Schema.org Recipe format)
3. **Microdata** — Reads HTML microdata attributes
4. **Heuristic analysis** — Intelligent CSS selector matching for unstructured pages

Imported recipes are automatically tagged with the "Imported from Internet" category and a blue badge showing the source domain.

### Security: SSRF protection

Because the scraper makes HTTP requests on behalf of any logged-in user, it could be abused to probe services on the network where Zest runs (your router, NAS, Proxmox, cloud metadata endpoints, etc.). To prevent this, Zest validates every URL before fetching it and **blocks requests that resolve to internal IP ranges**.

**Blocked by default:**

- Loopback (`127.0.0.0/8`, `::1`) — your own container
- Link-local / cloud metadata (`169.254.0.0/16`, `fe80::/10`) — AWS/GCP/Azure credentials endpoints
- Private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `fc00::/7`) — your LAN
- Other reserved ranges (CGN, multicast, benchmarking)

When a blocked URL is submitted (whether the recipe page itself or an image embedded in the scraped HTML), the scraper returns the error *"URL bloqueada: no se permiten direcciones internas"* and never makes the request.

#### Allowing private networks (advanced)

If you intentionally want to scrape recipes from another service running in your own LAN — for example, a Mealie or Tandoor instance at `192.168.x.x`, or your own recipe blog on a separate machine — you can opt out of the private-network block by setting:

```env
ALLOW_PRIVATE_NETWORKS=true
```

in your `.env` file, then restarting:

```bash
docker compose down && docker compose up -d
```

**Important:** even with this flag enabled, loopback (`127.x`) and cloud metadata (`169.254.x`) remain blocked. There is no legitimate reason for the scraper to fetch its own container or to query a cloud provider's metadata service.

This setting is **only safe** if you are the only user of your Zest instance, or if you fully trust every user that can register on it. In a multi-user setup exposed to untrusted users, leave the default (`false`).

---

## 6. Ingredients & Portion Calculator

### Structured Ingredients

Each ingredient has four fields:

- **Quantity** — A number (supports decimals: 0.5, 1.25, etc.)
- **Unit** — The measurement (cups, grams, ml, tbsp, tsp, oz, lb, etc.)
- **Name** — The ingredient name
- **Note** — Optional details ("diced", "at room temperature", "optional")

### Portion Calculator

On any recipe detail view:

1. Look for the **servings** indicator (e.g., "Serves 4")
2. Use the **+** and **−** buttons to adjust the number of servings
3. All ingredient quantities recalculate proportionally in real-time
4. Fractions are displayed beautifully: ½, ⅓, ¼, ⅔, ¾

For example, a recipe for 4 servings with "2 cups of flour" scaled to 6 servings shows "3 cups of flour".

---

## 7. What to Cook?

This is one of Zest's unique features. It answers the question: "I have chicken, rice, and onion — what can I make?"

### How to Use

1. Click **"What to Cook?"** in the sidebar
2. Start typing an ingredient name — suggestions appear from your recipe database
3. Click to add ingredients to your list
4. Zest instantly shows matching recipes, ranked by match percentage

### Understanding the Results

Each result shows:

- **Match percentage** — How many of the recipe's ingredients you have (green = 75%+, orange = 50%+, gray = below 50%)
- **Missing ingredients** — Highlighted in red so you know what you'd need to buy
- **Portion adjustment** — Scale the recipe right from the results
- **"Add to Shopping List"** — One click to add the missing ingredients to your shopping list

---

## 8. Shopping List

### Adding Items

There are several ways to add items to your shopping list:

- From any recipe detail view, click **"Add to Shopping List"**
- From the "What to Cook?" results, click **"Add missing items"**
- Manually type items in the shopping list view

### Smart Combining

When you add ingredients from multiple recipes, Zest combines them intelligently. If Recipe A needs 200g rice and Recipe B needs 100g rice, your shopping list shows 300g rice.

### Using the List

- Check off items as you shop
- The list persists between sessions
- Clear completed items or the entire list when done

---

## 9. Memories

Memories are what makes Zest different from every other recipe manager. A Memory connects photos, dates, locations, and stories to a recipe — turning your recipe collection into a culinary diary.

### Creating a Memory

1. Click **Memories** in the sidebar
2. Click **+ New Memory**
3. Fill in the details:
   - **Title** — "Christmas dinner 2025", "First attempt at sourdough", etc.
   - **Photos** — Upload up to 10 photos. JPEG photos with EXIF data will auto-fill the date and location.
   - **Date** — When it happened (auto-detected from photo EXIF if available)
   - **Location** — Where it happened (auto-detected from GPS coordinates via reverse geocoding)
   - **Story** — The description of what happened, who was there, why it was special
   - **Linked Recipe** — Associate this memory with a recipe from your collection
4. Click **Save**

### Photo Features

- **Multi-photo upload** — Select multiple photos at once
- **EXIF auto-detection** — Zest reads the date and GPS coordinates from JPEG photos automatically
- **Reverse geocoding** — GPS coordinates are converted to readable place names (e.g., "Brooklyn, New York")
- **HEIC/HEIF support** — iPhone photos work out of the box
- **Image optimization** — Photos are automatically resized (max 1920px) and converted to JPEG for optimal storage

### Viewing Memories

- **Grid view** — All memories displayed as cards with cover photo, date, location, and linked recipe
- **Detail view** — Click any memory to see the full photo gallery, story, and metadata
- **From recipe view** — Each recipe shows its associated memories in a dedicated section

### Editing & Deleting

- Click the **Edit** button in the memory detail view to modify any field or add/remove photos
- Click **Delete** to permanently remove the memory and its photos

---

## 10. Moment Cards

Moment Cards turn your memories into beautiful, shareable images designed for social media.

### Generating a Card

1. Open any memory that has at least one photo
2. Click the **Share** button (gradient orange button)
3. Choose a template:
   - **Story** (1080×1920) — Instagram Stories, TikTok
   - **Square** (1080×1080) — Instagram feed, WhatsApp
   - **Landscape** (1200×630) — Facebook, Twitter/X
4. Preview updates in real-time
5. Click **Download** or use the **Share** button (on mobile, uses the native share sheet)

### Card Design

Each card includes:

- Your photo as a full-bleed background with a dark gradient overlay
- The memory title in large, bold text
- Date and location
- Linked recipe name
- Subtle Zest branding (orange bar + "Zest" text)

---

## 11. Cookbooks

Cookbooks are curated collections of recipes — perfect for organizing by theme, sharing with friends, or creating gift-worthy PDF exports.

### Creating a Cookbook

1. Click **Cookbooks** in the sidebar
2. Click **+ New Cookbook**
3. Add a name, description, and optionally an author's note
4. **Cover photos** — Upload up to 2 cover images. Use drag-to-reposition to frame them perfectly.
5. **Add recipes** — Select recipes from your collection to include
6. Click **Save**

### Managing Cookbooks

- **Reorder recipes** — Drag recipes within a cookbook to set the order
- **Edit** — Change name, description, covers, or recipe selection at any time
- **Delete** — Removes the cookbook but not the recipes themselves

### Author's Note

Each cookbook has an optional personal note that appears at the top when shared or exported. Use it for dedications, context, or a personal message ("Mom, here are our family recipes I've been collecting...").

---

## 12. Sharing

### Public Share Links

1. Open a cookbook
2. Click **Share**
3. Zest generates a unique public link (e.g., `http://yourserver/shared/abc123`)
4. Anyone with the link can view the cookbook and all its recipes — no account needed
5. You can revoke the link at any time

### What Recipients See

The shared view is a beautiful, read-only presentation of your cookbook with cover photos, recipe cards, and full recipe details (ingredients, steps, photos). Your author's note is displayed at the top.

---

## 13. PDF Export

Export cookbooks as professional PDFs suitable for printing or gifting.

### How to Export

1. Open a cookbook
2. Click the **PDF** button
3. Zest generates a PDF with:
   - Cover page with the cookbook name and date
   - Recipe cards with ingredients, steps, and metadata
   - Proper typography with DejaVu fonts (full Unicode support)
4. The PDF downloads automatically

---

## 14. Settings & Profile

Access settings by clicking your avatar or the gear icon in the sidebar.

### Profile

- **Name** — Your display name
- **Email** — Your login email
- **Password** — Change your password (requires current password)
- **Avatar** — Upload a profile photo

### Categories & Tags

- View, rename, or delete categories
- View, rename, change color, or delete tags

---

## 15. Backups & Data

### Automatic Backups

1. Go to **Settings → Backups**
2. Enable automatic backups
3. Configure:
   - **Frequency** — Every 12 hours, 24 hours, or 7 days
   - **Retention** — How many backups to keep (default: 7)
   - **Include images** — Whether to include uploaded photos in backups

Backups are stored in the `./data/backups/` directory on your host machine.

### Manual Export

- **Full backup** (ZIP) — Exports the complete database + all images. Use this for disaster recovery or migrating to a new server.
- **JSON export** — Exports recipes in a portable JSON format for interoperability.

### Import

- **Database import** — Upload a full backup ZIP to restore an entire instance. **This replaces the current database completely** with the contents of the ZIP. Recipes, memories, cookbooks, users and example data that exist in the running instance but not in the backup will be removed.
- **JSON import** — Upload a JSON file to add recipes to your existing collection. Duplicates are detected and skipped. Use this when you want to *add* recipes without losing what you already have.

> **Safety net:** Both Database Import and the in-app Restore button automatically create a snapshot of the current state right before overwriting. The snapshot lands in `data/backups/` (look for the most recent file with the timestamp of the moment you triggered the restore). If you ever import the wrong backup, you can recover from that snapshot.

> **Heads up:** if you used the example seed (the 12 recipes the first user receives) and you import a backup that does NOT contain them, those examples will be gone after the import. The auto-snapshot still has them — you can restore the snapshot if you change your mind.

### Migration Between Servers

1. Export a full backup from the old server
2. Set up a fresh Zest instance on the new server
3. Import the backup
4. Done — all recipes, memories, cookbooks, and images are restored

---

## 16. Dark Mode

Click the moon/sun icon in the sidebar header to toggle between light and dark themes. Your preference is saved locally and persists across sessions.

---

## 17. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Esc` | Close any open modal or overlay |

---

## 18. Troubleshooting

### "Port 8000 is already in use"

Change the port in `docker-compose.yml`:

```yaml
ports:
  - "9000:8000"
```

On Windows, ports 7681–8782 may be blocked by Hyper-V. Use port 9000 or higher.

### Photos won't upload

- Check that the `./app/static/uploads` directory exists and is writable
- Maximum file size depends on your reverse proxy configuration. Add `client_max_body_size 20M;` to your Nginx config.

### Reading the logs

When something does not behave as expected, the first place to look is the container log:

```bash
docker compose logs -f zest
```

The `-f` flag follows the log live — useful while reproducing the issue. Press `Ctrl+C` to stop following. To see only the last lines without following:

```bash
docker compose logs --tail=100 zest
```

### Database migrations

Migrations run **automatically** every time the container starts. There is no manual command to invoke. The startup routine creates any missing tables (`memories`, `memory_photos`, `backup_config`) and adds any missing columns (`share_links.recipe_id`, `share_links.memory_id`, `is_example`, `memories.location`) on existing databases. Schema work is idempotent — restarting an already-up-to-date database is a no-op.

If you ever see startup errors mentioning the schema, share the log (above) when opening an issue.

### HEIC photos not working

HEIC support requires the `pillow-heif` package, which is included in the default Docker image. If you're running Zest outside Docker, install it separately:

```bash
pip install pillow-heif
```

### Forgot your password

If you're locked out, you can reset via the database from inside the container:

```bash
docker exec -it zest python -c "
import bcrypt
from app.database import SessionLocal
from app.models import User
db = SessionLocal()
user = db.query(User).filter(User.email == 'your@email.com').first()
user.password_hash = bcrypt.hashpw(b'newpassword', bcrypt.gensalt()).decode()
db.commit()
print('Password reset successfully')
"
```

Replace `your@email.com` and `newpassword` with your values. The container is named `zest` (matching `container_name` in `docker-compose.yml`).

### Health Check

Verify your instance is running:

```bash
curl http://localhost:8000/api/health
# {"status": "healthy", "recipes": 42, "users": 1}
```

Use this endpoint with Uptime Kuma, Healthchecks.io, or any monitoring tool. The Docker Compose health check uses this same endpoint, so `docker ps` will report `(healthy)` for the `zest` container once the app is responding.

---

## Need Help?

Open an issue on GitHub — we're happy to help.

---

<p align="center">
  <strong>🍊 Zest</strong> — Because recipes deserve memories.
</p>

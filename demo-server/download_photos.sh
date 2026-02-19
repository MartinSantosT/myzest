#!/bin/bash
# download_photos.sh — Download royalty-free food photos for Zest demo
# Source: Unsplash (free to use, no attribution required for photos)
# Run on the Hetzner server after seed_demo.py

set -e

UPLOADS_DIR="/tmp/zest_demo_photos"
mkdir -p "$UPLOADS_DIR"

echo "=== Downloading demo photos from Unsplash ==="

# Recipe photos (matched to seed_demo.py recipes)
# 1. Grandma's Sunday Pasta
echo "  1/12 Grandma's Sunday Pasta..."
curl -sL "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=85" -o "$UPLOADS_DIR/pasta.jpg"

# 2. Morning Banana Pancakes
echo "  2/12 Morning Banana Pancakes..."
curl -sL "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85" -o "$UPLOADS_DIR/pancakes.jpg"

# 3. Thai Green Curry
echo "  3/12 Thai Green Curry..."
curl -sL "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=85" -o "$UPLOADS_DIR/curry.jpg"

# 4. Classic Margherita Pizza
echo "  4/12 Classic Margherita Pizza..."
curl -sL "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=85" -o "$UPLOADS_DIR/pizza.jpg"

# 5. Honey Garlic Salmon
echo "  5/12 Honey Garlic Salmon..."
curl -sL "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=85" -o "$UPLOADS_DIR/salmon.jpg"

# 6. Chocolate Lava Cake
echo "  6/12 Chocolate Lava Cake..."
curl -sL "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=1200&q=85" -o "$UPLOADS_DIR/lavacake.jpg"

# 7. Greek Salad
echo "  7/12 Greek Salad..."
curl -sL "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=85" -o "$UPLOADS_DIR/greeksalad.jpg"

# 8. Chicken Tortilla Soup
echo "  8/12 Chicken Tortilla Soup..."
curl -sL "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85" -o "$UPLOADS_DIR/tortillasoup.jpg"

# 9. Garlic Butter Shrimp Scampi
echo "  9/12 Garlic Butter Shrimp Scampi..."
curl -sL "https://images.unsplash.com/photo-1633504581786-316c8002b1b9?w=1200&q=85" -o "$UPLOADS_DIR/shrimp.jpg"

# 10. Homemade Guacamole
echo "  10/12 Homemade Guacamole..."
curl -sL "https://images.unsplash.com/photo-1615870216519-2f9fa575fa5c?w=1200&q=85" -o "$UPLOADS_DIR/guacamole.jpg"

# 11. Roasted Butternut Squash Soup
echo "  11/12 Roasted Butternut Squash Soup..."
curl -sL "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=1200&q=85" -o "$UPLOADS_DIR/squashsoup.jpg"

# 12. Crispy Fish Tacos
echo "  12/12 Crispy Fish Tacos..."
curl -sL "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=85" -o "$UPLOADS_DIR/fishtacos.jpg"

echo ""
echo "=== Copying photos into Docker container ==="

# Copy all photos to the container's uploads directory
for f in "$UPLOADS_DIR"/*.jpg; do
    filename=$(basename "$f")
    docker cp "$f" zest_demo:/app/app/static/uploads/"$filename"
    echo "  Copied $filename"
done

echo ""
echo "=== Updating database with photo paths ==="

# Update recipe image_url in the database
docker exec zest_demo python -c "
import sqlite3
conn = sqlite3.connect('/app/data/zest.db')
c = conn.cursor()

photos = {
    'Grandma\\'s Sunday Pasta': 'uploads/pasta.jpg',
    'Morning Banana Pancakes': 'uploads/pancakes.jpg',
    'Thai Green Curry': 'uploads/curry.jpg',
    'Classic Margherita Pizza': 'uploads/pizza.jpg',
    'Honey Garlic Salmon': 'uploads/salmon.jpg',
    'Chocolate Lava Cake': 'uploads/lavacake.jpg',
    'Greek Salad': 'uploads/greeksalad.jpg',
    'Chicken Tortilla Soup': 'uploads/tortillasoup.jpg',
    'Garlic Butter Shrimp Scampi': 'uploads/shrimp.jpg',
    'Homemade Guacamole': 'uploads/guacamole.jpg',
    'Roasted Butternut Squash Soup': 'uploads/squashsoup.jpg',
    'Crispy Fish Tacos': 'uploads/fishtacos.jpg',
}

for title, photo_url in photos.items():
    c.execute('UPDATE recipes SET image_url = ? WHERE title = ?', (photo_url, title))
    print(f'  Updated: {title} -> {photo_url}')

conn.commit()
conn.close()
print()
print('Done! All recipe photos updated.')
"

# Cleanup temp files
rm -rf "$UPLOADS_DIR"

echo ""
echo "=== Photos setup complete ==="
echo "Refresh https://demo.myzest.app to see the photos!"
echo ""
echo "IMPORTANT: Run this to update the seed backup with photos:"
echo "  docker cp zest_demo:/app/data/zest.db /opt/zest-demo/seed_data/zest.db"
echo "  docker cp zest_demo:/app/app/static/uploads /opt/zest-demo/seed_data/"

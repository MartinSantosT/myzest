"""
Add hero photos to all 12 demo recipes using Unsplash images.
Run inside container: docker exec zest_demo python demo-server/add_recipe_photos.py
"""
import sqlite3
import urllib.request
import os

conn = sqlite3.connect('/app/data/zest.db')
c = conn.cursor()
uploads_dir = '/app/app/static/uploads'
os.makedirs(uploads_dir, exist_ok=True)

# Recipe title → (Unsplash URL, filename)
recipe_photos = {
    "Grandma's Sunday Pasta": (
        "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=85",
        "recipe_sunday_pasta.jpg"
    ),
    "Morning Banana Pancakes": (
        "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&q=85",
        "recipe_banana_pancakes.jpg"
    ),
    "Thai Green Curry": (
        "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=1200&q=85",
        "recipe_thai_curry.jpg"
    ),
    "Classic Margherita Pizza": (
        "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=1200&q=85",
        "recipe_margherita_pizza.jpg"
    ),
    "Honey Garlic Salmon": (
        "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=1200&q=85",
        "recipe_honey_salmon.jpg"
    ),
    "Chocolate Lava Cake": (
        "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=1200&q=85",
        "recipe_lava_cake.jpg"
    ),
    "Greek Salad": (
        "https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=1200&q=85",
        "recipe_greek_salad.jpg"
    ),
    "Chicken Tortilla Soup": (
        "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=85",
        "recipe_tortilla_soup.jpg"
    ),
    "Garlic Butter Shrimp Scampi": (
        "https://images.unsplash.com/photo-1633504581786-316c8002b1b9?w=1200&q=85",
        "recipe_shrimp_scampi.jpg"
    ),
    "Homemade Guacamole": (
        "https://images.unsplash.com/photo-1600335895229-6e75511892c8?w=1200&q=85",
        "recipe_guacamole.jpg"
    ),
    "Roasted Butternut Squash Soup": (
        "https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=1200&q=85",
        "recipe_squash_soup.jpg"
    ),
    "Crispy Fish Tacos": (
        "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=1200&q=85",
        "recipe_fish_tacos.jpg"
    ),
}

print("=== Adding recipe hero photos ===")
success = 0
errors = 0

for title, (url, filename) in recipe_photos.items():
    c.execute('SELECT id FROM recipes WHERE title = ?', (title,))
    row = c.fetchone()
    if not row:
        print(f"  Recipe not found: {title}")
        errors += 1
        continue

    recipe_id = row[0]
    filepath = os.path.join(uploads_dir, filename)

    try:
        print(f"  Downloading {filename}...")
        urllib.request.urlretrieve(url, filepath)
        image_url = f"uploads/{filename}"
        c.execute('UPDATE recipes SET image_url = ? WHERE id = ?', (image_url, recipe_id))
        print(f"    ✅ {title}")
        success += 1
    except Exception as e:
        print(f"    ❌ ERROR {title}: {e}")
        errors += 1

conn.commit()
conn.close()

print(f"\nDone! Recipe photos: {success} added, {errors} errors.")

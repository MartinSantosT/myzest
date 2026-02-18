"""
Add photos to memories and cookbook cover in Zest demo.
Run inside container: docker exec zest_demo python demo-server/add_photos.py
"""
import sqlite3
import urllib.request
import os

conn = sqlite3.connect('/app/data/zest.db')
c = conn.cursor()
uploads_dir = '/app/app/static/uploads'

# === MEMORY PHOTOS ===
memory_photos = {
    'The Sunday That Started It All': [
        ('https://images.unsplash.com/photo-1556761223-4c4282c73f77?w=800&q=85', 'memory_pasta_1.jpg', 'The sauce simmering away'),
    ],
    'Birthday Pizza Night': [
        ('https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=85', 'memory_pizza_1.jpg', 'Fresh out of the oven'),
    ],
    'Pancake Saturday Tradition': [
        ('https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=800&q=85', 'memory_pancakes_1.jpg', 'Saturday morning stack'),
    ],
    'First Snow Soup': [
        ('https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=800&q=85', 'memory_soup_1.jpg', 'Warm soup on a cold day'),
    ],
}

print("=== Adding memory photos ===")
for title, photos in memory_photos.items():
    c.execute('SELECT id FROM memories WHERE title = ?', (title,))
    row = c.fetchone()
    if not row:
        print(f'  Memory not found: {title}')
        continue
    memory_id = row[0]

    for i, (url, filename, caption) in enumerate(photos):
        filepath = os.path.join(uploads_dir, filename)
        print(f'  Downloading {filename}...')
        urllib.request.urlretrieve(url, filepath)

        image_url = f'uploads/{filename}'
        c.execute(
            'INSERT INTO memory_photos (memory_id, image_url, caption, order_index) VALUES (?, ?, ?, ?)',
            (memory_id, image_url, caption, i)
        )
        print(f'  Added photo to: {title}')

# === COOKBOOK COVER ===
print()
print("=== Adding cookbook cover ===")
cover_path = os.path.join(uploads_dir, 'cookbook_cover.jpg')
print('  Downloading cookbook cover...')
urllib.request.urlretrieve(
    'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1200&q=85',
    cover_path
)
c.execute("UPDATE cookbooks SET cover_image_url = 'uploads/cookbook_cover.jpg' WHERE name = 'Family Favorites'")
print('  Cookbook cover updated!')

conn.commit()
conn.close()
print()
print('Done! Memories + cookbook cover updated.')

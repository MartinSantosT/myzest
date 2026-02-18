"""
Add emotional/people photos to memories and cookbook in Zest demo.
Food photos are great, but the MOMENTS need PEOPLE.
Run inside container: docker exec zest_demo python demo-server/add_emotional_photos.py
"""
import sqlite3
import urllib.request
import os

conn = sqlite3.connect('/app/data/zest.db')
c = conn.cursor()
uploads_dir = '/app/app/static/uploads'

# === ADDITIONAL MEMORY PHOTOS (people, emotions, moments) ===
memory_extra_photos = {
    'The Sunday That Started It All': [
        # Grandma cooking, family kitchen vibes
        ('https://images.unsplash.com/photo-1507048331197-7d4ac70811cf?w=800&q=85',
         'memory_pasta_family.jpg', 'Cooking together, just like she taught us'),
        ('https://images.unsplash.com/photo-1542691457-cbe4df77094a?w=800&q=85',
         'memory_pasta_hands.jpg', 'Hands that know the recipe by heart'),
    ],
    'Birthday Pizza Night': [
        # Family making pizza, kids cooking, flour mess
        ('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=85',
         'memory_pizza_making.jpg', 'The second pizza was the good one'),
        ('https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?w=800&q=85',
         'memory_pizza_family.jpg', 'Flour everywhere — worth it'),
    ],
    'Pancake Saturday Tradition': [
        # Family breakfast, kids in kitchen, morning vibes
        ('https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=800&q=85',
         'memory_pancakes_table.jpg', 'Saturday mornings are for pancakes'),
        ('https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=800&q=85',
         'memory_pancakes_breakfast.jpg', 'The table is set, come and get it'),
    ],
    'First Snow Soup': [
        # Cozy winter scene, people with warm drinks, family dinner
        ('https://images.unsplash.com/photo-1481391032119-d89fee407e44?w=800&q=85',
         'memory_soup_cozy.jpg', 'Watching the snow from the kitchen window'),
        ('https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?w=800&q=85',
         'memory_soup_warm.jpg', 'Nothing beats a warm bowl on a cold day'),
    ],
}

print("=== Adding emotional photos to memories ===")
for title, photos in memory_extra_photos.items():
    c.execute('SELECT id FROM memories WHERE title = ?', (title,))
    row = c.fetchone()
    if not row:
        print(f'  Memory not found: {title}')
        continue
    memory_id = row[0]

    # Get current max order_index for this memory
    c.execute('SELECT COALESCE(MAX(order_index), -1) FROM memory_photos WHERE memory_id = ?', (memory_id,))
    max_order = c.fetchone()[0]

    for i, (url, filename, caption) in enumerate(photos):
        filepath = os.path.join(uploads_dir, filename)
        print(f'  Downloading {filename}...')
        try:
            urllib.request.urlretrieve(url, filepath)
            image_url = f'uploads/{filename}'
            order_idx = max_order + 1 + i
            c.execute(
                'INSERT INTO memory_photos (memory_id, image_url, caption, order_index) VALUES (?, ?, ?, ?)',
                (memory_id, image_url, caption, order_idx)
            )
            print(f'    Added to: {title} (order {order_idx})')
        except Exception as e:
            print(f'    ERROR downloading {filename}: {e}')

# === COOKBOOK: second cover photo (people/family) ===
print()
print("=== Adding second cookbook cover (family) ===")
cover2_filename = 'cookbook_cover2.jpg'
cover2_path = os.path.join(uploads_dir, cover2_filename)
print(f'  Downloading {cover2_filename}...')
try:
    urllib.request.urlretrieve(
        'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=1200&q=85',
        cover2_path
    )
    c.execute(
        "UPDATE cookbooks SET cover_image_url_2 = 'uploads/cookbook_cover2.jpg' WHERE name = 'Family Favorites'"
    )
    print('  Second cookbook cover updated!')
except Exception as e:
    print(f'  ERROR: {e}')

conn.commit()
conn.close()

print()
print('Done! Emotional photos added.')
print()
print('Summary:')
print(f'  Memory photos added: {sum(len(v) for v in memory_extra_photos.values())}')
print(f'  Cookbook second cover: 1')
print()
print('Update seed backup:')
print('  docker cp zest_demo:/app/data/zest.db /opt/zest-demo/seed_data/zest.db')
print('  docker cp zest_demo:/app/app/static/uploads /opt/zest-demo/seed_data/')

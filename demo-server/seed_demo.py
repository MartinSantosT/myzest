"""
Seed script for Zest demo instance (demo.myzest.app)
Creates demo user + sample recipes + memories + cookbook

Run inside the container:
  docker exec zest_demo python /app/demo-server/seed_demo.py

Or from host:
  docker exec zest_demo python -c "exec(open('/app/demo-server/seed_demo.py').read())"
"""

import sys
import os

# Add app to path
sys.path.insert(0, "/app")

from sqlalchemy import create_engine, insert
from sqlalchemy.orm import sessionmaker
from app.models import (
    User, Recipe, Ingredient, Step, Category, Tag,
    recipe_categories, recipe_tags, Memory, MemoryPhoto,
    Cookbook, cookbook_recipes
)
from app.database import Base
import bcrypt
from datetime import datetime, date
from slugify import slugify

def parse_qty(s):
    """Convert quantity string to float. Handles fractions like '1/4', '1/2'."""
    if not s or not s.strip():
        return None
    s = s.strip()
    if '/' in s:
        parts = s.split('/')
        return float(parts[0]) / float(parts[1])
    try:
        return float(s)
    except ValueError:
        return None

DB_PATH = "/app/data/zest.db"
engine = create_engine(f"sqlite:///{DB_PATH}")
Session = sessionmaker(bind=engine)

# Create tables if they don't exist
Base.metadata.create_all(engine)

db = Session()

# ============================================================
# 1. DEMO USER
# ============================================================
demo_email = "demo@myzest.app"
existing = db.query(User).filter(User.email == demo_email).first()
if existing:
    print("Demo data already exists. Skipping seed.")
    db.close()
    sys.exit(0)

password_hash = bcrypt.hashpw("demo1234".encode(), bcrypt.gensalt()).decode()
demo_user = User(
    email=demo_email,
    name="Demo Chef",
    password_hash=password_hash,
    username="demochef",
    is_admin=True
)
db.add(demo_user)
db.flush()

print(f"Created demo user: {demo_email} / demo1234")

# ============================================================
# 2. CATEGORIES
# ============================================================
category_names = [
    "Breakfast", "Lunch", "Dinner", "Desserts", "Appetizers",
    "Soups", "Salads", "Pasta", "Seafood", "Vegetarian",
    "Mexican", "Italian", "Asian", "Baking", "Quick Meals"
]
categories = {}
for name in category_names:
    cat = Category(name=name, slug=slugify(name))
    db.add(cat)
    db.flush()
    categories[name] = cat

# ============================================================
# 3. TAGS
# ============================================================
tag_data = [
    ("Family Favorite", "#f97316"),
    ("Quick & Easy", "#22c55e"),
    ("Weekend Special", "#8b5cf6"),
    ("Comfort Food", "#ef4444"),
    ("Healthy", "#06b6d4"),
    ("Party", "#ec4899"),
    ("Holiday", "#eab308"),
    ("Kid Friendly", "#3b82f6"),
]
tags = {}
for name, color in tag_data:
    tag = Tag(name=name, color=color)
    db.add(tag)
    db.flush()
    tags[name] = tag

# ============================================================
# 4. RECIPES
# ============================================================
recipes_data = [
    {
        "title": "Grandma's Sunday Pasta",
        "description": "The recipe that started it all. Every Sunday, grandma would fill the house with the aroma of slow-cooked tomato sauce. This is that recipe, exactly as she made it.",
        "prep_time": 20, "cook_time": 120, "servings": 6, "rating": 5,
        "is_favorite": True,
        "categories": ["Dinner", "Italian", "Pasta"],
        "tags": ["Family Favorite", "Comfort Food", "Weekend Special"],
        "ingredients": [
            ("2", "lbs", "San Marzano tomatoes", "canned, crushed"),
            ("1", "lb", "spaghetti", ""),
            ("4", "cloves", "garlic", "minced"),
            ("1", "large", "onion", "diced"),
            ("1/4", "cup", "olive oil", "extra virgin"),
            ("1", "bunch", "fresh basil", ""),
            ("1", "tsp", "sugar", "to balance acidity"),
            ("", "", "salt and pepper", "to taste"),
            ("1", "cup", "Parmigiano-Reggiano", "freshly grated"),
        ],
        "steps": [
            "Heat olive oil in a large heavy-bottomed pot over medium heat. Add diced onion and cook until translucent, about 5 minutes.",
            "Add minced garlic and cook for 1 minute until fragrant. Don't let it burn.",
            "Pour in the crushed San Marzano tomatoes. Add sugar, salt, and pepper. Stir well.",
            "Bring to a gentle simmer, then reduce heat to low. Cover partially and let it cook for 2 hours, stirring occasionally. This slow cooking is the secret — don't rush it.",
            "In the last 15 minutes, cook spaghetti in salted boiling water until al dente. Reserve 1 cup of pasta water before draining.",
            "Tear fresh basil leaves and add to the sauce. Toss pasta with sauce, adding pasta water as needed for silkiness.",
            "Serve with freshly grated Parmigiano-Reggiano. Close your eyes. You're at grandma's table again."
        ]
    },
    {
        "title": "Morning Banana Pancakes",
        "description": "Fluffy pancakes that became our Saturday morning tradition. The kids wake up to the smell and come running downstairs still in pajamas.",
        "prep_time": 10, "cook_time": 15, "servings": 4, "rating": 5,
        "is_favorite": True,
        "categories": ["Breakfast"],
        "tags": ["Family Favorite", "Quick & Easy", "Kid Friendly"],
        "ingredients": [
            ("2", "cups", "all-purpose flour", ""),
            ("2", "large", "ripe bananas", "mashed"),
            ("2", "", "eggs", ""),
            ("1", "cup", "milk", ""),
            ("2", "tbsp", "butter", "melted"),
            ("2", "tbsp", "maple syrup", "plus more for serving"),
            ("2", "tsp", "baking powder", ""),
            ("1", "pinch", "cinnamon", ""),
            ("1", "pinch", "salt", ""),
        ],
        "steps": [
            "In a large bowl, mash the bananas until smooth. Add eggs, milk, melted butter, and maple syrup. Whisk together.",
            "In a separate bowl, combine flour, baking powder, cinnamon, and salt.",
            "Pour wet ingredients into dry ingredients. Stir until just combined — lumps are okay! Overmixing makes tough pancakes.",
            "Heat a non-stick pan or griddle over medium heat. Lightly butter the surface.",
            "Pour 1/4 cup batter per pancake. Cook until bubbles form on the surface, about 2 minutes. Flip and cook 1 more minute.",
            "Serve stacked with fresh banana slices and a generous drizzle of maple syrup."
        ]
    },
    {
        "title": "Thai Green Curry",
        "description": "Our go-to weeknight dinner when we want something warm, fragrant, and satisfying. Ready in 30 minutes but tastes like it took hours.",
        "prep_time": 10, "cook_time": 20, "servings": 4, "rating": 4,
        "is_favorite": False,
        "categories": ["Dinner", "Asian", "Quick Meals"],
        "tags": ["Quick & Easy", "Healthy"],
        "ingredients": [
            ("2", "tbsp", "green curry paste", ""),
            ("1", "can", "coconut milk", "400ml, full fat"),
            ("1", "lb", "chicken breast", "sliced thin"),
            ("1", "cup", "bamboo shoots", ""),
            ("1", "cup", "Thai basil leaves", ""),
            ("2", "tbsp", "fish sauce", ""),
            ("1", "tbsp", "palm sugar", "or brown sugar"),
            ("4", "", "kaffir lime leaves", "torn"),
            ("1", "cup", "jasmine rice", "cooked, for serving"),
        ],
        "steps": [
            "Heat a splash of coconut cream (the thick part from the top of the can) in a wok over high heat.",
            "Add green curry paste and fry for 1 minute until fragrant.",
            "Add sliced chicken and stir-fry for 3 minutes until sealed on the outside.",
            "Pour in the remaining coconut milk. Add bamboo shoots, fish sauce, palm sugar, and torn kaffir lime leaves.",
            "Simmer for 15 minutes until chicken is cooked through and sauce has thickened slightly.",
            "Remove from heat. Stir in Thai basil leaves — the residual heat will wilt them perfectly.",
            "Serve over steamed jasmine rice."
        ]
    },
    {
        "title": "Classic Margherita Pizza",
        "description": "We made this the night we bought our pizza stone. The dough is simple, the toppings are minimal, and the result is pure magic.",
        "prep_time": 90, "cook_time": 12, "servings": 2, "rating": 5,
        "is_favorite": True,
        "categories": ["Dinner", "Italian"],
        "tags": ["Weekend Special", "Family Favorite"],
        "ingredients": [
            ("2.5", "cups", "bread flour", "tipo 00 if available"),
            ("1", "cup", "warm water", "110°F / 43°C"),
            ("1", "packet", "active dry yeast", "2.25 tsp"),
            ("1", "tsp", "sugar", ""),
            ("1", "tsp", "salt", ""),
            ("2", "tbsp", "olive oil", ""),
            ("1", "cup", "San Marzano tomato sauce", "crushed, seasoned"),
            ("8", "oz", "fresh mozzarella", "sliced"),
            ("", "", "fresh basil leaves", ""),
        ],
        "steps": [
            "Dissolve sugar and yeast in warm water. Let sit for 5 minutes until foamy.",
            "In a large bowl, combine flour and salt. Add yeast mixture and olive oil. Mix until a shaggy dough forms.",
            "Knead on a floured surface for 8-10 minutes until smooth and elastic. The dough should bounce back when poked.",
            "Place in an oiled bowl, cover with a damp towel, and let rise for 1 hour until doubled.",
            "Preheat oven to 500°F (260°C) with pizza stone inside for at least 30 minutes.",
            "Punch down dough and stretch into a 12-inch circle on a floured peel. Don't use a rolling pin — stretch with your hands.",
            "Spread thin layer of tomato sauce, leaving 1-inch border. Add mozzarella slices.",
            "Slide onto hot pizza stone. Bake 10-12 minutes until crust is golden and cheese is bubbling.",
            "Remove, add fresh basil leaves, drizzle with olive oil, and let rest 2 minutes before cutting."
        ]
    },
    {
        "title": "Honey Garlic Salmon",
        "description": "Restaurant-quality salmon in 20 minutes. The glaze caramelizes beautifully and makes the whole kitchen smell incredible.",
        "prep_time": 5, "cook_time": 15, "servings": 2, "rating": 4,
        "is_favorite": False,
        "categories": ["Dinner", "Seafood", "Quick Meals"],
        "tags": ["Quick & Easy", "Healthy"],
        "ingredients": [
            ("2", "", "salmon fillets", "6oz each, skin-on"),
            ("3", "tbsp", "honey", ""),
            ("2", "tbsp", "soy sauce", ""),
            ("3", "cloves", "garlic", "minced"),
            ("1", "tbsp", "butter", ""),
            ("1", "tbsp", "olive oil", ""),
            ("1", "", "lemon", "juiced"),
            ("", "", "salt and pepper", "to taste"),
        ],
        "steps": [
            "Pat salmon dry with paper towels. Season with salt and pepper.",
            "Mix honey, soy sauce, minced garlic, and lemon juice in a small bowl.",
            "Heat olive oil in an oven-safe skillet over medium-high heat.",
            "Place salmon skin-side up and sear for 3 minutes until golden.",
            "Flip salmon. Pour honey garlic mixture around the fish. Add butter.",
            "Transfer skillet to a preheated 400°F (200°C) oven. Bake 8-10 minutes.",
            "Spoon the caramelized glaze over the salmon before serving. Pair with steamed broccoli or rice."
        ]
    },
    {
        "title": "Chocolate Lava Cake",
        "description": "The dessert that never fails to impress. Break the crust with a spoon and watch the warm chocolate flow out. Pure drama on a plate.",
        "prep_time": 15, "cook_time": 14, "servings": 4, "rating": 5,
        "is_favorite": True,
        "categories": ["Desserts", "Baking"],
        "tags": ["Weekend Special", "Party"],
        "ingredients": [
            ("6", "oz", "dark chocolate", "70% cacao, chopped"),
            ("1/2", "cup", "unsalted butter", ""),
            ("2", "", "whole eggs", ""),
            ("2", "", "egg yolks", ""),
            ("1/4", "cup", "sugar", ""),
            ("2", "tbsp", "all-purpose flour", ""),
            ("1", "pinch", "salt", ""),
            ("", "", "powdered sugar", "for dusting"),
            ("", "", "vanilla ice cream", "for serving"),
        ],
        "steps": [
            "Preheat oven to 425°F (220°C). Butter and flour 4 ramekins generously.",
            "Melt chocolate and butter together in a double boiler or microwave (30-second intervals). Stir until smooth.",
            "In a separate bowl, whisk eggs, egg yolks, and sugar until thick and pale, about 2 minutes.",
            "Fold the chocolate mixture into the egg mixture. Gently fold in flour and salt.",
            "Divide batter among prepared ramekins. You can refrigerate them up to 8 hours before baking — perfect for dinner parties.",
            "Bake for exactly 12-14 minutes. The edges should be firm but the center should jiggle slightly.",
            "Let cool for 1 minute, then invert onto plates. Tap gently and lift ramekin. Dust with powdered sugar.",
            "Serve immediately with vanilla ice cream. The contrast of warm chocolate and cold ice cream is everything."
        ]
    },
    {
        "title": "Greek Salad",
        "description": "Summer in a bowl. No cooking required, no tricks — just the freshest ingredients you can find, dressed simply.",
        "prep_time": 15, "cook_time": 0, "servings": 4, "rating": 4,
        "is_favorite": False,
        "categories": ["Lunch", "Salads", "Vegetarian"],
        "tags": ["Quick & Easy", "Healthy"],
        "ingredients": [
            ("4", "large", "ripe tomatoes", "cut into wedges"),
            ("1", "large", "cucumber", "sliced into half moons"),
            ("1", "", "red onion", "thinly sliced"),
            ("1", "cup", "Kalamata olives", ""),
            ("7", "oz", "feta cheese", "block, not crumbled"),
            ("1", "", "green bell pepper", "sliced into rings"),
            ("3", "tbsp", "extra virgin olive oil", "the best you have"),
            ("1", "tbsp", "red wine vinegar", ""),
            ("1", "tsp", "dried oregano", ""),
        ],
        "steps": [
            "Cut tomatoes into wedges, cucumber into half moons, and red onion into thin slices.",
            "Arrange vegetables on a large plate — don't toss them in a bowl, spread them out like they do in Greece.",
            "Scatter Kalamata olives and green pepper rings over the vegetables.",
            "Place the entire block of feta cheese on top. Yes, the whole block. That's how it's done.",
            "Drizzle generously with extra virgin olive oil and a splash of red wine vinegar.",
            "Sprinkle dried oregano on the feta. Season with a little salt (careful — feta and olives are already salty).",
            "Serve with crusty bread to soak up the juices at the bottom. That's the best part."
        ]
    },
    {
        "title": "Chicken Tortilla Soup",
        "description": "This soup has been our cold-weather comfort since the first year we moved north. Smoky, warm, and deeply satisfying with every crunchy tortilla strip on top.",
        "prep_time": 15, "cook_time": 30, "servings": 6, "rating": 4,
        "is_favorite": False,
        "categories": ["Soups", "Mexican", "Dinner"],
        "tags": ["Comfort Food", "Family Favorite"],
        "ingredients": [
            ("2", "lbs", "chicken breast", ""),
            ("1", "can", "fire-roasted tomatoes", "14oz"),
            ("1", "can", "black beans", "drained and rinsed"),
            ("1", "cup", "corn kernels", "frozen is fine"),
            ("4", "cups", "chicken broth", ""),
            ("1", "", "onion", "diced"),
            ("3", "cloves", "garlic", "minced"),
            ("1", "tbsp", "cumin", ""),
            ("1", "tsp", "chili powder", ""),
            ("", "", "tortilla strips", "for topping"),
            ("", "", "avocado, lime, cilantro", "for serving"),
        ],
        "steps": [
            "Heat oil in a large pot over medium heat. Cook onion and garlic until fragrant, about 3 minutes.",
            "Add cumin and chili powder. Stir for 30 seconds until spices bloom.",
            "Add chicken breasts, fire-roasted tomatoes, black beans, corn, and chicken broth. Bring to a boil.",
            "Reduce heat and simmer for 25 minutes until chicken is cooked through.",
            "Remove chicken, shred with two forks, and return to the pot. Stir well.",
            "Ladle into bowls. Top with crispy tortilla strips, diced avocado, a squeeze of lime, and fresh cilantro.",
            "Serve with warm tortillas on the side."
        ]
    },
    {
        "title": "Garlic Butter Shrimp Scampi",
        "description": "10-minute dinner that looks and tastes like a special occasion. The garlic butter sauce is dangerously good — you'll want to drink it.",
        "prep_time": 5, "cook_time": 8, "servings": 2, "rating": 5,
        "is_favorite": True,
        "categories": ["Dinner", "Seafood", "Quick Meals"],
        "tags": ["Quick & Easy", "Party"],
        "ingredients": [
            ("1", "lb", "large shrimp", "peeled and deveined"),
            ("4", "tbsp", "butter", ""),
            ("5", "cloves", "garlic", "sliced thin"),
            ("1/2", "cup", "dry white wine", ""),
            ("1", "", "lemon", "juiced"),
            ("1/4", "tsp", "red pepper flakes", ""),
            ("8", "oz", "angel hair pasta", "cooked"),
            ("", "", "fresh parsley", "chopped"),
        ],
        "steps": [
            "Cook angel hair pasta according to package. Reserve 1/2 cup pasta water. Drain.",
            "In a large skillet, melt butter over medium-high heat. Add sliced garlic and red pepper flakes. Cook 1 minute.",
            "Add shrimp in a single layer. Cook 2 minutes per side until pink and curled.",
            "Pour in white wine and lemon juice. Let it bubble for 2 minutes to reduce slightly.",
            "Toss in the cooked pasta. Add pasta water as needed for a silky sauce.",
            "Finish with chopped parsley and an extra squeeze of lemon. Serve immediately."
        ]
    },
    {
        "title": "Homemade Guacamole",
        "description": "The recipe we make every game day, every party, every 'we need a snack' moment. Simple, fresh, and always gone in minutes.",
        "prep_time": 10, "cook_time": 0, "servings": 4, "rating": 5,
        "is_favorite": True,
        "categories": ["Appetizers", "Mexican"],
        "tags": ["Quick & Easy", "Party", "Kid Friendly"],
        "ingredients": [
            ("3", "large", "ripe avocados", ""),
            ("1", "", "lime", "juiced"),
            ("1/2", "", "red onion", "finely diced"),
            ("1", "", "jalapeño", "seeded and minced"),
            ("1/4", "cup", "fresh cilantro", "chopped"),
            ("1", "", "Roma tomato", "diced, seeds removed"),
            ("1/2", "tsp", "salt", ""),
            ("1", "pinch", "cumin", ""),
        ],
        "steps": [
            "Cut avocados in half, remove pits, and scoop flesh into a bowl.",
            "Add lime juice immediately (prevents browning) and mash with a fork to desired consistency. We like it chunky.",
            "Fold in diced red onion, minced jalapeño, cilantro, and tomato.",
            "Season with salt and a pinch of cumin. Taste and adjust — it should be bright and slightly tangy.",
            "Serve immediately with warm tortilla chips. Pro tip: press plastic wrap directly onto the surface to store leftovers (but there won't be any)."
        ]
    },
    {
        "title": "Roasted Butternut Squash Soup",
        "description": "Velvety, warm, and deeply comforting. Roasting the squash first caramelizes the sugars and takes this from 'just soup' to something special.",
        "prep_time": 15, "cook_time": 45, "servings": 4, "rating": 4,
        "is_favorite": False,
        "categories": ["Soups", "Vegetarian"],
        "tags": ["Healthy", "Comfort Food"],
        "ingredients": [
            ("1", "large", "butternut squash", "halved and seeded"),
            ("1", "", "onion", "quartered"),
            ("4", "cloves", "garlic", "whole, unpeeled"),
            ("3", "cups", "vegetable broth", ""),
            ("1/2", "cup", "heavy cream", ""),
            ("2", "tbsp", "olive oil", ""),
            ("1", "tsp", "nutmeg", "freshly grated"),
            ("", "", "salt and pepper", "to taste"),
            ("", "", "pepitas", "for garnish"),
        ],
        "steps": [
            "Preheat oven to 400°F (200°C). Place squash halves cut-side up on a baking sheet with onion quarters and garlic cloves.",
            "Drizzle with olive oil, season with salt and pepper. Roast for 40-45 minutes until squash is fork-tender and edges are caramelized.",
            "Scoop roasted squash flesh into a pot. Squeeze garlic out of skins into the pot. Add roasted onion.",
            "Pour in vegetable broth. Bring to a simmer.",
            "Blend with an immersion blender until completely smooth. Stir in heavy cream and nutmeg.",
            "Taste and adjust seasoning. Serve topped with a swirl of cream and toasted pepitas."
        ]
    },
    {
        "title": "Crispy Fish Tacos",
        "description": "Beach day food, minus the beach. Crispy battered fish, crunchy slaw, creamy sauce — every bite is a mini vacation.",
        "prep_time": 20, "cook_time": 10, "servings": 4, "rating": 4,
        "is_favorite": False,
        "categories": ["Dinner", "Mexican", "Seafood"],
        "tags": ["Party", "Family Favorite"],
        "ingredients": [
            ("1", "lb", "white fish fillets", "cod or tilapia"),
            ("1", "cup", "all-purpose flour", ""),
            ("1", "cup", "beer", "light lager"),
            ("1", "tsp", "paprika", ""),
            ("8", "", "small flour tortillas", ""),
            ("2", "cups", "shredded cabbage", ""),
            ("1/2", "cup", "sour cream", ""),
            ("2", "tbsp", "sriracha", ""),
            ("1", "", "lime", "juiced"),
            ("", "", "oil for frying", ""),
        ],
        "steps": [
            "Mix flour, paprika, and a pinch of salt. Whisk in beer until batter is smooth and slightly thick.",
            "Cut fish into strips about 1 inch wide.",
            "Heat 2 inches of oil in a deep pan to 375°F (190°C).",
            "Dip fish strips in batter, let excess drip off, and fry for 3-4 minutes until golden and crispy. Drain on paper towels.",
            "Make the sauce: mix sour cream, sriracha, and lime juice.",
            "Warm tortillas. Fill with crispy fish, shredded cabbage, and a drizzle of sriracha cream sauce.",
            "Squeeze fresh lime over everything. Serve immediately."
        ]
    },
]

recipe_objects = []
for i, r in enumerate(recipes_data):
    recipe = Recipe(
        user_id=demo_user.id,
        slug=slugify(r["title"]),
        title=r["title"],
        description=r["description"],
        prep_time=r["prep_time"],
        cook_time=r["cook_time"],
        servings=r["servings"],
        rating=r["rating"],
        is_favorite=r.get("is_favorite", False),
        image_url=None,
    )
    db.add(recipe)
    db.flush()

    # Ingredients
    for j, (qty, unit, name, note) in enumerate(r["ingredients"]):
        ing = Ingredient(
            recipe_id=recipe.id,
            quantity=parse_qty(qty),
            unit=unit,
            name=name,
            note=note,
            text=f"{qty} {unit} {name}".strip() + (f" ({note})" if note else ""),
            order_index=j
        )
        db.add(ing)

    # Steps
    for j, step_text in enumerate(r["steps"]):
        step = Step(
            recipe_id=recipe.id,
            text=step_text,
            order_index=j
        )
        db.add(step)

    # Categories
    for cat_name in r.get("categories", []):
        if cat_name in categories:
            db.execute(insert(recipe_categories).values(recipe_id=recipe.id, category_id=categories[cat_name].id))

    # Tags
    for tag_name in r.get("tags", []):
        if tag_name in tags:
            db.execute(insert(recipe_tags).values(recipe_id=recipe.id, tag_id=tags[tag_name].id))

    recipe_objects.append(recipe)
    print(f"  Created recipe: {r['title']}")

db.flush()

# ============================================================
# 5. MEMORIES
# ============================================================
memories_data = [
    {
        "title": "The Sunday That Started It All",
        "description": "It was raining outside when I decided to try grandma's pasta recipe from that old notebook she left me. The sauce simmered for two hours while I read her handwritten notes in the margins. 'Don't rush the tomatoes,' she wrote. I didn't. And for those two hours, she was right there in the kitchen with me.",
        "event_date": date(2025, 3, 15),
        "location": "Home Kitchen, Portland",
        "recipe_index": 0,  # Grandma's Sunday Pasta
    },
    {
        "title": "Birthday Pizza Night",
        "description": "For my birthday, instead of going to a restaurant, we stayed home and made pizzas from scratch. The kids got flour everywhere. The first pizza was a disaster — too much sauce, soggy middle. But the second one? Perfect. We ate it standing around the kitchen counter, straight from the cutting board, laughing about the flour explosion.",
        "event_date": date(2025, 8, 22),
        "location": "Home Kitchen, Portland",
        "recipe_index": 3,  # Margherita Pizza
    },
    {
        "title": "Pancake Saturday Tradition",
        "description": "Every Saturday morning for the past year, the kids wake up to banana pancakes. They know the routine now — Emma mashes the bananas, Lucas cracks the eggs (mostly successfully). It's not just breakfast. It's our thing. Years from now, when they're grown up, I hope they remember the smell of these pancakes on Saturday mornings.",
        "event_date": date(2025, 11, 8),
        "location": "Home Kitchen, Portland",
        "recipe_index": 1,  # Banana Pancakes
    },
    {
        "title": "First Snow Soup",
        "description": "The first snow of the season fell while the soup was simmering. We watched it through the kitchen window, holding warm mugs of tortilla soup. The crispy strips on top, the squeeze of lime, the steam rising — it felt like the kind of moment you only see in movies. But it was real, and it was ours.",
        "event_date": date(2025, 12, 1),
        "location": "Home Kitchen, Portland",
        "recipe_index": 7,  # Chicken Tortilla Soup
    },
]

memory_objects = []
for m in memories_data:
    memory = Memory(
        user_id=demo_user.id,
        recipe_id=recipe_objects[m["recipe_index"]].id if m["recipe_index"] is not None else None,
        title=m["title"],
        description=m["description"],
        event_date=m["event_date"],
        location=m.get("location", ""),
    )
    db.add(memory)
    db.flush()
    memory_objects.append(memory)
    print(f"  Created memory: {m['title']}")

# ============================================================
# 6. COOKBOOK
# ============================================================
cookbook = Cookbook(
    user_id=demo_user.id,
    name="Family Favorites",
    description="The recipes that define us. Every dish here comes with a story, a memory, and a reason to cook it again.",
    note="Started this collection in 2025 when I realized our best family moments always happened around food. These aren't just recipes — they're the soundtrack of our kitchen.",
)
db.add(cookbook)
db.flush()

# Add favorite recipes to cookbook
favorites = [0, 1, 3, 5, 8, 9]  # Indices of favorite recipes
for order, idx in enumerate(favorites):
    db.execute(insert(cookbook_recipes).values(
        cookbook_id=cookbook.id,
        recipe_id=recipe_objects[idx].id,
        order_index=order
    ))

print(f"  Created cookbook: Family Favorites ({len(favorites)} recipes)")

# ============================================================
# COMMIT
# ============================================================
db.commit()
db.close()

print("\n✅ Demo data seeded successfully!")
print(f"   Login: {demo_email} / demo1234")
print(f"   Recipes: {len(recipes_data)}")
print(f"   Categories: {len(category_names)}")
print(f"   Tags: {len(tag_data)}")
print(f"   Memories: {len(memories_data)}")
print(f"   Cookbooks: 1")
print("\nNote: Photos are not included. Add them manually via the UI or by copying")
print("images to /app/app/static/uploads/ and updating image_url in the database.")

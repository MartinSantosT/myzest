from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Header, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session, joinedload, subqueryload
from sqlalchemy import text
from typing import List, Optional
import os
import shutil
import uuid
import re
from slugify import slugify
import json
import zipfile
from pathlib import Path
from datetime import datetime, timedelta, date
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse, HTMLResponse
import io
import tempfile
import hashlib
import hmac
import base64
import bcrypt as bcrypt_lib

from . import models, schemas, database

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

# Register HEIC/HEIF support in Pillow (iPhone photos)
try:
    from pillow_heif import register_heif_opener
    register_heif_opener()
except ImportError:
    pass  # pillow-heif not installed, HEIC not supported

# --- CONFIGURATION ---
models.Base.metadata.create_all(bind=database.engine)

# --- AUTO-MIGRATE: add missing columns ---
try:
    with database.engine.connect() as conn:
        # ShareLink.recipe_id (added for individual recipe sharing)
        try:
            conn.execute(text("SELECT recipe_id FROM share_links LIMIT 1"))
        except Exception:
            conn.execute(text("ALTER TABLE share_links ADD COLUMN recipe_id INTEGER REFERENCES recipes(id) ON DELETE CASCADE"))
            conn.commit()
        # ShareLink.memory_id (added for individual memory sharing)
        try:
            conn.execute(text("SELECT memory_id FROM share_links LIMIT 1"))
        except Exception:
            conn.execute(text("ALTER TABLE share_links ADD COLUMN memory_id INTEGER REFERENCES memories(id) ON DELETE CASCADE"))
            conn.commit()
        # is_example columns (added for seed/example data)
        for table in ["recipes", "memories", "cookbooks"]:
            try:
                conn.execute(text(f"SELECT is_example FROM {table} LIMIT 1"))
            except Exception:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN is_example BOOLEAN DEFAULT 0"))
                conn.commit()
except Exception as e:
    print(f"Auto-migrate note: {e}")

app = FastAPI(title="Zest Recipe Manager", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

os.makedirs("app/static", exist_ok=True)
os.makedirs("app/static/uploads", exist_ok=True)
os.makedirs("data", exist_ok=True)
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# --- AUTH CONFIG ---
SECRET_KEY = os.environ.get("ZEST_SECRET_KEY", "zest-dev-secret-change-in-production-2024")
TOKEN_EXPIRY_DAYS = 30

def get_db():
    db = database.SessionLocal()
    try: yield db
    finally: db.close()


# --- PASSWORD HASHING (bcrypt) ---
def hash_password(password: str) -> str:
    """Hash password with bcrypt."""
    return bcrypt_lib.hashpw(password.encode('utf-8'), bcrypt_lib.gensalt()).decode('utf-8')

def verify_password(password: str, stored_hash: str) -> bool:
    """Verify password. Supports bcrypt, legacy sha256 and plaintext."""
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        return bcrypt_lib.checkpw(password.encode('utf-8'), stored_hash.encode('utf-8'))
    elif ":" in stored_hash:
        # Legacy sha256 (format "salt:hash")
        salt, hashed = stored_hash.split(":", 1)
        return hashlib.sha256((salt + password).encode()).hexdigest() == hashed
    else:
        # Legacy plaintext
        return password == stored_hash

def needs_rehash(stored_hash: str) -> bool:
    """Detect if a password needs to be re-hashed to bcrypt."""
    return not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"))


# --- SIMPLE JWT (without external dependencies) ---
def create_token(user_id: int, email: str) -> str:
    """Create a simple JWT with HMAC-SHA256."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")

    payload_data = {
        "user_id": user_id,
        "email": email,
        "exp": (datetime.utcnow() + timedelta(days=TOKEN_EXPIRY_DAYS)).isoformat(),
        "iat": datetime.utcnow().isoformat()
    }
    payload = base64.urlsafe_b64encode(json.dumps(payload_data).encode()).decode().rstrip("=")

    signature_input = f"{header}.{payload}".encode()
    signature = base64.urlsafe_b64encode(
        hmac.new(SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
    ).decode().rstrip("=")

    return f"{header}.{payload}.{signature}"

def decode_token(token: str) -> dict:
    """Decode and verify a JWT."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header, payload, signature = parts

        # Verify signature
        signature_input = f"{header}.{payload}".encode()
        expected_sig = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
        ).decode().rstrip("=")

        if not hmac.compare_digest(signature, expected_sig):
            return None

        # Decode payload (add padding)
        padding = 4 - len(payload) % 4
        if padding != 4:
            payload += "=" * padding

        payload_data = json.loads(base64.urlsafe_b64decode(payload))

        # Verify expiration
        exp = datetime.fromisoformat(payload_data["exp"])
        if datetime.utcnow() > exp:
            return None

        return payload_data
    except Exception:
        return None


# --- AUTH DEPENDENCY ---
def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> models.User:
    """Extract current user from JWT token."""
    if not authorization:
        raise HTTPException(401, "Token required")

    # Support "Bearer <token>" or just "<token>"
    token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization

    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")

    user = db.query(models.User).filter(models.User.id == payload["user_id"]).first()
    if not user:
        raise HTTPException(401, "User not found")

    return user

def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[models.User]:
    """Try to extract user, but don't fail if there's no token (for public routes)."""
    if not authorization:
        return None
    try:
        return get_current_user(authorization, db)
    except HTTPException:
        return None


# --- STARTUP ---
@app.on_event("startup")
def ensure_default_user():
    db = database.SessionLocal()
    user = db.query(models.User).filter(models.User.id == 1).first()
    if not user:
        db.add(models.User(
            email="admin@zest.local",
            name="Chef",
            username="admin",
            password_hash=hash_password("admin"),
            is_admin=True
        ))
        db.commit()
    db.close()

@app.on_event("startup")
def ensure_imported_category():
    """Auto-create 'Imported from Internet' category if it doesn't exist."""
    db = database.SessionLocal()
    cat = db.query(models.Category).filter(models.Category.name == "Imported from Internet").first()
    if not cat:
        db.add(models.Category(name="Imported from Internet"))
        db.commit()
    db.close()


# --- UTILITIES ---
def generate_unique_slug(db: Session, title: str):
    base_slug = slugify(title)
    slug = base_slug
    counter = 1
    while db.query(models.Recipe).filter(models.Recipe.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


# --- INGREDIENT PARSER ---
UNIT_MAP = {
    r'tazas?': 'taza', r'cucharadas?\s*soperas?': 'cucharada',
    r'cucharadas?': 'cucharada', r'cucharaditas?': 'cucharadita',
    r'cdas?\.?': 'cucharada', r'cdtas?\.?': 'cucharadita',
    r'cuchara\s+sopera': 'cucharada',
    r'vasos?': 'vaso', r'vasitos?': 'vasito',
    r'litros?': 'litro', r'ml\.?': 'ml', r'cl\.?': 'cl', r'cc\.?': 'cc',
    r'copas?': 'copa',
    r'grs?\.?': 'g', r'gms?\.?': 'g', r'gramos?': 'g', r'gr\.?': 'g',
    r'kgs?\.?': 'kg', r'kilos?': 'kg',
    r'libras?': 'libra', r'lbs?\.?': 'libra',
    r'onzas?': 'onza', r'oz\.?': 'onza',
    r'latas?': 'lata', r'potes?': 'pote', r'sobres?': 'sobre',
    r'sobresitos?': 'sobre', r'bolsas?': 'bolsa', r'paquetes?': 'paquete',
    r'botes?': 'bote', r'tarros?': 'tarro',
    r'ud\.?': 'unidad', r'uds\.?': 'unidad', r'unidades?': 'unidad',
    r'piezas?': 'pieza',
    r'dientes?': 'diente', r'hojas?': 'hoja', r'ramas?': 'rama',
    r'ramitas?': 'ramita', r'rodajas?': 'rodaja', r'rebanadas?': 'rebanada',
    r'lonjas?': 'lonja', r'lonchas?': 'loncha',
    r'manojos?': 'manojo', r'manos?': 'mano',
    r'pellizcos?': 'pellizco', r'pizcas?': 'pizca',
    r'chorritos?': 'chorrito', r'chorros?': 'chorro', r'puñados?': 'puñado',
}

def parse_ingredient(text: str) -> dict:
    text = text.strip()
    if not text:
        return {'quantity': None, 'unit': None, 'name': '', 'notes': ''}

    m = re.match(r'^[Uu]n[ao]?\s+(pizca|pellizco|chorrito|chorro|poco|puñado)\s+de\s+(.*)', text)
    if m:
        name = m.group(2).strip().rstrip('.,;')
        return {'quantity': 1, 'unit': m.group(1).lower(), 'name': name, 'notes': ''}

    m = re.match(r'^([^:]+):\s*(\d[\d.,/\s]*)\s*(.*)', text)
    if m and len(m.group(1)) > 3:
        name_part = m.group(1).strip()
        qty, _ = _parse_qty(m.group(2).strip() + ' x')
        unit_rest = m.group(3).strip()
        if qty is not None and unit_rest:
            unit, extra = _parse_unit(unit_rest)
            return {'quantity': qty, 'unit': unit, 'name': (name_part + ' ' + extra).strip().rstrip('.,;'), 'notes': ''}

    quantity, rest = _parse_qty(text)
    unit, rest = _parse_unit(rest)

    notes = ''
    paren = re.search(r'\(([^)]+)\)', rest)
    if paren:
        notes = paren.group(1)
        rest = rest[:paren.start()].strip() + ' ' + rest[paren.end():].strip()

    m2 = re.search(r',?\s*(al? (?:su )?gusto)\.?$', rest, re.IGNORECASE)
    if m2:
        notes = (notes + ', ' + m2.group(1)).strip(', ')
        rest = rest[:m2.start()].strip()

    name = rest.strip().rstrip('.,;:')
    return {'quantity': quantity, 'unit': unit, 'name': name, 'notes': notes}

def _parse_qty(text):
    unicode_fracs = {'½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 0.333, '⅔': 0.667}
    for char, val in unicode_fracs.items():
        if text.startswith(char):
            return val, text[1:].strip()

    m = re.match(r'^(\d+)\s+(\d+)/(\d+)\s+(.*)', text)
    if m:
        return int(m.group(1)) + int(m.group(2)) / int(m.group(3)), m.group(4).strip()

    m = re.match(r'^(\d+)/(\d+)\s+(.*)', text)
    if m:
        return int(m.group(1)) / int(m.group(2)), m.group(3).strip()

    m = re.match(r'^(\d+[.,]?\d*)\s+(.*)', text)
    if m:
        return float(m.group(1).replace(',', '.')), m.group(2).strip()

    return None, text

def _parse_unit(text):
    for pattern, normalized in UNIT_MAP.items():
        m = re.match(r'^(' + pattern + r')\.?\s+(?:de\s+)?(.*)', text, re.IGNORECASE)
        if m:
            return normalized, (m.group(2) or '').strip()
    if text.startswith('de '):
        return None, text[3:].strip()
    return None, text


# ============================================================
# ROUTES
# ============================================================

@app.get("/")
def read_root(): return RedirectResponse(url="/static/index.html")

@app.get("/api/health")
def health_check(): return {"message": "Zest API Online", "version": "2.0.0"}


# --- AUTH ENDPOINTS ---

@app.post("/auth/register", response_model=schemas.TokenResponse)
@limiter.limit("5/minute")
def register(request: Request, data: schemas.UserRegister, db: Session = Depends(get_db)):
    # Validate email
    if not data.email or "@" not in data.email:
        raise HTTPException(400, "Invalid email")

    # Check that it doesn't exist
    existing = db.query(models.User).filter(models.User.email == data.email).first()
    if existing:
        raise HTTPException(400, "An account with this email already exists")

    if len(data.password) < 4:
        raise HTTPException(400, "Password must be at least 4 characters")

    user = models.User(
        email=data.email,
        name=data.name,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Auto-seed example data for the first user
    user_count = db.query(models.User).count()
    if user_count == 1:
        try:
            from .seed_examples import seed_user_examples
            result = seed_user_examples(db, user.id)
            db.commit()
            print(f"Example data seeded: {result}")
        except Exception as e:
            print(f"Warning: Failed to seed examples: {e}")

    token = create_token(user.id, user.email)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserResponse.model_validate(user)
    )

@app.post("/auth/login", response_model=schemas.TokenResponse)
@limiter.limit("10/minute")
def login(request: Request, data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, "Invalid email or password")

    # Auto-upgrade: if hash is legacy (sha256/plaintext), re-hash with bcrypt
    if needs_rehash(user.password_hash):
        user.password_hash = hash_password(data.password)
        db.commit()

    token = create_token(user.id, user.email)
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserResponse.model_validate(user)
    )

@app.get("/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

@app.put("/auth/profile", response_model=schemas.UserResponse)
def update_profile(data: schemas.UserProfileUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Validate email if it changed
    if data.email and data.email != current_user.email:
        if "@" not in data.email:
            raise HTTPException(400, "Invalid email")
        existing = db.query(models.User).filter(
            models.User.email == data.email,
            models.User.id != current_user.id
        ).first()
        if existing:
            raise HTTPException(400, "That email is already in use")
        current_user.email = data.email

    if data.name:
        current_user.name = data.name

    if data.avatar_url is not None:
        current_user.avatar_url = data.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user

@app.put("/auth/password")
def change_password(data: schemas.UserPasswordChange, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(400, "Current password is incorrect")

    if len(data.new_password) < 4:
        raise HTTPException(400, "New password must be at least 4 characters")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()
    return {"msg": "Password updated"}


# --- UPLOAD (with optimization and HEIC support) ---

def process_image(file_bytes: bytes, original_ext: str, max_size: int = 1920) -> tuple:
    """
    Process image: convert HEIC→JPEG, optimize size, preserve EXIF.
    Returns (processed_bytes, final_extension).
    """
    from PIL import Image as PILImage
    import io as _io

    ext = original_ext.lower()

    # Try to open with Pillow (supports HEIC if pillow-heif is installed)
    try:
        img = PILImage.open(_io.BytesIO(file_bytes))
    except Exception:
        # If Pillow can't open it, return unprocessed
        return file_bytes, ext

    # Preserve EXIF if it exists
    exif_data = None
    try:
        exif_data = img.info.get('exif')
    except Exception:
        pass

    # Rotate according to EXIF orientation
    try:
        from PIL import ImageOps
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    # Resize if too large (maintain aspect ratio)
    if max(img.width, img.height) > max_size:
        img.thumbnail((max_size, max_size), PILImage.LANCZOS)

    # Convert to RGB if necessary (HEIC, RGBA, etc.)
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Save as optimized JPEG
    output = _io.BytesIO()
    save_kwargs = {"format": "JPEG", "quality": 85, "optimize": True}
    if exif_data:
        save_kwargs["exif"] = exif_data
    img.save(output, **save_kwargs)
    output.seek(0)

    return output.getvalue(), "jpg"


@app.post("/upload/")
@limiter.limit("30/minute")
async def upload_image(request: Request, file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.content_type.startswith('image/'): raise HTTPException(400, "Not an image")
    original_ext = file.filename.split(".")[-1]
    file_bytes = await file.read()

    processed_bytes, ext = process_image(file_bytes, original_ext)
    name = f"{uuid.uuid4()}.{ext}"
    path = f"app/static/uploads/{name}"
    with open(path, "wb") as f:
        f.write(processed_bytes)
    return {"url": f"/static/uploads/{name}"}

def delete_image_file(image_url: str):
    """Delete an image file from disk if it exists."""
    if not image_url or not image_url.startswith("/static/uploads/"):
        return
    file_path = f"app{image_url}"
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

@app.delete("/upload/")
async def delete_uploaded_image(url: str, current_user: models.User = Depends(get_current_user)):
    """Delete an image from server. Only the owner can delete."""
    delete_image_file(url)
    return {"msg": "Deleted"}


# --- RECIPE SCRAPING ---

from pydantic import BaseModel as PydanticBaseModel

class ScrapeRequest(PydanticBaseModel):
    url: str

@app.post("/recipes/scrape")
@limiter.limit("10/minute")
def scrape_recipe_endpoint(request: Request, req: ScrapeRequest, current_user: models.User = Depends(get_current_user)):
    """
    Scrape a recipe from a URL. Returns pre-filled recipe data for review.
    Does NOT save the recipe — the user reviews and then POSTs to /recipes/.
    """
    from .scrapers import scrape_recipe, download_recipe_image

    result = scrape_recipe(req.url)

    if not result.success:
        raise HTTPException(422, result.error)

    recipe_data = result.data

    # Download and store the hero image locally
    local_image = download_recipe_image(recipe_data.get('image_url', ''))

    # Build response matching RecipeCreate schema for easy frontend integration
    response = {
        "success": True,
        "method": result.method,
        "recipe": {
            "title": recipe_data.get('title', ''),
            "description": recipe_data.get('description', ''),
            "servings": recipe_data.get('servings') or 4,
            "prep_time": recipe_data.get('prep_time') or 0,
            "cook_time": recipe_data.get('cook_time') or 0,
            "image_url": local_image or "",
            "source_url": req.url,
            "source_type": "imported",
            "ingredients": [
                {"text": ing, "order_index": i}
                for i, ing in enumerate(recipe_data.get('ingredients', []))
            ],
            "steps": [
                {"text": step, "order_index": i}
                for i, step in enumerate(recipe_data.get('steps', []))
            ],
        }
    }

    return response


# --- CATEGORIES ---

@app.get("/categories/", response_model=List[schemas.Category])
def get_categories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Category).order_by(models.Category.name).all()

@app.post("/categories/", response_model=schemas.Category)
def create_category(category: schemas.CategoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.Category).filter(models.Category.name == category.name).first()
    if existing:
        return existing
    db_cat = models.Category(name=category.name)
    db.add(db_cat)
    db.commit()
    db.refresh(db_cat)
    return db_cat


# --- TAGS ---

@app.get("/tags/", response_model=List[schemas.Tag])
def get_tags(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Tag).order_by(models.Tag.name).all()

@app.post("/tags/", response_model=schemas.Tag)
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    existing = db.query(models.Tag).filter(models.Tag.name == tag.name).first()
    if existing:
        return existing
    db_tag = models.Tag(name=tag.name, color=tag.color)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


# --- RECIPES ---

@app.get("/recipes/", response_model=List[schemas.Recipe])
def read_recipes(skip: int = 0, limit: int = 2000, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Recipe).filter(
        models.Recipe.user_id == current_user.id
    ).options(
        joinedload(models.Recipe.categories),
        joinedload(models.Recipe.ingredients),
        joinedload(models.Recipe.steps),
        joinedload(models.Recipe.tags),
        joinedload(models.Recipe.images),
        subqueryload(models.Recipe.memories)
    ).order_by(models.Recipe.title.asc()).offset(skip).limit(limit).all()

@app.post("/recipes/", response_model=schemas.Recipe)
def create_recipe(recipe: schemas.RecipeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    unique_slug = generate_unique_slug(db, recipe.title)
    db_recipe = models.Recipe(
        title=recipe.title, slug=unique_slug, description=recipe.description,
        prep_time=recipe.prep_time, cook_time=recipe.cook_time,
        servings=recipe.servings, rating=recipe.rating,
        image_url=recipe.image_url, is_favorite=recipe.is_favorite,
        source_url=recipe.source_url or "", source_type=recipe.source_type or "original",
        user_id=current_user.id
    )
    db.add(db_recipe)
    db.flush()

    for cat_id in recipe.category_ids:
        category = db.query(models.Category).filter(models.Category.id == cat_id).first()
        if category:
            db_recipe.categories.append(category)

    for tag_id in recipe.tag_ids:
        tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
        if tag:
            db_recipe.tags.append(tag)

    for ing in recipe.ingredients:
        parsed = parse_ingredient(ing.text)
        db.add(models.Ingredient(
            text=ing.text, note=ing.note or parsed['notes'],
            order_index=ing.order_index, recipe_id=db_recipe.id,
            quantity=parsed['quantity'], unit=parsed['unit'], name=parsed['name']
        ))
    for step in recipe.steps: db.add(models.Step(**step.model_dump(), recipe_id=db_recipe.id))

    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@app.put("/recipes/{recipe_id}", response_model=schemas.Recipe)
def update_recipe(recipe_id: int, recipe: schemas.RecipeCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_recipe = db.query(models.Recipe).filter(
        models.Recipe.id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not db_recipe: raise HTTPException(404, "Recipe not found")

    if recipe.title != db_recipe.title:
        db_recipe.slug = generate_unique_slug(db, recipe.title)
        db_recipe.title = recipe.title

    db_recipe.description = recipe.description
    db_recipe.prep_time = recipe.prep_time
    db_recipe.cook_time = recipe.cook_time
    db_recipe.servings = recipe.servings
    db_recipe.rating = recipe.rating
    db_recipe.image_url = recipe.image_url
    db_recipe.source_url = recipe.source_url or db_recipe.source_url or ""
    # Preserve source_type if recipe was already imported and client didn't send it explicitly
    if db_recipe.source_type == "imported" and recipe.source_type == "original":
        pass  # Don't overwrite — frontend probably didn't send the field
    else:
        db_recipe.source_type = recipe.source_type or db_recipe.source_type or "original"

    db_recipe.categories.clear()
    for cat_id in recipe.category_ids:
        category = db.query(models.Category).filter(models.Category.id == cat_id).first()
        if category:
            db_recipe.categories.append(category)

    db_recipe.tags.clear()
    for tag_id in recipe.tag_ids:
        tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
        if tag:
            db_recipe.tags.append(tag)

    db.query(models.Ingredient).filter(models.Ingredient.recipe_id == recipe_id).delete()
    db.query(models.Step).filter(models.Step.recipe_id == recipe_id).delete()

    for ing in recipe.ingredients:
        parsed = parse_ingredient(ing.text)
        db.add(models.Ingredient(
            text=ing.text, note=ing.note or parsed['notes'],
            order_index=ing.order_index, recipe_id=recipe_id,
            quantity=parsed['quantity'], unit=parsed['unit'], name=parsed['name']
        ))
    for step in recipe.steps: db.add(models.Step(**step.model_dump(), recipe_id=recipe_id))

    db.commit()
    db.refresh(db_recipe)
    return db_recipe

@app.delete("/recipes/{recipe_id}")
def delete_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_recipe = db.query(models.Recipe).filter(
        models.Recipe.id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not db_recipe: raise HTTPException(404)
    db.delete(db_recipe)
    db.commit()
    return {"msg": "Deleted"}

@app.patch("/recipes/{recipe_id}/favorite")
def toggle_favorite(recipe_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_recipe = db.query(models.Recipe).filter(
        models.Recipe.id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not db_recipe: raise HTTPException(404, "Recipe not found")
    db_recipe.is_favorite = not db_recipe.is_favorite
    db.commit()
    db.refresh(db_recipe)
    return {"id": db_recipe.id, "is_favorite": db_recipe.is_favorite}


# --- RECIPE IMAGES (additional photos) ---

@app.post("/recipes/{recipe_id}/images", response_model=schemas.RecipeImage)
async def add_recipe_image(recipe_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_recipe = db.query(models.Recipe).filter(
        models.Recipe.id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not db_recipe: raise HTTPException(404, "Recipe not found")

    # Max 3 additional photos
    existing_count = db.query(models.RecipeImage).filter(models.RecipeImage.recipe_id == recipe_id).count()
    if existing_count >= 3:
        raise HTTPException(400, "Maximum 3 additional photos per recipe")

    if not file.content_type.startswith('image/'): raise HTTPException(400, "Not an image")
    ext = file.filename.split(".")[-1]
    name = f"{uuid.uuid4()}.{ext}"
    path = f"app/static/uploads/{name}"
    with open(path, "wb") as buffer: shutil.copyfileobj(file.file, buffer)

    db_image = models.RecipeImage(
        recipe_id=recipe_id,
        image_url=f"/static/uploads/{name}",
        order_index=existing_count
    )
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

@app.delete("/recipes/{recipe_id}/images/{image_id}")
def delete_recipe_image(recipe_id: int, image_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    db_image = db.query(models.RecipeImage).join(models.Recipe).filter(
        models.RecipeImage.id == image_id,
        models.RecipeImage.recipe_id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not db_image: raise HTTPException(404)
    db.delete(db_image)
    db.commit()
    return {"msg": "Image deleted"}


# --- COOKBOOKS (Recipe Collections) ---

@app.get("/cookbooks/", response_model=List[schemas.Cookbook])
def get_cookbooks(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.Cookbook).filter(
        models.Cookbook.user_id == current_user.id
    ).options(
        joinedload(models.Cookbook.recipes)
    ).order_by(models.Cookbook.name).all()

@app.post("/cookbooks/", response_model=schemas.Cookbook)
def create_cookbook(data: schemas.CookbookCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cookbook = models.Cookbook(
        name=data.name,
        description=data.description,
        cover_image_url=data.cover_image_url,
        cover_image_url_2=data.cover_image_url_2,
        cover_position_1=data.cover_position_1,
        cover_position_2=data.cover_position_2,
        note=data.note,
        user_id=current_user.id
    )
    db.add(cookbook)
    db.flush()

    for rid in data.recipe_ids:
        recipe = db.query(models.Recipe).filter(
            models.Recipe.id == rid,
            models.Recipe.user_id == current_user.id
        ).first()
        if recipe:
            cookbook.recipes.append(recipe)

    db.commit()
    db.refresh(cookbook)
    return cookbook

@app.put("/cookbooks/{cookbook_id}", response_model=schemas.Cookbook)
def update_cookbook(cookbook_id: int, data: schemas.CookbookUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cookbook = db.query(models.Cookbook).filter(
        models.Cookbook.id == cookbook_id,
        models.Cookbook.user_id == current_user.id
    ).first()
    if not cookbook: raise HTTPException(404)

    # Clean up replaced images
    if cookbook.cover_image_url and cookbook.cover_image_url != data.cover_image_url:
        delete_image_file(cookbook.cover_image_url)
    if cookbook.cover_image_url_2 and cookbook.cover_image_url_2 != data.cover_image_url_2:
        delete_image_file(cookbook.cover_image_url_2)

    cookbook.name = data.name
    cookbook.description = data.description
    cookbook.cover_image_url = data.cover_image_url
    cookbook.cover_image_url_2 = data.cover_image_url_2
    cookbook.cover_position_1 = data.cover_position_1
    cookbook.cover_position_2 = data.cover_position_2
    cookbook.note = data.note

    cookbook.recipes.clear()
    for rid in data.recipe_ids:
        recipe = db.query(models.Recipe).filter(
            models.Recipe.id == rid,
            models.Recipe.user_id == current_user.id
        ).first()
        if recipe:
            cookbook.recipes.append(recipe)

    db.commit()
    db.refresh(cookbook)
    return cookbook

@app.delete("/cookbooks/{cookbook_id}")
def delete_cookbook(cookbook_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    cookbook = db.query(models.Cookbook).filter(
        models.Cookbook.id == cookbook_id,
        models.Cookbook.user_id == current_user.id
    ).first()
    if not cookbook: raise HTTPException(404)
    # Clean up cover images
    delete_image_file(cookbook.cover_image_url)
    delete_image_file(cookbook.cover_image_url_2)
    db.delete(cookbook)
    db.commit()
    return {"msg": "Deleted"}


# --- SHARE LINKS ---

@app.post("/share/", response_model=schemas.ShareLink)
def create_share_link(data: schemas.ShareLinkCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # If it's for a cookbook, verify it belongs to the user
    if data.cookbook_id:
        cookbook = db.query(models.Cookbook).filter(
            models.Cookbook.id == data.cookbook_id,
            models.Cookbook.user_id == current_user.id
        ).first()
        if not cookbook: raise HTTPException(404, "Cookbook not found")

    link = models.ShareLink(
        token=uuid.uuid4().hex,
        user_id=current_user.id,
        cookbook_id=data.cookbook_id,
        allow_signup=data.allow_signup
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return link

@app.get("/share/{token}/recipes", response_model=List[schemas.Recipe])
def get_shared_recipes(token: str, db: Session = Depends(get_db)):
    """PUBLIC route — doesn't require auth. Returns shared recipes."""
    share = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not share: raise HTTPException(404, "Link not found")

    if share.cookbook_id:
        # Recipes from specific cookbook
        cookbook = db.query(models.Cookbook).filter(models.Cookbook.id == share.cookbook_id).options(
            joinedload(models.Cookbook.recipes).joinedload(models.Recipe.ingredients),
            joinedload(models.Cookbook.recipes).joinedload(models.Recipe.steps),
            joinedload(models.Cookbook.recipes).joinedload(models.Recipe.images),
        ).first()
        return cookbook.recipes if cookbook else []
    else:
        # All recipes from user
        return db.query(models.Recipe).filter(
            models.Recipe.user_id == share.user_id
        ).options(
            joinedload(models.Recipe.categories),
            joinedload(models.Recipe.ingredients),
            joinedload(models.Recipe.steps),
            joinedload(models.Recipe.tags),
            joinedload(models.Recipe.images)
        ).order_by(models.Recipe.title).all()

@app.get("/share/{token}/info")
def get_share_info(token: str, db: Session = Depends(get_db)):
    """PUBLIC route — shared link info."""
    share = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not share: raise HTTPException(404, "Link not found")

    user = db.query(models.User).filter(models.User.id == share.user_id).first()

    info = {
        "owner_name": user.name if user else "Chef",
        "allow_signup": share.allow_signup,
        "cookbook_name": None,
        "cookbook_description": None,
        "cover_image_url": None,
        "cover_image_url_2": None,
        "cover_position_1": "50% 50%",
        "cover_position_2": "50% 50%",
        "cookbook_note": None,
    }

    if share.cookbook_id:
        cookbook = db.query(models.Cookbook).filter(models.Cookbook.id == share.cookbook_id).first()
        if cookbook:
            info["cookbook_name"] = cookbook.name
            info["cookbook_description"] = cookbook.description
            info["cover_image_url"] = cookbook.cover_image_url
            info["cover_image_url_2"] = cookbook.cover_image_url_2
            info["cover_position_1"] = cookbook.cover_position_1 or "50% 50%"
            info["cover_position_2"] = cookbook.cover_position_2 or "50% 50%"
            info["cookbook_note"] = cookbook.note

    return info

@app.get("/share/mine", response_model=List[schemas.ShareLink])
def get_my_share_links(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.ShareLink).filter(models.ShareLink.user_id == current_user.id).all()

@app.delete("/share/{link_id}")
def delete_share_link(link_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    link = db.query(models.ShareLink).filter(
        models.ShareLink.id == link_id,
        models.ShareLink.user_id == current_user.id
    ).first()
    if not link: raise HTTPException(404)
    db.delete(link)
    db.commit()
    return {"msg": "Deleted"}


# --- RECIPE SHARING (Individual) ---

@app.post("/recipes/{recipe_id}/share")
def create_recipe_share_link(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate a public link to share an individual recipe."""
    recipe = db.query(models.Recipe).filter(
        models.Recipe.id == recipe_id,
        models.Recipe.user_id == current_user.id
    ).first()
    if not recipe:
        raise HTTPException(404, "Recipe not found")

    # Search for existing link
    existing = db.query(models.ShareLink).filter(
        models.ShareLink.user_id == current_user.id,
        models.ShareLink.recipe_id == recipe_id
    ).first()
    if existing:
        return {"token": existing.token, "id": existing.id}

    token = uuid.uuid4().hex[:12]
    link = models.ShareLink(
        token=token,
        user_id=current_user.id,
        recipe_id=recipe_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"token": link.token, "id": link.id}


@app.get("/recipes/{recipe_id}/share-link")
def get_recipe_share_link(
    recipe_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get the existing share link for a recipe."""
    link = db.query(models.ShareLink).filter(
        models.ShareLink.user_id == current_user.id,
        models.ShareLink.recipe_id == recipe_id
    ).first()
    if not link:
        return {"token": None}
    return {"token": link.token, "id": link.id}


@app.post("/memories/{memory_id}/share")
def create_memory_share_link(
    memory_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate a public link to share a memory."""
    memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).first()
    if not memory:
        raise HTTPException(404, "Memory not found")

    existing = db.query(models.ShareLink).filter(
        models.ShareLink.user_id == current_user.id,
        models.ShareLink.memory_id == memory_id
    ).first()
    if existing:
        return {"token": existing.token, "id": existing.id}

    token = uuid.uuid4().hex[:12]
    link = models.ShareLink(
        token=token,
        user_id=current_user.id,
        memory_id=memory_id,
    )
    db.add(link)
    db.commit()
    db.refresh(link)
    return {"token": link.token, "id": link.id}


@app.get("/memories/{memory_id}/share-link")
def get_memory_share_link(
    memory_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Get the existing share link for a memory."""
    link = db.query(models.ShareLink).filter(
        models.ShareLink.user_id == current_user.id,
        models.ShareLink.memory_id == memory_id
    ).first()
    if not link:
        return {"token": None}
    return {"token": link.token, "id": link.id}


# --- SHARED MEMORY PUBLIC VIEW ---

@app.get("/shared/memory/{token}")
def shared_memory_public_view(token: str, request: Request, db: Session = Depends(get_db)):
    """Serve the public page for a shared memory with OG meta tags."""
    share = db.query(models.ShareLink).filter(
        models.ShareLink.token == token,
        models.ShareLink.memory_id.isnot(None)
    ).first()
    if not share:
        raise HTTPException(404, "Link not found")
    shared_memory_html = "app/static/shared_memory.html"
    if not os.path.exists(shared_memory_html):
        raise HTTPException(404, "Page not available")

    memory = db.query(models.Memory).filter(models.Memory.id == share.memory_id).options(
        joinedload(models.Memory.photos)
    ).first()
    if not memory:
        return FileResponse(shared_memory_html, media_type="text/html")

    owner = db.query(models.User).filter(models.User.id == share.user_id).first()
    owner_name = owner.name if owner else "Someone"

    base_url = str(request.base_url).rstrip("/")
    page_url = f"{base_url}/shared/memory/{token}"
    title = f"{memory.title} — Zest"
    description = memory.description or f"A moment shared by {owner_name} on Zest"
    # Use first photo as OG image
    image_url = ""
    if memory.photos:
        photo_url = memory.photos[0].image_url
        image_url = f"{base_url}{photo_url}"

    og_tags = f'''
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{page_url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description[:200]}">
    {f'<meta property="og:image" content="{image_url}">' if image_url else ''}
    {f'<meta property="og:image:width" content="1200">' if image_url else ''}
    {f'<meta property="og:image:height" content="630">' if image_url else ''}
    <meta property="og:site_name" content="Zest">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description[:200]}">
    {f'<meta name="twitter:image" content="{image_url}">' if image_url else ''}
    '''

    with open(shared_memory_html, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace("</head>", og_tags + "\n</head>")
    html = html.replace("<title>Zest — Shared Moment</title>", f"<title>{title}</title>")
    return HTMLResponse(content=html)


@app.get("/api/shared/memory/{token}")
def get_shared_memory_data(token: str, db: Session = Depends(get_db)):
    """PUBLIC API — data for a shared memory (no auth)."""
    share = db.query(models.ShareLink).filter(
        models.ShareLink.token == token,
        models.ShareLink.memory_id.isnot(None)
    ).first()
    if not share:
        raise HTTPException(404, "Link not found")

    memory = db.query(models.Memory).filter(
        models.Memory.id == share.memory_id
    ).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).first()
    if not memory:
        raise HTTPException(404, "Memory not found")

    owner = db.query(models.User).filter(models.User.id == share.user_id).first()
    owner_name = owner.name if owner else "Someone"

    result = {
        "memory": {
            "title": memory.title,
            "description": memory.description,
            "event_date": str(memory.event_date) if memory.event_date else None,
            "location": memory.location,
            "photos": [
                {"image_url": p.image_url, "caption": p.caption}
                for p in (memory.photos or [])
            ],
        },
        "recipe": None,
        "owner_name": owner_name,
    }

    if memory.recipe:
        r = memory.recipe
        result["recipe"] = {
            "title": r.title,
            "description": r.description,
            "image_url": r.image_url,
            "prep_time": r.prep_time,
            "cook_time": r.cook_time,
            "servings": r.servings,
            "rating": r.rating,
        }

    return result


@app.get("/shared/recipe/{token}")
def shared_recipe_public_view(token: str, request: Request, db: Session = Depends(get_db)):
    """Serve the public page for a shared recipe with OG meta tags for social previews."""
    share = db.query(models.ShareLink).filter(
        models.ShareLink.token == token,
        models.ShareLink.recipe_id.isnot(None)
    ).first()
    if not share:
        raise HTTPException(404, "Link not found")
    shared_recipe_html = "app/static/shared_recipe.html"
    if not os.path.exists(shared_recipe_html):
        raise HTTPException(404, "Page not available")

    # Get recipe data for OG tags
    recipe = db.query(models.Recipe).filter(models.Recipe.id == share.recipe_id).first()
    if not recipe:
        return FileResponse(shared_recipe_html, media_type="text/html")

    owner = db.query(models.User).filter(models.User.id == share.user_id).first()
    owner_name = owner.name if owner else "Chef"

    # Build OG meta tags
    base_url = str(request.base_url).rstrip("/")
    page_url = f"{base_url}/shared/recipe/{token}"
    title = f"{recipe.title} — Zest"
    description = recipe.description or f"A recipe shared by {owner_name} on Zest"
    image_url = f"{base_url}{recipe.image_url}" if recipe.image_url else ""

    og_tags = f'''
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{page_url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description[:200]}">
    {f'<meta property="og:image" content="{image_url}">' if image_url else ''}
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:site_name" content="Zest">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description[:200]}">
    {f'<meta name="twitter:image" content="{image_url}">' if image_url else ''}
    '''

    # Read HTML and inject OG tags before </head>
    with open(shared_recipe_html, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace("</head>", og_tags + "\n</head>")
    html = html.replace("<title>Zest — Shared Recipe</title>", f"<title>{title}</title>")
    return HTMLResponse(content=html)


@app.get("/api/shared/recipe/{token}")
def get_shared_recipe_data(token: str, db: Session = Depends(get_db)):
    """PUBLIC API — data for a shared recipe (no auth)."""
    share = db.query(models.ShareLink).filter(
        models.ShareLink.token == token,
        models.ShareLink.recipe_id.isnot(None)
    ).first()
    if not share:
        raise HTTPException(404, "Link not found")

    recipe = db.query(models.Recipe).filter(
        models.Recipe.id == share.recipe_id
    ).options(
        joinedload(models.Recipe.ingredients),
        joinedload(models.Recipe.steps),
        joinedload(models.Recipe.categories),
        joinedload(models.Recipe.tags),
        joinedload(models.Recipe.images),
    ).first()

    if not recipe:
        raise HTTPException(404, "Recipe not found")

    # Get author name
    owner = db.query(models.User).filter(models.User.id == share.user_id).first()
    owner_name = owner.name if owner else "Chef"

    return {
        "recipe": {
            "title": recipe.title,
            "description": recipe.description,
            "image_url": recipe.image_url,
            "prep_time": recipe.prep_time,
            "cook_time": recipe.cook_time,
            "servings": recipe.servings,
            "rating": recipe.rating,
            "source_url": recipe.source_url,
            "source_type": recipe.source_type,
            "ingredients": [
                {
                    "text": ing.text,
                    "quantity": ing.quantity,
                    "unit": ing.unit,
                    "name": ing.name,
                    "note": ing.note,
                    "order_index": ing.order_index,
                }
                for ing in recipe.ingredients
            ],
            "steps": [
                {
                    "text": step.text,
                    "order_index": step.order_index,
                }
                for step in recipe.steps
            ],
            "categories": [{"id": c.id, "name": c.name} for c in recipe.categories],
            "tags": [{"id": t.id, "name": t.name, "color": t.color} for t in recipe.tags],
            "images": [
                {
                    "image_url": img.image_url,
                    "caption": img.caption,
                    "order_index": img.order_index,
                }
                for img in recipe.images
            ],
        },
        "owner_name": owner_name,
    }

# --- SHARED PUBLIC VIEW ---

@app.get("/shared/{token}")
def shared_public_view(token: str, request: Request, db: Session = Depends(get_db)):
    """Serve the public page of the shared cookbook with OG meta tags."""
    share = db.query(models.ShareLink).filter(models.ShareLink.token == token).first()
    if not share: raise HTTPException(404, "Link not found")
    shared_html_path = "app/static/shared.html"
    if not os.path.exists(shared_html_path):
        raise HTTPException(404, "Page not available")

    # Try to get cookbook info for OG tags
    cookbook = None
    if share.cookbook_id:
        cookbook = db.query(models.Cookbook).filter(models.Cookbook.id == share.cookbook_id).first()

    owner = db.query(models.User).filter(models.User.id == share.user_id).first()
    owner_name = owner.name if owner else "Chef"

    base_url = str(request.base_url).rstrip("/")
    page_url = f"{base_url}/shared/{token}"
    title = f"{cookbook.name if cookbook else 'Cookbook'} — Zest"
    description = cookbook.description if cookbook and cookbook.description else f"A cookbook shared by {owner_name} on Zest"
    cover_url = cookbook.cover_image_url if cookbook and cookbook.cover_image_url else ""
    image_url = f"{base_url}{cover_url}" if cover_url else ""

    og_tags = f'''
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="article">
    <meta property="og:url" content="{page_url}">
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{description[:200]}">
    {f'<meta property="og:image" content="{image_url}">' if image_url else ''}
    {f'<meta property="og:image:width" content="1200">' if image_url else ''}
    {f'<meta property="og:image:height" content="630">' if image_url else ''}
    <meta property="og:site_name" content="Zest">
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{title}">
    <meta name="twitter:description" content="{description[:200]}">
    {f'<meta name="twitter:image" content="{image_url}">' if image_url else ''}
    '''

    with open(shared_html_path, "r", encoding="utf-8") as f:
        html = f.read()
    html = html.replace("</head>", og_tags + "\n</head>")
    html = html.replace("<title>Zest — Shared Cookbook</title>", f"<title>{title}</title>")
    return HTMLResponse(content=html)

# --- PDF EXPORT ---

@app.get("/cookbooks/{cookbook_id}/pdf")
def export_cookbook_pdf(cookbook_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Export a cookbook as a professional PDF with ReportLab."""
    cookbook = db.query(models.Cookbook).filter(
        models.Cookbook.id == cookbook_id,
        models.Cookbook.user_id == current_user.id
    ).options(
        joinedload(models.Cookbook.recipes).joinedload(models.Recipe.ingredients),
        joinedload(models.Cookbook.recipes).joinedload(models.Recipe.steps),
    ).first()
    if not cookbook: raise HTTPException(404)

    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.colors import HexColor
        from reportlab.pdfbase import pdfmetrics
        from reportlab.pdfbase.ttfonts import TTFont
        from reportlab.lib.utils import ImageReader
    except ImportError:
        raise HTTPException(500, "reportlab library not installed")

    # --- REGISTER UNICODE FONTS ---
    font_dir = "/usr/share/fonts/truetype/dejavu"
    try:
        pdfmetrics.registerFont(TTFont('Zest', f'{font_dir}/DejaVuSans.ttf'))
        pdfmetrics.registerFont(TTFont('ZestB', f'{font_dir}/DejaVuSans-Bold.ttf'))
        pdfmetrics.registerFont(TTFont('ZestI', f'{font_dir}/DejaVuSans-Oblique.ttf'))
        pdfmetrics.registerFont(TTFont('ZestBI', f'{font_dir}/DejaVuSans-BoldOblique.ttf'))
        F, FB, FI, FBI = 'Zest', 'ZestB', 'ZestI', 'ZestBI'
    except Exception:
        F, FB, FI, FBI = 'Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique'

    # --- TEXT CLEANER (fix quoted-printable artifacts) ---
    import quopri
    def clean_text(text):
        """Decode text with quoted-printable artifacts and clean."""
        if not text:
            return ''
        t = str(text)
        # Detect and decode quoted-printable (=ED → í, =E1 → á, etc.)
        if '=' in t and any(f'={h}' in t for h in ['E1','E9','ED','F3','FA','F1','C1','C9','CD','D3','DA','D1','BF','A1','FC','DC','E0','E8','EC','F2','F9']):
            try:
                t = quopri.decodestring(t.encode('utf-8')).decode('utf-8', errors='replace')
            except Exception:
                try:
                    t = quopri.decodestring(t.encode('utf-8')).decode('latin-1', errors='replace')
                except Exception:
                    pass
        return t

    # --- PAGE SETUP ---
    W, H = letter  # 612 x 792
    ML, MR, MT, MB = 50, 50, 40, 50
    PW = W - ML - MR  # usable width = 512

    buf = io.BytesIO()
    c = rl_canvas.Canvas(buf, pagesize=letter)
    c.setTitle(cookbook.name)

    # --- COLORS ---
    C_HEADER = HexColor('#8B7355')   # Warm brown for "Shared intentionally" (more visible)
    C_TITLE  = HexColor('#333333')
    C_TEXT   = HexColor('#555555')
    C_ACCENT = HexColor('#C87137')   # Orange for "Ingredients", "Instructions", count
    C_LIGHT  = HexColor('#999999')
    C_FAINT  = HexColor('#D5D5D5')
    C_FOOTER_BG = HexColor('#D4976B')  # Soft orange footer (semi-transparent effect)

    # --- HELPERS ---
    def header(c):
        """Shared intentionally — top right, light beige, italic, fine."""
        c.setFont(FI, 7.5)
        c.setFillColor(C_HEADER)
        c.drawRightString(W - MR, H - 28, "Shared intentionally")

    def footer(c):
        """Soft orange bar side to side, stuck at bottom, white text."""
        bar_h = 22
        c.setFillColor(C_FOOTER_BG)
        c.rect(0, 0, W, bar_h, fill=1, stroke=0)
        c.setFont(FI, 7.5)
        c.setFillColor(HexColor('#FFFFFF'))
        c.drawCentredString(W / 2, 7, "Made to be shared.")

    def draw_image(c, img_path, x, y_top, max_w, max_h):
        """Draw image respecting aspect ratio. Returns height used."""
        try:
            img = ImageReader(img_path)
            iw, ih = img.getSize()
            ratio = min(max_w / iw, max_h / ih)
            dw, dh = iw * ratio, ih * ratio
            dx = x + (max_w - dw) / 2
            dy = y_top - dh
            c.drawImage(img_path, dx, dy, dw, dh, preserveAspectRatio=True, mask='auto')
            return dh
        except Exception:
            return 0

    def wrap_lines(c, text, font, size, max_w):
        """Split text into lines that fit in max_w."""
        if not text:
            return []
        words = text.split()
        lines = []
        current = ''
        for word in words:
            test = f'{current} {word}'.strip() if current else word
            if c.stringWidth(test, font, size) <= max_w:
                current = test
            else:
                if current:
                    lines.append(current)
                current = word
        if current:
            lines.append(current)
        return lines if lines else [text[:60]]

    def draw_centered_text(c, text, font, size, y, color=None, line_spacing=4):
        """Draw centered text, return final y."""
        if color:
            c.setFillColor(color)
        c.setFont(font, size)
        lines = wrap_lines(c, text, font, size, PW - 20)
        for line in lines:
            c.drawCentredString(W / 2, y, line)
            y -= size + line_spacing
        return y

    def measure_text_height(c, text, font, size, max_w, line_spacing=4):
        """Calculate height occupied by text without drawing it."""
        if not text:
            return 0
        lines = wrap_lines(c, text, font, size, max_w)
        return len(lines) * (size + line_spacing)

    # ====================================================================
    #  COVER PAGE
    # ====================================================================
    header(c)

    # --- PHOTO ---
    y_after_photo = H - MT - 20
    if cookbook.cover_image_url:
        cover_path = f"app{cookbook.cover_image_url}"
        if os.path.exists(cover_path):
            img_h = draw_image(c, cover_path, ML, y_after_photo, PW, 290)
            y_after_photo -= img_h
            y_after_photo -= 10  # Minimal spacing between photo and title
        else:
            y_after_photo -= 50
    else:
        y_after_photo -= 60

    # --- MEASURE CONTENT to center proportionally ---
    footer_top = 22 + 10  # footer bar (22) + margin (10)
    available_space = y_after_photo - footer_top

    # Calculate total content height
    tw = PW - 20  # text width
    content_h = 0

    # Title
    content_h += measure_text_height(c, clean_text(cookbook.name), F, 30, tw, 6)
    content_h += 12  # break

    # Description
    if cookbook.description:
        content_h += measure_text_height(c, clean_text(cookbook.description), F, 18, tw, 4)

    # Date
    content_h += 12  # break
    from datetime import datetime as dt_now
    date_str = dt_now.now().strftime('%B %d, %Y')
    content_h += measure_text_height(c, date_str, FI, 10, tw)

    # Separator + spacing
    content_h += 24 + 1 + 16  # 2 breaks + line + 1 break

    # Note
    if cookbook.note:
        content_h += measure_text_height(c, clean_text(cookbook.note), FI, 10, tw, 5)

    # Recipes + author
    content_h += 14  # break
    recipe_count = len(cookbook.recipes) if cookbook.recipes else 0
    content_h += measure_text_height(c, f'{recipe_count} recipes', F, 9, tw, 2)
    content_h += measure_text_height(c, f'Created by: {current_user.name or "Chef"}', FI, 8, tw)

    # Center: calculate starting Y
    top_padding = min(20, max(0, (available_space - content_h) / 2))
    y = y_after_photo - top_padding

    # --- DRAW CENTERED CONTENT ---

    # Cookbook name — Regular (not bold), size 30
    y = draw_centered_text(c, clean_text(cookbook.name), F, 30, y, C_TITLE, line_spacing=6)
    y -= 12

    # Description — size 18
    if cookbook.description:
        y = draw_centered_text(c, clean_text(cookbook.description), F, 18, y, C_LIGHT, line_spacing=4)

    # Creation date — italic 10
    y -= 12
    y = draw_centered_text(c, date_str, FI, 10, y, C_LIGHT)

    # Two breaks + 70% separator
    y -= 24
    sep_w = PW * 0.7
    c.setStrokeColor(C_FAINT)
    c.setLineWidth(0.5)
    c.line(W/2 - sep_w/2, y, W/2 + sep_w/2, y)

    # One break + personal note — italic 10
    y -= 16
    if cookbook.note:
        y = draw_centered_text(c, clean_text(cookbook.note), FI, 10, y, C_TEXT, line_spacing=5)

    # One break + recipes + author
    y -= 14
    y = draw_centered_text(c, f'{recipe_count} recipes', F, 9, y, C_ACCENT, line_spacing=2)
    y = draw_centered_text(c, f'Created by: {current_user.name or "Chef"}', FI, 8, y, C_LIGHT)

    footer(c)
    c.showPage()

    # ====================================================================
    #  RECIPES — each one on exactly 1 page
    # ====================================================================
    for recipe in (cookbook.recipes or []):
        header(c)

        y = H - MT - 25

        # --- TITLE centered at top ---
        c.setFont(FB, 15)
        c.setFillColor(C_TITLE)
        title_lines = wrap_lines(c, clean_text(recipe.title), FB, 15, PW)
        for line in title_lines:
            c.drawCentredString(W / 2, y, line)
            y -= 20

        # --- Meta (servings, time) ---
        meta = []
        if recipe.servings: meta.append(f'Servings: {recipe.servings}')
        total_time = (recipe.prep_time or 0) + (recipe.cook_time or 0)
        if total_time:
            parts = []
            if recipe.prep_time: parts.append(f'Prep: {recipe.prep_time} min')
            if recipe.cook_time: parts.append(f'Cook: {recipe.cook_time} min')
            if recipe.prep_time and recipe.cook_time: parts.append(f'Total: {total_time} min')
            meta.append(' · '.join(parts))
        elif recipe.prep_time:
            meta.append(f'{recipe.prep_time} minutes')
        if meta:
            y -= 2
            c.setFont(F, 8)
            c.setFillColor(C_LIGHT)
            c.drawCentredString(W / 2, y, '  ·  '.join(meta))
            y -= 16
        else:
            y -= 8

        # --- PHOTO ---
        photo_h = 0
        if recipe.image_url:
            img_path = f"app{recipe.image_url}"
            if os.path.exists(img_path):
                photo_h = draw_image(c, img_path, ML, y, PW, 190)
                y -= photo_h + 12

        # --- CONTENT: Ingredients + Instructions ---
        # Collect texts
        ing_texts = []
        for ing in sorted(recipe.ingredients or [], key=lambda x: x.order_index):
            text = ing.text or ''
            if not text and ing.name:
                parts = []
                if ing.quantity: parts.append(str(ing.quantity))
                if ing.unit: parts.append(ing.unit)
                parts.append(ing.name)
                if ing.note: parts.append(f'({ing.note})')
                text = ' '.join(parts)
            if text:
                ing_texts.append(clean_text(text))

        step_texts = []
        for step in sorted(recipe.steps or [], key=lambda x: x.order_index):
            if step.text:
                step_texts.append(clean_text(f'{step.order_index + 1}. {step.text}'))

        content_bottom = 22 + 10  # Footer bar (22) + padding
        available = y - content_bottom

        # Calculate needed lines at font_size 8
        fs = 8
        lh = 11  # line height

        def count_lines(texts, width):
            total = 0
            for t in texts:
                total += max(1, len(wrap_lines(c, t, F, fs, width)))
            return total

        ing_line_count = count_lines(ing_texts, PW - 15) + 2  # +header
        step_line_count = count_lines(step_texts, PW - 15) + 2
        total_lines = ing_line_count + step_line_count
        single_col_h = total_lines * lh

        # Decide: 1 column or 2 columns
        use_cols = single_col_h > available

        if use_cols:
            # If still doesn't fit in 2 columns, reduce font
            col_w = (PW - 24) / 2
            col_lines_ing = count_lines(ing_texts, col_w - 10) + 2
            col_lines_step = count_lines(step_texts, col_w - 10) + 2
            max_col = max(col_lines_ing, col_lines_step)
            needed = max_col * lh

            if needed > available:
                # Reduce font and line height
                fs = max(6, int(fs * available / needed))
                lh = fs + 3

            # Left column: Ingredients
            cx = ML
            cy = y

            c.setFont(FB, 9)
            c.setFillColor(C_ACCENT)
            c.drawString(cx, cy, 'Ingredients')
            cy -= lh + 2

            c.setFont(F, fs)
            c.setFillColor(C_TEXT)
            for ing in ing_texts:
                lines = wrap_lines(c, f'· {ing}', F, fs, col_w - 8)
                for line in lines:
                    if cy < content_bottom: break
                    c.drawString(cx + 4, cy, line)
                    cy -= lh

            # Right column: Instructions
            cx2 = ML + col_w + 24
            cy2 = y

            c.setFont(FB, 9)
            c.setFillColor(C_ACCENT)
            c.drawString(cx2, cy2, 'Instructions')
            cy2 -= lh + 2

            c.setFont(F, fs)
            c.setFillColor(C_TEXT)
            for step in step_texts:
                lines = wrap_lines(c, step, F, fs, col_w - 8)
                for line in lines:
                    if cy2 < content_bottom: break
                    c.drawString(cx2 + 4, cy2, line)
                    cy2 -= lh

        else:
            # Single column
            cy = y

            # Ingredients
            c.setFont(FB, 10)
            c.setFillColor(C_ACCENT)
            c.drawString(ML, cy, 'Ingredients')
            cy -= lh + 3

            c.setFont(F, fs)
            c.setFillColor(C_TEXT)
            for ing in ing_texts:
                lines = wrap_lines(c, f'· {ing}', F, fs, PW - 15)
                for line in lines:
                    c.drawString(ML + 8, cy, line)
                    cy -= lh

            cy -= 8

            # Instructions
            c.setFont(FB, 10)
            c.setFillColor(C_ACCENT)
            c.drawString(ML, cy, 'Instructions')
            cy -= lh + 3

            c.setFont(F, fs)
            c.setFillColor(C_TEXT)
            for step in step_texts:
                lines = wrap_lines(c, step, F, fs, PW - 15)
                for line in lines:
                    c.drawString(ML + 8, cy, line)
                    cy -= lh

        footer(c)
        c.showPage()

    # --- GENERATE ---
    c.save()
    buf.seek(0)
    safe_name = re.sub(r'[^\w\s-]', '', cookbook.name).strip().replace(' ', '_')

    return StreamingResponse(
        buf,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename="Zest_{safe_name}.pdf"'}
    )


# --- EXPORT/IMPORT ---

@app.get("/export/database")
async def export_database(current_user: models.User = Depends(get_current_user)):
    try:
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            db_path = "data/zest.db"
            if os.path.exists(db_path):
                zip_file.write(db_path, "zest.db")
            uploads_dir = "app/static/uploads"
            if os.path.exists(uploads_dir):
                for filename in os.listdir(uploads_dir):
                    file_path = os.path.join(uploads_dir, filename)
                    if os.path.isfile(file_path):
                        zip_file.write(file_path, f"uploads/{filename}")
        zip_buffer.seek(0)
        return StreamingResponse(
            zip_buffer, media_type="application/zip",
            headers={"Content-Disposition": f"attachment; filename=zest_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.zip"}
        )
    except Exception as e:
        raise HTTPException(500, f"Export error: {str(e)}")

@app.get("/export/recipes")
def export_recipes(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    try:
        recipes = db.query(models.Recipe).filter(models.Recipe.user_id == current_user.id).all()
        export_data = {
            "export_date": datetime.now().isoformat(),
            "total_recipes": len(recipes),
            "version": "2.0",
            "recipes": []
        }
        for recipe in recipes:
            recipe_data = {
                "title": recipe.title,
                "description": recipe.description,
                "prep_time": recipe.prep_time, "cook_time": recipe.cook_time,
                "servings": recipe.servings, "rating": recipe.rating,
                "image_url": recipe.image_url, "is_favorite": recipe.is_favorite,
                "source_url": recipe.source_url,
                "categories": [cat.name for cat in recipe.categories],
                "tags": [{"name": tag.name, "color": tag.color} for tag in recipe.tags],
                "ingredients": [
                    {"text": ing.text, "note": ing.note, "order_index": ing.order_index,
                     "quantity": ing.quantity, "unit": ing.unit, "name": ing.name}
                    for ing in recipe.ingredients
                ],
                "steps": [{"text": step.text, "order_index": step.order_index} for step in recipe.steps],
                "images": [{"image_url": img.image_url, "caption": img.caption, "order_index": img.order_index} for img in recipe.images]
            }
            export_data["recipes"].append(recipe_data)

        json_str = json.dumps(export_data, ensure_ascii=False, indent=2)
        json_buffer = io.BytesIO(json_str.encode('utf-8'))
        return StreamingResponse(
            json_buffer, media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=recipes_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"}
        )
    except Exception as e:
        raise HTTPException(500, f"JSON export error: {str(e)}")

@app.post("/import/database")
async def import_database(file: UploadFile = File(...), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.zip'):
        raise HTTPException(400, "File must be a ZIP")
    try:
        backup_dir = "data/backups"
        os.makedirs(backup_dir, exist_ok=True)
        if os.path.exists("data/zest.db"):
            backup_path = f"{backup_dir}/zest_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
            shutil.copy("data/zest.db", backup_path)

        zip_content = await file.read()
        zip_buffer = io.BytesIO(zip_content)
        recipes_count = 0
        images_count = 0

        with zipfile.ZipFile(zip_buffer, 'r') as zip_file:
            if 'zest.db' in zip_file.namelist():
                zip_file.extract('zest.db', 'data/')
                import sqlite3
                conn = sqlite3.connect('data/zest.db')
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM recipes")
                recipes_count = cursor.fetchone()[0]
                conn.close()
            for file_name in zip_file.namelist():
                if file_name.startswith('uploads/'):
                    zip_file.extract(file_name, 'app/static/')
                    images_count += 1

        return {"message": "Imported successfully", "recipes": recipes_count, "images": images_count}
    except Exception as e:
        raise HTTPException(500, f"Import error: {str(e)}")

@app.post("/import/recipes")
async def import_recipes(file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    if not file.filename.endswith('.json'):
        raise HTTPException(400, "File must be JSON")
    try:
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        if "recipes" not in data:
            raise HTTPException(400, "Invalid JSON format")

        imported = 0
        skipped = 0

        for recipe_data in data["recipes"]:
            existing = db.query(models.Recipe).filter(
                models.Recipe.title == recipe_data["title"],
                models.Recipe.user_id == current_user.id
            ).first()
            if existing:
                skipped += 1
                continue

            slug = generate_unique_slug(db, recipe_data["title"])
            new_recipe = models.Recipe(
                title=recipe_data["title"], slug=slug,
                description=recipe_data.get("description", ""),
                prep_time=recipe_data.get("prep_time", 0), cook_time=recipe_data.get("cook_time", 0),
                servings=recipe_data.get("servings", 4), rating=recipe_data.get("rating", 0),
                image_url=recipe_data.get("image_url", ""), is_favorite=recipe_data.get("is_favorite", False),
                source_url=recipe_data.get("source_url", ""), user_id=current_user.id
            )
            db.add(new_recipe)
            db.flush()

            for cat_name in recipe_data.get("categories", []):
                category = db.query(models.Category).filter(models.Category.name == cat_name).first()
                if not category:
                    category = models.Category(name=cat_name)
                    db.add(category)
                    db.flush()
                new_recipe.categories.append(category)

            for tag_data in recipe_data.get("tags", []):
                tag_name = tag_data.get("name") if isinstance(tag_data, dict) else tag_data
                tag_color = tag_data.get("color", "#f97316") if isinstance(tag_data, dict) else "#f97316"
                tag = db.query(models.Tag).filter(models.Tag.name == tag_name).first()
                if not tag:
                    tag = models.Tag(name=tag_name, color=tag_color)
                    db.add(tag)
                    db.flush()
                new_recipe.tags.append(tag)

            for ing in recipe_data.get("ingredients", []):
                parsed = parse_ingredient(ing["text"])
                db.add(models.Ingredient(
                    recipe_id=new_recipe.id, text=ing["text"],
                    note=ing.get("note", "") or parsed['notes'],
                    order_index=ing.get("order_index", 0),
                    quantity=parsed['quantity'], unit=parsed['unit'], name=parsed['name']
                ))

            for step in recipe_data.get("steps", []):
                db.add(models.Step(recipe_id=new_recipe.id, text=step["text"], order_index=step.get("order_index", 0)))

            imported += 1

        db.commit()
        return {"message": "Imported successfully", "imported": imported, "skipped": skipped, "total": len(data["recipes"])}
    except json.JSONDecodeError:
        raise HTTPException(400, "JSON read error")
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Import error: {str(e)}")


# ============================================================
# AUTOMATIC BACKUP — Product feature (self-hosted)
# ============================================================
# Track SaaS: PostgreSQL pg_dump + versioned S3 (implement when it arrives)
# Track self-hosted: backup to data/backups/ with integrated scheduler
# ============================================================

import asyncio
import glob as glob_module

BACKUP_DIR = "data/backups"
os.makedirs(BACKUP_DIR, exist_ok=True)


def _get_backup_config(db: Session) -> models.BackupConfig:
    """Get or create backup config (singleton)."""
    config = db.query(models.BackupConfig).first()
    if not config:
        config = models.BackupConfig(enabled=False, frequency_hours=24, max_backups=7, include_images=True)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


def _format_size(size_bytes: int) -> str:
    """Format bytes to readable text."""
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    elif size_bytes < 1024 * 1024 * 1024:
        return f"{size_bytes / (1024 * 1024):.1f} MB"
    else:
        return f"{size_bytes / (1024 * 1024 * 1024):.1f} GB"


def _perform_backup(db: Session, include_images: bool = True) -> dict:
    """Execute backup of zest.db (+ images optionally) to data/backups/."""
    try:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"zest_auto_{timestamp}.zip"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)

        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Always include the DB
            db_path = "data/zest.db"
            if os.path.exists(db_path):
                zf.write(db_path, "zest.db")

            # Optionally include images
            if include_images:
                uploads_dir = "app/static/uploads"
                if os.path.exists(uploads_dir):
                    for filename in os.listdir(uploads_dir):
                        file_path = os.path.join(uploads_dir, filename)
                        if os.path.isfile(file_path) and filename != ".gitkeep":
                            zf.write(file_path, f"uploads/{filename}")

        # Write to disk
        with open(backup_path, 'wb') as f:
            f.write(zip_buffer.getvalue())

        file_size = os.path.getsize(backup_path)
        size_str = _format_size(file_size)

        # Update config
        config = _get_backup_config(db)
        config.last_backup_at = datetime.now()
        config.last_backup_size = size_str
        config.last_backup_status = "success"
        db.commit()

        return {"status": "success", "filename": backup_filename, "size": size_str}

    except Exception as e:
        config = _get_backup_config(db)
        config.last_backup_status = f"error: {str(e)}"
        db.commit()
        return {"status": "error", "message": str(e)}


def _cleanup_old_backups(max_backups: int):
    """Delete old backups, keep only the last N."""
    backups = sorted(glob_module.glob(os.path.join(BACKUP_DIR, "zest_auto_*.zip")))
    while len(backups) > max_backups:
        oldest = backups.pop(0)
        try:
            os.remove(oldest)
        except OSError:
            pass


# --- Scheduler: background task that checks every hour ---

async def _backup_scheduler():
    """Loop that checks every hour if automatic backup is needed."""
    while True:
        await asyncio.sleep(3600)  # Check every hour
        try:
            db = database.SessionLocal()
            try:
                config = _get_backup_config(db)
                if not config.enabled:
                    continue

                # Is backup needed?
                if config.last_backup_at is None:
                    needs_backup = True
                else:
                    elapsed = datetime.now() - config.last_backup_at
                    needs_backup = elapsed >= timedelta(hours=config.frequency_hours)

                if needs_backup:
                    _perform_backup(db, include_images=config.include_images)
                    _cleanup_old_backups(config.max_backups)
            finally:
                db.close()
        except Exception:
            pass  # Scheduler must never crash the app


@app.on_event("startup")
async def start_backup_scheduler():
    """Start backup scheduler on app startup."""
    asyncio.create_task(_backup_scheduler())


# --- Example data management ---

@app.delete("/api/examples")
def delete_all_examples(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete all example/seed data for the current user."""
    # Delete recipes (cascade deletes ingredients, steps, images, recipe_tags, recipe_categories)
    deleted_recipes = db.query(models.Recipe).filter(
        models.Recipe.user_id == current_user.id,
        models.Recipe.is_example == True
    ).delete(synchronize_session='fetch')

    # Delete memories (cascade deletes memory_photos)
    deleted_memories = db.query(models.Memory).filter(
        models.Memory.user_id == current_user.id,
        models.Memory.is_example == True
    ).delete(synchronize_session='fetch')

    # Delete cookbooks
    deleted_cookbooks = db.query(models.Cookbook).filter(
        models.Cookbook.user_id == current_user.id,
        models.Cookbook.is_example == True
    ).delete(synchronize_session='fetch')

    # Clean up seed photos from uploads
    uploads_dir = "app/static/uploads"
    if os.path.exists(uploads_dir):
        for f in os.listdir(uploads_dir):
            if f.startswith("seed_"):
                try:
                    os.remove(os.path.join(uploads_dir, f))
                except Exception:
                    pass

    db.commit()

    return {
        "message": "Example data deleted",
        "recipes_deleted": deleted_recipes,
        "memories_deleted": deleted_memories,
        "cookbooks_deleted": deleted_cookbooks,
    }


# --- Backup endpoints ---

@app.get("/backup/config")
def get_backup_config(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    config = _get_backup_config(db)
    return {
        "enabled": config.enabled,
        "frequency_hours": config.frequency_hours,
        "max_backups": config.max_backups,
        "include_images": config.include_images,
        "last_backup_at": config.last_backup_at.isoformat() if config.last_backup_at else None,
        "last_backup_size": config.last_backup_size,
        "last_backup_status": config.last_backup_status,
    }


@app.put("/backup/config")
def update_backup_config(
    enabled: bool,
    frequency_hours: int = 24,
    max_backups: int = 7,
    include_images: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if frequency_hours not in [12, 24, 168]:
        raise HTTPException(400, "Frequency must be 12, 24, or 168 hours")
    if max_backups < 1 or max_backups > 30:
        raise HTTPException(400, "Maximum backups must be between 1 and 30")

    config = _get_backup_config(db)
    config.enabled = enabled
    config.frequency_hours = frequency_hours
    config.max_backups = max_backups
    config.include_images = include_images
    db.commit()

    return {"message": "Configuration updated", "enabled": enabled}


@app.post("/backup/now")
def backup_now(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    result = _perform_backup(db, include_images=True)
    if result["status"] == "success":
        config = _get_backup_config(db)
        _cleanup_old_backups(config.max_backups)
        return result
    raise HTTPException(500, result.get("message", "Error creating backup"))


@app.get("/backup/list")
def list_backups(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    backups = []
    pattern = os.path.join(BACKUP_DIR, "zest_auto_*.zip")
    for filepath in sorted(glob_module.glob(pattern), reverse=True):
        filename = os.path.basename(filepath)
        size = os.path.getsize(filepath)
        # Extract date from name: zest_auto_20260214_153000.zip
        try:
            date_str = filename.replace("zest_auto_", "").replace(".zip", "")
            created = datetime.strptime(date_str, '%Y%m%d_%H%M%S')
        except ValueError:
            created = datetime.fromtimestamp(os.path.getmtime(filepath))

        backups.append({
            "filename": filename,
            "size": _format_size(size),
            "size_bytes": size,
            "created_at": created.isoformat(),
        })
    return backups


@app.delete("/backup/{filename}")
def delete_backup(filename: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Security: only allow valid backup names
    if not filename.startswith("zest_auto_") or not filename.endswith(".zip"):
        raise HTTPException(400, "Invalid backup name")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid backup name")

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Backup not found")

    os.remove(filepath)
    return {"message": "Backup deleted"}


@app.post("/backup/restore/{filename}")
async def restore_backup(filename: str, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    # Security
    if not filename.startswith("zest_auto_") or not filename.endswith(".zip"):
        raise HTTPException(400, "Invalid backup name")
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid backup name")

    filepath = os.path.join(BACKUP_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(404, "Backup not found")

    try:
        # First, backup current state before restoring
        _perform_backup(db, include_images=True)

        with zipfile.ZipFile(filepath, 'r') as zf:
            # Restore DB
            if "zest.db" in zf.namelist():
                zf.extract("zest.db", "data/")

            # Restore images if they exist
            for name in zf.namelist():
                if name.startswith("uploads/"):
                    zf.extract(name, "app/static/")

        return {"message": "Backup restored. Restart the application to see changes."}
    except Exception as e:
        raise HTTPException(500, f"Restore error: {str(e)}")


# ============================================================
# MEMORIES — Memories (Phase 6)
# ============================================================

@app.get("/memories/", response_model=List[schemas.Memory])
def list_memories(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """List user memories with photos and linked recipe."""
    memories = db.query(models.Memory).filter(
        models.Memory.user_id == current_user.id
    ).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).order_by(models.Memory.event_date.desc().nullslast(), models.Memory.created_at.desc()).all()
    return memories


@app.get("/memories/{memory_id}", response_model=schemas.Memory)
def get_memory(memory_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Memory detail."""
    memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).first()
    if not memory:
        raise HTTPException(404, "Memory not found")
    return memory


@app.post("/memories/", response_model=schemas.Memory)
def create_memory(memory: schemas.MemoryCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Create a new memory."""
    # Verify that the recipe exists if it's linked
    if memory.recipe_id:
        recipe = db.query(models.Recipe).filter(
            models.Recipe.id == memory.recipe_id,
            models.Recipe.user_id == current_user.id
        ).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

    db_memory = models.Memory(
        user_id=current_user.id,
        title=memory.title,
        description=memory.description or "",
        recipe_id=memory.recipe_id,
        location=memory.location or "",
        event_date=date.fromisoformat(memory.event_date) if memory.event_date else None
    )
    db.add(db_memory)
    db.commit()
    db.refresh(db_memory)

    # Reload with relationships
    return db.query(models.Memory).filter(models.Memory.id == db_memory.id).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).first()


@app.put("/memories/{memory_id}", response_model=schemas.Memory)
def update_memory(memory_id: int, memory: schemas.MemoryUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Edit a memory."""
    db_memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).first()
    if not db_memory:
        raise HTTPException(404, "Memory not found")

    # Verify recipe if it changes
    if memory.recipe_id:
        recipe = db.query(models.Recipe).filter(
            models.Recipe.id == memory.recipe_id,
            models.Recipe.user_id == current_user.id
        ).first()
        if not recipe:
            raise HTTPException(404, "Recipe not found")

    db_memory.title = memory.title
    db_memory.description = memory.description or ""
    db_memory.recipe_id = memory.recipe_id
    db_memory.location = memory.location or ""
    db_memory.event_date = date.fromisoformat(memory.event_date) if memory.event_date else None
    db.commit()
    db.refresh(db_memory)

    return db.query(models.Memory).filter(models.Memory.id == db_memory.id).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).first()


@app.delete("/memories/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a memory and its photos."""
    db_memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).options(joinedload(models.Memory.photos)).first()
    if not db_memory:
        raise HTTPException(404, "Memory not found")

    # Delete photo files from disk
    for photo in db_memory.photos:
        delete_image_file(photo.image_url)

    db.delete(db_memory)
    db.commit()
    return {"message": "Memory deleted"}


@app.post("/memories/{memory_id}/photos", response_model=schemas.MemoryPhoto)
async def add_memory_photo(memory_id: int, file: UploadFile = File(...), db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Upload a photo to a memory (maximum 10)."""
    db_memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).first()
    if not db_memory:
        raise HTTPException(404, "Memory not found")

    # Verify 10 photo limit
    photo_count = db.query(models.MemoryPhoto).filter(models.MemoryPhoto.memory_id == memory_id).count()
    if photo_count >= 10:
        raise HTTPException(400, "Maximum 10 photos per memory")

    if not file.content_type.startswith('image/'):
        raise HTTPException(400, "File is not an image")

    original_ext = file.filename.split(".")[-1]
    file_bytes = await file.read()
    processed_bytes, ext = process_image(file_bytes, original_ext)
    name = f"{uuid.uuid4()}.{ext}"
    path = f"app/static/uploads/{name}"
    with open(path, "wb") as f:
        f.write(processed_bytes)

    db_photo = models.MemoryPhoto(
        memory_id=memory_id,
        image_url=f"/static/uploads/{name}",
        order_index=photo_count
    )
    db.add(db_photo)
    db.commit()
    db.refresh(db_photo)
    return db_photo


@app.delete("/memories/{memory_id}/photos/{photo_id}")
def delete_memory_photo(memory_id: int, photo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Delete a photo from a memory."""
    # Verify that the memory belongs to the user
    db_memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).first()
    if not db_memory:
        raise HTTPException(404, "Memory not found")

    db_photo = db.query(models.MemoryPhoto).filter(
        models.MemoryPhoto.id == photo_id,
        models.MemoryPhoto.memory_id == memory_id
    ).first()
    if not db_photo:
        raise HTTPException(404, "Photo not found")

    delete_image_file(db_photo.image_url)
    db.delete(db_photo)
    db.commit()
    return {"message": "Photo deleted"}


@app.get("/memories/by-recipe/{recipe_id}", response_model=List[schemas.Memory])
def get_memories_by_recipe(recipe_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """Get memories linked to a specific recipe."""
    memories = db.query(models.Memory).filter(
        models.Memory.recipe_id == recipe_id,
        models.Memory.user_id == current_user.id
    ).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).order_by(models.Memory.event_date.desc().nullslast()).all()
    return memories


# --- MOMENT CARDS (Phase 7) ---

@app.get("/memories/{memory_id}/card")
def generate_moment_card(
    memory_id: int,
    template: str = "square",
    photo_index: int = 0,
    hide_location: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """Generate a visual card (PNG) of a memory for sharing on social media."""
    from .card_generator import generate_card, TEMPLATES

    if template not in TEMPLATES:
        raise HTTPException(400, f"Invalid template. Options: {', '.join(TEMPLATES.keys())}")

    memory = db.query(models.Memory).filter(
        models.Memory.id == memory_id,
        models.Memory.user_id == current_user.id
    ).options(
        joinedload(models.Memory.photos),
        joinedload(models.Memory.recipe)
    ).first()

    if not memory:
        raise HTTPException(404, "Memory not found")

    # Find photo by index (allows selecting which one to use)
    photo_path = None
    if memory.photos:
        idx = min(photo_index, len(memory.photos) - 1)
        idx = max(0, idx)
        selected_photo_url = memory.photos[idx].image_url
        # Convert relative URL to file path (handle both formats)
        if selected_photo_url.startswith("/static/"):
            photo_path = os.path.join("app", selected_photo_url.lstrip("/"))
        elif selected_photo_url.startswith("uploads/"):
            photo_path = os.path.join("app", "static", selected_photo_url)
        else:
            photo_path = os.path.join("app", "static", "uploads", selected_photo_url)

    png_bytes = generate_card(
        memory_title=memory.title,
        memory_description=memory.description or "",
        event_date=memory.event_date,
        location="" if hide_location else (memory.location or ""),
        recipe_title=memory.recipe.title if memory.recipe else "",
        photo_path=photo_path,
        template=template,
    )

    return StreamingResponse(
        io.BytesIO(png_bytes),
        media_type="image/png",
        headers={
            "Content-Disposition": f'inline; filename="momento-zest-{memory_id}.png"',
            "Cache-Control": "no-cache",
        }
    )

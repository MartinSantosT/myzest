from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Table, Text
from sqlalchemy.orm import relationship
from datetime import datetime, date
from slugify import slugify

from .database import Base

# --- TABLAS DE RELACIÓN (Many-to-Many) ---

recipe_categories = Table(
    'recipe_categories', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id', ondelete='CASCADE'), primary_key=True),
    Column('category_id', Integer, ForeignKey('categories.id', ondelete='CASCADE'), primary_key=True)
)

recipe_tags = Table(
    'recipe_tags', Base.metadata,
    Column('recipe_id', Integer, ForeignKey('recipes.id', ondelete='CASCADE'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id', ondelete='CASCADE'), primary_key=True)
)

cookbook_recipes = Table(
    'cookbook_recipes', Base.metadata,
    Column('cookbook_id', Integer, ForeignKey('cookbooks.id', ondelete='CASCADE'), primary_key=True),
    Column('recipe_id', Integer, ForeignKey('recipes.id', ondelete='CASCADE'), primary_key=True),
    Column('order_index', Integer, default=0)
)


# --- MODELOS ---

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String, default="")
    password_hash = Column(String)
    avatar_url = Column(String, default="")
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Legacy field (kept for backward compat)
    username = Column(String, unique=True, index=True, nullable=True)

    recipes = relationship("Recipe", back_populates="user")
    cookbooks = relationship("Cookbook", back_populates="user")
    share_links = relationship("ShareLink", back_populates="user")
    memories = relationship("Memory", back_populates="user")


class Recipe(Base):
    __tablename__ = "recipes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    slug = Column(String, unique=True, index=True)
    title = Column(String, index=True)
    description = Column(Text, default="")
    prep_time = Column(Integer, default=0)
    cook_time = Column(Integer, default=0)
    servings = Column(Integer, default=1)
    rating = Column(Integer, default=0)
    image_url = Column(String, default="")       # Foto principal (hero)
    is_favorite = Column(Boolean, default=False)
    source_url = Column(String, default="")
    source_type = Column(String, default="original")   # "original", "imported", "adapted"
    is_example = Column(Boolean, default=False)          # True for seed/example data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="recipes")
    categories = relationship("Category", secondary=recipe_categories, back_populates="recipes")
    tags = relationship("Tag", secondary=recipe_tags, back_populates="recipes")
    ingredients = relationship("Ingredient", back_populates="recipe", cascade="all, delete-orphan")
    steps = relationship("Step", back_populates="recipe", cascade="all, delete-orphan")
    images = relationship("RecipeImage", back_populates="recipe", cascade="all, delete-orphan",
                          order_by="RecipeImage.order_index")
    memories = relationship("Memory", back_populates="recipe")

    @property
    def memory_count(self):
        return len(self.memories) if self.memories else 0


class RecipeImage(Base):
    __tablename__ = "recipe_images"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    image_url = Column(String)
    caption = Column(String, default="")          # Descripción opcional de la foto
    order_index = Column(Integer, default=0)      # 0, 1, 2 (max 3 adicionales)

    recipe = relationship("Recipe", back_populates="images")


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    slug = Column(String, unique=True, index=True)

    recipes = relationship("Recipe", secondary=recipe_categories, back_populates="categories")

    def __init__(self, **kwargs):
        if 'name' in kwargs and 'slug' not in kwargs:
            kwargs['slug'] = slugify(kwargs['name'])
        super().__init__(**kwargs)


class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    color = Column(String, default="#f97316")

    recipes = relationship("Recipe", secondary=recipe_tags, back_populates="tags")


class Ingredient(Base):
    __tablename__ = "ingredients"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    text = Column(String)
    note = Column(String, nullable=True)
    order_index = Column(Integer, default=0)
    quantity = Column(Float, nullable=True)
    unit = Column(String, nullable=True)
    name = Column(String, nullable=True)

    recipe = relationship("Recipe", back_populates="ingredients")


class Step(Base):
    __tablename__ = "steps"

    id = Column(Integer, primary_key=True, index=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"))
    text = Column(String)
    order_index = Column(Integer, default=0)

    recipe = relationship("Recipe", back_populates="steps")


class Cookbook(Base):
    __tablename__ = "cookbooks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String)
    description = Column(Text, default="")
    cover_image_url = Column(String, default="")
    cover_image_url_2 = Column(String, default="")           # Segunda portada
    cover_position_1 = Column(String, default="50% 50%")     # object-position foto 1
    cover_position_2 = Column(String, default="50% 50%")     # object-position foto 2
    note = Column(Text, default="")                           # Nota personal del autor
    is_example = Column(Boolean, default=False)                  # True for seed/example data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="cookbooks")
    recipes = relationship("Recipe", secondary=cookbook_recipes, backref="cookbooks")


class ShareLink(Base):
    __tablename__ = "share_links"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cookbook_id = Column(Integer, ForeignKey("cookbooks.id", ondelete="CASCADE"), nullable=True)
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="CASCADE"), nullable=True)
    memory_id = Column(Integer, ForeignKey("memories.id", ondelete="CASCADE"), nullable=True)
    allow_signup = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="share_links")
    cookbook = relationship("Cookbook")
    recipe = relationship("Recipe")
    memory = relationship("Memory")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    recipe_id = Column(Integer, ForeignKey("recipes.id", ondelete="SET NULL"), nullable=True)
    title = Column(String)
    description = Column(Text, default="")
    event_date = Column(Date, nullable=True)
    location = Column(String, default="")              # Lugar del recuerdo
    is_example = Column(Boolean, default=False)          # True for seed/example data
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memories")
    recipe = relationship("Recipe", back_populates="memories")
    photos = relationship("MemoryPhoto", back_populates="memory", cascade="all, delete-orphan",
                          order_by="MemoryPhoto.order_index")


class MemoryPhoto(Base):
    __tablename__ = "memory_photos"

    id = Column(Integer, primary_key=True, index=True)
    memory_id = Column(Integer, ForeignKey("memories.id", ondelete="CASCADE"))
    image_url = Column(String)
    caption = Column(String, default="")
    order_index = Column(Integer, default=0)

    memory = relationship("Memory", back_populates="photos")


class BackupConfig(Base):
    __tablename__ = "backup_config"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=False)
    frequency_hours = Column(Integer, default=24)       # 12, 24, 168 (semanal)
    max_backups = Column(Integer, default=7)             # Retención: últimos N backups
    include_images = Column(Boolean, default=True)       # Incluir /uploads en backup
    last_backup_at = Column(DateTime, nullable=True)
    last_backup_size = Column(String, default="")        # "45.2 MB"
    last_backup_status = Column(String, default="")      # "success" o "error: mensaje"
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

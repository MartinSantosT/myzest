from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date


# --- AUTH ---
class UserRegister(BaseModel):
    email: str
    name: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    avatar_url: str = ""
    is_admin: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class UserProfileUpdate(BaseModel):
    name: str = ""
    email: str = ""
    avatar_url: str = ""

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class Category(CategoryBase):
    id: int
    slug: str

    class Config:
        from_attributes = True


# --- TAG ---
class TagBase(BaseModel):
    name: str
    color: str = "#f97316"

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: int

    class Config:
        from_attributes = True


# --- INGREDIENT ---
class IngredientBase(BaseModel):
    text: str
    note: Optional[str] = None
    order_index: int = 0

class IngredientCreate(IngredientBase):
    pass

class Ingredient(IngredientBase):
    id: int
    recipe_id: int
    quantity: Optional[float] = None
    unit: Optional[str] = None
    name: Optional[str] = None

    class Config:
        from_attributes = True


# --- STEP ---
class StepBase(BaseModel):
    text: str
    order_index: int = 0

class StepCreate(StepBase):
    pass

class Step(StepBase):
    id: int
    recipe_id: int

    class Config:
        from_attributes = True


# --- RECIPE IMAGE ---
class RecipeImageBase(BaseModel):
    image_url: str
    caption: str = ""
    order_index: int = 0

class RecipeImageCreate(RecipeImageBase):
    pass

class RecipeImage(RecipeImageBase):
    id: int
    recipe_id: int

    class Config:
        from_attributes = True


# --- RECIPE ---
class RecipeBase(BaseModel):
    title: str
    description: Optional[str] = None
    prep_time: int = 0
    cook_time: int = 0
    servings: int = 1
    rating: int = 0
    image_url: Optional[str] = None
    is_favorite: bool = False
    source_url: Optional[str] = None
    source_type: str = "original"

class RecipeCreate(RecipeBase):
    ingredients: List[IngredientCreate] = []
    steps: List[StepCreate] = []
    category_ids: List[int] = []
    tag_ids: List[int] = []

class Recipe(RecipeBase):
    id: int
    user_id: int
    slug: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    ingredients: List[Ingredient] = []
    steps: List[Step] = []
    categories: List[Category] = []
    tags: List[Tag] = []
    images: List[RecipeImage] = []
    memory_count: int = 0

    class Config:
        from_attributes = True


# --- COOKBOOK ---
class CookbookBase(BaseModel):
    name: str
    description: str = ""
    cover_image_url: Optional[str] = ""
    cover_image_url_2: Optional[str] = ""
    cover_position_1: str = "50% 50%"
    cover_position_2: str = "50% 50%"
    note: str = ""

class CookbookCreate(CookbookBase):
    recipe_ids: List[int] = []

class CookbookUpdate(CookbookBase):
    recipe_ids: List[int] = []

class Cookbook(CookbookBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    recipes: List[Recipe] = []

    class Config:
        from_attributes = True

class CookbookSummary(CookbookBase):
    id: int
    user_id: int
    created_at: Optional[datetime] = None
    recipe_count: int = 0

    class Config:
        from_attributes = True


# --- SHARE LINK ---
# --- MEMORY PHOTO ---
class MemoryPhotoBase(BaseModel):
    image_url: str
    caption: str = ""
    order_index: int = 0

class MemoryPhotoCreate(MemoryPhotoBase):
    pass

class MemoryPhoto(MemoryPhotoBase):
    id: int
    memory_id: int

    class Config:
        from_attributes = True


# --- MEMORY ---
class MemoryBase(BaseModel):
    title: str
    description: str = ""
    event_date: Optional[str] = None  # "2025-12-24"
    recipe_id: Optional[int] = None
    location: str = ""

class MemoryCreate(MemoryBase):
    pass

class MemoryUpdate(MemoryBase):
    pass

class RecipeSummary(BaseModel):
    """Minimal recipe summary to link to a memory."""
    id: int
    title: str
    slug: str
    image_url: str = ""

    class Config:
        from_attributes = True

class Memory(BaseModel):
    id: int
    user_id: int
    title: str
    description: str = ""
    event_date: Optional[date] = None
    recipe_id: Optional[int] = None
    location: str = ""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    photos: List[MemoryPhoto] = []
    recipe: Optional[RecipeSummary] = None

    class Config:
        from_attributes = True


# --- SHARE LINK ---
class ShareLinkCreate(BaseModel):
    cookbook_id: Optional[int] = None
    allow_signup: bool = False

class ShareLink(BaseModel):
    id: int
    token: str
    user_id: int
    cookbook_id: Optional[int] = None
    allow_signup: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

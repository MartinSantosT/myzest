# ============================================
# SCRAPERS.PY — Recipe Scraping Engine
# ============================================
# 4-tier fallback: recipe-scrapers → JSON-LD → Microdata → Heuristics

import re
import json
import logging
from typing import Optional, Dict, Any, List
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# --- ISO 8601 Duration Parser ---

def parse_iso_duration(duration_str: str) -> Optional[int]:
    """Parse ISO 8601 duration (PT1H30M) to minutes."""
    if not duration_str:
        return None
    m = re.match(
        r'P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?',
        duration_str.strip(), re.IGNORECASE
    )
    if not m:
        # Try plain number
        try:
            return int(duration_str)
        except (ValueError, TypeError):
            return None

    days = int(m.group(1) or 0)
    hours = int(m.group(2) or 0)
    minutes = int(m.group(3) or 0)
    seconds = int(m.group(4) or 0)

    total = days * 1440 + hours * 60 + minutes + (1 if seconds >= 30 else 0)
    return total if total > 0 else None


def _clean_text(text: str) -> str:
    """Strip HTML tags and normalize whitespace."""
    if not text:
        return ""
    text = re.sub(r'<[^>]+>', '', str(text))
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def _resolve_url(url: str, base_url: str) -> str:
    """Resolve relative URLs to absolute."""
    if not url:
        return ""
    if url.startswith(('http://', 'https://', '//')):
        return url
    return urljoin(base_url, url)


def _normalize_ingredients(raw_list) -> List[str]:
    """Normalize ingredient list — handle strings, dicts, nested structures."""
    result = []
    if not raw_list:
        return result
    for item in raw_list:
        if isinstance(item, str):
            cleaned = _clean_text(item)
            if cleaned:
                result.append(cleaned)
        elif isinstance(item, dict):
            # Try full text first
            text = item.get('text') or item.get('@value', '')
            # If no full text, reconstruct from structured fields
            if not text:
                parts = []
                qty = item.get('quantity') or item.get('amount') or ''
                unit = item.get('unitText') or item.get('unit') or ''
                name = item.get('name') or item.get('ingredient') or ''
                if qty: parts.append(str(qty))
                if unit: parts.append(str(unit))
                if name: parts.append(str(name))
                text = ' '.join(parts)
            # If still nothing, try name alone
            if not text:
                text = item.get('name') or ''
            cleaned = _clean_text(str(text))
            if cleaned:
                result.append(cleaned)
    return result


def _normalize_steps(raw_list) -> List[str]:
    """Normalize step list — handle strings, HowToStep dicts, HowToSection dicts."""
    result = []
    if not raw_list:
        return result
    for item in raw_list:
        if isinstance(item, str):
            cleaned = _clean_text(item)
            if cleaned:
                result.append(cleaned)
        elif isinstance(item, dict):
            item_type = item.get('@type', '')
            if item_type == 'HowToSection':
                # Nested section — flatten its steps
                section_steps = item.get('itemListElement', [])
                result.extend(_normalize_steps(section_steps))
            else:
                text = item.get('text') or item.get('description') or item.get('name', '')
                cleaned = _clean_text(str(text))
                if cleaned:
                    result.append(cleaned)
        elif isinstance(item, list):
            result.extend(_normalize_steps(item))
    return result


def _extract_servings(value) -> Optional[int]:
    """Extract numeric servings from various formats."""
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, list):
        value = value[0] if value else None
    s = str(value).strip()
    m = re.search(r'(\d+)', s)
    return int(m.group(1)) if m else None


# ============================================
# TIER 1: recipe-scrapers library
# ============================================

def _scrape_with_library(url: str, html: str) -> Optional[Dict[str, Any]]:
    """Use the recipe-scrapers library (supports 100+ sites)."""
    try:
        from recipe_scrapers import scrape_html
        scraper = scrape_html(html=html, org_url=url)

        data = {
            'title': scraper.title() or '',
            'description': '',
            'servings': None,
            'prep_time': None,
            'cook_time': None,
            'total_time': None,
            'ingredients': [],
            'steps': [],
            'image_url': '',
        }

        try: data['description'] = scraper.description() or ''
        except Exception: pass

        try:
            yields = scraper.yields()
            if yields:
                m = re.search(r'(\d+)', str(yields))
                if m: data['servings'] = int(m.group(1))
        except Exception: pass

        try: data['prep_time'] = scraper.prep_time()
        except Exception: pass

        try: data['cook_time'] = scraper.cook_time()
        except Exception: pass

        try: data['total_time'] = scraper.total_time()
        except Exception: pass

        # Si solo hay total_time y no prep/cook, usar total_time como referencia
        if data['total_time'] and not data['prep_time'] and not data['cook_time']:
            data['cook_time'] = data['total_time']

        try: data['ingredients'] = scraper.ingredients() or []
        except Exception: pass

        try:
            instructions = scraper.instructions_list()
            if instructions:
                data['steps'] = instructions
            else:
                raw = scraper.instructions()
                if raw:
                    data['steps'] = [s.strip() for s in raw.split('\n') if s.strip()]
        except Exception: pass

        try: data['image_url'] = scraper.image() or ''
        except Exception: pass

        # Validate minimum data
        if data['title'] and (data['ingredients'] or data['steps']):
            logger.info(f"✓ recipe-scrapers succeeded for {url}")
            return data

    except Exception as e:
        logger.debug(f"recipe-scrapers failed: {e}")

    return None


# ============================================
# TIER 2: JSON-LD schema.org/Recipe
# ============================================

def _scrape_jsonld(url: str, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract recipe from JSON-LD structured data."""
    try:
        scripts = soup.find_all('script', type='application/ld+json')

        for script in scripts:
            try:
                raw = script.string or script.get_text()
                if not raw:
                    continue

                payload = json.loads(raw)

                # Handle @graph wrapper
                if isinstance(payload, dict) and '@graph' in payload:
                    payload = payload['@graph']

                # Find Recipe in array or single object
                recipes = []
                if isinstance(payload, list):
                    for item in payload:
                        if isinstance(item, dict) and 'Recipe' in str(item.get('@type', '')):
                            recipes.append(item)
                elif isinstance(payload, dict) and 'Recipe' in str(payload.get('@type', '')):
                    recipes.append(payload)

                for recipe in recipes:
                    data = {
                        'title': _clean_text(recipe.get('name', '')),
                        'description': _clean_text(recipe.get('description', '')),
                        'servings': _extract_servings(recipe.get('recipeYield')),
                        'prep_time': parse_iso_duration(recipe.get('prepTime', '')),
                        'cook_time': parse_iso_duration(recipe.get('cookTime', '')),
                        'total_time': parse_iso_duration(recipe.get('totalTime', '')),
                        'ingredients': _normalize_ingredients(recipe.get('recipeIngredient', [])),
                        'steps': _normalize_steps(recipe.get('recipeInstructions', [])),
                        'image_url': '',
                    }

                    # Image handling (can be string, array, or ImageObject)
                    img = recipe.get('image', '')
                    if isinstance(img, list):
                        img = img[0] if img else ''
                    if isinstance(img, dict):
                        img = img.get('url', '') or img.get('contentUrl', '')
                    data['image_url'] = _resolve_url(str(img), url)

                    # Si solo hay total_time, usarlo como cook_time
                    if data.get('total_time') and not data.get('prep_time') and not data.get('cook_time'):
                        data['cook_time'] = data['total_time']

                    if data['title'] and (data['ingredients'] or data['steps']):
                        logger.info(f"✓ JSON-LD succeeded for {url}")
                        return data

            except json.JSONDecodeError:
                continue

    except Exception as e:
        logger.debug(f"JSON-LD failed: {e}")

    return None


# ============================================
# TIER 3: Microdata (itemprop)
# ============================================

def _scrape_microdata(url: str, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract recipe from Microdata/RDFa attributes."""
    try:
        # Find the recipe container
        recipe_el = (
            soup.find(itemtype=re.compile(r'schema\.org/Recipe', re.I)) or
            soup.find(attrs={'typeof': re.compile(r'Recipe', re.I)})
        )
        if not recipe_el:
            return None

        data = {
            'title': '',
            'description': '',
            'servings': None,
            'prep_time': None,
            'cook_time': None,
            'total_time': None,
            'ingredients': [],
            'steps': [],
            'image_url': '',
        }

        # Title
        title_el = recipe_el.find(attrs={'itemprop': 'name'})
        if title_el:
            data['title'] = _clean_text(title_el.get_text())

        # Description
        desc_el = recipe_el.find(attrs={'itemprop': 'description'})
        if desc_el:
            data['description'] = _clean_text(desc_el.get_text())

        # Servings
        yield_el = recipe_el.find(attrs={'itemprop': 'recipeYield'})
        if yield_el:
            val = yield_el.get('content') or yield_el.get_text()
            data['servings'] = _extract_servings(val)

        # Times
        for prop, key in [('prepTime', 'prep_time'), ('cookTime', 'cook_time'), ('totalTime', 'total_time')]:
            el = recipe_el.find(attrs={'itemprop': prop})
            if el:
                val = el.get('content') or el.get('datetime') or el.get_text()
                data[key] = parse_iso_duration(str(val))

        # Si solo hay total_time, usarlo como cook_time
        if data.get('total_time') and not data.get('prep_time') and not data.get('cook_time'):
            data['cook_time'] = data['total_time']

        # Ingredients
        ing_els = recipe_el.find_all(attrs={'itemprop': 'recipeIngredient'})
        if not ing_els:
            ing_els = recipe_el.find_all(attrs={'itemprop': 'ingredients'})
        for el in ing_els:
            text = _clean_text(el.get_text())
            if text:
                data['ingredients'].append(text)

        # Steps
        step_els = recipe_el.find_all(attrs={'itemprop': 'recipeInstructions'})
        if len(step_els) == 1:
            # Might be a container — look for child steps
            children = step_els[0].find_all(attrs={'itemprop': 'text'})
            if children:
                step_els = children
            else:
                # Single block of text — split by sentences or <li>
                lis = step_els[0].find_all('li')
                if lis:
                    step_els = lis

        for el in step_els:
            text = _clean_text(el.get_text())
            if text:
                data['steps'].append(text)

        # Image
        img_el = recipe_el.find(attrs={'itemprop': 'image'})
        if img_el:
            img_url = img_el.get('src') or img_el.get('content') or img_el.get('href', '')
            data['image_url'] = _resolve_url(str(img_url), url)

        if data['title'] and (data['ingredients'] or data['steps']):
            logger.info(f"✓ Microdata succeeded for {url}")
            return data

    except Exception as e:
        logger.debug(f"Microdata failed: {e}")

    return None


# ============================================
# TIER 4: HTML Heuristics
# ============================================

# Common CSS selectors used by recipe blogs
_INGREDIENT_SELECTORS = [
    '.recipe-ingredients li', '.ingredients li', '.ingredient-list li',
    '.wprm-recipe-ingredient', '.tasty-recipe-ingredients li',
    '[class*="ingredient"] li', '.recipe__ingredients li',
    '.ingredientes li', '.lista-ingredientes li',
]

_STEP_SELECTORS = [
    '.recipe-instructions li', '.instructions li', '.directions li',
    '.wprm-recipe-instruction', '.tasty-recipe-instructions li',
    '[class*="instruction"] li', '[class*="direction"] li',
    '.recipe__instructions li', '.preparacion li', '.pasos li',
    '.recipe-instructions p', '.instructions p',
]

def _scrape_heuristic(url: str, soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Last resort: use common CSS selectors and page structure."""
    try:
        data = {
            'title': '',
            'description': '',
            'servings': None,
            'prep_time': None,
            'cook_time': None,
            'ingredients': [],
            'steps': [],
            'image_url': '',
        }

        # Title — use <h1> or og:title
        og_title = soup.find('meta', property='og:title')
        h1 = soup.find('h1')
        data['title'] = _clean_text(
            (og_title.get('content') if og_title else None)
            or (h1.get_text() if h1 else '')
        )

        # Description
        og_desc = soup.find('meta', property='og:description')
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        data['description'] = _clean_text(
            (og_desc.get('content') if og_desc else None)
            or (meta_desc.get('content') if meta_desc else '')
        )

        # Image
        og_img = soup.find('meta', property='og:image')
        if og_img:
            data['image_url'] = _resolve_url(og_img.get('content', ''), url)

        # Ingredients — try each selector
        for selector in _INGREDIENT_SELECTORS:
            try:
                els = soup.select(selector)
                if els and len(els) >= 2:
                    data['ingredients'] = [_clean_text(e.get_text()) for e in els if _clean_text(e.get_text())]
                    break
            except Exception:
                continue

        # Steps
        for selector in _STEP_SELECTORS:
            try:
                els = soup.select(selector)
                if els and len(els) >= 1:
                    data['steps'] = [_clean_text(e.get_text()) for e in els if _clean_text(e.get_text())]
                    break
            except Exception:
                continue

        if data['title'] and (data['ingredients'] or data['steps']):
            logger.info(f"✓ Heuristic succeeded for {url}")
            return data

    except Exception as e:
        logger.debug(f"Heuristic failed: {e}")

    return None


# ============================================
# MAIN SCRAPER — Orchestrates all tiers
# ============================================

# User-Agent to avoid blocks
_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
}

class ScrapeResult:
    """Result of a recipe scrape attempt."""

    def __init__(self, success: bool, data: Optional[Dict] = None, error: str = "", method: str = ""):
        self.success = success
        self.data = data or {}
        self.error = error
        self.method = method

    def to_dict(self) -> Dict[str, Any]:
        if not self.success:
            return {"success": False, "error": self.error}
        return {
            "success": True,
            "method": self.method,
            "recipe": self.data,
        }


def scrape_recipe(url: str, timeout: int = 15) -> ScrapeResult:
    """
    Scrape a recipe from a URL using 4-tier fallback.
    Returns ScrapeResult with normalized recipe data.
    """
    # Validate URL
    parsed = urlparse(url)
    if not parsed.scheme:
        url = 'https://' + url
        parsed = urlparse(url)

    if parsed.scheme not in ('http', 'https'):
        return ScrapeResult(False, error="URL inválida: solo se soporta HTTP/HTTPS")

    if not parsed.netloc:
        return ScrapeResult(False, error="URL inválida: falta el dominio")

    # Fetch the page
    try:
        response = requests.get(url, headers=_HEADERS, timeout=timeout, allow_redirects=True)
        response.raise_for_status()
        html = response.text
    except requests.exceptions.Timeout:
        return ScrapeResult(False, error="Timeout: la página tardó demasiado en responder")
    except requests.exceptions.ConnectionError:
        return ScrapeResult(False, error="No se pudo conectar a la página")
    except requests.exceptions.HTTPError as e:
        return ScrapeResult(False, error=f"Error HTTP: {e.response.status_code}")
    except Exception as e:
        return ScrapeResult(False, error=f"Error al descargar la página: {str(e)}")

    soup = BeautifulSoup(html, 'html.parser')

    # TIER 1: recipe-scrapers library
    result = _scrape_with_library(url, html)
    if result:
        return ScrapeResult(True, data=result, method="recipe-scrapers")

    # TIER 2: JSON-LD
    result = _scrape_jsonld(url, soup)
    if result:
        return ScrapeResult(True, data=result, method="json-ld")

    # TIER 3: Microdata
    result = _scrape_microdata(url, soup)
    if result:
        return ScrapeResult(True, data=result, method="microdata")

    # TIER 4: Heuristics
    result = _scrape_heuristic(url, soup)
    if result:
        return ScrapeResult(True, data=result, method="heuristic")

    return ScrapeResult(
        False,
        error="No se pudo extraer la receta. Es posible que la página no contenga una receta reconocible o que use un formato no compatible."
    )


def download_recipe_image(image_url: str, upload_dir: str = "app/static/uploads") -> Optional[str]:
    """
    Download a recipe's hero image, resize to max 1200px width, save as JPEG.
    Returns the local URL path or None on failure.
    """
    if not image_url:
        return None

    try:
        import uuid as uuid_mod
        from PIL import Image
        from io import BytesIO

        resp = requests.get(image_url, headers=_HEADERS, timeout=10, stream=True)
        resp.raise_for_status()

        # Verify it's an image
        content_type = resp.headers.get('content-type', '')
        if not content_type.startswith('image/'):
            return None

        img = Image.open(BytesIO(resp.content))

        # Convert RGBA/P to RGB for JPEG
        if img.mode in ('RGBA', 'P', 'LA'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if 'A' in img.mode else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        # Resize if wider than 1200px
        max_width = 1200
        if img.width > max_width:
            ratio = max_width / img.width
            new_size = (max_width, int(img.height * ratio))
            img = img.resize(new_size, Image.LANCZOS)

        # Save as JPEG
        import os
        os.makedirs(upload_dir, exist_ok=True)
        filename = f"scraped-{uuid_mod.uuid4().hex[:12]}.jpg"
        filepath = os.path.join(upload_dir, filename)
        img.save(filepath, 'JPEG', quality=85, optimize=True)

        return f"/static/uploads/{filename}"

    except Exception as e:
        logger.warning(f"Failed to download image {image_url}: {e}")
        return None

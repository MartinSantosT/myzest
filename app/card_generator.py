"""
Generador de tarjetas de momento para compartir en redes sociales.
Usa Pillow para generar imágenes bonitas desde un Recuerdo.

Templates disponibles:
- story:     1080×1920 (Instagram Stories, vertical)
- square:    1080×1080 (Instagram feed, WhatsApp)
- landscape: 1200×630  (Facebook, Twitter/X)
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
from datetime import date
import io
import os


# --- Configuración ---

TEMPLATES = {
    "story":     (1080, 1920),
    "square":    (1080, 1080),
    "landscape": (1200, 630),
}

# Buscar fuentes DejaVuSans en ubicaciones comunes
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    # Fallback dentro del container si no están en el sistema
    "/usr/local/lib/python3.10/dist-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans.ttf",
    "/usr/local/lib/python3.10/dist-packages/matplotlib/mpl-data/fonts/ttf/DejaVuSans-Bold.ttf",
]

BRAND_COLOR = (249, 115, 22)  # Naranja Zest (#f97316)


def _find_font(bold: bool = False) -> str:
    """Busca la fuente DejaVuSans en el sistema."""
    target = "Bold" if bold else "DejaVuSans.ttf"
    for path in FONT_PATHS:
        if bold and "Bold" in path and os.path.exists(path):
            return path
        if not bold and "Bold" not in path and path.endswith("DejaVuSans.ttf") and os.path.exists(path):
            return path
    # Fallback: cualquier DejaVuSans que exista
    for path in FONT_PATHS:
        if os.path.exists(path):
            return path
    return None


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    """Carga fuente con fallback a default."""
    font_path = _find_font(bold)
    if font_path:
        return ImageFont.truetype(font_path, size)
    return ImageFont.load_default()


def _format_date(event_date) -> str:
    """Formatea fecha para la tarjeta."""
    if not event_date:
        return ""
    if isinstance(event_date, str):
        try:
            parts = event_date.split("-")
            event_date = date(int(parts[0]), int(parts[1]), int(parts[2]))
        except (ValueError, IndexError):
            return event_date

    months = [
        "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ]
    return f"{event_date.day} de {months[event_date.month]} {event_date.year}"


def _draw_text_with_shadow(draw, position, text, font, fill=(255, 255, 255), shadow_color=(0, 0, 0, 160)):
    """Dibuja texto con sombra sutil para legibilidad."""
    x, y = position
    # Sombra
    draw.text((x + 2, y + 2), text, font=font, fill=shadow_color)
    # Texto principal
    draw.text((x, y), text, font=font, fill=fill)


def _wrap_text(text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list:
    """Divide texto en líneas que quepan en max_width."""
    words = text.split()
    lines = []
    current_line = ""

    for word in words:
        test_line = f"{current_line} {word}".strip()
        bbox = font.getbbox(test_line)
        width = bbox[2] - bbox[0]
        if width <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word

    if current_line:
        lines.append(current_line)

    return lines if lines else [text]


def generate_card(
    memory_title: str,
    memory_description: str = "",
    event_date=None,
    location: str = "",
    recipe_title: str = "",
    photo_path: str = None,
    template: str = "square",
) -> bytes:
    """
    Genera una tarjeta de momento como PNG bytes.

    Args:
        memory_title: Título del recuerdo
        memory_description: Descripción/historia
        event_date: Fecha del evento (date o string)
        location: Ubicación
        recipe_title: Título de la receta vinculada (opcional)
        photo_path: Ruta a la foto principal
        template: "story", "square", o "landscape"

    Returns:
        bytes PNG de la imagen generada
    """
    width, height = TEMPLATES.get(template, TEMPLATES["square"])

    # --- 1. Cargar foto base o crear fondo ---
    if photo_path and os.path.exists(photo_path):
        try:
            photo = Image.open(photo_path).convert("RGBA")
            # Redimensionar para cubrir el canvas (cover)
            photo_ratio = photo.width / photo.height
            canvas_ratio = width / height

            if photo_ratio > canvas_ratio:
                # Foto más ancha: ajustar por alto
                new_height = height
                new_width = int(height * photo_ratio)
            else:
                # Foto más alta: ajustar por ancho
                new_width = width
                new_height = int(width / photo_ratio)

            photo = photo.resize((new_width, new_height), Image.LANCZOS)

            # Centrar y recortar
            left = (new_width - width) // 2
            top = (new_height - height) // 2
            photo = photo.crop((left, top, left + width, top + height))

            # Aplicar blur sutil al fondo para que el texto resalte
            base = photo.copy()
        except Exception:
            base = Image.new("RGBA", (width, height), (30, 30, 30, 255))
    else:
        # Sin foto: fondo oscuro elegante con gradiente
        base = Image.new("RGBA", (width, height), (30, 30, 30, 255))

    # --- 2. Overlay degradado oscuro abajo ---
    overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    # Degradado: más oscuro abajo para texto legible
    gradient_start = int(height * 0.35)
    for y in range(gradient_start, height):
        progress = (y - gradient_start) / (height - gradient_start)
        alpha = int(200 * progress)
        overlay_draw.line([(0, y), (width, y)], fill=(0, 0, 0, alpha))

    base = Image.alpha_composite(base, overlay)

    # --- 3. Barra naranja Zest arriba ---
    bar_overlay = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    bar_draw = ImageDraw.Draw(bar_overlay)
    bar_height = max(4, int(height * 0.004))
    bar_draw.rectangle([(0, 0), (width, bar_height)], fill=(*BRAND_COLOR, 255))
    base = Image.alpha_composite(base, bar_overlay)

    # --- 4. Dibujar textos ---
    draw = ImageDraw.Draw(base)
    margin = int(width * 0.07)
    text_max_width = width - (margin * 2)

    # Escalar fuentes según template
    scale = width / 1080
    font_title = _load_font(int(60 * scale), bold=True)
    font_meta = _load_font(int(30 * scale), bold=False)
    font_recipe = _load_font(int(26 * scale), bold=False)
    font_brand = _load_font(int(22 * scale), bold=True)
    font_brand_light = _load_font(int(22 * scale), bold=False)
    font_desc = _load_font(int(26 * scale), bold=False)

    # Posicionar desde abajo hacia arriba
    y_cursor = height - margin

    # Branding "Shared Intentionally · Zest" en esquina inferior derecha
    brand_part1 = "Shared Intentionally"
    brand_sep = "  ·  "
    brand_part2 = "Zest"

    # Calcular anchos de cada parte
    p1_bbox = font_brand_light.getbbox(brand_part1)
    p1_w = p1_bbox[2] - p1_bbox[0]
    sep_bbox = font_brand_light.getbbox(brand_sep)
    sep_w = sep_bbox[2] - sep_bbox[0]
    p2_bbox = font_brand.getbbox(brand_part2)
    p2_w = p2_bbox[2] - p2_bbox[0]

    total_brand_w = p1_w + sep_w + p2_w
    brand_h = max(p1_bbox[3] - p1_bbox[1], p2_bbox[3] - p2_bbox[1])

    brand_x = width - margin - total_brand_w
    brand_y = y_cursor - brand_h

    # "Shared Intentionally" en blanco suave
    _draw_text_with_shadow(draw, (brand_x, brand_y), brand_part1, font_brand_light,
                           fill=(200, 200, 200), shadow_color=(0, 0, 0, 120))
    # " · " separador
    _draw_text_with_shadow(draw, (brand_x + p1_w, brand_y), brand_sep, font_brand_light,
                           fill=(150, 150, 150), shadow_color=(0, 0, 0, 120))
    # "Zest" en naranja bold
    _draw_text_with_shadow(draw, (brand_x + p1_w + sep_w, brand_y), brand_part2, font_brand,
                           fill=BRAND_COLOR, shadow_color=(0, 0, 0, 120))

    y_cursor = brand_y - int(30 * scale)

    # Línea separadora sutil
    line_y = y_cursor
    draw.line([(margin, line_y), (width - margin, line_y)],
              fill=(255, 255, 255, 60), width=1)
    y_cursor = line_y - int(20 * scale)

    # Descripción (fragmento, máx 2 líneas)
    if memory_description:
        desc_text = memory_description
        if len(desc_text) > 120:
            desc_text = desc_text[:117] + "..."
        desc_lines = _wrap_text(desc_text, font_desc, text_max_width)[:2]
        for line in reversed(desc_lines):
            desc_bbox = font_desc.getbbox(line)
            line_h = desc_bbox[3] - desc_bbox[1]
            y_cursor -= line_h + int(4 * scale)
            _draw_text_with_shadow(draw, (margin, y_cursor), line, font_desc,
                                   fill=(220, 220, 220))
        y_cursor -= int(15 * scale)

    # Receta vinculada
    if recipe_title:
        recipe_text = f"Receta: {recipe_title}"
        recipe_bbox = font_recipe.getbbox(recipe_text)
        recipe_h = recipe_bbox[3] - recipe_bbox[1]
        y_cursor -= recipe_h + int(4 * scale)
        _draw_text_with_shadow(draw, (margin, y_cursor), recipe_text, font_recipe,
                               fill=BRAND_COLOR)
        y_cursor -= int(10 * scale)

    # Metadatos (fecha + ubicación)
    meta_parts = []
    formatted_date = _format_date(event_date)
    if formatted_date:
        meta_parts.append(formatted_date)
    if location:
        meta_parts.append(location)

    if meta_parts:
        meta_text = "  ·  ".join(meta_parts)
        meta_lines = _wrap_text(meta_text, font_meta, text_max_width)
        for line in reversed(meta_lines):
            meta_bbox = font_meta.getbbox(line)
            line_h = meta_bbox[3] - meta_bbox[1]
            y_cursor -= line_h + int(4 * scale)
            _draw_text_with_shadow(draw, (margin, y_cursor), line, font_meta,
                                   fill=(200, 200, 200))
        y_cursor -= int(12 * scale)

    # Título (grande, bold)
    title_lines = _wrap_text(memory_title, font_title, text_max_width)[:3]
    for line in reversed(title_lines):
        title_bbox = font_title.getbbox(line)
        line_h = title_bbox[3] - title_bbox[1]
        y_cursor -= line_h + int(6 * scale)
        _draw_text_with_shadow(draw, (margin, y_cursor), line, font_title)

    # --- 5. Exportar como PNG ---
    output = io.BytesIO()
    base.convert("RGB").save(output, format="PNG", optimize=True)
    output.seek(0)
    return output.getvalue()

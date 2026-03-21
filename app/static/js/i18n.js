// ============================================
// I18N.JS — Internationalization for Zest
// ============================================
// Pattern: T('key') returns the translated string
// Language stored in localStorage and synced to user profile
// ============================================

const translations = {
    // ─── AUTH ───
    'auth.login': { en: 'Log In', es: 'Iniciar Sesión' },
    'auth.createAccount': { en: 'Create Account', es: 'Crear Cuenta' },
    'auth.email': { en: 'Email', es: 'Correo electrónico' },
    'auth.password': { en: 'Password', es: 'Contraseña' },
    'auth.confirmPassword': { en: 'Confirm Password', es: 'Confirmar Contraseña' },
    'auth.name': { en: 'Name', es: 'Nombre' },
    'auth.rememberMe': { en: 'Remember me', es: 'Recordarme' },
    'auth.minChars': { en: 'Minimum 4 characters', es: 'Mínimo 4 caracteres' },
    'auth.completeFields': { en: 'Complete all fields', es: 'Completa todos los campos' },
    'auth.loggingIn': { en: 'Logging in...', es: 'Iniciando sesión...' },
    'auth.wrongCredentials': { en: 'Email or password incorrect', es: 'Correo o contraseña incorrectos' },
    'auth.connectionError': { en: 'Connection error', es: 'Error de conexión' },
    'auth.creatingAccount': { en: 'Creating account...', es: 'Creando cuenta...' },
    'auth.passwordsDontMatch': { en: 'Passwords do not match', es: 'Las contraseñas no coinciden' },
    'auth.passwordMinChars': { en: 'Password: minimum 4 characters', es: 'Contraseña: mínimo 4 caracteres' },
    'auth.welcomeTo': { en: 'Welcome to', es: 'Bienvenido a' },
    'auth.tagline': { en: 'Your personal culinary diary', es: 'Tu diario culinario personal' },
    'auth.noAccount': { en: "Don't have an account?", es: '¿No tienes cuenta?' },
    'auth.haveAccount': { en: 'Already have an account?', es: '¿Ya tienes cuenta?' },
    'auth.or': { en: 'or', es: 'o' },

    // ─── SIDEBAR / NAV ───
    'nav.mainMenu': { en: 'Main Menu', es: 'Menú Principal' },
    'nav.allRecipes': { en: 'All Recipes', es: 'Todas las Recetas' },
    'nav.favorites': { en: 'Favorites', es: 'Favoritos' },
    'nav.cookbooks': { en: 'Cookbooks', es: 'Recetarios' },
    'nav.memories': { en: 'Memories', es: 'Recuerdos' },
    'nav.tools': { en: 'Tools', es: 'Herramientas' },
    'nav.whatToCook': { en: 'What to Cook?', es: '¿Qué Cocinar?' },
    'nav.calculator': { en: 'Calculate portions', es: 'Calcular porciones' },
    'nav.shoppingList': { en: 'Shopping List', es: 'Lista de Compras' },
    'nav.importUrl': { en: 'Import from URL', es: 'Importar desde URL' },
    'nav.planner': { en: 'Planner', es: 'Planificador' },
    'nav.settings': { en: 'Settings', es: 'Ajustes' },
    'nav.help': { en: 'Help', es: 'Ayuda' },
    'nav.darkMode': { en: 'Dark Mode', es: 'Modo Oscuro' },
    'nav.lightMode': { en: 'Light Mode', es: 'Modo Claro' },
    'nav.logOut': { en: 'Log Out', es: 'Cerrar Sesión' },

    // ─── STATS BAR ───
    'stats.totalRecipes': { en: 'Total Recipes', es: 'Total de Recetas' },
    'stats.categories': { en: 'Categories', es: 'Categorías' },
    'stats.tags': { en: 'Tags', es: 'Etiquetas' },
    'stats.favorites': { en: 'Favorites', es: 'Favoritos' },
    'stats.fiveStarRated': { en: '5 Star Rated', es: '5 Estrellas' },

    // ─── FILTER BAR ───
    'filter.allCategories': { en: 'All Categories', es: 'Todas las Categorías' },
    'filter.allTags': { en: 'All Tags', es: 'Todas las Etiquetas' },
    'filter.allRatings': { en: 'All Ratings', es: 'Todas las Calificaciones' },
    'filter.searchPlaceholder': { en: 'Search by name or ingredient...', es: 'Buscar por nombre o ingrediente...' },
    'filter.newRecipe': { en: 'New Recipe', es: 'Nueva Receta' },

    // ─── RECIPES ───
    'recipe.createNew': { en: 'Create New Recipe', es: 'Crear Nueva Receta' },
    'recipe.readMode': { en: 'Read Mode', es: 'Modo Lectura' },
    'recipe.editing': { en: 'Editing...', es: 'Editando...' },
    'recipe.saving': { en: 'Saving...', es: 'Guardando...' },
    'recipe.errorSaving': { en: 'Error saving:', es: 'Error al guardar:' },
    'recipe.noRecipeToDelete': { en: 'No recipe to delete', es: 'No hay receta para eliminar' },
    'recipe.errorFavorite': { en: 'Error updating favorite', es: 'Error al actualizar favorito' },
    'recipe.errorUploadImage': { en: 'Error uploading image', es: 'Error al subir imagen' },
    'recipe.noRecipesToDisplay': { en: 'No recipes to display', es: 'No hay recetas para mostrar' },
    'recipe.contains': { en: 'Contains:', es: 'Contiene:' },
    'recipe.imported': { en: 'Imported', es: 'Importada' },
    'recipe.noImage': { en: 'NO IMAGE', es: 'SIN IMAGEN' },
    'recipe.title': { en: 'Title', es: 'Título' },
    'recipe.categories': { en: 'Categories', es: 'Categorías' },
    'recipe.tags': { en: 'Tags', es: 'Etiquetas' },
    'recipe.rating': { en: 'Rating', es: 'Calificación' },
    'recipe.prepMin': { en: 'Prep (min)', es: 'Prep (min)' },
    'recipe.cookMin': { en: 'Cook (min)', es: 'Cocción (min)' },
    'recipe.total': { en: 'Total', es: 'Total' },
    'recipe.servings': { en: 'Servings', es: 'Porciones' },
    'recipe.ingredients': { en: 'Ingredients', es: 'Ingredientes' },
    'recipe.steps': { en: 'Steps', es: 'Pasos' },
    'recipe.image': { en: 'Image', es: 'Imagen' },
    'recipe.noImage2': { en: 'No image', es: 'Sin imagen' },
    'recipe.uploadImage': { en: 'Upload Image', es: 'Subir Imagen' },
    'recipe.imageUrl': { en: 'Image URL', es: 'URL de imagen' },
    'recipe.edit': { en: 'Edit', es: 'Editar' },
    'recipe.save': { en: 'Save', es: 'Guardar' },
    'recipe.delete': { en: 'Delete', es: 'Eliminar' },
    'recipe.importedFrom': { en: 'Imported from:', es: 'Importado de:' },
    'recipe.stepsPlaceholder': { en: 'One step per line...', es: 'Un paso por línea...' },
    'recipe.addIngredient': { en: 'Add ingredient', es: 'Agregar ingrediente' },
    'recipe.selectCategories': { en: 'Select or create categories...', es: 'Seleccionar o crear categorías...' },
    'recipe.searchCategory': { en: 'Search or create category...', es: 'Buscar o crear categoría...' },
    'recipe.selectTags': { en: 'Select or create tags...', es: 'Seleccionar o crear etiquetas...' },
    'recipe.availableTags': { en: 'Available tags (click to add):', es: 'Etiquetas disponibles (clic para agregar):' },
    'recipe.createNewTag': { en: 'Create new tag:', es: 'Crear nueva etiqueta:' },
    'recipe.tagName': { en: 'Tag name...', es: 'Nombre de etiqueta...' },
    'recipe.colorRed': { en: '🔴 Red', es: '🔴 Rojo' },
    'recipe.colorOrange': { en: '🟠 Orange', es: '🟠 Naranja' },
    'recipe.colorYellow': { en: '🟡 Yellow', es: '🟡 Amarillo' },
    'recipe.colorGreen': { en: '🟢 Green', es: '🟢 Verde' },
    'recipe.colorBlue': { en: '🔵 Blue', es: '🔵 Azul' },
    'recipe.colorPurple': { en: '🟣 Purple', es: '🟣 Morado' },
    'recipe.colorPink': { en: '🩷 Pink', es: '🩷 Rosa' },
    'recipe.confirmDelete': { en: 'Delete this recipe permanently?', es: '¿Eliminar esta receta permanentemente?' },
    'recipe.confirmDeleteFinal': { en: 'CONFIRM: This CANNOT be undone. Delete?', es: 'CONFIRMAR: Esto NO se puede deshacer. ¿Eliminar?' },

    // ─── RECIPE DETAIL ───
    'detail.backToRecipes': { en: 'Back to Recipes', es: 'Volver a Recetas' },
    'detail.cook': { en: 'Cook', es: 'Cocinar' },
    'detail.share': { en: 'Share', es: 'Compartir' },
    'detail.prep': { en: 'Prep:', es: 'Prep:' },
    'detail.cookTime': { en: 'Cook:', es: 'Cocción:' },
    'detail.noIngredients': { en: 'No ingredients', es: 'Sin ingredientes' },
    'detail.noInstructions': { en: 'No instructions', es: 'Sin instrucciones' },
    'detail.additionalPhotos': { en: 'Additional photos', es: 'Fotos adicionales' },
    'detail.viewOriginal': { en: 'View original recipe', es: 'Ver receta original' },
    'detail.servings': { en: 'servings', es: 'porciones' },

    // ─── COOKING MODE ───
    'cooking.stepOf': { en: 'Step {current} of {total}', es: 'Paso {current} de {total}' },
    'cooking.next': { en: 'Next', es: 'Siguiente' },
    'cooking.previous': { en: 'Previous', es: 'Anterior' },
    'cooking.done': { en: 'Done!', es: '¡Listo!' },
    'cooking.timer': { en: 'Timer:', es: 'Temporizador:' },
    'cooking.startTimer': { en: 'Start timer', es: 'Iniciar temporizador' },
    'cooking.timesUp': { en: "Time's up!", es: '¡Tiempo!' },
    'cooking.exit': { en: 'Exit', es: 'Salir' },
    'cooking.viewIngredients': { en: 'View ingredients', es: 'Ver ingredientes' },

    // ─── RATING ───
    'rating.none': { en: 'No rating', es: 'Sin calificación' },
    'rating.1': { en: 'Poor', es: 'Malo' },
    'rating.2': { en: 'Fair', es: 'Regular' },
    'rating.3': { en: 'Good', es: 'Bueno' },
    'rating.4': { en: 'Very good', es: 'Muy bueno' },
    'rating.5': { en: 'Excellent', es: 'Excelente' },

    // ─── CALCULATOR ───
    'calc.title': { en: 'Portion Calculator', es: 'Calculadora de Porciones' },
    'calc.subtitle': { en: 'Adjust portions and calculate ingredients', es: 'Ajusta porciones y calcula ingredientes' },
    'calc.searchRecipe': { en: 'Search recipe...', es: 'Buscar receta...' },
    'calc.servings': { en: 'Servings:', es: 'Porciones:' },
    'calc.original': { en: '(original: {n})', es: '(original: {n})' },
    'calc.reset': { en: 'Reset', es: 'Restablecer' },
    'calc.addToShoppingList': { en: 'Add to Shopping List', es: 'Agregar a Lista de Compras' },
    'calc.startOver': { en: 'Start over', es: 'Empezar de nuevo' },
    'calc.noIngredients': { en: 'No ingredients', es: 'Sin ingredientes' },
    'calc.noRecipesFound': { en: 'No recipes found', es: 'No se encontraron recetas' },

    // ─── WHAT TO COOK ───
    'wtc.title': { en: 'What to Cook?', es: '¿Qué Cocinar?' },
    'wtc.subtitle': { en: "Add the ingredients you have and I'll suggest recipes", es: 'Agrega los ingredientes que tienes y te sugeriré recetas' },
    'wtc.whatDoYouHave': { en: 'What do you have at home?', es: '¿Qué tienes en casa?' },
    'wtc.inputPlaceholder': { en: 'Type an ingredient... (ex: chicken)', es: 'Escribe un ingrediente... (ej: pollo)' },
    'wtc.add': { en: 'Add', es: 'Agregar' },
    'wtc.addIngredients': { en: 'Add ingredients to see suggestions...', es: 'Agrega ingredientes para ver sugerencias...' },
    'wtc.recipesYouCanMake': { en: 'Recipes you can make', es: 'Recetas que puedes hacer' },
    'wtc.noResults': { en: 'No results', es: 'Sin resultados' },
    'wtc.noRecipesFound': { en: 'No recipes found with those ingredients.', es: 'No se encontraron recetas con esos ingredientes.' },
    'wtc.tryAddMore': { en: 'Try adding more ingredients.', es: 'Intenta agregar más ingredientes.' },
    'wtc.haveAllIngredients': { en: 'You have all ingredients', es: 'Tienes todos los ingredientes' },
    'wtc.missing': { en: 'Missing:', es: 'Faltan:' },
    'wtc.canCookNow': { en: 'You can cook this recipe right now!', es: '¡Puedes cocinar esta receta ahora mismo!' },
    'wtc.addMissingToList': { en: 'Add {n} missing items to Shopping List', es: 'Agregar {n} faltantes a la Lista de Compras' },

    // ─── SHOPPING LIST ───
    'shop.title': { en: 'Shopping List', es: 'Lista de Compras' },
    'shop.subtitle': { en: 'Add ingredients from What to Cook? or the Calculator', es: 'Agrega ingredientes desde ¿Qué Cocinar? o la Calculadora' },
    'shop.clearList': { en: 'Clear list', es: 'Vaciar lista' },
    'shop.emptyTitle': { en: 'Your list is empty', es: 'Tu lista está vacía' },
    'shop.emptyDesc': { en: 'Use <strong>What to Cook?</strong> or the <strong>Calculator</strong> to add ingredients', es: 'Usa <strong>¿Qué Cocinar?</strong> o la <strong>Calculadora</strong> para agregar ingredientes' },
    'shop.clearConfirm': { en: 'Clear entire shopping list?', es: '¿Vaciar toda la lista de compras?' },
    'shop.servings': { en: 'servings', es: 'porciones' },
    'shop.ingredients': { en: 'ingredients', es: 'ingredientes' },

    // ─── SCRAPER ───
    'scraper.title': { en: 'Import Recipe from Internet', es: 'Importar Receta de Internet' },
    'scraper.subtitle': { en: "Paste the URL of any recipe and we'll import it for you", es: 'Pega la URL de cualquier receta y la importaremos para ti' },
    'scraper.recipeUrl': { en: 'Recipe URL', es: 'URL de la Receta' },
    'scraper.findRecipe': { en: 'Find Recipe', es: 'Buscar Receta' },
    'scraper.searching': { en: 'Searching...', es: 'Buscando...' },
    'scraper.worksWith': { en: 'Works with AllRecipes, Free Recipes, BBC Good Food, Cookpad, blogs and more', es: 'Funciona con AllRecipes, Free Recipes, BBC Good Food, Cookpad, blogs y más' },
    'scraper.analyzing': { en: 'Analyzing the page...', es: 'Analizando la página...' },
    'scraper.mayTakeSeconds': { en: 'This may take a few seconds', es: 'Esto puede tardar unos segundos' },
    'scraper.couldNotImport': { en: 'Could not import', es: 'No se pudo importar' },
    'scraper.recipeFound': { en: 'Recipe found — check the data before importing', es: 'Receta encontrada — revisa los datos antes de importar' },
    'scraper.description': { en: 'Description', es: 'Descripción' },
    'scraper.source': { en: 'Source:', es: 'Fuente:' },
    'scraper.importToMyRecipes': { en: 'Import to My Recipes', es: 'Importar a Mis Recetas' },
    'scraper.importing': { en: 'Importing...', es: 'Importando...' },
    'scraper.recipeImported': { en: 'Recipe imported!', es: '¡Receta importada!' },
    'scraper.savedToCategory': { en: 'The recipe was saved to your recipes and in the "Imported from Internet" category', es: 'La receta fue guardada en tus recetas y en la categoría "Importadas de Internet"' },
    'scraper.importAnother': { en: 'Import another', es: 'Importar otra' },
    'scraper.viewMyRecipes': { en: 'View my recipes', es: 'Ver mis recetas' },
    'scraper.noIngredientsFound': { en: 'No ingredients found', es: 'No se encontraron ingredientes' },
    'scraper.noStepsFound': { en: 'No steps found', es: 'No se encontraron pasos' },
    'scraper.validUrl': { en: 'Please enter a valid URL (e.g., https://www.example.com/recipe)', es: 'Ingresa una URL válida (ej: https://www.ejemplo.com/receta)' },
    'scraper.couldNotExtract': { en: 'Could not extract recipe', es: 'No se pudo extraer la receta' },

    // ─── MEMORIES ───
    'memory.title': { en: 'Memories', es: 'Recuerdos' },
    'memory.subtitle': { en: 'The moments around the table', es: 'Los momentos alrededor de la mesa' },
    'memory.new': { en: 'New Memory', es: 'Nuevo Recuerdo' },
    'memory.noMemoriesYet': { en: 'No memories yet', es: 'Aún no hay recuerdos' },
    'memory.emptyDesc': { en: 'Each recipe has a story. Save the special moments you lived cooking or sharing food.', es: 'Cada receta tiene una historia. Guarda los momentos especiales que viviste cocinando o compartiendo comida.' },
    'memory.createFirst': { en: 'Create your first memory', es: 'Crea tu primer recuerdo' },
    'memory.back': { en: 'Back to Memories', es: 'Volver a Recuerdos' },
    'memory.edit': { en: 'Edit Memory', es: 'Editar Recuerdo' },
    'memory.theStory': { en: 'The story', es: 'La historia' },
    'memory.noLinkedRecipe': { en: 'No linked recipe', es: 'Sin receta vinculada' },
    'memory.titleRequired': { en: 'Title is required', es: 'El título es requerido' },
    'memory.saving': { en: 'Saving...', es: 'Guardando...' },
    'memory.uploadingPhotos': { en: 'Uploading photos...', es: 'Subiendo fotos...' },
    'memory.deleteConfirm': { en: 'Delete this memory and all its photos?', es: '¿Eliminar este recuerdo y todas sus fotos?' },
    'memory.dateDetected': { en: 'Date detected from photo', es: 'Fecha detectada de la foto' },
    'memory.locationDetected': { en: 'Location detected from photo', es: 'Ubicación detectada de la foto' },
    'memory.photos': { en: 'Photos', es: 'Fotos' },
    'memory.memoryTitle': { en: 'Memory title *', es: 'Título del recuerdo *' },
    'memory.titlePlaceholder': { en: "Ex: Christmas at Grandma's", es: 'Ej: Navidad en casa de la abuela' },
    'memory.dateOfMoment': { en: 'Date of moment', es: 'Fecha del momento' },
    'memory.linkedRecipe': { en: 'Linked recipe', es: 'Receta vinculada' },
    'memory.connectToRecipe': { en: 'Optional: connect this memory to a recipe', es: 'Opcional: conecta este recuerdo a una receta' },
    'memory.place': { en: 'Place', es: 'Lugar' },
    'memory.placePlaceholder': { en: "Ex: Grandma's house, Mexico City", es: 'Ej: Casa de la abuela, CDMX' },
    'memory.autoDetectGps': { en: 'Automatically detected from photos if they have GPS', es: 'Se detecta automáticamente de fotos con GPS' },
    'memory.storyLabel': { en: 'The story', es: 'La historia' },
    'memory.storyPlaceholder': { en: 'Tell what happened, how it felt, who you were with...', es: 'Cuenta qué pasó, cómo se sintió, con quién estabas...' },
    'memory.noMemoriesRecipe': { en: 'No memories of this recipe', es: 'Sin recuerdos de esta receta' },
    'memory.addMemory': { en: 'Add memory', es: 'Agregar recuerdo' },
    'memory.linkCopied': { en: 'Link copied!', es: '¡Enlace copiado!' },
    'memory.imageDownloaded': { en: 'Image downloaded', es: 'Imagen descargada' },
    'memory.imageCopied': { en: 'Image copied to clipboard', es: 'Imagen copiada al portapapeles' },
    'memory.generatingCard': { en: 'Generating card...', es: 'Generando tarjeta...' },
    'memory.errorGenerating': { en: 'Error generating card', es: 'Error al generar tarjeta' },
    'memory.shareMoment': { en: 'Share moment', es: 'Compartir momento' },
    'memory.hideLocation': { en: 'Hide location', es: 'Ocultar ubicación' },
    'memory.generatePublicLink': { en: 'Generate public link', es: 'Generar enlace público' },

    // ─── COOKBOOKS ───
    'cookbook.title': { en: 'My Cookbooks', es: 'Mis Recetarios' },
    'cookbook.subtitle': { en: 'Collections of recipes to share', es: 'Colecciones de recetas para compartir' },
    'cookbook.new': { en: 'New Cookbook', es: 'Nuevo Recetario' },
    'cookbook.edit': { en: 'Edit Cookbook', es: 'Editar Recetario' },
    'cookbook.noDescription': { en: 'No description', es: 'Sin descripción' },
    'cookbook.recipe': { en: 'recipe', es: 'receta' },
    'cookbook.recipes': { en: 'recipes', es: 'recetas' },
    'cookbook.open': { en: 'Open', es: 'Abrir' },
    'cookbook.noBookmarks': { en: "You don't have any cookbooks yet", es: 'Aún no tienes recetarios' },
    'cookbook.createFirstDesc': { en: 'Create your first cookbook to organize and share your recipes', es: 'Crea tu primer recetario para organizar y compartir tus recetas' },
    'cookbook.createFirst': { en: 'Create my first cookbook', es: 'Crear mi primer recetario' },
    'cookbook.backToCookbooks': { en: 'Back to Cookbooks', es: 'Volver a Recetarios' },
    'cookbook.personalNote': { en: 'Personal note', es: 'Nota personal' },
    'cookbook.noRecipes': { en: 'This cookbook has no recipes', es: 'Este recetario no tiene recetas' },
    'cookbook.addRecipes': { en: 'Add recipes', es: 'Agregar recetas' },
    'cookbook.cover': { en: 'Cover', es: 'Portada' },
    'cookbook.coverDesc': { en: 'Recommended: 1200 × 400 px, horizontal format. Drag image to adjust framing.', es: 'Recomendado: 1200 × 400 px, formato horizontal. Arrastra la imagen para ajustar el encuadre.' },
    'cookbook.photo1': { en: 'Photo 1', es: 'Foto 1' },
    'cookbook.photo2': { en: 'Photo 2 (optional)', es: 'Foto 2 (opcional)' },
    'cookbook.name': { en: 'Cookbook Name', es: 'Nombre del Recetario' },
    'cookbook.namePlaceholder': { en: "Ex: Sundays with Family, Grandma Carmen's Recipes...", es: 'Ej: Domingos en Familia, Recetas de la Abuela Carmen...' },
    'cookbook.storyDesc': { en: 'Story / Description', es: 'Historia / Descripción' },
    'cookbook.storyPlaceholder': { en: 'What makes this cookbook special? Tell its story...', es: '¿Qué hace especial este recetario? Cuenta su historia...' },
    'cookbook.notePlaceholder': { en: 'A note from your kitchen...', es: 'Una nota desde tu cocina...' },
    'cookbook.noteDesc': { en: 'Appears in the PDF. Ex: "These are the recipes we always return to when the week calms down."', es: 'Aparece en el PDF. Ej: "Estas son las recetas a las que siempre volvemos cuando la semana se calma."' },
    'cookbook.selected': { en: '({n} selected)', es: '({n} seleccionados)' },
    'cookbook.searchRecipes': { en: 'Search recipes...', es: 'Buscar recetas...' },
    'cookbook.nameRequired': { en: 'Name is required', es: 'El nombre es requerido' },
    'cookbook.deleteConfirm': { en: 'Delete "{name}"? Recipes will NOT be deleted, only the cookbook.', es: '¿Eliminar "{name}"? Las recetas NO se eliminarán, solo el recetario.' },
    'cookbook.deleteConfirm2': { en: 'CONFIRM: Really delete "{name}"?', es: 'CONFIRMAR: ¿Realmente eliminar "{name}"?' },
    'cookbook.sharedIntentionally': { en: 'Shared intentionally.', es: 'Compartido intencionalmente.' },

    // ─── SHARING ───
    'share.title': { en: 'Share', es: 'Compartir' },
    'share.chooseHow': { en: 'Choose how you want to share', es: 'Elige cómo quieres compartir' },
    'share.publicLink': { en: 'Public Link', es: 'Enlace Público' },
    'share.publicLinkDesc': { en: 'Anyone with the link can view the recipes', es: 'Cualquier persona con el enlace puede ver las recetas' },
    'share.generateLink': { en: 'Generate Link', es: 'Generar Enlace' },
    'share.generating': { en: 'Generating...', es: 'Generando...' },
    'share.copy': { en: 'Copy', es: 'Copiar' },
    'share.copied': { en: 'Copied!', es: '¡Copiado!' },
    'share.openPreview': { en: 'Open preview', es: 'Abrir vista previa' },
    'share.deleteLink': { en: 'Delete link', es: 'Eliminar enlace' },
    'share.deleteLinkConfirm': { en: 'Delete this link? No one will be able to access the cookbook with it.', es: '¿Eliminar este enlace? Nadie podrá acceder al recetario con él.' },
    'share.exportPdf': { en: 'Export PDF', es: 'Exportar PDF' },
    'share.exportPdfDesc': { en: 'Download a PDF ready to print or send', es: 'Descarga un PDF listo para imprimir o enviar' },
    'share.downloadPdf': { en: 'Download PDF', es: 'Descargar PDF' },
    'share.generatingPdf': { en: 'Generating PDF...', es: 'Generando PDF...' },

    // ─── PROFILE ───
    'profile.title': { en: 'My Profile', es: 'Mi Perfil' },
    'profile.information': { en: 'Information', es: 'Información' },
    'profile.name': { en: 'Name', es: 'Nombre' },
    'profile.yourName': { en: 'Your name', es: 'Tu nombre' },
    'profile.email': { en: 'Email', es: 'Correo electrónico' },
    'profile.saveChanges': { en: 'Save Changes', es: 'Guardar Cambios' },
    'profile.changePassword': { en: 'Change Password', es: 'Cambiar Contraseña' },
    'profile.currentPassword': { en: 'Current password', es: 'Contraseña actual' },
    'profile.newPassword': { en: 'New password', es: 'Nueva contraseña' },
    'profile.confirmNewPassword': { en: 'Confirm new password', es: 'Confirmar nueva contraseña' },
    'profile.repeatNewPassword': { en: 'Repeat new password', es: 'Repetir nueva contraseña' },
    'profile.nameRequired': { en: 'Name is required', es: 'El nombre es requerido' },
    'profile.invalidEmail': { en: 'Invalid email', es: 'Correo inválido' },
    'profile.profileUpdated': { en: 'Profile updated', es: 'Perfil actualizado' },
    'profile.errorSaving': { en: 'Error saving', es: 'Error al guardar' },
    'profile.completePasswordFields': { en: 'Complete all password fields', es: 'Completa todos los campos de contraseña' },
    'profile.newPasswordsDontMatch': { en: 'New passwords do not match', es: 'Las contraseñas nuevas no coinciden' },
    'profile.passwordMin': { en: 'Minimum 4 characters', es: 'Mínimo 4 caracteres' },
    'profile.changing': { en: 'Changing...', es: 'Cambiando...' },
    'profile.passwordUpdated': { en: 'Password updated', es: 'Contraseña actualizada' },
    'profile.photoUpdated': { en: 'Photo updated', es: 'Foto actualizada' },

    // ─── SETTINGS ───
    'settings.title': { en: 'Settings', es: 'Ajustes' },
    'settings.profile': { en: 'Profile', es: 'Perfil' },
    'settings.backup': { en: 'Backup', es: 'Respaldo' },
    'settings.export': { en: 'Export', es: 'Exportar' },
    'settings.import': { en: 'Import', es: 'Importar' },

    // ─── BACKUP ───
    'backup.automatic': { en: 'Automatic Backup', es: 'Respaldo Automático' },
    'backup.enabled': { en: 'Enabled', es: 'Activado' },
    'backup.frequency': { en: 'Frequency', es: 'Frecuencia' },
    'backup.maxKeep': { en: 'Keep max', es: 'Mantener máx' },
    'backup.includeImages': { en: 'Include images', es: 'Incluir imágenes' },
    'backup.saveConfig': { en: 'Save Configuration', es: 'Guardar Configuración' },
    'backup.saved': { en: 'Saved', es: 'Guardado' },
    'backup.createNow': { en: 'Create Backup Now', es: 'Crear Respaldo Ahora' },
    'backup.creating': { en: 'Creating backup...', es: 'Creando respaldo...' },
    'backup.created': { en: 'Backup created', es: 'Respaldo creado' },
    'backup.lastBackup': { en: 'Last backup:', es: 'Último respaldo:' },
    'backup.noBackupsYet': { en: 'No backups yet', es: 'Aún no hay respaldos' },
    'backup.noBackupsSaved': { en: 'No backups saved', es: 'No hay respaldos guardados' },
    'backup.restoreConfirm': { en: 'Restore from {file}?\n\nA backup of the current state will be created before restoring. You will need to restart the application afterward.', es: '¿Restaurar desde {file}?\n\nSe creará un respaldo del estado actual antes de restaurar. Necesitarás reiniciar la aplicación después.' },
    'backup.deleteConfirm': { en: 'Delete {file}?', es: '¿Eliminar {file}?' },

    // ─── EXPORT / IMPORT ───
    'export.fullBackup': { en: 'Export Full Backup', es: 'Exportar Respaldo Completo' },
    'export.fullBackupDesc': { en: 'Database + all images (ZIP)', es: 'Base de datos + todas las imágenes (ZIP)' },
    'export.recipesJson': { en: 'Export Recipes (JSON)', es: 'Exportar Recetas (JSON)' },
    'export.recipesJsonDesc': { en: 'Only recipes in JSON format', es: 'Solo recetas en formato JSON' },
    'export.exporting': { en: 'Exporting...', es: 'Exportando...' },
    'export.success': { en: 'Database and images exported successfully', es: 'Base de datos e imágenes exportadas exitosamente' },
    'export.jsonSuccess': { en: 'Recipes exported in JSON format', es: 'Recetas exportadas en formato JSON' },
    'export.error': { en: 'Export error', es: 'Error de exportación' },
    'import.fullBackup': { en: 'Import Full Backup', es: 'Importar Respaldo Completo' },
    'import.fullBackupDesc': { en: 'Restore from a backup ZIP file', es: 'Restaurar desde un archivo ZIP de respaldo' },
    'import.recipesJson': { en: 'Import Recipes (JSON)', es: 'Importar Recetas (JSON)' },
    'import.recipesJsonDesc': { en: 'Add recipes from a JSON file', es: 'Agregar recetas desde un archivo JSON' },
    'import.warning': { en: 'WARNING: This will replace the ENTIRE current database and images. Are you sure?', es: 'ADVERTENCIA: Esto reemplazará TODA la base de datos e imágenes actual. ¿Estás seguro?' },
    'import.uploading': { en: 'Uploading file...', es: 'Subiendo archivo...' },
    'import.processing': { en: 'Processing...', es: 'Procesando...' },
    'import.importingRecipes': { en: 'Importing recipes...', es: 'Importando recetas...' },
    'import.done': { en: 'Done!', es: '¡Listo!' },
    'import.error': { en: 'Import error', es: 'Error de importación' },

    // ─── ONBOARDING ───
    'onboarding.welcome': { en: 'Welcome to Zest', es: 'Bienvenido a Zest' },
    'onboarding.tagline': { en: 'Your personal culinary diary', es: 'Tu diario culinario personal' },
    'onboarding.motto': { en: "We don't save recipes. We save the moments around the table.", es: 'No guardamos recetas. Guardamos los momentos alrededor de la mesa.' },
    'onboarding.recipesTitle': { en: 'Your recipes, your story', es: 'Tus recetas, tu historia' },
    'onboarding.recipesDesc': { en: 'Start by creating your first recipe', es: 'Empieza creando tu primera receta' },
    'onboarding.memoriesTitle': { en: 'Memories', es: 'Recuerdos' },
    'onboarding.memoriesDesc': { en: 'What makes Zest different', es: 'Lo que hace diferente a Zest' },
    'onboarding.createFirstMemory': { en: 'Create my first memory', es: 'Crear mi primer recuerdo' },
    'onboarding.explore': { en: 'Explore on my own', es: 'Explorar por mi cuenta' },
    'onboarding.previous': { en: 'Previous', es: 'Anterior' },
    'onboarding.skip': { en: 'Skip', es: 'Omitir' },
    'onboarding.next': { en: 'Next', es: 'Siguiente' },

    // ─── PLANNER ───
    'planner.title': { en: 'Menu Planner', es: 'Planificador de Menú' },
    'planner.comingSoon': { en: 'Coming Soon', es: 'Próximamente' },
    'planner.desc': { en: "Soon you'll be able to organize your week with a menu planner. Drag recipes, generate automatic shopping lists and never again ask yourself \"what am I cooking today?\".", es: 'Pronto podrás organizar tu semana con un planificador de menú. Arrastra recetas, genera listas de compras automáticas y nunca más te preguntes "¿qué cocino hoy?".' },
    'planner.inDevelopment': { en: 'In Development', es: 'En Desarrollo' },

    // ─── HELP ───
    'help.title': { en: 'Help', es: 'Ayuda' },
    'help.subtitle': { en: 'Everything you need to know about Zest', es: 'Todo lo que necesitas saber sobre Zest' },
    'help.recipes': { en: 'Recipes', es: 'Recetas' },
    'help.memories': { en: 'Memories', es: 'Recuerdos' },
    'help.importUrls': { en: 'Import URLs', es: 'Importar URLs' },
    'help.cookbooks': { en: 'Cookbooks', es: 'Recetarios' },
    'help.whatToCook': { en: 'What to Cook?', es: '¿Qué Cocinar?' },
    'help.backups': { en: 'Backups', es: 'Respaldos' },

    // ─── GENERAL / COMMON ───
    'common.save': { en: 'Save', es: 'Guardar' },
    'common.cancel': { en: 'Cancel', es: 'Cancelar' },
    'common.delete': { en: 'Delete', es: 'Eliminar' },
    'common.close': { en: 'Close', es: 'Cerrar' },
    'common.back': { en: 'Back', es: 'Atrás' },
    'common.next': { en: 'Next', es: 'Siguiente' },
    'common.previous': { en: 'Previous', es: 'Anterior' },
    'common.search': { en: 'Search', es: 'Buscar' },
    'common.loading': { en: 'Loading...', es: 'Cargando...' },
    'common.error': { en: 'Error', es: 'Error' },
    'common.success': { en: 'Success', es: 'Éxito' },
    'common.connectionError': { en: 'Connection error', es: 'Error de conexión' },
    'common.noResults': { en: 'No results', es: 'Sin resultados' },
    'common.min': { en: 'min', es: 'min' },
    'common.create': { en: 'Create', es: 'Crear' },
    'common.qty': { en: 'Qty.', es: 'Cant.' },
    'common.ingredient': { en: 'Ingredient...', es: 'Ingrediente...' },
    'common.noCategoriesAvailable': { en: 'No categories available', es: 'No hay categorías disponibles' },
    'common.noTagsAvailable': { en: 'No tags. Create a new one.', es: 'Sin etiquetas. Crea una nueva.' },
    'common.tagCreated': { en: 'Tag "{name}" created', es: 'Etiqueta "{name}" creada' },
    'common.enterTagName': { en: 'Please enter a name for the tag', es: 'Ingresa un nombre para la etiqueta' },

    // ─── VERSION BANNER ───
    'version.newVersion': { en: 'New version available', es: 'Nueva versión disponible' },
    'version.reload': { en: 'Reload', es: 'Recargar' },

    // ─── CALCULATOR (extra) ───
    'calc.selectRecipe': { en: 'Select a recipe', es: 'Selecciona una receta' },
    'calc.servingsCount': { en: '{n} servings', es: '{n} porciones' },
    'calc.ingredientsCount': { en: '{n} ingredients', es: '{n} ingredientes' },

    // ─── COOKBOOK (extra) ───
    'cookbook.recipeCount': { en: '{n} recipe', es: '{n} receta' },
    'cookbook.recipesCount': { en: '{n} recipes', es: '{n} recetas' },
    'cookbook.save': { en: 'Save', es: 'Guardar' },
    'cookbook.errorSaving': { en: 'Error saving', es: 'Error al guardar' },
    'cookbook.servingsLabel': { en: 'servings', es: 'porciones' },

    // ─── FILTER (extra) ───
    'filter.stars': { en: 'stars', es: 'estrellas' },
    'filter.star': { en: 'star', es: 'estrella' },
    'filter.unrated': { en: 'Unrated', es: 'Sin calificar' },
};

// ─── LANGUAGE STATE ───
// Detect browser language: if user hasn't chosen a language yet, use navigator.language
function detectBrowserLang() {
    const saved = localStorage.getItem('zest_lang');
    if (saved) return saved;

    // Detect from browser
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    const detected = browserLang.startsWith('es') ? 'es' : 'en';

    // Save so detection only happens once
    localStorage.setItem('zest_lang', detected);
    return detected;
}

let currentLang = detectBrowserLang();

export function getLang() {
    return currentLang;
}

export function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('zest_lang', lang);
    translatePage();
}

// ─── TRANSLATE FUNCTION ───
export function T(key, params = {}) {
    const entry = translations[key];
    if (!entry) {
        console.warn(`[i18n] Missing key: "${key}"`);
        return key;
    }
    let text = entry[currentLang] || entry['en'] || key;
    // Replace {param} placeholders
    for (const [k, v] of Object.entries(params)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    }
    return text;
}

// ─── TRANSLATE ALL data-i18n ELEMENTS ───
export function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = T(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = T(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        el.title = T(key);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
        const key = el.getAttribute('data-i18n-html');
        el.innerHTML = T(key);
    });

    // Update language toggle button text if it exists
    const langBtnText = document.getElementById('langToggleBtnText');
    if (langBtnText) {
        langBtnText.textContent = currentLang === 'en' ? 'ES' : 'EN';
    }
}

// ─── TOGGLE LANGUAGE (sidebar button) ───
export function toggleAppLang() {
    const newLang = currentLang === 'en' ? 'es' : 'en';
    setLang(newLang);

    // Update the toggle button text
    const btnText = document.getElementById('langToggleBtnText');
    if (btnText) btnText.textContent = newLang === 'en' ? 'ES' : 'EN';

    // Re-render dynamic views that are currently visible
    if (window.loadRecipes && document.getElementById('viewRecipes') && !document.getElementById('viewRecipes').classList.contains('hidden')) {
        window.applyFilters();
    }

    // Re-populate filter dropdowns (they are built dynamically)
    if (window.populateCategoryFilter) window.populateCategoryFilter();
    if (window.populateTagFilter) window.populateTagFilter();

    // Re-render rating filter
    const ratingFilter = document.getElementById('ratingFilter');
    if (ratingFilter) {
        const currentVal = ratingFilter.value;
        ratingFilter.innerHTML = `
            <option value="">${T('filter.allRatings')}</option>
            <option value="5">⭐⭐⭐⭐⭐ (5 ${T('filter.stars')})</option>
            <option value="4">⭐⭐⭐⭐ (4 ${T('filter.stars')})</option>
            <option value="3">⭐⭐⭐ (3 ${T('filter.stars')})</option>
            <option value="2">⭐⭐ (2 ${T('filter.stars')})</option>
            <option value="1">⭐ (1 ${T('filter.star')})</option>
            <option value="0">${T('filter.unrated')}</option>
        `;
        ratingFilter.value = currentVal;
    }

    // Re-render cookbooks if visible
    if (window.loadCookbooks && document.getElementById('viewCookbooks') && !document.getElementById('viewCookbooks').classList.contains('hidden')) {
        window.loadCookbooks();
    }
}

// ─── INIT LANG BUTTON STATE ───
export function initLangButton() {
    const btnText = document.getElementById('langToggleBtnText');
    if (btnText) btnText.textContent = currentLang === 'en' ? 'ES' : 'EN';
}

// ─── WINDOW EXPOSURE ───
window.T = T;
window.getLang = getLang;
window.setLang = setLang;
window.translatePage = translatePage;
window.toggleAppLang = toggleAppLang;
window.initLangButton = initLangButton;
window.zestLang = currentLang;

// Re-export for module use
export default { T, getLang, setLang, translatePage, toggleAppLang, initLangButton };

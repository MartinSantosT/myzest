// ============================================
// RATING.JS — Star Rating Functions
// ============================================

export function setRating(rating) {
    document.getElementById('inputRating').value = rating;

    const stars = document.querySelectorAll('#ratingStars .rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-orange-500');
        } else {
            star.classList.remove('text-orange-500');
            star.classList.add('text-gray-300');
        }
    });

    const texts = ['No rating', '⭐ Poor', '⭐⭐ Fair', '⭐⭐⭐ Good', '⭐⭐⭐⭐ Very good', '⭐⭐⭐⭐⭐ Excellent'];
    document.getElementById('ratingText').textContent = texts[rating];
}

export function displayRating(rating) {
    const stars = document.querySelectorAll('#ratingStars .rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('text-gray-300');
            star.classList.add('text-orange-500');
        } else {
            star.classList.remove('text-orange-500');
            star.classList.add('text-gray-300');
        }
    });

    const texts = ['No rating', '⭐ Poor', '⭐⭐ Fair', '⭐⭐⭐ Good', '⭐⭐⭐⭐ Very good', '⭐⭐⭐⭐⭐ Excellent'];
    document.getElementById('ratingText').textContent = texts[rating];
}

// --- Window Exposure (for inline onclick) ---
window.setRating = setRating;
window.displayRating = displayRating;

// Initialiser le panier
function getCart() {
    return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

// Dispatch event to notify UI that cart changed
function notifyCartUpdated() {
    updateCartCounter();
    try {
        document.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (e) {
        // older browsers fallback
        document.dispatchEvent(new Event('cartUpdated'));
    }
}

// Affiche un toast non bloquant en bas à droite
function showToast(message, duration = 2200) {
    let toast = document.getElementById('site-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'site-toast';
        toast.style.position = 'fixed';
        toast.style.right = '1rem';
        toast.style.bottom = '1rem';
        toast.style.background = 'rgba(0,0,0,0.85)';
        toast.style.color = 'white';
        toast.style.padding = '0.6rem 1rem';
        toast.style.borderRadius = '8px';
        toast.style.boxShadow = '0 6px 18px rgba(0,0,0,0.25)';
        toast.style.zIndex = 10000;
        toast.style.fontFamily = 'Inter, system-ui, sans-serif';
        toast.style.fontSize = '0.95rem';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    clearTimeout(toast._hideTimeout);
    toast._hideTimeout = setTimeout(() => {
        toast.style.transition = 'opacity 300ms ease';
        toast.style.opacity = '0';
    }, duration);
}

// Ajouter un produit au panier
function addToCart(product) {
    let cart = getCart();

    // Vérifie si même produit + même taille existe déjà → incrémente quantité
    const existing = cart.find(
        item => item.id === product.id && item.size === product.size
    );

    if (existing) {
        existing.qty += product.qty;
    } else {
        cart.push(product);
    }

    saveCart(cart);
    notifyCartUpdated();
}

// Update item quantity (by id + size)
function updateCartItem(id, size, newQty) {
    const cart = getCart();
    const idx = cart.findIndex(i => i.id === id && i.size === size);
    if (idx === -1) return false;
    if (newQty <= 0) {
        // remove
        cart.splice(idx, 1);
    } else {
        cart[idx].qty = newQty;
    }
    saveCart(cart);
    notifyCartUpdated();
    return true;
}

// Remove an item entirely
function removeCartItem(id, size) {
    const cart = getCart();
    const newCart = cart.filter(i => !(i.id === id && i.size === size));
    saveCart(newCart);
    notifyCartUpdated();
}

// Mettre à jour le compteur du panier dans le header
function updateCartCounter() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.qty, 0);
    const counter = document.getElementById("cart-counter");
    
    if (counter) {
        counter.textContent = count;
        counter.style.display = count > 0 ? "flex" : "none";
    }
}

// Clear cart
function clearCart() {
    localStorage.removeItem("cart");
    updateCartCounter();
}

// Initialisation au chargement
document.addEventListener("DOMContentLoaded", updateCartCounter);

// Step navigation function (moved from inline script to avoid CSP 'unsafe-inline')
function goToStep(step) {
    try {
        // Hide all sections
        for (let s = 1; s <= 3; s++) {
            const el = document.getElementById(`step${s}`);
            if (el) el.classList.add('hidden');
        }

        const target = document.getElementById(`step${step}`);
        if (target) target.classList.remove('hidden');

        // Update progress indicators
        for (let i = 1; i <= 3; i++) {
            const indicator = document.getElementById(`step${i}-indicator`);
            if (!indicator) continue;
            indicator.classList.remove('active', 'completed');
            if (i < step) {
                indicator.classList.add('completed');
            } else if (i === step) {
                indicator.classList.add('active');
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        console.warn('goToStep error', e);
    }
}

// Gestion du clic "Ajouter au panier"
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-to-cart");
    if (!btn) return;

    // récupérer taille choisie
    const parent = btn.closest(".product-details");
    const activeSize = parent.querySelector(".size-option.active");
    if (!activeSize) {
        showToast("Veuillez choisir une taille.");
        return;
    }

    // quantité (champ adjacent)
    let qty = 1;
    const qtyInput = parent.querySelector('.qty-input');
    if (qtyInput) {
        const v = parseInt(qtyInput.value, 10);
        if (!isNaN(v) && v > 0) qty = v;
    }

    const product = {
        id: btn.dataset.id,
        name: btn.dataset.name,
        price: parseFloat(btn.dataset.price),
        size: activeSize.textContent,
        qty: qty,
        image: btn.dataset.image
    };

    addToCart(product);
    showToast("Article ajouté au panier !");
});

// Synchronisation cross-tab: quand une autre onglet modifie localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        // update counter and notify UI listeners in this tab
        try {
            document.dispatchEvent(new CustomEvent('cartUpdated'));
        } catch (err) {
            document.dispatchEvent(new Event('cartUpdated'));
        }
        updateCartCounter();
    }
});
// First order discount helper - exposed globally for payment.js
function isFirstOrderDiscount() {
    try {
        var checkbox = document.getElementById('isFirstOrder');
        return checkbox ? checkbox.checked : false;
    } catch (e) {
        return false;
    }
}

// Wire navigation buttons (data-go-step) and return-home button to avoid inline handlers
document.addEventListener('DOMContentLoaded', function () {
    try {
        // Buttons that move between steps
        var stepBtns = document.querySelectorAll('[data-go-step]');
        stepBtns.forEach(function (b) {
            b.addEventListener('click', function (ev) {
                var step = parseInt(b.getAttribute('data-go-step'), 10);
                if (!isNaN(step) && typeof window.goToStep === 'function') {
                    window.goToStep(step);
                }
            });
        });

        // Return home button in success modal
        var ret = document.getElementById('btnReturnHome');
        if (ret) {
            ret.addEventListener('click', function () { window.location.href = '/'; });
        }
    } catch (e) {
        // Non-fatal
        console.warn('Could not wire navigation buttons:', e);
    }
});

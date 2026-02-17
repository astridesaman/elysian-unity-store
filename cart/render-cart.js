function renderCart() {
    const cart = getCart();
    // support pages that use either an element with id `cart-items` or class `.cart-items-list`
    const container = document.getElementById("cart-items") || document.querySelector('.cart-items-list');

    if (!container) {
        // nothing to render on this page
        return;
    }

    // On détecte si on est sur la page checkout (réduction étudiante)
    const isCheckout = !!document.getElementById('isFirstOrder');

    if (!cart || cart.length === 0) {
        container.innerHTML = "<p class=\"empty-cart\">Votre panier est vide.</p>";
        const subtotalEl = document.getElementById("subtotal");
        const totalEl = document.getElementById("total");
        const shippingEl = document.getElementById("shipping");

        if (subtotalEl) subtotalEl.textContent = "0€";
        if (shippingEl && !isCheckout) shippingEl.textContent = "0€";
        if (totalEl && !isCheckout) totalEl.textContent = "0€";

        return;
    }

    // Render compact view if using `.cart-items-list` (different markup)
    const usingCompact = container.classList && container.classList.contains('cart-items-list');

    // small inline SVG used as fallback when product image missing or 404
    // expose global placeholder so repair function can access it
    window.__cartImagePlaceholder = window.__cartImagePlaceholder || ('data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect fill="#e8e8e8" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="36">👕</text></svg>'));

    // function to try several fixes when an <img> fails to load
    window.__tryFixImgSrc = window.__tryFixImgSrc || function(img) {
        try {
            img.onerror = null; // prevent loops
            const raw = img.getAttribute('src') || '';
            const candidates = [];

            // if raw contains spaces, try encodeURI version
            if (raw.indexOf(' ') !== -1) candidates.push(encodeURI(raw));

            // if it's relative (no leading slash), try with leading '/'
            if (!raw.startsWith('/') && !raw.match(/^https?:\/\//)) candidates.push('/' + raw.replace(/^\.\//, ''));

            // if image was stored from a /cart page, try removing /cart/ prefix
            if (raw.indexOf('/cart/') !== -1) candidates.push(raw.replace('/cart/', '/'));

            // specific common wrong prefix replacement
            if (raw.indexOf('/cart/public') !== -1) candidates.push(raw.replace('/cart/public', '/public'));

            // try encodeURI of raw as last attempt
            candidates.push(encodeURI(raw));

            for (let i = 0; i < candidates.length; i++) {
                const c = candidates[i];
                if (!c) continue;
                if (c === raw || c === img.src) continue;
                img.src = c;
                return;
            }
        } catch (e) {
            // fallthrough to placeholder
        }
        img.src = window.__cartImagePlaceholder;
    };

    if (usingCompact) {
        container.innerHTML = cart.map(item => `
            <div class="cart-item-mini" data-id="${item.id}" data-size="${item.size}">
                <img src="${item.image || window.__cartImagePlaceholder}" alt="${item.name}" onerror="window.__tryFixImgSrc(this)">
                <div class="info">
                    <h4>${item.name}</h4>
                    <div class="details">Taille: ${item.size}</div>
                    <div class="qty-controls" style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
                        <button class="qty-decrease" style="width: 28px; height: 28px; border: 1px solid #f0f0f0; background: white; cursor: pointer; border-radius: 4px;" aria-label="Réduire">−</button>
                        <input class="qty-input-cart" type="number" min="1" value="${item.qty}" style="width: 50px; height: 28px; border: 1px solid #f0f0f0; border-radius: 4px; text-align: center;" aria-label="Quantité">
                        <button class="qty-increase" style="width: 28px; height: 28px; border: 1px solid #f0f0f0; background: white; cursor: pointer; border-radius: 4px;" aria-label="Augmenter">+</button>
                        <button class="remove-btn" style="margin-left: 0.75rem; padding: 0.3rem 0.6rem; border: none; background: transparent; color: #d32f2f; cursor: pointer; font-size: 0.8rem; text-transform: uppercase; font-weight: 500;">✕ Supprimer</button>
                    </div>
                </div>
                <div class="price" style="font-weight: 600;">${((item.price||0) * item.qty).toFixed(2).replace('.00','')}€</div>
            </div>
        `).join('');
    } else {
        container.innerHTML = cart.map(item => `
            <div class="cart-item" data-id="${item.id}" data-size="${item.size}">
                <img src="${item.image || window.__cartImagePlaceholder}" alt="${item.name}" onerror="window.__tryFixImgSrc(this)">
                <div class="item-info">
                    <h3>${item.name}</h3>
                    <div class="details">Taille : ${item.size}</div>
                    <div class="qty-controls">
                        <button class="qty-decrease" aria-label="Réduire quantité">−</button>
                        <input class="qty-input-cart" type="number" min="1" value="${item.qty}" aria-label="Quantité">
                        <button class="qty-increase" aria-label="Augmenter quantité">+</button>
                        <button class="remove-btn">Supprimer</button>
                    </div>
                </div>
                <div class="item-price">${((item.price||0) * item.qty).toFixed(2).replace('.00','')}€</div>
            </div>
        `).join("");
    }

    const subtotal = cart.reduce((sum, item) => sum + (parseFloat(item.price) || 0) * (item.qty || 0), 0);
    const shipping = subtotal > 100 ? 0 : (subtotal === 0 ? 0 : 4);
    const total = subtotal + shipping;

    const subtotalEl = document.getElementById("subtotal");
    const shippingEl = document.getElementById("shipping");
    const totalEl = document.getElementById("total");

    // On peut toujours afficher le sous-total brut (avant remise)
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2).replace('.00','') + "€";

    // Sur la page checkout, on laisse payment.js gérer shipping + total (avec réduction)
    if (!isCheckout) {
        if (shippingEl) {
            shippingEl.textContent = shipping === 0 ? "Gratuite" : shipping.toFixed(2).replace('.00','') + "€";
        }
        if (totalEl) {
            totalEl.textContent = total.toFixed(2).replace('.00','') + "€";
        }
    }
}


// Event delegation for quantity controls + remove
function setupCartInteractions() {
    const container = document.getElementById("cart-items") || document.querySelector('.cart-items-list');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const inc = e.target.closest('.qty-increase');
        const dec = e.target.closest('.qty-decrease');
        const rem = e.target.closest('.remove-btn');
        
        // Support both full cart items (.cart-item) and compact items (.cart-item-mini)
        const parent = e.target.closest('.cart-item') || e.target.closest('.cart-item-mini');
        if (!parent) return;
        
        const id = parent.dataset.id;
        const size = parent.dataset.size;

        if (inc) {
            const input = parent.querySelector('.qty-input-cart');
            const v = parseInt(input.value, 10) || 1;
            input.value = v + 1;
            updateCartItem(id, size, v + 1);
            renderCart();
            return;
        }

        if (dec) {
            const input = parent.querySelector('.qty-input-cart');
            const v = parseInt(input.value, 10) || 1;
            const nv = Math.max(1, v - 1);
            input.value = nv;
            updateCartItem(id, size, nv);
            renderCart();
            return;
        }

        if (rem) {
            if (confirm('Supprimer cet article du panier ?')) {
                removeCartItem(id, size);
                renderCart();
            }
            return;
        }
    });

    // input change handler
    container.addEventListener('change', (e) => {
        const input = e.target.closest('.qty-input-cart');
        if (!input) return;
        const parent = input.closest('.cart-item') || input.closest('.cart-item-mini');
        const id = parent.dataset.id;
        const size = parent.dataset.size;
        let v = parseInt(input.value, 10) || 1;
        if (v < 1) v = 1;
        input.value = v;
        updateCartItem(id, size, v);
        renderCart();
    });
}

document.addEventListener("DOMContentLoaded", () => {
    renderCart();
    setupCartInteractions();
});

// Re-render when cart utility notifies change
document.addEventListener('cartUpdated', () => {
    // small timeout to let storage update if needed
    setTimeout(renderCart, 80);
});

// Also listen for storage events from other tabs and re-render
window.addEventListener('storage', (e) => {
    if (e.key === 'cart') {
        // small delay to ensure localStorage has the new value
        setTimeout(renderCart, 60);
    }
});

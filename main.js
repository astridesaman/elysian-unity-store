// main.js - browser-safe: avoid Node-only imports and don't redeclare global `stripe`
// If you expose `window.STRIPE_PUBLISHABLE_KEY` in your page, payment scripts will initialize Stripe.
var stripeInstance = window.stripe || null;
// Only warn if this is a payment page and Stripe is missing
document.addEventListener('DOMContentLoaded', function() {
  const hasPaymentForm = document.getElementById('paymentForm') || document.getElementById('card-element');
  if (hasPaymentForm && !stripeInstance && typeof Stripe === 'undefined') {
    console.warn("Stripe library not loaded; payment page may have issues initializing Stripe Elements.");
  }
});

  //  Script sélection tailles
  
        document.querySelectorAll('.size-options').forEach(group => {
            group.addEventListener('click', (e) => {
                const btn = e.target.closest('.size-option');
                if (!btn) return;
                group.querySelectorAll('.size-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
 

    // Script modal guide des tailles
  
        const sizeModal = document.getElementById('size-guide-modal');
        if (!sizeModal) return; // Not on this page
        const backdrop = sizeModal.querySelector('.size-modal-backdrop');
        const closeBtn = sizeModal.querySelector('.size-modal-close');
        const tabButtons = sizeModal.querySelectorAll('.size-tab');
        const panels = sizeModal.querySelectorAll('.size-panel');

        function openSizeModal(initialProduct) {
            tabButtons.forEach(btn => {
                const tab = btn.getAttribute('data-tab');
                btn.classList.toggle('active', tab === initialProduct);
            });

            panels.forEach(panel => {
                panel.classList.toggle('active', panel.id === `size-panel-${initialProduct}`);
            });

            sizeModal.classList.add('open');
            sizeModal.setAttribute('aria-hidden', 'false');
        }

        function closeSizeModal() {
            sizeModal.classList.remove('open');
            sizeModal.setAttribute('aria-hidden', 'true');
        }

        document.querySelectorAll('.size-guide-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const product = btn.getAttribute('data-product') || 'hoodie';
                openSizeModal(product);
            });
        });

        closeBtn.addEventListener('click', closeSizeModal);
        backdrop.addEventListener('click', closeSizeModal);

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && sizeModal.classList.contains('open')) {
                closeSizeModal();
            }
        });

        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');

                tabButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                panels.forEach(panel => {
                    panel.classList.toggle('active', panel.id === `size-panel-${tab}`);
                });
            });
        });
    


// Gestion du clic sur "Commander" / "Précommander"
document.querySelectorAll('.btn-primary[data-product-id]').forEach(button => {
  button.addEventListener('click', async () => {
    const productId = button.dataset.productId;

    const details = button.closest('.product-details');
    const meta = details.querySelector('.product-meta');
    let size = null;

    if (meta) {
      const activeSize = meta.querySelector('.size-option.active');
      if (!activeSize) {
        alert("Merci de choisir une taille avant de continuer.");
        return;
      }
      size = activeSize.textContent.trim();
    }

    try {
      const response = await fetch("/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          productId: productId,
          size: size
        })
      });

      if (!response.ok) {
        throw new Error("Erreur serveur");
      }

      const data = await response.json();

      if (!stripeInstance) {
        alert('Stripe non initialisé — redirection au checkout impossible.');
      } else {
        const result = await stripeInstance.redirectToCheckout({ sessionId: data.id });
        if (result && result.error) alert(result.error.message);
      }
    } catch (error) {
      console.error(error);
      alert("Une erreur est survenue. Merci de réessayer dans quelques instants.");
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
    const waitlistButtons = document.querySelectorAll('.waitlist-btn');

    waitlistButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const email = prompt("Laisse ton email pour rejoindre la liste d'attente :");
            if (!email) return;

            const productId = btn.dataset.productId;

            fetch("https://elysianunity.fr/waitlist/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    product_id: 4, // ex: Collector Edition
                }),
            })

            .then(() => {
                alert("Merci ! Tu es bien inscrit(e) sur la liste d'attente 🤍");
            })
            .catch(() => {
                alert("Merci ! Si le formulaire ne fonctionne pas, écris-nous à admin@elysianunity.fr");
            });
        });
    });
});


// Hamburger menu toggle (responsive)
(function () {
  function closeNav() {
    document.body.classList.remove('nav-open');
    document.querySelectorAll('[aria-expanded="true"]').forEach(el => el.setAttribute('aria-expanded', 'false'));
  }

  function openNav(toggle) {
    document.body.classList.add('nav-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  document.addEventListener('click', function (e) {
    const toggle = e.target.closest('#nav-toggle');
    if (toggle) {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      if (expanded) closeNav(); else openNav(toggle);
      return;
    }

    // Click outside nav-menu closes it
    if (document.body.classList.contains('nav-open')) {
      const menu = document.getElementById('nav-menu');
      if (menu && !menu.contains(e.target) && !e.target.closest('#nav-toggle')) {
        closeNav();
      }
    }
  });

  // Close on Escape
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      closeNav();
    }
  });
})();



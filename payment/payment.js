// payment/payment.js — Stripe + backend FastAPI (Elysian Unity)
// - Lit le panier depuis localStorage
// - Calcule les totaux côté front (affichage)
// - Envoie le panier + infos client au backend pour créer un PaymentIntent Stripe
// - Utilise Stripe Elements pour confirmer le paiement
// - Le backend valide la commande via webhook Stripe

(function () {
  'use strict';

  // 🔗 URL du backend FastAPI
  var BACKEND_BASE_URL = 'https://elysian-unity-backend.onrender.com';

  // Helper: read canonical cart (prefer global getCart() if available)
  function readCart() {
    try {
      if (typeof getCart === 'function') return getCart();
    } catch (e) {}
    try {
      var raw = localStorage.getItem('cart');
      if (!raw) return [];
      return JSON.parse(raw) || [];
    } catch (e) {
      return [];
    }
  }

  function formatEuro(n) {
    if (typeof n !== 'number') n = Number(n) || 0;
    var s = n.toFixed(2).replace(/\.00$/, '');
    return s + '€';
  }

  // Resolve publishable key from globals if present
  var publishableKey = null;
  try {
    if (window && window.env && window.env.STRIPE_PUBLISHABLE_KEY) {
      publishableKey = window.env.STRIPE_PUBLISHABLE_KEY;
    }
  } catch (e) {}
  if (!publishableKey && window && window.STRIPE_PUBLISHABLE_KEY) {
    publishableKey = window.STRIPE_PUBLISHABLE_KEY;
  }

  // Initialize global stripe once (if Stripe library loaded and key available)
  if (typeof Stripe !== 'undefined' && typeof window.stripe === 'undefined') {
    try {
      window.stripe = publishableKey ? Stripe(publishableKey) : null;
    } catch (e) {
      window.stripe = null;
    }
  }
  var stripeInstance = window.stripe || null;

  // Create Elements + mount card if possible
  var elements = null;
  var cardElement = null;
  try {
    if (stripeInstance) {
      elements = stripeInstance.elements();
      cardElement = elements.create('card', { hidePostalCode: true });
      if (document.getElementById('card-element')) {
        cardElement.mount('#card-element');
      }
    }
  } catch (e) {
    elements = null;
    cardElement = null;
  }

  // Cached DOM nodes
  var form = document.getElementById('paymentForm');
  var payBtn = document.getElementById('payBtn');
  var clearBtn = document.getElementById('clearBtn');
  var overlay = document.getElementById('overlay') || document.getElementById('successModal');
  var summaryContainer = document.getElementById('summaryItems');

  function setError(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.display = message ? 'block' : 'none';
    el.textContent = message || '';
    var fieldWrapper = el.parentElement;
    if (!fieldWrapper) return;
    var input = fieldWrapper.querySelector('input, textarea, select');
    if (input) {
      if (message) input.classList.add('error');
      else input.classList.remove('error');
    }
  }

  function resetErrors() {
    setError('err-fullName', '');
    setError('err-email', '');
    setError('err-address', '');
    var c = document.getElementById('card-errors');
    if (c) c.textContent = '';
  }

  // Efface proprement le panier côté front
  function clearCartSafe() {
    try {
      if (typeof clearCart === 'function') {
        clearCart();
      } else {
        localStorage.removeItem('cart');
        document.dispatchEvent(new CustomEvent('cartUpdated'));
      }
    } catch (e) {
      console.warn('Erreur clearCart:', e);
    }
  }

  // Affiche un succès "fallback" uniquement si Stripe/Backend ne sont pas dispo (mode démo)
  async function simulateSuccess() {
    console.warn('[payment.js] simulateSuccess() — mode démo, aucun paiement réel effectué.');
    var orderSummaryEl = document.getElementById('orderSummary');
    if (orderSummaryEl) {
      orderSummaryEl.textContent = 'Commande enregistrée en mode test (aucun paiement).';
    }
    if (overlay) overlay.classList.add('show');
    clearCartSafe();
  }

  // Render line-by-line summary into aside
  function renderSummaryFromCart(cart) {
    if (!summaryContainer) return;
    if (!cart || !cart.length) {
      summaryContainer.innerHTML = '<p class="muted">Votre panier est vide.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < cart.length; i++) {
      var it = cart[i];
      var line = (parseFloat(it.price) || 0) * (it.qty || 1);
      var img = it.image || '/public/Charcoal Edition - Elysian Unity.png';
      html +=
        '<div class="summary-line" style="display:flex;gap:0.75rem;align-items:center;padding:0.6rem 0;border-bottom:1px solid #f0f0f0;">' +
        '<img src="' + img + '" alt="' + (it.name || '') + '" style="width:56px;height:56px;object-fit:cover;border-radius:8px;">' +
        '<div style="flex:1;">' +
        '<div style="font-weight:600">' + (it.name || '') + '</div>' +
        '<div class="muted" style="font-size:0.9rem;margin-top:0.15rem">Taille ' + (it.size || '-') + ' • Quantité ' + (it.qty || 0) + '</div>' +
        '</div>' +
        '<div style="font-weight:700">' + (line.toFixed ? line.toFixed(2).replace('.00', '') : line) + '€</div>' +
        '</div>';
    }
    summaryContainer.innerHTML = html;
  }

  // Compute totals from canonical cart (affichage uniquement)
  function calcTotals() {
    const cart = readCart();

    // 1) Sous-total brut
    let sub = 0;
    for (let i = 0; i < cart.length; i++) {
      sub += (parseFloat(cart[i].price) || 0) * (cart[i].qty || 1);
    }

    // Compute discount if applicable
    let discount = 0;
    const isFirstOrder = document.getElementById('isFirstOrder') && document.getElementById('isFirstOrder').checked;
    if (isFirstOrder) {
      discount = sub * 0.1; // 10% pour première commande
    }
    let subAfterDiscount = 0;

    // 2) Calculer subAfterDiscount
    subAfterDiscount = sub - discount;

    // 3) Livraison
    const shipping = subAfterDiscount === 0 ? 0 : (subAfterDiscount > 100 ? 0 : 4);

    // 4) Total final
    const total = subAfterDiscount + shipping;

    console.log('[payment.js] Final total => sub=', sub, 'discount=', discount, 'ship=', shipping, 'total=', total);
    const discountRow = document.getElementById('firstOrderDiscount');
    if (discountRow) {
      if (discount > 0) {
        discountRow.style.display = 'flex';
        const discountValue = discountRow.querySelector('.discount-value');
        if (discountValue) {
          discountValue.textContent = '-' + formatEuro(discount).replace('€', '') + '€';
        }
      } else {
        discountRow.style.display = 'none';
      }
    }

    // 5) Mise à jour du récap DOM
    const subEl = document.getElementById('subtotal');
    if (subEl) subEl.textContent = formatEuro(sub);

    const shipEl = document.getElementById('shipping');
    if (shipEl) shipEl.textContent = shipping === 0 ? 'Gratuite' : formatEuro(shipping);

    const totalEl = document.getElementById('total');
    if (totalEl) totalEl.textContent = formatEuro(total);

    // 6) Rendu des lignes produits
    renderSummaryFromCart(cart);

    return { subTotal: sub, shipping, total, cart };
  }

  // Recalc on cart updates (same tab) and storage changes (other tabs)
  document.addEventListener('cartUpdated', function () {
    console.log('[payment.js] cartUpdated event fired, recalculating totals');
    calcTotals();
  });
  window.addEventListener('storage', function (e) {
    if (e.key === 'cart') {
      console.log('[payment.js] cart changed in storage');
      calcTotals();
    }
  });

  // Wire change listeners for fallback fields si présents
  ['product', 'qty', 'size'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', calcTotals);
    if (id === 'qty') el.addEventListener('input', calcTotals);
  });

  // Listener for first order discount
  var firstOrderCheckbox = document.getElementById('isFirstOrder');
  if (firstOrderCheckbox) {
    firstOrderCheckbox.addEventListener('change', calcTotals);
  }

  // Clear button
  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      if (form) form.reset();
      resetErrors();
      clearCartSafe();
      calcTotals();
    });
  }

  // Form submit handler
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      resetErrors();

      var fullName = (document.getElementById('fullName') && document.getElementById('fullName').value) || '';
      var email = (document.getElementById('email') && document.getElementById('email').value) || '';
      var address = (document.getElementById('address') && document.getElementById('address').value) || '';

      var totals = calcTotals(); // pour logging / affichage
      var cart = totals.cart;

      var ok = true;
      if (fullName.trim().length < 3) {
        setError('err-fullName', 'Veuillez renseigner votre nom complet');
        ok = false;
      }
      if (!/\S+@\S+\.\S+/.test(email)) {
        setError('err-email', 'Adresse email invalide');
        ok = false;
      }
      if (address.trim().length < 6) {
        setError('err-address', 'Adresse trop courte');
        ok = false;
      }
      if (!cart || !cart.length) {
        var errCart = document.getElementById('err-cart');
        if (errCart) {
          errCart.style.display = 'block';
          errCart.textContent = 'Votre panier est vide.';
        }
        ok = false;
      }
      if (!ok) return;

      // Case première commande
      var isFirstOrder = false;
      var checkbox = document.getElementById('isFirstOrder');
      if (checkbox && checkbox.checked) isFirstOrder = true;

      if (!stripeInstance || !cardElement) {
        // Pas de Stripe => impossible de prendre un vrai paiement
        var cardErr = document.getElementById('card-errors');
        if (cardErr) cardErr.textContent = 'Le paiement n’est pas disponible pour le moment. Réessayez plus tard.';
        return;
      }

      if (payBtn) {
        payBtn.disabled = true;
        payBtn.textContent = 'Traitement...';
      }

      (async function () {
        try {
          // Préparer le payload pour FastAPI
          var payload = {
            cart: cart.map(function (item) {
              return {
                id: item.id,        // doit matcher l’id ou le slug du produit côté backend
                size: item.size,
                qty: item.qty
              };
            }),
            customer: {
              name: fullName,
              email: email,
              address: address
            },
            is_first_order: isFirstOrder
          };

          console.log('[payment.js] Sending to backend:', payload);

          var resp = await fetch(BACKEND_BASE_URL + '/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          if (!resp || !resp.ok) {
            console.warn('Backend /create-payment-intent error', resp);
            var errData = null;
            try { errData = await resp.json(); } catch (e) {}
            var cardErr2 = document.getElementById('card-errors');
            if (cardErr2) cardErr2.textContent = (errData && errData.detail) || 'Erreur lors de la création du paiement.';
            return;
          }

          var data = await resp.json();
          var clientSecret = data && data.clientSecret;

          if (!clientSecret) {
            var cardErr3 = document.getElementById('card-errors');
            if (cardErr3) cardErr3.textContent = 'Réponse paiement invalide.';
            return;
          }

          // Confirmation de paiement côté Stripe
          var res = await stripeInstance.confirmCardPayment(clientSecret, {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: fullName,
                email: email
              }
            }
          });

          if (res.error) {
            var errEl = document.getElementById('card-errors');
            if (errEl) errEl.textContent = res.error.message || 'Erreur carte';
          } else if (res.paymentIntent && res.paymentIntent.status === 'succeeded') {
            var orderSummaryEl = document.getElementById('orderSummary');
            if (orderSummaryEl) orderSummaryEl.textContent = 'Commande confirmée. Merci pour votre précommande 🤍';
            if (overlay) overlay.classList.add('show');
            clearCartSafe();
            calcTotals();
          } else {
            var errEl2 = document.getElementById('card-errors');
            if (errEl2) errEl2.textContent = 'Le paiement n\'a pas pu être confirmé.';
          }
        } catch (err) {
          console.warn('Payment flow error, fallback to demo mode.', err);
          await simulateSuccess();
        } finally {
          if (payBtn) {
            payBtn.disabled = false;
            payBtn.textContent = 'PAYER';
          }
        }
      })();
    });
  }

  // initial render
  calcTotals();

})();

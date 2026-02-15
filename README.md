<!-- README pour la boutique statique Elysian Unity -->
# Elysian Unity — Store (statique)

Site statique de démonstration pour la boutique Elysian Unity. Ce dépôt contient les pages publiques, la logique du panier (stockée dans `localStorage`) et une intégration front-end de Stripe Elements avec un mode de test local (simulation) si le backend n'est pas disponible.

**Objectif**
- Fournir une boutique statique simple (HTML/CSS/JS) : ajouter au panier, modifier le panier, récapitulatif et flux de paiement front-end.

**Fonctionnalités clés**
- Ajouter des articles au panier avec options (taille, quantité).
- Persistance du panier dans `localStorage` (clé `cart`).
- Page de panier réactive et rendu via JavaScript.
- Intégration Stripe Elements côté client; le traitement réel nécessite un serveur pour créer un PaymentIntent.

**Structure du dépôt (principale)**
- [index.html](index.html) — page d'accueil / listing produits
- [globals.css](globals.css) — styles globaux
- [main.js](main.js) — scripts UX globaux
- [products.json](products.json) — données produits (optionnel)
- [cart/checkout.html](cart/checkout.html) — page panier / checkout
- [cart/checkout.css](cart/checkout.css) — styles de la page panier
- [cart/checkout.js](cart/checkout.js) — logique d'interaction du panier
- [cart/render-cart.js](cart/render-cart.js) — rendu du panier sur la page
- [payment/payment.js](payment/payment.js) — logique de paiement / Stripe (front-end)
- [legal/](legal/) — pages légales (CGV, confidentialité, etc.)
- [public/](public/) — ressources publiques

> Remarque : certains noms de fichiers ont été mis à jour pour refléter l'arborescence actuelle du projet.

**Prérequis**
- Navigateur moderne (Chrome, Edge, Firefox).
- Pour tester localement, un simple serveur statique suffit.

**Exécuter localement (rapide)**

PowerShell (depuis le dossier du projet) :

```powershell
# Serveur HTTP simple (Python 3)
python -m http.server 8000

# Ou (si Node.js installé) :
npx serve . -l 8000
```

Ouvrez ensuite `http://localhost:8000` et parcourez le site.

**Flux de paiement & Stripe**
- Le front-end utilise Stripe Elements pour collecter les données de carte. En production, un endpoint serveur doit créer un PaymentIntent et renvoyer le `client_secret` au client.
- Endpoint attendu côté serveur : `POST /create-payment-intent` (renvoie `{ clientSecret: '...' }`).
- En l'absence d'un backend Stripe, le code client inclut un mode demo qui simule une réussite de paiement pour tests locaux — ne pas utiliser cela en production.
- Pour brancher Stripe réel : définissez votre clé publique dans [payment/payment.js](payment/payment.js) (remplacez `pk_test_VOTRE_CLE_PUBLIQUE_STRIPE`) et fournissez un endpoint serveur sécurisé.

**Données localStorage et debug**
- Le panier est stocké sous la clé `cart` dans `localStorage`.
- Pour réinitialiser le panier : ouvrez DevTools → Application → Local Storage → supprimez la clé `cart`, ou exécutez `localStorage.removeItem('cart')` dans la console.

**Fichiers à lire en priorité**
- [cart/render-cart.js](cart/render-cart.js) — rendu et interactions du panier
- [cart/checkout.js](cart/checkout.js) — manipulation du panier côté page
- [payment/payment.js](payment/payment.js) — calcul des totaux et logique de soumission

**Contribuer**
- Fork, branchez vos modifs et proposez une PR. Toutes améliorations UX ou sécurité (paiement) sont bienvenues.

Merci d'utiliser ou d'explorer ce dépôt — dites-moi si vous souhaitez que j'ajoute un exemple d'endpoint serveur pour Stripe ou des instructions Docker.
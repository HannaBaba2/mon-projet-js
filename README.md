# Exercice 3 : SDK JavaScript RodiumAI

Script interactif en JavaScript qui utilise le SDK `rodiumai` (npm) : chat, génération d'image (PNG) et de vidéo (mp4).
À la fin de chaque étape, on peut revenir en arrière, rester pour la refaire, ou passer à la suite.

## Installation
Version de Node utilisée : 18 ou plus (`node -v`).

```bash
npm install
```

Le SDK doit être en version 0.3.1 ou plus (génération de vidéo).

## Configuration
Copier `.env.example` en `.env`, puis remplacer la valeur par votre vraie clé API :

```bash
cp .env.example .env
```

Les modèles se règlent en haut de `main.js` (format `fournisseur/modèle`).

## Lancement
```bash
node main.js
```

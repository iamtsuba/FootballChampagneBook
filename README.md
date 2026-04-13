# 📖 Story Manager — Gestionnaire d'univers sportif

Application web pour structurer ton roman sportif : personnages, équipes, compétitions, matchs, arcs narratifs et livres.

---

## 🚀 Installation rapide

### 1. Cloner / télécharger le projet

```bash
git clone https://github.com/TON_PSEUDO/story-manager.git
cd story-manager
npm install
```

---

### 2. Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New project**
2. Donne un nom, choisis une région (ex: West EU), génère un mot de passe
3. Attends ~2 minutes que le projet se lance

---

### 3. Créer les tables (schéma SQL)

1. Dans ton dashboard Supabase → **SQL Editor** → **New query**
2. Copie-colle **tout le contenu** du fichier `supabase_schema.sql`
3. Clique **Run** → tu devrais voir "Success"

---

### 4. Configurer les variables d'environnement

1. Dans Supabase → **Project Settings** → **API**
2. Copie :
   - **Project URL** (ex: `https://abcdef.supabase.co`)
   - **anon / public key**
3. À la racine du projet, crée un fichier `.env.local` :

```env
VITE_SUPABASE_URL=https://TON_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=TON_ANON_KEY
```

---

### 5. Lancer l'application

```bash
npm run dev
```

Ouvre [http://localhost:5173](http://localhost:5173) 🎉

---

## 📦 Déployer sur GitHub Pages ou Vercel

### GitHub Pages

```bash
npm run build
# puis pousse le dossier dist/ ou configure GitHub Actions
```

### Vercel (recommandé — gratuit)

1. Push ton repo sur GitHub
2. Va sur [vercel.com](https://vercel.com) → Import project
3. Ajoute les variables d'environnement dans les settings Vercel
4. Deploy 🚀

> ⚠️ **Important** : Ne jamais commiter le fichier `.env.local` — il est dans `.gitignore`

---

## 🗂️ Structure de l'application

```
src/
├── components/
│   ├── Sidebar.jsx       # Navigation latérale
│   └── Modal.jsx         # Composant modal réutilisable
├── hooks/
│   └── useToast.jsx      # Notifications toast
├── lib/
│   └── supabase.js       # Client Supabase
├── pages/
│   ├── Dashboard.jsx     # Vue d'ensemble
│   ├── Personnages.jsx   # CRUD personnages
│   ├── Equipes.jsx       # CRUD équipes + saisons/effectifs
│   ├── Competitions.jsx  # CRUD compétitions
│   ├── Matchs.jsx        # CRUD matchs (filtrable)
│   ├── Arcs.jsx          # CRUD arcs narratifs + relations
│   └── Livres.jsx        # CRUD livres + arcs liés
├── styles/
│   └── global.css        # Thème complet
├── App.jsx
└── main.jsx
```

---

## 🗄️ Schéma de base de données

| Table | Description |
|-------|-------------|
| `personnages` | Tous les personnages avec design physique et personnalité |
| `equipes` | Équipes avec couleurs, maillots, palmares |
| `saisons` | Effectifs par équipe et par année |
| `saison_joueurs` | Relation joueur ↔ saison (avec numéro de maillot) |
| `competitions` | Championnats, coupes, tournois... |
| `matchs` | Matchs liés aux compétitions et aux équipes |
| `arcs` | Arcs narratifs avec thèmes et statut |
| `arc_personnages` | Relation arc ↔ personnages |
| `arc_equipes` | Relation arc ↔ équipes |
| `arc_competitions` | Relation arc ↔ compétitions |
| `arc_matchs` | Relation arc ↔ matchs |
| `livres` | Tomes/livres avec synopsis et statut |
| `livre_arcs` | Relation livre ↔ arcs |

---

## ✨ Fonctionnalités

- ✅ **Personnages** : Nom, prénom, surnom, poste, design physique détaillé, personnalité (optionnel)
- ✅ **Équipes** : Couleurs (sélecteur hex), description maillot, palmares par année, effectifs par saison
- ✅ **Compétitions** : Championnat, coupe, tournoi, niveau national/international
- ✅ **Matchs** : Scores, phases, résumés, filtrage par compétition et par année
- ✅ **Arcs narratifs** : Thèmes, statut, périodes, avec liaison vers personnages/équipes/compétitions/matchs
- ✅ **Livres** : Tomes numérotés, synopsis, statut d'écriture, arcs inclus
- ✅ Recherche et filtres
- ✅ Notifications toast
- ✅ Interface sombre thème sport

---

## 🔧 Stack technique

- **React 18** + **Vite 5**
- **React Router v6**
- **Supabase** (PostgreSQL + API REST auto-générée)
- CSS custom (zero dépendance UI)

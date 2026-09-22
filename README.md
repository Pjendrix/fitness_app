# Forge – posilovací deník (PWA)

Mobilní PWA pro sledování posilovacích tréninků ve stylu FitNotes. React + Vite, Firebase Auth (Google) a Cloud Firestore. Monochromatický design podle Vercel design systemu (Geist, vlasové rámečky, radius 6 px).

## Funkce
- **Domů** – rychlý start (další v rotaci PUSH → PULL → LEGS), týdenní statistiky, poslední rekordy
- **Trénink** – zápis sérií, časovač, odškrtávání, přidání/smazání série, odebrání a přesun cvičení, výběr z knihovny cvičení, displej nezhasíná
- **Historie** – odcvičené tréninky s objemem a délkou, mazání
- **Šablony** – PUSH / PULL / LEGS v Normal a Hardcore variantě, vlastní šablony skládané z knihovny, úprava kopie vestavěné šablony
- **Statistiky** – progres cvičení (odhad 1RM, top váha), týdenní objem a frekvence, série podle partie, kalendář docházky, tabulka rekordů. Na desktopu (≥ 960 px) boční navigace a široký analytický layout.
- **Nastavení** – profil, export dat do JSON, odhlášení

### Chytré předvyplnění
1. Poslední trénink daného cvičení (váha i opakování, série po sérii)
2. Když historie chybí: plán ze šablony (např. pyramida bench 60×10 → 85×4) nebo doporučená váha
3. Štítek **PB: 100 kg × 5** – osobní rekord (vyšší váha, při shodě víc opakování). Nový rekord se zvýrazní už při odškrtnutí série.

Historie a PB se párují podle názvu cvičení, takže „Bench Press (Barbell)" sdílí data mezi Normal i Hardcore.

## Spuštění
```bash
npm install
npm run dev          # appka proti produkčnímu Firebase (přihlásí se jen povolené účty)
VITE_DEMO=1 npm run dev   # DEMO bez Firebase, data jen v localStorage
npm test             # unit testy (rekordy, validace, CSV, i18n)
npm run lint
```

## Firebase a bezpečnost
- Config je přímo v `src/lib/firebase.js` (webový config Firebase je veřejný z principu).
- Přístup mají jen účty v `firestore.rules` (skutečná ochrana) a `src/lib/access.js` (hláška v UI). Při změně uprav **obě** místa.
- Rules validují strukturu a limity dokumentů; klient navíc validuje každou sérii (`sanitizeSet` v `util.js`).
- App Check: vlož site key do `APP_CHECK_SITE_KEY` v `firebase.js` (postup v `INSTRUKCE.md`).
- Nasazení pravidel: Firebase Console → Firestore → Rules, nebo `firebase deploy --only firestore:rules`.

### Datový model
```
users/{uid}/templates/{id}       vlastní šablony
users/{uid}/workouts/{id}        {id, name, templateId, group, variant, startedAt, finishedAt, exercises[{key, name, type?, sets[{weight, reps, time?}]}]}
users/{uid}/prs/{exerciseKey}    {name, weight, reps, time?, date}
users/{uid}/meta/exercises       {list: [{name, cat, type?, db?}], v: 2}
users/{uid}/meta/profile         {id: 'krystof' | 'chiara'}
users/{uid}/meta/main            {[profileId]: {groups, templates}}
```
Historie se odebírá živě (`onSnapshot`) z offline cache Firestore – série zapsané bez signálu se odešlou později a appka ukazuje stav „Offline / Synchronizuji…“. Rozdělaný trénink se drží v `localStorage` zvlášť pro každého uživatele.

## Nasazení
Vercel (napojený na GitHub repo) builduje `npm run build` do `dist`. GitHub Actions (`ci.yml`) jen kontroluje lint, testy a build. Service worker generuje `vite-plugin-pwa` (Workbox) a nová verze se nabídne bannerem „Obnovit“.

## Na telefon
Otevři nasazenou URL → Safari: *Sdílet → Přidat na plochu* / Chrome: *Nainstalovat aplikaci*.

## Úprava šablon
`src/data/defaultTemplates.js` – každé cvičení má `sets`, `reps`, `weight` (výchozí kg), `hint` (doporučení), `note` a volitelně `plan` pro váhu každé série.

## Knihovna cvičení
`src/data/exercises.js` – ~75 cviků rozdělených podle partie. Vlastní cviky se přidávají přímo ve výběru (napiš název → Vytvořit).

## v3
- English UI by default, Czech optional (Settings → Language). Exercise names and default templates are English; old Czech names in history/PBs are mapped automatically.
- Exercises tab (desktop sidebar, or Settings → Manage exercises): library by muscle group, CSV export/import (`name,category`), reset to defaults in Settings.
- Template colours (matte palette, light tint).
- History: list / calendar view, filter by workout.

## v4 – profiles
- Training profile per Google account (`users/{uid}/meta/profile`): **Kryštof** (PUSH/PULL/LEGS, Normal/Hardcore) or **Chiara** (Upper A/B, Lower A/B, Abs & Cardio). Chosen on first login, changeable in Settings.
- Timed exercises (Plank, Stairmaster and other cardio): sets are logged as kg + minutes. CSV has an optional `type` column (`reps` / `time`).

## v5 – bezpečnost, integrita dat, posilovna
- Allowlist účtů + validace ve Firestore rules, App Check (volitelně), bezpečnostní HTTP hlavičky.
- Validace vstupů, přepočet rekordů po smazání tréninku, vrácení draftu při odmítnutém zápisu, draft per uživatel.
- Mazání série potažením doleva s „Zpět“, větší ovládací prvky, pauza mezi sériemi (Nastavení → Pauza), upozornění na neodškrtnuté série.
- Indikátor offline / synchronizace, živá synchronizace historie mezi zařízeními.
- Tmavý vzhled (Nastavení → Vzhled), lepší kontrast, vlastní dialogy, přístupné panely (Esc, focus).
- Rozdělený store (bez zbytečných překreslení), lazy obrazovky, Workbox SW s precache a update bannerem, self-hosted fonty.
- ESLint, Vitest, CI.

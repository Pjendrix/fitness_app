# Forge – posilovací deník (PWA)

Mobilní PWA pro sledování posilovacích tréninků ve stylu FitNotes. React + Vite, Firebase Auth (Google) a Cloud Firestore. Tmavý fialový design s glass kartami.

## Funkce
- **Domů** – rychlý start (další v rotaci PUSH → PULL → LEGS), týdenní statistiky, poslední rekordy
- **Trénink** – zápis sérií, časovač, odškrtávání, přidání série/cvičení, displej nezhasíná (Wake Lock)
- **Historie** – odcvičené tréninky s objemem a délkou, mazání
- **Šablony** – PUSH / PULL / LEGS v Normal a Hardcore variantě + vlastní šablony
- **Nastavení** – profil, export dat do JSON, odhlášení

### Chytré předvyplnění
1. Poslední trénink daného cvičení (váha i opakování, série po sérii)
2. Když historie chybí: plán ze šablony (např. pyramida bench 60×10 → 85×4) nebo doporučená váha
3. Štítek **PB: 100 kg × 5** – osobní rekord (vyšší váha, při shodě víc opakování). Nový rekord se zvýrazní už při odškrtnutí série.

Historie a PB se párují podle názvu cvičení, takže „Bench Press (Barbell)" sdílí data mezi Normal i Hardcore.

## Spuštění
```bash
npm install
cp .env.example .env.local   # vyplň Firebase config (bez něj běží DEMO režim v localStorage)
npm run dev
```

## Firebase
1. [console.firebase.google.com](https://console.firebase.google.com) → nový projekt → přidat Web app → zkopírovat config do `.env.local`
2. Authentication → Sign-in method → **Google** zapnout; do *Authorized domains* přidat doménu nasazení
3. Firestore Database → vytvořit (production mode)
4. Nasazení pravidel a hostingu:
```bash
npm i -g firebase-tools
firebase login && firebase use --add
npm run build && firebase deploy
```

### Datový model
```
users/{uid}/templates/{id}       vlastní šablony
users/{uid}/workouts/{id}        {name, group, variant, startedAt, finishedAt, exercises[{key, name, sets[{weight, reps}]}]}
users/{uid}/prs/{exerciseKey}    {name, weight, reps, date}
```
Firestore běží s offline cache – série zapsané bez signálu se odešlou později. Rozdělaný trénink se drží v `localStorage`, takže přežije zavření appky.

## Na telefon
Otevři nasazenou URL → Safari: *Sdílet → Přidat na plochu* / Chrome: *Nainstalovat aplikaci*.

## Úprava šablon
`src/data/defaultTemplates.js` – každé cvičení má `sets`, `reps`, `weight` (výchozí kg), `hint` (doporučení), `note` a volitelně `plan` pro váhu každé série.

## GitHub Pages (volitelné)
Workflow `.github/workflows/deploy.yml` builduje při pushi do `main`. Firebase hodnoty dej do repo Secrets a doménu `<user>.github.io` do Authorized domains.

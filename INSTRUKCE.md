# Forge 4.5 – co udělat mimo nahrání ZIPu

## 1. Firestore rules (před nahráním kódu)
Limit váhy u rekordů se zvedl z 500 na 1000 kg. Bez nových rules by zápis tréninku s rekordem nad 500 kg selhal.
Firebase Console → **fitnessapp-88bd2** → Firestore → **Rules** → vlož celý `firestore.rules` → **Publish**.
(nebo `firebase deploy --only firestore:rules`)

## 2. GitHub: smazat ručně
Nahrání ZIPu přes web nic nemaže. Smaž v repu:
- `download` – omylem přejmenovaný `.gitignore` (nový `.gitignore` je v ZIPu)
- `src/icon-192.png` – přesunutý do `public/icon-192.png`

`.gitignore` začíná tečkou, takže ho Finder nezobrazí. Před přetažením zapni skryté soubory (Cmd + Shift + .).

## 3. Po nasazení
- Na telefonu se objeví banner „Je k dispozici nová verze“ → Obnovit.
- Ikona na ploše: na iPhonu se nová ikona projeví až po odebrání a znovupřidání appky na plochu.
- Náhledy na přihlášení (`public/preview`) ještě ukazují starý popisek „Série“. Přegeneruješ je `npm run previews`.

## Stále otevřené z dřívějška
- **Doména:** omezení API klíče (Google Cloud → Credentials → HTTP referrers), Authentication → Authorized domains a případně App Check musí obsahovat `fitness.krystofbenka.cz`.
- **CSP:** ve `vercel.json` je pořád `Content-Security-Policy-Report-Only`. Když konzole nehlásí porušení, přejmenuj klíč na `Content-Security-Policy`.
- **App Check:** `APP_CHECK_SITE_KEY` v `src/lib/firebase.js` je prázdný. Postup: App Check → reCAPTCHA Enterprise → klíč do kódu → pár dní sledovat metriky → teprve pak Enforce.
- **Přidání účtu:** Nastavení → Přístupy (admin). Rules i `src/lib/access.js` měň jen při změně zakladatelů.

# Forge 5.2 – co udělat mimo nahrání ZIPu

Pořadí je důležité kvůli přístupu Chiary: nové rules už nemají její e-mail napevno.

## 1. GitHub: nahrát ZIP a jeden soubor smazat
- Nahraj ZIP. Obsahuje i skrytý `.gitignore` a `.github/workflows/ci.yml` (na Macu Cmd + Shift + tečka, na Windows je uvidíš normálně).
- **Smaž v repu soubor `download`** – byl to omylem přejmenovaný `.gitignore`, ten je teď v ZIPu pod správným názvem.
- Vercel se nasadí sám. V záložce *Actions* poběží dva joby: `check` (lint, testy, build) a nový `rules` (testy Firestore rules v emulátoru).

## 2. Přidat Chiaru do Přístupů (před publikováním rules!)
Otevři nasazenou appku jako admin → **Nastavení → Přístupy** → přidej `chiaralari24@gmail.com`.
Staré rules ji zatím pouštějí pořád, takže nic nespěchá – ale musí to být hotové dřív než krok 3.

## 3. Firestore rules
Firebase Console → **fitnessapp-88bd2** → Firestore → **Rules** → vlož celý `firestore.rules` → **Publish**.
Nové rules: validace tvaru dat, mazání vlastních dat (smazání účtu), Chiara už jen přes Přístupy.
Kdyby se Chiara po publikování nedostala dovnitř, chybí jí záznam z kroku 2 – přidej ho a hned funguje.

## 4. Zásady ochrany osobních údajů
Zkontroluj `public/privacy.html` (odkaz je na přihlášení a v Nastavení). Jako správce a kontakt je tam
tvoje jméno a `tofbenka@gmail.com`. Je to rozumný základ, ne právní rada – před prodejem ho nech projít někým, kdo GDPR dělá.

## 5. Test na telefonu
- [ ] Chiara se přihlásí i po publikování nových rules
- [ ] Zapsat a dokončit trénink (u obou účtů), smazat trénink v Historii a vrátit
- [ ] Historie: dole „Zobrazit starší“
- [ ] Nastavení → Čeština: přepne se všechno včetně spodní lišty
- [ ] Nastavení → Smazání účtu: **zkus na testovacím Google účtu**, ne na svém (přidej ho v Přístupech, přihlas se, pár sérií, smazat)

## Když selže job `rules` v Actions
Pošli mi log. Testy rules jsem tady nemohl spustit (emulátor se stahuje z Googlu a sem to síť nepustí),
takže tohle je jejich první běh. Na nasazení nemají vliv – Vercel nasazuje nezávisle na CI.

## Stále otevřené z dřívějška
- **CSP:** ve `vercel.json` je pořád `Content-Security-Policy-Report-Only`. Když konzole prohlížeče nehlásí porušení, přejmenuj klíč na `Content-Security-Policy`.
- **App Check:** `APP_CHECK_SITE_KEY` v `src/lib/firebase.js` je prázdný (App Check → reCAPTCHA Enterprise → klíč do kódu → pár dní sledovat → Enforce).
- **Doména:** omezení API klíče (HTTP referrers) a Authentication → Authorized domains musí obsahovat `fitness.krystofbenka.cz`.

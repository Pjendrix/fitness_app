# Forge v5 – co udělat mimo nahrání nového ZIPu

Pořadí je důležité. Kroky 1–3 dělej hned po sobě; do té doby se nikdo nový nepřihlásí jen proto, že máš nový kód.

---

## 1. GitHub: nahrát kód a smazat staré soubory

Nahrání ZIPu přes web GitHubu **nemaže** soubory, které v nové verzi nejsou. Smaž v repu ručně:

| Smazat | Proč |
|---|---|
| `.github/workflows/deploy.yml` | Nasazení na GitHub Pages už nepoužíváme (nahrazeno `ci.yml`) |
| `public/sw.js` | Service worker se teď generuje při buildu |
| `env.local`, `env.example` | Config je v `src/lib/firebase.js`, env soubory nic nedělaly |
| `download` | Byl to omylem přejmenovaný `.gitignore` |

Zkontroluj, že se nahrály i **skryté soubory**: `.gitignore` a `.github/workflows/ci.yml`. Na Macu je Finder nezobrazuje (Cmd + Shift + . je ukáže), a proto je drag & drop nemusí vzít s sebou.

Pokud máš v repu *Settings → Pages* zapnuté GitHub Pages, vypni je. V *Settings → Secrets and variables → Actions* můžeš smazat secrets `VITE_FIREBASE_*`, už se nepoužívají.

Po pushi se v záložce *Actions* spustí **CI** (lint + testy + build); mělo by být zelené.

---

## 2. Firestore rules (nejdůležitější krok)

1. Firebase Console → projekt **fitnessapp-88bd2** → *Firestore Database* → záložka **Rules**.
2. Nahraď obsah celým souborem `firestore.rules` z repa a klikni **Publish**.
3. Otestuj v **Rules Playground** (tlačítko v téže záložce):
   - *get* na `/users/<tvoje-uid>/workouts/test`, Authenticated, provider Google, e-mail `tofBenka@gmail.com` → **Allow**
   - stejné s jiným e-mailem (např. `test@gmail.com`) → **Deny**
   - UID najdeš v *Authentication → Users*.
   - Pozor: Playground posílá `email_verified` jen když ho zaškrtneš. U Google přihlášení je vždy `true`.

Alternativa přes CLI: `firebase deploy --only firestore:rules` (v `firebase.json` už zůstala jen konfigurace Firestore).

Když budeš chtít přidat dalšího člověka, uprav e-mail na **dvou** místech: `firestore.rules` (funkce `allowed`) a `src/lib/access.js`.

---

## 3. Vercel: ověřit nasazení

Vercel se nasadí sám po pushi. Pak:

1. Otevři appku a přihlas se oběma účty (ty i Chiara). Oba musí projít; jakýkoli jiný Google účet uvidí hlášku „nemá do appky přístup“.
2. V DevTools → *Network* → hlavní dokument zkontroluj, že odpověď má hlavičky `X-Content-Type-Options`, `Strict-Transport-Security` a `Content-Security-Policy-Report-Only`.
3. **CSP je zatím jen v režimu Report-Only** (nic neblokuje, jen hlásí). Pár dní sleduj konzoli prohlížeče (hlavně přihlášení, obrázky cviků a App Check). Když tam nebudou žádná hlášení `Content-Security-Policy`, přejmenuj ve `vercel.json` klíč `Content-Security-Policy-Report-Only` na `Content-Security-Policy`.

### Přechod service workeru na telefonech

Nainstalovaná PWA běží ještě se starým service workerem, který o nové verzi neví. Na každém telefonu proto:

1. Otevři appku, počkej pár sekund a **úplně ji zavři** (vyswipuj z přepínače aplikací).
2. Otevři znovu. Poprvé může být potřeba zopakovat.

Od téhle verze už se další aktualizace ohlásí samy bannerem **„Je k dispozici nová verze · Obnovit“**.

Rozdělaný trénink ze staré verze se automaticky převede na účet, který se přihlásí jako první. Pokud máš zrovna něco rozcvičeného, radši to před aktualizací dokonči.

---

## 4. Omezení API klíče (Google Cloud Console)

1. [console.cloud.google.com](https://console.cloud.google.com) → projekt **fitnessapp-88bd2** → *APIs & Services → Credentials*.
2. Otevři klíč `Browser key (auto created by Firebase)` (začíná `AIzaSyB4q3...`).
3. **Application restrictions → Websites** a přidej:
   - `https://<tvoje-domena>.vercel.app/*` (přesnou doménu najdeš ve Vercelu)
   - `https://fitnessapp-88bd2.firebaseapp.com/*`
   - `http://localhost:5173/*` (pro vývoj)
4. **API restrictions → Restrict key** a zaškrtni:
   - Identity Toolkit API
   - Token Service API
   - Cloud Firestore API
   - Firebase Installations API
   - Firebase App Check API a reCAPTCHA Enterprise API (pro krok 5)
5. Ulož a do ~5 minut otestuj přihlášení i uložení tréninku. Když něco selže, konzole prohlížeče ukáže, které API chybí.

---

## 5. App Check (doporučené)

App Check zajistí, že Firestore přijímá požadavky jen z tvé appky.

1. Firebase Console → **App Check** → *Apps* → webová appka → **reCAPTCHA Enterprise**.
2. Vytvoř klíč (Firebase tě přesměruje do Google Cloud): typ *Website*, domény: tvoje Vercel doména a `localhost`. Zkopíruj **site key**.
3. V `src/lib/firebase.js` vlož klíč:
   ```js
   const APP_CHECK_SITE_KEY = '6Lc...tvůj-klíč';
   ```
   a pushni.
4. Pro lokální vývoj: po `npm run dev` se v konzoli vypíše *App Check debug token*. Přidej ho v App Check → *Apps* → ⋮ → **Manage debug tokens**.
5. **Nezapínej hned vynucení.** 2–3 dny sleduj v App Check → *APIs → Cloud Firestore* metriku *Verified requests*. Až bude skoro 100 %, klikni **Enforce**.

Pořadí je nutné dodržet: když zapneš Enforce dřív, než je nasazený kód s klíčem, appka přestane načítat data.

---

## 6. Firebase Authentication – nastavení

Firebase Console → *Authentication → Settings*:

- **Authorized domains:** nech jen `localhost`, `fitnessapp-88bd2.firebaseapp.com` a svoji Vercel doménu. Smaž zbytky jako `*.github.io` nebo staré preview domény.
- **User actions → Email enumeration protection:** zapnout.
- V *Users* můžeš smazat účty, které tam nemají co dělat (nepovolený účet se sice okamžitě odhlásí, ale v seznamu po něm zůstane záznam).

---

## 7. Rychlý test na telefonu (checklist)

- [ ] Přihlášení z plochy (standalone PWA) funguje u obou účtů
- [ ] Série: psaní čísel, −/+, odškrtnutí spustí pauzu (Nastavení → *Pauza mezi sériemi*)
- [ ] Potažení série doleva ji smaže, „Zpět“ v toastu ji vrátí
- [ ] „Dokončit“ s vyplněnými, ale neodškrtnutými sériemi se zeptá, co s nimi
- [ ] Režim letadlo → zapsat a dokončit trénink → nahoře „Offline – uloženo v zařízení“ → vypnout režim letadlo → hláška zmizí a trénink je vidět i na druhém zařízení
- [ ] Smazání tréninku v Historii přepočítá rekord (Statistiky → Osobní rekordy)
- [ ] Nastavení → Vzhled → Tmavý

---

## Poznámky

- **Starý chybný rekord** (např. překlep 1000 kg) opravíš takto: smaž trénink, ze kterého pochází; rekord se přepočítá z ostatních tréninků. Pokud je ten trénink starší než posledních 1000, smaž dokument v Firestore → `users/<uid>/prs/<cvik>`.
- **Testy rules v emulátoru** (volitelné, vyžaduje Javu): `npm i -D @firebase/rules-unit-testing` + `firebase emulators:exec`. V CI zatím nejsou.
- Jednotky jsou pořád jen kg. Přepínač lb by byl samostatná úprava.

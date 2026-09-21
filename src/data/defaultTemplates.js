// Předdefinované šablony podle Workout_Split.docx.
// sets   = počet sérií      reps   = cílová opakování (první číslo se předvyplní, když chybí historie)
// weight = výchozí váha v kg (předvyplní se, jen dokud cvičení nemá historii; '' = vlastní váha)
// hint   = doporučená váha z plánu (zobrazí se u cvičení)
// plan   = volitelně váha/opakování pro každou sérii zvlášť (pyramida, vypalovačka)
const ex = (name, sets, reps = '', o = {}) => ({ name, sets, reps, weight: '', hint: '', note: '', ...o });

export const GROUPS = {
  PUSH: { label: 'PUSH', sub: 'Prsa, ramena, triceps' },
  PULL: { label: 'PULL', sub: 'Záda, zadní delty, biceps' },
  LEGS: { label: 'LEGS', sub: 'Nohy, hýždě, břicho' },
};
export const GROUP_ORDER = ['PUSH', 'PULL', 'LEGS'];

const t = (group, variant, exercises) => ({
  id: `${group.toLowerCase()}-${variant.toLowerCase()}`,
  name: `${group} ${variant}`,
  group, variant, builtin: true, exercises,
});

export const DEFAULT_TEMPLATES = [
  t('PUSH', 'Normal', [
    ex('Bench Press (Barbell)', 4, '6-8', { weight: 80, hint: '80 kg', note: 'Rozcvička 20–60 kg' }),
    ex('Incline DB Bench Press', 3, '8-10', { weight: 25, hint: '25–30 kg jednoručky' }),
    ex('Chest Fly', 3, '10-12', { weight: 15, hint: '15–20 kg' }),
    ex('Shoulder Press (Machine)', 3, '8-10', { weight: 20, hint: '20–25 kg' }),
    ex('Triceps Extension – Kladka', 3, '10-12', { weight: 15, hint: '15 kg' }),
  ]),
  t('PUSH', 'Hardcore', [
    ex('Bench Press (Barbell)', 5, 'pyramida', {
      note: 'Pyramida, poslední série do totálního selhání',
      plan: [{ w: 60, r: 10 }, { w: 70, r: 8 }, { w: 80, r: 6 }, { w: 85, r: 4 }, { w: 60, r: 'max' }],
    }),
    ex('Incline DB Bench Press', 4, '8', { weight: 30, hint: '30 kg', note: 'Poslední série dvojitý drop-set' }),
    ex('Dips (Bradla)', 3, 'max', { note: 'Do selhání, vlastní váha / lehký kotouč' }),
    ex('Military Press', 4, '6', { weight: 40, hint: '40–50 kg', note: 'Těžce' }),
    ex('Triceps Extension – Kladka', 3, 'max', { weight: 17.5, hint: '17,5 kg', note: 'Superserie s Overhead, do vyčerpání' }),
    ex('Overhead Triceps Extension – Kladka', 3, 'max', { weight: 12.5, hint: '12,5 kg', note: 'Superserie, bez pauzy' }),
  ]),
  t('PULL', 'Normal', [
    ex('Pulldown (Tyč/Kladka)', 4, '8-10', { weight: 50, hint: '50–60 kg' }),
    ex('Seated Row (Machine)', 4, '8-10', { weight: 50, hint: '50–55 kg' }),
    ex('Pullup (Shyby)', 3, '5-8', { note: 'Vlastní váha' }),
    ex('Bent-Over Cable Fly (Zadní ramena)', 3, '12', { weight: 7.5, hint: '7,5–10 kg' }),
    ex('Bicep Curl (DB)', 3, '10', { weight: 10, hint: '10–12 kg jednoručky' }),
  ]),
  t('PULL', 'Hardcore', [
    ex('Deadlift (Mrtvý tah)', 4, '5', { weight: 90, hint: '90–100 kg', note: 'Těžké pracovní série' }),
    ex('Pullup se zátěží', 4, 'max', { note: 'Bez zátěže = pomalé spouštění' }),
    ex('One-Arm Lat Pulldown', 4, '8-10', { note: 'Důraz na protažení' }),
    ex('Barbell Row', 4, '6-8', { weight: 45, hint: '45–50 kg' }),
    ex('Biceps Curl (EZ)', 3, 'max', { note: 'Superserie s Hammer Curl, do selhání' }),
    ex('Hammer Curl (DB)', 3, 'max', { note: 'Superserie, okamžitě po EZ' }),
  ]),
  t('LEGS', 'Normal', [
    ex('Squat (Dřepy)', 4, '6-8', { weight: 70, hint: '70–80 kg', note: 'Rozcvička ~50 kg' }),
    ex('Leg Extension (Předkopávání)', 3, '10-12', { weight: 35, hint: '35–40 kg' }),
    ex('Leg Curl (Zakopávání)', 3, '10-12', { weight: 20, hint: '20 kg' }),
    ex('Bulgarian Split Squats', 3, '10', { weight: 12, hint: '12–16 kg jednoručky', note: 'Na nohu' }),
    ex('Random ABS (Břicho)', 3, '', { note: '3–4 série dle výběru' }),
  ]),
  t('LEGS', 'Hardcore', [
    ex('Squat (Dřepy)', 5, '', {
      note: 'Pracovní série 80–85 kg + vypalovačka',
      plan: [{ w: 80, r: 6 }, { w: 82.5, r: 6 }, { w: 85, r: 5 }, { w: 85, r: 5 }, { w: 50, r: 15 }],
    }),
    ex('Leg Press', 4, '', { note: 'Těžké série, drop-set na konci každé' }),
    ex('Bulgarian Split Squats', 3, 'max', { weight: 20, hint: '20 kg jednoručky', note: 'Do hlubokého selhání' }),
    ex('Leg Extension (Předkopávání)', 4, '12', { note: 'Superserie s Leg Curl, bez pauzy' }),
    ex('Leg Curl (Zakopávání)', 4, '12', { note: 'Superserie, bez pauzy' }),
    ex('Pistol Squats / Výpady', 3, 'max', { note: 'Na závěr, do vyčerpání' }),
  ]),
];

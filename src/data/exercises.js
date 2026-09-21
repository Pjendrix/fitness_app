// Default exercise library. `cat` = muscle group key (translated via i18n `cat.*`).
import { exKey } from '../lib/util.js';

export const CATEGORIES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'glutes', 'abs'];

const L = (cat, names) => names.map((name) => ({ name, cat }));

export const EXERCISES = [
  ...L('chest', [
    'Bench Press (Barbell)', 'Incline Bench Press (Barbell)', 'Decline Bench Press', 'Dumbbell Bench Press', 'Incline Dumbbell Bench Press',
    'Chest Fly', 'Cable Crossover', 'Pec Deck (Machine)', 'Chest Press (Machine)', 'Dips', 'Push-up',
  ]),
  ...L('back', [
    'Deadlift', 'Lat Pulldown', 'One-Arm Lat Pulldown', 'Pull-up', 'Weighted Pull-up', 'Chin-up',
    'Seated Row (Machine)', 'Seated Cable Row', 'Barbell Row', 'One-Arm Dumbbell Row', 'T-Bar Row', 'Straight-Arm Pulldown', 'Back Extension',
  ]),
  ...L('shoulders', [
    'Military Press', 'Shoulder Press (Machine)', 'Dumbbell Shoulder Press', 'Arnold Press', 'Lateral Raise (Dumbbell)', 'Cable Lateral Raise',
    'Front Raise', 'Bent-Over Cable Fly (Rear Delts)', 'Reverse Pec Deck', 'Face Pull', 'Shrugs',
  ]),
  ...L('biceps', ['Bicep Curl (Dumbbell)', 'Bicep Curl (EZ Bar)', 'Barbell Curl', 'Hammer Curl', 'Preacher Curl', 'Cable Curl', 'Incline Dumbbell Curl', 'Concentration Curl']),
  ...L('triceps', [
    'Triceps Pushdown (Cable)', 'Overhead Triceps Extension (Cable)', 'Skull Crusher (EZ Bar)', 'Close-Grip Bench Press',
    'Dumbbell Overhead Extension', 'Triceps Kickback', 'Bench Dips',
  ]),
  ...L('legs', [
    'Squat', 'Front Squat', 'Leg Press', 'Hack Squat', 'Leg Extension', 'Leg Curl',
    'Bulgarian Split Squat', 'Lunges', 'Pistol Squat', 'Romanian Deadlift', 'Goblet Squat', 'Calf Raise',
  ]),
  ...L('glutes', ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Hip Abduction (Machine)', 'Step-up']),
  ...L('abs', ['Abs Circuit', 'Crunch', 'Cable Crunch', 'Hanging Leg Raise', 'Plank', 'Russian Twist', 'Ab Wheel', 'Lying Leg Raise']),
];

// Old (Czech-era) names → new English names, so existing history and PBs keep linking.
const LEGACY = {
  'DB Bench Press': 'Dumbbell Bench Press', 'Incline DB Bench Press': 'Incline Dumbbell Bench Press', 'Dips (Bradla)': 'Dips',
  'Push-up (Kliky)': 'Push-up', 'Deadlift (Mrtvý tah)': 'Deadlift', 'Pulldown (Tyč/Kladka)': 'Lat Pulldown', 'Pullup (Shyby)': 'Pull-up',
  'Pullup se zátěží': 'Weighted Pull-up', 'DB Row (Jednoruč)': 'One-Arm Dumbbell Row', 'Hyperextenze': 'Back Extension',
  'DB Shoulder Press': 'Dumbbell Shoulder Press', 'Lateral Raise (DB)': 'Lateral Raise (Dumbbell)', 'Bent-Over Cable Fly (Zadní ramena)': 'Bent-Over Cable Fly (Rear Delts)',
  'Shrugs (Krčení)': 'Shrugs', 'Bicep Curl (DB)': 'Bicep Curl (Dumbbell)', 'Biceps Curl (EZ)': 'Bicep Curl (EZ Bar)', 'Hammer Curl (DB)': 'Hammer Curl',
  'Triceps Extension – Kladka': 'Triceps Pushdown (Cable)', 'Overhead Triceps Extension – Kladka': 'Overhead Triceps Extension (Cable)',
  'Skull Crusher (EZ)': 'Skull Crusher (EZ Bar)', 'DB Overhead Extension': 'Dumbbell Overhead Extension', 'Squat (Dřepy)': 'Squat',
  'Leg Extension (Předkopávání)': 'Leg Extension', 'Leg Curl (Zakopávání)': 'Leg Curl', 'Bulgarian Split Squats': 'Bulgarian Split Squat',
  'Výpady (Lunges)': 'Lunges', 'Pistol Squats / Výpady': 'Pistol Squat', 'Calf Raise (Lýtka)': 'Calf Raise', 'Abduktory (Machine)': 'Hip Abduction (Machine)',
  'Random ABS (Břicho)': 'Abs Circuit', 'Biceps Curl (EZ)': 'Bicep Curl (EZ Bar)',
};
const LEGACY_BY_KEY = Object.fromEntries(Object.entries(LEGACY).map(([o, n]) => [exKey(o), n]));
export const modernName = (name) => LEGACY_BY_KEY[exKey(name)] || name;

const LEGACY_CATS = { prsa: 'chest', zada: 'back', ramena: 'shoulders', biceps: 'biceps', triceps: 'triceps', nohy: 'legs', hyzde: 'glutes', bricho: 'abs' };
// Accepts key, English label or Czech label (for CSV import / old data).
export const normCat = (c) => {
  const k = String(c || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
  if (CATEGORIES.includes(k)) return k;
  if (LEGACY_CATS[k]) return LEGACY_CATS[k];
  if (k === 'shoulder') return 'shoulders';
  if (k === 'leg') return 'legs';
  return 'other';
};

// Knihovna cvičení. `cat` = svalová partie (pro výběr i statistiky).
import { exKey } from '../lib/util.js';

export const CATEGORIES = ['Prsa', 'Záda', 'Ramena', 'Biceps', 'Triceps', 'Nohy', 'Hýždě', 'Břicho'];

const L = (cat, names) => names.map((name) => ({ name, cat }));

export const EXERCISES = [
  ...L('Prsa', [
    'Bench Press (Barbell)', 'Incline Bench Press (Barbell)', 'Decline Bench Press', 'DB Bench Press', 'Incline DB Bench Press',
    'Chest Fly', 'Cable Crossover', 'Pec Deck (Machine)', 'Chest Press (Machine)', 'Dips (Bradla)', 'Push-up (Kliky)',
  ]),
  ...L('Záda', [
    'Deadlift (Mrtvý tah)', 'Pulldown (Tyč/Kladka)', 'One-Arm Lat Pulldown', 'Pullup (Shyby)', 'Pullup se zátěží', 'Chin-up',
    'Seated Row (Machine)', 'Seated Cable Row', 'Barbell Row', 'DB Row (Jednoruč)', 'T-Bar Row', 'Straight-Arm Pulldown', 'Hyperextenze',
  ]),
  ...L('Ramena', [
    'Military Press', 'Shoulder Press (Machine)', 'DB Shoulder Press', 'Arnold Press', 'Lateral Raise (DB)', 'Cable Lateral Raise',
    'Front Raise', 'Bent-Over Cable Fly (Zadní ramena)', 'Reverse Pec Deck', 'Face Pull', 'Shrugs (Krčení)',
  ]),
  ...L('Biceps', ['Bicep Curl (DB)', 'Biceps Curl (EZ)', 'Barbell Curl', 'Hammer Curl (DB)', 'Preacher Curl', 'Cable Curl', 'Incline DB Curl', 'Concentration Curl']),
  ...L('Triceps', [
    'Triceps Extension – Kladka', 'Overhead Triceps Extension – Kladka', 'Skull Crusher (EZ)', 'Close-Grip Bench Press',
    'DB Overhead Extension', 'Triceps Kickback', 'Bench Dips',
  ]),
  ...L('Nohy', [
    'Squat (Dřepy)', 'Front Squat', 'Leg Press', 'Hack Squat', 'Leg Extension (Předkopávání)', 'Leg Curl (Zakopávání)',
    'Bulgarian Split Squats', 'Výpady (Lunges)', 'Pistol Squats / Výpady', 'Romanian Deadlift', 'Goblet Squat', 'Calf Raise (Lýtka)',
  ]),
  ...L('Hýždě', ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Abduktory (Machine)', 'Step-up']),
  ...L('Břicho', ['Random ABS (Břicho)', 'Crunch', 'Cable Crunch', 'Hanging Leg Raise', 'Plank', 'Russian Twist', 'Ab Wheel', 'Leg Raise']),
];

const BY_KEY = Object.fromEntries(EXERCISES.map((e) => [exKey(e.name), e]));
export const categoryOf = (name) => BY_KEY[exKey(name)]?.cat || null;

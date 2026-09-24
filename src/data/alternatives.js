// Replacement suggestions for the active workout ("station is busy").
// Groups = same movement pattern, ordered from closest substitute. An exercise may sit in several groups.
import { exKey } from '../lib/util.js';

const GROUPS = [
  // Chest
  ['Bench Press (Barbell)', 'Dumbbell Bench Press', 'Chest Press (Machine)', 'Decline Bench Press', 'Push-up', 'Dips'],
  ['Incline Bench Press (Barbell)', 'Incline Dumbbell Bench Press', 'Chest Press (Machine)', 'Dumbbell Bench Press'],
  ['Chest Fly', 'Pec Deck (Machine)', 'Cable Crossover'],
  // Back
  ['Lat Pulldown', 'Pull-up', 'Assisted Pull-up', 'One-Arm Lat Pulldown', 'Chin-up', 'Weighted Pull-up', 'Straight-Arm Pulldown'],
  ['Pull-up', 'Weighted Pull-up', 'Chin-up', 'Assisted Pull-up', 'Lat Pulldown'],
  ['Seated Cable Row', 'Seated Row (Machine)', 'One-Arm Dumbbell Row', 'Barbell Row', 'T-Bar Row'],
  ['Barbell Row', 'T-Bar Row', 'One-Arm Dumbbell Row', 'Seated Row (Machine)', 'Seated Cable Row'],
  ['Deadlift', 'Romanian Deadlift', 'Cable RDL', 'Back Extension', 'Hip Thrust'],
  // Shoulders
  ['Military Press', 'Dumbbell Shoulder Press', 'Shoulder Press (Machine)', 'Arnold Press'],
  ['Lateral Raise (Dumbbell)', 'Cable Lateral Raise', 'Front Raise'],
  ['Face Pull', 'Reverse Pec Deck', 'Bent-Over Cable Fly (Rear Delts)'],
  // Arms
  ['Bicep Curl (Dumbbell)', 'Bicep Curl (EZ Bar)', 'Barbell Curl', 'Cable Curl', 'Hammer Curl', 'Incline Dumbbell Curl', 'Preacher Curl', 'Concentration Curl'],
  ['Triceps Pushdown (Cable)', 'Triceps Kickback', 'Bench Dips', 'Dips', 'Close-Grip Bench Press'],
  ['Overhead Triceps Extension (Cable)', 'Dumbbell Overhead Extension', 'Skull Crusher (EZ Bar)'],
  // Legs & glutes
  ['Squat', 'Hack Squat', 'Leg Press', 'Front Squat', 'Goblet Squat'],
  ['Bulgarian Split Squat', 'Lunges', 'Elevated Lunges', 'Step-up', 'Pistol Squat'],
  ['Leg Curl', 'Romanian Deadlift', 'Cable RDL'],
  ['Leg Extension', 'Hack Squat', 'Leg Press', 'Bulgarian Split Squat'],
  ['Hip Thrust', 'Glute Bridge', 'Cable Kickback', 'Hip Abduction (Machine)'],
  // Core
  ['Crunch', 'Cable Crunch', 'Weighted Crunch', 'Weighted Sit-up', 'Abs Circuit'],
  ['Hanging Leg Raise', 'Lying Leg Raise', 'Ab Wheel'],
  ['Plank', 'Side Plank', 'Ab Wheel', 'Russian Twist'],
  // Cardio
  ['Stairmaster', 'Treadmill', 'Cross Trainer', 'Stationary Bike', 'Rowing Machine', 'Jump Rope'],
];

const BY_KEY = new Map();
for (const g of GROUPS) {
  for (const name of g) {
    const k = exKey(name);
    const list = BY_KEY.get(k) || [];
    for (const other of g) if (other !== name && !list.includes(other)) list.push(other);
    BY_KEY.set(k, list);
  }
}

// → { similar, sameCat } – library entries only (respects what the user removed), minus `exclude` keys.
export function alternativesFor(name, { library, catOf, prs = {}, exclude = [] }) {
  const lib = new Map(library.map((e) => [exKey(e.name), e]));
  const skip = new Set([exKey(name), ...exclude]);
  const similar = [];
  for (const n of BY_KEY.get(exKey(name)) || []) {
    const k = exKey(n);
    if (!skip.has(k) && lib.has(k)) { similar.push(lib.get(k)); skip.add(k); }
  }
  const cat = catOf(name);
  const sameCat = !cat || cat === 'other' ? [] : library
    .filter((e) => e.cat === cat && !skip.has(exKey(e.name)))
    // Cviky, které už někdy dělal (mají PB → předvyplní se váhy), nahoru
    .sort((a, b) => Number(Boolean(prs[exKey(b.name)])) - Number(Boolean(prs[exKey(a.name)])) || a.name.localeCompare(b.name))
    .slice(0, 8);
  return { similar: similar.slice(0, 8), sameCat };
}

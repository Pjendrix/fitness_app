// Default templates per training profile (Kryštof from Workout_Split.docx, Chiara from her logs).
// sets   = number of sets      reps  = target reps (number or 'max'; prefilled when there is no history)
// weight = default kg (prefilled only until the exercise has history; '' = bodyweight)
// hint   = suggested weight shown on the exercise
// plan   = optional weight/reps per set (pyramid, ascending); time exercises use {w, t: minutes}
// type   = 'time' for timed exercises (plank, cardio)
const ex = (name, sets, reps = '', o = {}) => ({ name, sets, reps, weight: '', hint: '', note: '', ...o });

// Plan helper: ascending sets, e.g. up([30, 35, 40, 45], 10) → 30×10, 35×10, 40×10, 45×10
const up = (weights, reps) => weights.map((w, i) => ({ w, r: Array.isArray(reps) ? reps[i] : reps }));

const t = (group, variant, exercises, name) => ({
  id: `${group.toLowerCase()}-${variant.toLowerCase()}`,
  name: name || `${group} ${variant}`,
  group, variant, builtin: true, exercises,
});

// ——— Kryštof: PUSH / PULL / LEGS, Normal + Hardcore ———
const KRYSTOF = [
  t('PUSH', 'Normal', [
    ex('Bench Press (Barbell)', 4, '6', { weight: 80, hint: '80 kg', note: 'Warm-up 20–60 kg' }),
    ex('Incline Dumbbell Bench Press', 3, '8', { weight: 25, hint: '25–30 kg dumbbells' }),
    ex('Chest Fly', 3, '10', { weight: 15, hint: '15–20 kg' }),
    ex('Shoulder Press (Machine)', 3, '8', { weight: 20, hint: '20–25 kg' }),
    ex('Triceps Pushdown (Cable)', 3, '10', { weight: 15, hint: '15 kg' }),
  ]),
  t('PUSH', 'Hardcore', [
    ex('Bench Press (Barbell)', 5, 'pyramid', {
      note: 'Pyramid, last set to total failure',
      plan: [{ w: 60, r: 10 }, { w: 70, r: 8 }, { w: 80, r: 6 }, { w: 85, r: 4 }, { w: 60, r: 'max' }],
    }),
    ex('Incline Dumbbell Bench Press', 4, '8', { weight: 30, hint: '30 kg', note: 'Double drop set on the last set' }),
    ex('Dips', 3, 'max', { note: 'To failure, bodyweight / light plate' }),
    ex('Military Press', 4, '6', { weight: 40, hint: '40–50 kg', note: 'Heavy' }),
    ex('Triceps Pushdown (Cable)', 3, 'max', { weight: 17.5, hint: '17.5 kg', note: 'Superset with overhead extension, to exhaustion' }),
    ex('Overhead Triceps Extension (Cable)', 3, 'max', { weight: 12.5, hint: '12.5 kg', note: 'Superset, no rest' }),
  ]),
  t('PULL', 'Normal', [
    ex('Lat Pulldown', 4, '8', { weight: 50, hint: '50–60 kg' }),
    ex('Seated Row (Machine)', 4, '8', { weight: 50, hint: '50–55 kg' }),
    ex('Pull-up', 3, '5', { note: 'Bodyweight' }),
    ex('Bent-Over Cable Fly (Rear Delts)', 3, '12', { weight: 7.5, hint: '7.5–10 kg' }),
    ex('Bicep Curl (Dumbbell)', 3, '10', { weight: 10, hint: '10–12 kg dumbbells' }),
  ]),
  t('PULL', 'Hardcore', [
    ex('Deadlift', 4, '5', { weight: 90, hint: '90–100 kg', note: 'Heavy working sets' }),
    ex('Weighted Pull-up', 4, 'max', { note: 'No weight = slow negatives' }),
    ex('One-Arm Lat Pulldown', 4, '8', { note: 'Focus on the stretch' }),
    ex('Barbell Row', 4, '6', { weight: 45, hint: '45–50 kg' }),
    ex('Bicep Curl (EZ Bar)', 3, 'max', { note: 'Superset with hammer curl, to failure' }),
    ex('Hammer Curl', 3, 'max', { note: 'Superset, right after the EZ curl' }),
  ]),
  t('LEGS', 'Normal', [
    ex('Squat', 4, '6', { weight: 70, hint: '70–80 kg', note: 'Warm-up ~50 kg' }),
    ex('Leg Extension', 3, '10', { weight: 35, hint: '35–40 kg' }),
    ex('Leg Curl', 3, '10', { weight: 20, hint: '20 kg' }),
    ex('Bulgarian Split Squat', 3, '10', { weight: 12, hint: '12–16 kg dumbbells', note: 'Per leg' }),
    ex('Abs Circuit', 3, '', { note: '3–4 sets of your choice' }),
  ]),
  t('LEGS', 'Hardcore', [
    ex('Squat', 5, '', {
      note: 'Working sets 80–85 kg + burnout',
      plan: [{ w: 80, r: 6 }, { w: 82.5, r: 6 }, { w: 85, r: 5 }, { w: 85, r: 5 }, { w: 50, r: 15 }],
    }),
    ex('Leg Press', 4, '', { note: 'Heavy sets, drop set at the end of each' }),
    ex('Bulgarian Split Squat', 3, 'max', { weight: 20, hint: '20 kg dumbbells', note: 'To deep failure' }),
    ex('Leg Extension', 4, '12', { note: 'Superset with leg curl, no rest' }),
    ex('Leg Curl', 4, '12', { note: 'Superset, no rest' }),
    ex('Pistol Squat', 3, 'max', { note: 'Finisher, to exhaustion' }),
  ]),
];

// ——— Chiara: Upper A/B, Lower A/B, Abs & Cardio (from her logs; ascending weights) ———
const c = (group, variant, exercises, name) => ({ ...t(group, variant, exercises, name), id: `c-${group.toLowerCase()}-${variant.toLowerCase()}` });
const CHIARA = [
  c('UPPER', 'A', [
    ex('Lat Pulldown', 4, '10', { note: 'Warm-up first · bar or handles', plan: up([30, 35, 40, 45], 10) }),
    ex('Seated Row (Machine)', 3, '10', { plan: up([25, 30, 35], 10) }),
    ex('Dumbbell Shoulder Press', 3, '8', { plan: up([6, 8, 10], [10, 10, 5]) }),
    ex('Lateral Raise (Dumbbell)', 2, '15', { weight: 3, hint: '3 kg' }),
    ex('Push-up', 2, 'max'),
  ], 'Upper A'),
  c('UPPER', 'B', [
    ex('Assisted Pull-up', 3, 'max', { note: 'Warm-up first · cable assisted' }),
    ex('Lat Pulldown', 3, '10', { note: 'Grip handle', plan: up([25, 25, 30], 10) }),
    ex('Seated Cable Row', 4, '10', { plan: up([25, 25, 30, 35], [10, 10, 8, 8]) }),
    ex('Dumbbell Shoulder Press', 3, '8', { plan: up([6, 6, 8], [8, 8, 6]) }),
    ex('Lateral Raise (Dumbbell)', 2, '15', { weight: 3, hint: '3 kg' }),
  ], 'Upper B'),
  c('LOWER', 'A', [
    ex('Hip Thrust', 4, '8', { note: 'Warm-up first (airplanes)', plan: up([20, 20, 25, 30], [10, 10, 7, 5]) }),
    ex('Cable RDL', 4, '10', { plan: up([35, 50, 55, 60], 10) }),
    ex('Leg Extension', 3, '10', { plan: up([20, 25, 30], 10) }),
    ex('Elevated Lunges', 3, '10', { plan: up([15, 20, 25], 10) }),
    ex('Hip Abduction (Machine)', 3, '10', { plan: up([35, 40, 45], [10, 10, 8]) }),
  ], 'Lower A'),
  c('LOWER', 'B', [
    ex('Cable RDL', 4, '10', { note: 'Warm-up first', plan: up([30, 40, 50, 55], 10) }),
    ex('Leg Press', 4, '10', { plan: up([61, 77, 82, 93], [10, 10, 10, 8]) }),
    ex('Leg Extension', 3, '10', { plan: up([20, 25, 30], [10, 10, 8]) }),
  ], 'Lower B'),
  c('ABS', 'Core', [
    ex('Weighted Crunch', 3, '15', { weight: 4, hint: '4 kg' }),
    ex('Weighted Sit-up', 3, '10', { weight: 4, hint: '4 kg' }),
    ex('Plank', 3, '', { type: 'time', plan: [{ w: 0, t: 1 }, { w: 5, t: 1 }, { w: 5, t: 1 }] }),
    ex('Side Plank', 3, '10', { note: 'Gluteus medius' }),
    ex('Stairmaster', 1, '', { type: 'time', note: 'Intervals: 3 min easy / 5 min harder', plan: [{ w: 0, t: 20 }] }),
  ], 'Abs & Cardio'),
];

// Training profiles: which built-in templates, groups (quick start) and variants.
export const PROFILES = {
  krystof: { id: 'krystof', name: 'Kryštof', groups: ['PUSH', 'PULL', 'LEGS'], variants: { PUSH: ['Normal', 'Hardcore'], PULL: ['Normal', 'Hardcore'], LEGS: ['Normal', 'Hardcore'] }, templates: KRYSTOF },
  chiara: { id: 'chiara', name: 'Chiara', groups: ['UPPER', 'LOWER', 'ABS'], variants: { UPPER: ['A', 'B'], LOWER: ['A', 'B'], ABS: ['Core'] }, templates: CHIARA },
};
export const profileOf = (id) => PROFILES[id] || PROFILES.krystof;
export const ALL_BUILTIN = [...KRYSTOF, ...CHIARA];

// Matte template colours (tint applied at low opacity).
export const TEMPLATE_COLORS = [
  { id: 'royal', hex: '#2d3e78' }, { id: 'marine', hex: '#7196cc' }, { id: 'navy', hex: '#3b405c' },
  { id: 'purple', hex: '#56487b' }, { id: 'burgundy', hex: '#784853' }, { id: 'red', hex: '#a55758' },
  { id: 'pink', hex: '#d56e82' }, { id: 'orange', hex: '#cc765b' }, { id: 'yellow', hex: '#e6c85a' },
  { id: 'tan', hex: '#b09e87' }, { id: 'lime', hex: '#5aa15a' }, { id: 'green', hex: '#264c4b' }, { id: 'grey', hex: '#939396' },
];
export const colorHex = (id) => TEMPLATE_COLORS.find((c) => c.id === id)?.hex || null;

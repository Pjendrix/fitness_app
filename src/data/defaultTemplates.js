// Default templates (from Workout_Split.docx).
// sets   = number of sets      reps  = target reps (number or 'max'; prefilled when there is no history)
// weight = default kg (prefilled only until the exercise has history; '' = bodyweight)
// hint   = suggested weight shown on the exercise
// plan   = optional weight/reps per set (pyramid, burnout)
const ex = (name, sets, reps = '', o = {}) => ({ name, sets, reps, weight: '', hint: '', note: '', ...o });

export const GROUP_ORDER = ['PUSH', 'PULL', 'LEGS'];

const t = (group, variant, exercises) => ({
  id: `${group.toLowerCase()}-${variant.toLowerCase()}`,
  name: `${group} ${variant}`,
  group, variant, builtin: true, exercises,
});

export const DEFAULT_TEMPLATES = [
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

// Matte template colours (tint applied at low opacity).
export const TEMPLATE_COLORS = [
  { id: 'royal', hex: '#2d3e78' }, { id: 'marine', hex: '#7196cc' }, { id: 'navy', hex: '#3b405c' },
  { id: 'purple', hex: '#56487b' }, { id: 'burgundy', hex: '#784853' }, { id: 'red', hex: '#a55758' },
  { id: 'pink', hex: '#d56e82' }, { id: 'orange', hex: '#cc765b' }, { id: 'yellow', hex: '#e6c85a' },
  { id: 'tan', hex: '#b09e87' }, { id: 'lime', hex: '#5aa15a' }, { id: 'green', hex: '#264c4b' }, { id: 'grey', hex: '#939396' },
];
export const colorHex = (id) => TEMPLATE_COLORS.find((c) => c.id === id)?.hex || null;

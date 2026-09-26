// Full free-exercise-db (github.com/yuhonas/free-exercise-db, public domain), loaded on demand.
// A9: připnuto na konkrétní commit – přejmenování souborů v cizím repu appku nerozbije (novější data = nový SHA).
const URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/dist/exercises.json';
export const DB_IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/a859101d633a01c4a1a920d6a8ce41dabba0705f/exercises/';
let cache = null;
export const loadDb = () => (cache ||= fetch(URL).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).catch((e) => { cache = null; throw e; }));

const MUSCLE_CAT = {
  chest: 'chest', lats: 'back', 'middle back': 'back', 'lower back': 'back', traps: 'back', shoulders: 'shoulders',
  biceps: 'biceps', triceps: 'triceps', forearms: 'biceps', quadriceps: 'legs', hamstrings: 'legs', calves: 'legs',
  adductors: 'legs', glutes: 'glutes', abductors: 'glutes', abdominals: 'abs',
};
// DB entry → library entry {name, cat, type?, db}
export const fromDb = (x) => {
  const cat = x.category === 'cardio' ? 'cardio' : MUSCLE_CAT[x.primaryMuscles?.[0]] || 'other';
  return { name: x.name, cat, ...(x.category === 'cardio' ? { type: 'time' } : {}), db: x.id };
};

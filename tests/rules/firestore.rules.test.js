// Testy firestore.rules v emulátoru: npm run test:rules (potřebuje Javu 21+). V CI běží samostatný job.
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

const ADMIN = { uid: 'admin', email: 'tofbenka@gmail.com' };
const FRIEND = { uid: 'friend', email: 'friend@gmail.com' };
const STRANGER = { uid: 'stranger', email: 'stranger@gmail.com' };

let env;
const db = (u, verified = true) => env.authenticatedContext(u.uid, { email: u.email, email_verified: verified }).firestore();
const now = () => Date.now();
const workout = (over = {}) => ({
  id: 'w1', name: 'PUSH Normal', startedAt: now() - 3600000, finishedAt: now(),
  exercises: [{ key: 'bench', name: 'Bench', sets: [{ weight: 80, reps: 5 }] }], ...over,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-forge', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  // Přátelský účet přidaný adminem
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'access', FRIEND.email), { email: FRIEND.email, name: '', addedAt: 1 }));
});

describe('log chyb', () => {
  const entry = (uid, over = {}) => ({ uid, msg: 'TypeError: x is undefined', where: 'boundary', ver: '5.10', at: Date.now(), ...over });
  it('povolený účet zapíše jen svou chybu, číst smí jen admin', async () => {
    await assertSucceeds(setDoc(doc(db(FRIEND), 'errors/e1'), entry('friend')));
    await assertFails(setDoc(doc(db(FRIEND), 'errors/e2'), entry('admin')));
    await assertFails(setDoc(doc(db(STRANGER), 'errors/e3'), entry('stranger')));
    await assertFails(setDoc(doc(db(FRIEND), 'errors/e4'), entry('friend', { msg: 'x'.repeat(501) })));
    await assertFails(getDoc(doc(db(FRIEND), 'errors/e1')));
    await assertSucceeds(getDoc(doc(db(ADMIN), 'errors/e1')));
  });
});

describe('přístup', () => {
  it('admin i přidaný účet smí do svých dat, cizí účet ne', async () => {
    await assertSucceeds(setDoc(doc(db(ADMIN), 'users/admin/workouts/w1'), workout()));
    await assertSucceeds(setDoc(doc(db(FRIEND), 'users/friend/workouts/w1'), workout()));
    await assertFails(setDoc(doc(db(STRANGER), 'users/stranger/workouts/w1'), workout()));
    await assertFails(getDoc(doc(db(STRANGER), 'users/stranger/workouts/w1')));
  });
  it('neověřený e-mail neprojde', async () => {
    await assertFails(getDoc(doc(db(ADMIN, false), 'users/admin/workouts/w1')));
  });
  it('nikdo nečte cizí data (ani admin)', async () => {
    await assertFails(getDoc(doc(db(FRIEND), 'users/admin/workouts/w1')));
    await assertFails(getDoc(doc(db(ADMIN), 'users/friend/workouts/w1')));
  });
  it('seznam přístupů spravuje jen admin; vlastní záznam jde přečíst i smazat', async () => {
    await assertSucceeds(setDoc(doc(db(ADMIN), 'access', 'new@gmail.com'), { email: 'new@gmail.com', name: '', addedAt: 1 }));
    await assertFails(setDoc(doc(db(FRIEND), 'access', STRANGER.email), { email: STRANGER.email, name: '', addedAt: 1 }));
    await assertSucceeds(getDoc(doc(db(FRIEND), 'access', FRIEND.email)));
    await assertFails(getDoc(doc(db(FRIEND), 'access', 'new@gmail.com')));
    await assertSucceeds(deleteDoc(doc(db(FRIEND), 'access', FRIEND.email)));
  });
});

describe('validace', () => {
  it('trénink: tvar, limity a čas', async () => {
    const d = db(FRIEND);
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ id: 'jine' })));
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ exercises: [] })));
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ exercises: ['text'] })));
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ hack: true })));
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ finishedAt: now() + 3 * 86400000 })));
    await assertFails(setDoc(doc(d, 'users/friend/workouts/w1'), workout({ name: 'x'.repeat(81) })));
  });
  it('rekord: váha do 1000 kg', async () => {
    const d = db(FRIEND);
    await assertSucceeds(setDoc(doc(d, 'users/friend/prs/leg-press'), { name: 'Leg Press', weight: 520, reps: 8, date: 1 }));
    await assertFails(setDoc(doc(d, 'users/friend/prs/leg-press'), { name: 'Leg Press', weight: 1001, reps: 8, date: 1 }));
  });
  it('šablona: jen povolená pole a tvar cviků', async () => {
    const d = db(FRIEND);
    const tpl = { id: 't1', name: 'Moje', color: 'royal', exercises: [{ name: 'Squat', sets: 3, reps: '8' }] };
    await assertSucceeds(setDoc(doc(d, 'users/friend/templates/t1'), tpl));
    await assertFails(setDoc(doc(d, 'users/friend/templates/t1'), { ...tpl, builtin: true }));
    await assertFails(setDoc(doc(d, 'users/friend/templates/t1'), { ...tpl, exercises: [42] }));
  });
  it('meta: knihovna, hlavní šablony, nastavení', async () => {
    const d = db(FRIEND);
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/exercises'), { list: [{ name: 'Squat', cat: 'legs' }], v: 2 }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/exercises'), { list: [1, 2], v: 2 }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/main'), { own: { groups: [{ id: 'PUSH', label: 'PUSH' }], templates: [{ id: 'push-normal', group: 'PUSH', exercises: [] }] } }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/main'), { own: { groups: ['x'], templates: [] } }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { weeklyGoal: 4, appearance: { tint: '#aabbcc', strength: 40, accent: null } }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { weeklyGoal: 9 }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { strengthScale: 'lighter' }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { strengthScale: 'heavy' }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { gamify: false }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { gamify: 'no' }));
    // 5.12: síla vůči sobě / benchmark, pauzy a lehké týdny, cíl kardia
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { strengthScale: 'women' }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { breaks: [{ kind: 'pause', from: 1790503200000, to: null }] }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { breaks: 'pause' }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { cardioGoal: 150 }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { cardioGoal: 1000 }));
    await assertSucceeds(setDoc(doc(d, 'users/friend/meta/settings'), { strengthLifts: ['squat', 'hip-thrust'] }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/settings'), { strengthLifts: ['a', 'b', 'c', 'd', 'e'] }));
    await assertFails(setDoc(doc(d, 'users/friend/meta/other'), { a: 1 }));
  });
});

describe('tělesná váha (E3)', () => {
  it('záznam dne: tvar a rozsah', async () => {
    const d = db(FRIEND);
    await assertSucceeds(setDoc(doc(d, 'users/friend/body/2026-09-27'), { date: 1790503200000, weight: 82.4 }));
    await assertFails(setDoc(doc(d, 'users/friend/body/dnes'), { date: 1, weight: 82 }));
    await assertFails(setDoc(doc(d, 'users/friend/body/2026-09-27'), { date: 1, weight: 5 }));
    await assertFails(setDoc(doc(d, 'users/friend/body/2026-09-27'), { date: 1, weight: 82, note: 'x' }));
    await assertFails(getDoc(doc(db(STRANGER), 'users/friend/body/2026-09-27')));
    await assertSucceeds(deleteDoc(doc(d, 'users/friend/body/2026-09-27')));
  });

  it('kardio aktivity: tvar, rozsah minut, jen vlastník', async () => {
    const d = db(FRIEND);
    await assertSucceeds(setDoc(doc(d, 'users/friend/activities/a1'), { id: 'a1', date: 1790503200000, kind: 'run', minutes: 30, vigorous: true }));
    await assertFails(setDoc(doc(d, 'users/friend/activities/a2'), { id: 'a2', date: 1790503200000, kind: 'run', minutes: 0 }));
    await assertFails(setDoc(doc(d, 'users/friend/activities/a3'), { id: 'a3', date: 1790503200000, kind: 'yoga', minutes: 30 }));
    await assertFails(setDoc(doc(d, 'users/friend/activities/a4'), { id: 'x', date: 1790503200000, kind: 'run', minutes: 30 }));
    await assertFails(setDoc(doc(d, 'users/friend/activities/a5'), { id: 'a5', date: 1790503200000, kind: 'run', minutes: 30, kcal: 300 }));
    await assertFails(getDoc(doc(db(STRANGER), 'users/friend/activities/a1')));
    await assertSucceeds(deleteDoc(doc(d, 'users/friend/activities/a1')));
  });
});

describe('smazání účtu (F2)', () => {
  it('vlastník smaže vlastní meta i data, cizí ne', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users/friend/meta/settings'), { weeklyGoal: 3 });
      await setDoc(doc(ctx.firestore(), 'users/admin/meta/settings'), { weeklyGoal: 3 });
    });
    await assertSucceeds(deleteDoc(doc(db(FRIEND), 'users/friend/meta/settings')));
    await assertFails(deleteDoc(doc(db(FRIEND), 'users/admin/meta/settings')));
  });
});

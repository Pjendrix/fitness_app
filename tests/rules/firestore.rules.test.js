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
    await assertFails(setDoc(doc(d, 'users/friend/meta/other'), { a: 1 }));
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

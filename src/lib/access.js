// Kdo smí appku používat. Skutečná ochrana je ve firestore.rules; tady je jen hezčí hláška.
// FOUNDERS = pevně povolené účty (musí odpovídat rules). Další lidi přidává admin v Nastavení
// → dokument access/{email} ve Firestore.
export const ADMIN_EMAIL = 'tofbenka@gmail.com';
export const FOUNDERS = ['tofbenka@gmail.com', 'chiaralari24@gmail.com'];
export const normEmail = (email) => String(email || '').trim().toLowerCase();
export const isFounder = (email) => FOUNDERS.includes(normEmail(email));
export const isAdmin = (email) => normEmail(email) === ADMIN_EMAIL;
export const validEmail = (email) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(normEmail(email)) && normEmail(email).length <= 120;

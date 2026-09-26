// Kdo smí appku používat. Skutečná ochrana je ve firestore.rules; tady je jen hezčí hláška.
// Napevno je jen admin (musí odpovídat rules). Všechny ostatní účty přidává admin v Nastavení → Přístupy
// (dokument access/{email} ve Firestore) – žádné další e-maily v kódu (A5b).
export const ADMIN_EMAIL = 'tofbenka@gmail.com';
export const FOUNDERS = [ADMIN_EMAIL];
export const normEmail = (email) => String(email || '').trim().toLowerCase();
export const isFounder = (email) => FOUNDERS.includes(normEmail(email));
export const isAdmin = (email) => normEmail(email) === ADMIN_EMAIL;
export const validEmail = (email) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(normEmail(email)) && normEmail(email).length <= 120;

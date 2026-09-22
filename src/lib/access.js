// Kdo smí appku používat. Musí odpovídat allowlistu ve firestore.rules (tam je to skutečná ochrana,
// tady jen hezčí hláška místo tichého selhání zápisů).
export const ALLOWED_EMAILS = ['tofbenka@gmail.com', 'chiaralari24@gmail.com'];
export const isAllowed = (email) => ALLOWED_EMAILS.includes(String(email || '').trim().toLowerCase());

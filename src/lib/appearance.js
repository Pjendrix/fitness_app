// Vzhled účtu: podbarvení pozadí (tint + intenzita) a akcentní barva tlačítek → CSS proměnné na <html>.
export const TINTS = ['#e27aa3', '#d56e82', '#cc765b', '#e6c85a', '#5aa15a', '#3f8f86', '#7196cc', '#2d3e78', '#7a64b0', '#939396'];
export const ACCENTS = ['#b83c6e', '#c2410c', '#b8892b', '#297a3a', '#0f766e', '#2f6fdb', '#4338ca', '#7a4bd1'];

const hexOk = (h) => typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h);
// Text na akcentu: tmavý na světlé barvě, jinak bílý
export const readableOn = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45 ? '#171717' : '#ffffff';
};

export function applyAppearance(look) {
  const root = document.documentElement;
  const tint = look && hexOk(look.tint) ? look.tint : null;
  const accent = look && hexOk(look.accent) ? look.accent : null;
  if (tint) {
    root.dataset.tint = '1';
    root.style.setProperty('--tint', tint);
    root.style.setProperty('--tint-k', String(Math.min(100, Math.max(0, Number(look.strength) || 0)) / 100));
  } else {
    delete root.dataset.tint;
    root.style.removeProperty('--tint');
    root.style.removeProperty('--tint-k');
  }
  if (accent) {
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-fg', readableOn(accent));
  } else {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-fg');
  }
}

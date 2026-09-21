const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' };
const I = (children) => (props) => <svg {...base} {...props}>{children}</svg>;

export const HomeIcon = I(<><path d="M4 11l8-7 8 7" /><path d="M6 10v9h12v-9" /></>);
export const DumbbellIcon = I(<><path d="M7 8v8M4 10v4M17 8v8M20 10v4M7 12h10" /></>);
export const HistoryIcon = I(<><path d="M4 12a8 8 0 1 0 2.5-5.8" /><path d="M4 4v4h4" /><path d="M12 8v4l3 2" /></>);
export const TemplatesIcon = I(<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>);
export const SettingsIcon = I(<><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" /></>);
export const CheckIcon = I(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const PlusIcon = I(<path d="M12 5v14M5 12h14" />);
export const ChevronIcon = I(<path d="M6 9l6 6 6-6" />);
export const TrashIcon = I(<><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12" /></>);
export const GoogleIcon = (props) => (
  <svg width="20" height="20" viewBox="0 0 24 24" {...props}>
    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
  </svg>
);

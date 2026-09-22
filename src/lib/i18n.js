// Jednoduché i18n: angličtina výchozí, čeština volitelně (Settings → Language).
import { useEffect, useState } from 'react';

const KEY = 'forge:lang';
const listeners = new Set();
export const getLang = () => {
  try { return localStorage.getItem(KEY) === 'cs' ? 'cs' : 'en'; } catch { return 'en'; }
};
export const setLang = (l) => {
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  document.documentElement.lang = l;
  listeners.forEach((f) => f());
};
export const locale = () => (getLang() === 'cs' ? 'cs-CZ' : 'en-GB');

const D = {
  en: {
    // nav
    'nav.home': 'Home', 'nav.workout': 'Workout', 'nav.history': 'History', 'nav.stats': 'Analytics',
    'nav.exercises': 'Exercises', 'nav.templates': 'Templates', 'nav.settings': 'Settings', 'nav.live': 'Workout in progress',
    'view.desktop': 'Desktop', 'view.mobile': 'Mobile', 'view.auto': 'Auto', 'view.switch': 'Switch layout',
    // login
    'login.sub': 'Log your sets, track your records. PUSH, PULL and LEGS templates are ready to go.',
    'login.google': 'Sign in with Google', 'login.demo': 'Enter demo mode',
    'login.demoNote': 'Firebase is not configured. Data is stored in this browser only (see README).',
    // home
    'home.hi': 'Hi', 'home.hiName': 'Hi, {name}', 'home.title': 'What are we training today?',
    'home.unfinished': 'Unfinished workout', 'home.continue': 'Continue', 'home.quickStart': 'Quick start', 'home.upNext': 'up next',
    'home.start': 'Start {name}', 'home.empty': 'Start empty workout', 'home.mine': 'Start my template',
    'home.weekWorkouts': 'workouts this week', 'home.weekVolume': 'volume this week', 'home.total': 'workouts total',
    'home.recentPrs': 'Recent records', 'home.allStats': 'All analytics', 'home.noPrs': 'Records appear after your first finished workout.',
    'home.openStats': 'Open analytics',
    'groups.PUSH': 'Chest, shoulders, triceps', 'groups.PULL': 'Back, rear delts, biceps', 'groups.LEGS': 'Legs, glutes, abs', 'groups.UPPER': 'Back, shoulders, arms', 'groups.LOWER': 'Glutes, hamstrings, quads', 'groups.ABS': 'Core & cardio',
    'count.exercises': { one: '{n} exercise', other: '{n} exercises' }, 'count.sets': { one: '{n} set', other: '{n} sets' },
    // workout
    'wo.title': 'Workout', 'wo.none': 'No workout in progress.', 'wo.pickTemplate': 'Choose a template', 'wo.emptyName': 'Quick workout',
    'wo.finish': 'Finish', 'wo.sets': '{done}/{total} sets', 'wo.recommended': 'suggested {w}', 'wo.pb': 'Personal best',
    'wo.weight': 'Weight, set {n}', 'wo.reps': 'Reps, set {n}', 'wo.check': 'Complete set', 'wo.uncheck': 'Undo set',
    'wo.delSet': 'Delete set {n}', 'wo.newPb': 'New PB', 'wo.addSet': 'Set', 'wo.up': 'Move up', 'wo.down': 'Move down',
    'wo.removeEx': 'Remove exercise', 'wo.confirmRemoveEx': 'Remove “{name}” from this workout?', 'wo.addFirst': 'Add your first exercise.',
    'wo.addEx': 'Add exercise', 'wo.discard': 'Discard workout', 'wo.confirmDiscard': 'Discard the unfinished workout?',
    'wo.needReps': 'Enter reps first', 'wo.needOne': 'Log and tick at least one set',
    'wo.saved': 'Workout saved', 'wo.savedPb': 'Workout saved · {n}× new PB', 'wo.col.set': '#', 'wo.col.kg': 'kg', 'wo.col.reps': 'Reps',
    'wo.replace': 'Your unfinished workout will be replaced. Continue?',
    // picker
    'pick.title': 'Add exercise', 'pick.close': 'Close', 'pick.search': 'Search exercises', 'pick.all': 'All',
    'pick.inWorkout': 'added', 'pick.none': 'Nothing found.', 'pick.create': 'Create “{name}”', 'pick.createBtn': 'Create', 'pick.category': 'Category',
    // history
    'hist.title': 'History', 'hist.analytics': 'Analytics & charts', 'hist.list': 'List', 'hist.calendar': 'Calendar',
    'hist.allTemplates': 'All workouts', 'hist.loading': 'Loading…', 'hist.empty': 'No finished workouts yet.',
    'hist.noMatch': 'No workouts match this filter.', 'hist.delete': 'Delete', 'hist.confirmDelete': 'Delete this workout from history?',
    'hist.dayEmpty': 'Rest day.', 'hist.prev': 'Previous month', 'hist.next': 'Next month', 'hist.month': { one: '{n} workout this month', other: '{n} workouts this month' },
    // templates
    'tpl.title': 'Templates', 'tpl.mine': 'My templates', 'tpl.start': 'Start', 'tpl.edit': 'Edit', 'tpl.editCopy': 'Edit copy',
    'tpl.delete': 'Delete template', 'tpl.confirmDelete': 'Delete this template?', 'tpl.new': 'New template', 'tpl.name': 'Template name',
    'tpl.sets': 'Sets', 'tpl.reps': 'Reps', 'tpl.kg': 'kg', 'tpl.max': 'max', 'tpl.toFailure': 'to failure', 'tpl.note': 'Note (e.g. drop set, to failure)',
    'tpl.remove': 'Remove', 'tpl.save': 'Save template', 'tpl.cancel': 'Cancel', 'tpl.less': 'Less', 'tpl.more': 'More',
    'tpl.copySuffix': '(mine)', 'tpl.color': 'Colour', 'tpl.noColor': 'No colour',
    // exercises
    'ex.title': 'Exercises', 'ex.count': { one: '{n} exercise', other: '{n} exercises' }, 'ex.export': 'Export CSV', 'ex.import': 'Import CSV',
    'ex.importMode': 'Replace the whole library with this file? (Cancel = merge / add only)', 'ex.imported': { one: 'Imported {n} exercise', other: 'Imported {n} exercises' },
    'ex.importFail': 'No valid rows found. Expected columns: name,category', 'ex.add': 'Add exercise', 'ex.namePh': 'Exercise name',
    'ex.delete': 'Delete from library', 'ex.confirmDelete': 'Delete “{name}” from the library? History stays untouched.',
    'ex.sessions': '{n}× logged', 'ex.exists': 'Already in the library', 'ex.search': 'Search',
    // settings
    'set.title': 'Settings', 'set.user': 'User', 'set.storage': 'Storage', 'set.cloud': 'Cloud Firestore', 'set.local': 'Local (demo)',
    'set.units': 'Units', 'set.done': 'Finished workouts', 'set.view': 'Layout', 'set.lang': 'Language',
    'set.library': 'Exercise library', 'set.openLibrary': 'Manage exercises', 'set.reset': 'Reset default exercises',
    'set.confirmReset': 'Restore the default exercise library? Your custom exercises will be removed (history stays).', 'set.resetDone': 'Default exercises restored',
    'set.export': 'Export data (JSON)', 'set.exported': 'Export downloaded', 'set.logout': 'Sign out',
    // analytics
    'an.title': 'Analytics', 'an.empty': 'Charts appear after your first finished workouts.', 'an.period': 'Period',
    'an.workouts': 'Workouts', 'an.perWeek': '{n} per week', 'an.volume': 'Volume', 'an.volumeSub': 'weight × reps',
    'an.sets': 'Sets', 'an.setsSub': 'completed', 'an.avg': 'Avg duration', 'an.avgSub': 'per workout',
    'an.progress': 'Exercise progress', 'an.exercise': 'Exercise', 'an.e1rm': 'Est. 1RM', 'an.top': 'Top weight', 'an.maxReps': 'Max reps',
    'an.pb': 'PB', 'an.sessions': 'Sessions', 'an.change': 'Top weight change', 'an.date': 'Date', 'an.setsCol': 'Sets', 'an.volCol': 'Volume',
    'an.weeklyVol': 'Weekly volume', 'an.weeklyN': 'Workouts per week', 'an.muscles': 'Sets by muscle group', 'an.attendance': 'Attendance',
    'an.weeks': '{n} weeks', 'an.prs': 'Personal records', 'an.record': 'Record', 'an.weekOf': 'Week of {d}', 'an.fewData': 'Not enough data yet.',
    'an.r4': '4w', 'an.r12': '12w', 'an.r26': '6m', 'an.r52': '1y', 'an.mon': 'Mon', 'an.wed': 'Wed', 'an.fri': 'Fri', 'an.nWorkouts': '{n}× workout',
    // categories
    'cat.chest': 'Chest', 'cat.back': 'Back', 'cat.shoulders': 'Shoulders', 'cat.biceps': 'Biceps', 'cat.triceps': 'Triceps',
    'cat.legs': 'Legs', 'cat.glutes': 'Glutes', 'cat.abs': 'Abs', 'cat.cardio': 'Cardio', 'cat.other': 'Other',
    'prof.title': 'Training profile', 'prof.pick': 'Who is training on this account?', 'prof.pickSub': 'Loads your own split and templates. You can change it later in Settings.', 'prof.saved': 'Profile set to {name}',
    'wo.col.min': 'Min', 'tpl.min': 'Min', 'an.maxTime': 'Longest (min)', 'ex.timed': 'timed',
    'type.reps': 'kg × reps', 'type.time': 'time', 'type.label': 'Type', 'type.repsLong': 'Weight × reps', 'type.timeLong': 'Time (min)',
    'info.open': 'How to do {name}', 'info.title': 'How to', 'info.source': 'Source: free-exercise-db · {name}', 'info.none': 'No written guide for this exercise yet.', 'info.video': 'Watch on YouTube ↗',
    'info.custom': 'custom', 'pick.mine': 'My library', 'pick.db': 'From exercise database', 'pick.dbHint': 'Type at least 2 letters to search 870+ exercises', 'pick.dbFail': 'Database unavailable (offline?)', 'pick.dbAdd': 'add', 'ex.browse': 'Browse database', 'ex.customTitle': 'Add custom exercise', 'ex.added': 'Added {name}',
    'undo.btn': 'Undo', 'undo.title': 'Undo: {what} ({n} left)', 'undo.done': 'Undone: {what}', 'undo.tpl': 'template change', 'undo.tplDel': 'template deleted',
    'undo.group': 'group rename', 'undo.reset': 'templates reset', 'undo.library': 'exercise library change', 'undo.workout': 'workout deleted',
    'tpl.main': 'Main templates', 'tpl.variant': 'Variant', 'tpl.addVariant': 'Add variant', 'tpl.duplicate': 'Copy to My templates',
    'tpl.renameGroup': 'Rename group', 'tpl.groupName': 'Group name', 'tpl.groupSub': 'Description (optional)', 'tpl.lastInGroup': 'Keep at least one template in the group',
    'set.resetTpl': 'Reset templates', 'set.confirmResetTpl': 'Restore the default main templates for this profile? My templates stay untouched.', 'set.resetTplDone': 'Main templates restored',
    // errors
    'err.load': 'Loading data failed: {m}', 'err.save': 'Saving failed: {m}', 'err.delete': 'Deleting failed: {m}', 'err.login': 'Sign-in failed: {m}',

    // v5
    'login.denied': 'The account {email} does not have access to this app.',
    'nav.main': 'Main navigation',
    'wo.time': 'Minutes, set {n}', 'wo.dec': 'Decrease: {what}', 'wo.inc': 'Increase: {what}',
    'wo.setRemoved': 'Set deleted', 'wo.exRemoved': 'Exercise removed', 'wo.swipeHint': 'Swipe a set to the left to delete it.',
    'wo.uncheckedTitle': { one: '{n} filled-in set is not ticked', other: '{n} filled-in sets are not ticked' },
    'wo.uncheckedMsg': 'Save them as completed, or leave them out?', 'wo.tickSave': 'Tick and save', 'wo.dropSave': 'Save without them',
    'err.saveWorkout': 'Saving failed ({m}). The workout is back in the Workout tab.',
    'rest.title': 'Rest', 'rest.skip': 'Skip', 'rest.done': 'Rest over – next set', 'rest.off': 'Off', 'rest.minusAria': 'Shorten rest by 15 seconds', 'rest.plusAria': 'Extend rest by 15 seconds',
    'set.rest': 'Rest timer', 'set.theme': 'Theme', 'theme.light': 'Light', 'theme.dark': 'Dark', 'theme.auto': 'Auto',
    'sync.offline': 'Offline – saved on this device', 'sync.pending': 'Syncing…',
    'upd.ready': 'A new version is available', 'upd.reload': 'Reload',
    'dlg.cancel': 'Cancel', 'dlg.confirm': 'Confirm', 'dlg.save': 'Save',
    'ex.importTitle': { one: 'Import {n} exercise', other: 'Import {n} exercises' }, 'ex.importMerge': 'Add to library', 'ex.importReplace': 'Replace library',
    'chart.bar': 'Bar chart: {name}', 'chart.line': 'Line chart: {name}', 'an.attendanceAria': { one: 'Attendance calendar, {n} workout', other: 'Attendance calendar, {n} workouts' },
    'info.photo': 'Illustration of {name}',
  },
  cs: {
    'nav.home': 'Domů', 'nav.workout': 'Trénink', 'nav.history': 'Historie', 'nav.stats': 'Statistiky',
    'nav.exercises': 'Cvičení', 'nav.templates': 'Šablony', 'nav.settings': 'Nastavení', 'nav.live': 'Probíhá trénink',
    'view.desktop': 'Desktop', 'view.mobile': 'Mobil', 'view.auto': 'Auto', 'view.switch': 'Přepnout zobrazení',
    'login.sub': 'Zapisuj série, sleduj rekordy. Šablony PUSH, PULL a LEGS jsou připravené.',
    'login.google': 'Přihlásit přes Google', 'login.demo': 'Vstoupit do demo režimu',
    'login.demoNote': 'Firebase není nastavený. Data se ukládají jen v tomto prohlížeči (viz README).',
    'home.hi': 'Ahoj', 'home.hiName': 'Ahoj, {name}', 'home.title': 'Co dnes potrénujeme?',
    'home.unfinished': 'Rozdělaný trénink', 'home.continue': 'Pokračovat', 'home.quickStart': 'Rychlý start', 'home.upNext': 'na řadě',
    'home.start': 'Začít {name}', 'home.empty': 'Zahájit rychlý trénink', 'home.mine': 'Spustit moji šablonu',
    'home.weekWorkouts': 'tréninků tento týden', 'home.weekVolume': 'objem tento týden', 'home.total': 'tréninků celkem',
    'home.recentPrs': 'Nedávné rekordy', 'home.allStats': 'Všechny statistiky', 'home.noPrs': 'Rekordy se objeví po prvním dokončeném tréninku.',
    'home.openStats': 'Otevřít statistiky',
    'groups.PUSH': 'Prsa, ramena, triceps', 'groups.PULL': 'Záda, zadní delty, biceps', 'groups.LEGS': 'Nohy, hýždě, břicho', 'groups.UPPER': 'Záda, ramena, paže', 'groups.LOWER': 'Hýždě, hamstringy, stehna', 'groups.ABS': 'Střed těla a kardio',
    'count.exercises': '{n} cvičení', 'count.sets': { one: '{n} série', few: '{n} série', many: '{n} série', other: '{n} sérií' },
    'wo.title': 'Trénink', 'wo.none': 'Žádný trénink neprobíhá.', 'wo.pickTemplate': 'Vybrat šablonu', 'wo.emptyName': 'Rychlý trénink',
    'wo.finish': 'Dokončit', 'wo.sets': '{done}/{total} sérií', 'wo.recommended': 'doporučeno {w}', 'wo.pb': 'Osobní rekord',
    'wo.weight': 'Váha, série {n}', 'wo.reps': 'Opakování, série {n}', 'wo.check': 'Odškrtnout sérii', 'wo.uncheck': 'Zrušit odškrtnutí',
    'wo.delSet': 'Smazat sérii {n}', 'wo.newPb': 'Nový rekord', 'wo.addSet': 'Série', 'wo.up': 'Posunout výš', 'wo.down': 'Posunout níž',
    'wo.removeEx': 'Odebrat cvičení', 'wo.confirmRemoveEx': 'Odebrat „{name}“ z tréninku?', 'wo.addFirst': 'Přidej první cvičení.',
    'wo.addEx': 'Přidat cvičení', 'wo.discard': 'Zahodit trénink', 'wo.confirmDiscard': 'Zahodit rozdělaný trénink?',
    'wo.needReps': 'Doplň opakování', 'wo.needOne': 'Zapiš a odškrtni aspoň jednu sérii',
    'wo.saved': 'Trénink uložen', 'wo.savedPb': 'Trénink uložen · {n}× nový rekord', 'wo.col.set': '#', 'wo.col.kg': 'kg', 'wo.col.reps': 'Opak.',
    'wo.replace': 'Rozdělaný trénink bude nahrazen. Pokračovat?',
    'pick.title': 'Přidat cvičení', 'pick.close': 'Zavřít', 'pick.search': 'Hledat cvičení', 'pick.all': 'Vše',
    'pick.inWorkout': 'přidáno', 'pick.none': 'Nic nenalezeno.', 'pick.create': 'Vytvořit „{name}“', 'pick.createBtn': 'Vytvořit', 'pick.category': 'Partie',
    'hist.title': 'Historie', 'hist.analytics': 'Statistiky a grafy', 'hist.list': 'Seznam', 'hist.calendar': 'Kalendář',
    'hist.allTemplates': 'Všechny tréninky', 'hist.loading': 'Načítám…', 'hist.empty': 'Zatím žádný odcvičený trénink.',
    'hist.noMatch': 'Filtru neodpovídá žádný trénink.', 'hist.delete': 'Smazat', 'hist.confirmDelete': 'Smazat trénink z historie?',
    'hist.dayEmpty': 'Volno.', 'hist.prev': 'Předchozí měsíc', 'hist.next': 'Další měsíc', 'hist.month': { one: '{n} trénink tento měsíc', few: '{n} tréninky tento měsíc', many: '{n} tréninku tento měsíc', other: '{n} tréninků tento měsíc' },
    'tpl.title': 'Šablony', 'tpl.mine': 'Moje šablony', 'tpl.start': 'Spustit', 'tpl.edit': 'Upravit', 'tpl.editCopy': 'Upravit kopii',
    'tpl.delete': 'Smazat šablonu', 'tpl.confirmDelete': 'Smazat šablonu?', 'tpl.new': 'Nová šablona', 'tpl.name': 'Název šablony',
    'tpl.sets': 'Série', 'tpl.reps': 'Opak.', 'tpl.kg': 'kg', 'tpl.max': 'max', 'tpl.toFailure': 'do selhání', 'tpl.note': 'Poznámka (např. drop-set, do selhání)',
    'tpl.remove': 'Odebrat', 'tpl.save': 'Uložit šablonu', 'tpl.cancel': 'Zrušit', 'tpl.less': 'Méně', 'tpl.more': 'Více',
    'tpl.copySuffix': '(moje)', 'tpl.color': 'Barva', 'tpl.noColor': 'Bez barvy',
    'ex.title': 'Cvičení', 'ex.count': '{n} cvičení', 'ex.export': 'Export CSV', 'ex.import': 'Import CSV',
    'ex.importMode': 'Nahradit celou knihovnu tímto souborem? (Zrušit = jen doplnit)', 'ex.imported': 'Importováno {n} cvičení',
    'ex.importFail': 'Nenalezen žádný platný řádek. Očekávané sloupce: name,category', 'ex.add': 'Přidat cvičení', 'ex.namePh': 'Název cvičení',
    'ex.delete': 'Smazat z knihovny', 'ex.confirmDelete': 'Smazat „{name}“ z knihovny? Historie zůstane.',
    'ex.sessions': '{n}× zapsáno', 'ex.exists': 'Už je v knihovně', 'ex.search': 'Hledat',
    'set.title': 'Nastavení', 'set.user': 'Uživatel', 'set.storage': 'Úložiště', 'set.cloud': 'Cloud Firestore', 'set.local': 'Lokální (demo)',
    'set.units': 'Jednotky', 'set.done': 'Odcvičených tréninků', 'set.view': 'Zobrazení', 'set.lang': 'Jazyk',
    'set.library': 'Knihovna cvičení', 'set.openLibrary': 'Spravovat cvičení', 'set.reset': 'Obnovit výchozí cvičení',
    'set.confirmReset': 'Obnovit výchozí knihovnu cvičení? Vlastní cviky budou odstraněny (historie zůstane).', 'set.resetDone': 'Výchozí cvičení obnovena',
    'set.export': 'Exportovat data (JSON)', 'set.exported': 'Export stažen', 'set.logout': 'Odhlásit se',
    'an.title': 'Statistiky', 'an.empty': 'Grafy se objeví po prvních dokončených trénincích.', 'an.period': 'Období',
    'an.workouts': 'Tréninky', 'an.perWeek': '{n} týdně', 'an.volume': 'Objem', 'an.volumeSub': 'váha × opakování',
    'an.sets': 'Série', 'an.setsSub': 'odškrtnutých', 'an.avg': 'Průměrná délka', 'an.avgSub': 'na trénink',
    'an.progress': 'Progres cvičení', 'an.exercise': 'Cvičení', 'an.e1rm': 'Odhad 1RM', 'an.top': 'Top váha', 'an.maxReps': 'Max opakování',
    'an.pb': 'PB', 'an.sessions': 'Tréninků', 'an.change': 'Změna top váhy', 'an.date': 'Datum', 'an.setsCol': 'Série', 'an.volCol': 'Objem',
    'an.weeklyVol': 'Objem po týdnech', 'an.weeklyN': 'Tréninky po týdnech', 'an.muscles': 'Série podle partie', 'an.attendance': 'Docházka',
    'an.weeks': '{n} týdnů', 'an.prs': 'Osobní rekordy', 'an.record': 'Rekord', 'an.weekOf': 'Týden od {d}', 'an.fewData': 'Zatím málo dat.',
    'an.r4': '4 t', 'an.r12': '12 t', 'an.r26': '6 m', 'an.r52': '1 r', 'an.mon': 'Po', 'an.wed': 'St', 'an.fri': 'Pá', 'an.nWorkouts': '{n}× trénink',
    'cat.chest': 'Prsa', 'cat.back': 'Záda', 'cat.shoulders': 'Ramena', 'cat.biceps': 'Biceps', 'cat.triceps': 'Triceps',
    'cat.legs': 'Nohy', 'cat.glutes': 'Hýždě', 'cat.abs': 'Břicho', 'cat.cardio': 'Kardio', 'cat.other': 'Ostatní',
    'prof.title': 'Tréninkový profil', 'prof.pick': 'Kdo na tomhle účtu trénuje?', 'prof.pickSub': 'Načte tvůj split a šablony. Změnit to jde později v Nastavení.', 'prof.saved': 'Profil nastaven: {name}',
    'wo.col.min': 'Min', 'tpl.min': 'Min', 'an.maxTime': 'Nejdelší (min)', 'ex.timed': 'na čas',
    'type.reps': 'kg × opak.', 'type.time': 'čas', 'type.label': 'Typ', 'type.repsLong': 'Váha × opakování', 'type.timeLong': 'Čas (min)',
    'info.open': 'Jak cvičit {name}', 'info.title': 'Návod', 'info.source': 'Zdroj: free-exercise-db · {name} (anglicky)', 'info.none': 'Pro tento cvik zatím není psaný návod.', 'info.video': 'Video na YouTube ↗',
    'info.custom': 'vlastní', 'pick.mine': 'Moje knihovna', 'pick.db': 'Z databáze cviků', 'pick.dbHint': 'Napiš aspoň 2 písmena a hledej v 870+ cvicích', 'pick.dbFail': 'Databáze není dostupná (offline?)', 'pick.dbAdd': 'přidat', 'ex.browse': 'Procházet databázi', 'ex.customTitle': 'Přidat vlastní cvik', 'ex.added': 'Přidáno: {name}',
    'undo.btn': 'Zpět', 'undo.title': 'Vrátit: {what} (zbývá {n})', 'undo.done': 'Vráceno: {what}', 'undo.tpl': 'úprava šablony', 'undo.tplDel': 'smazání šablony',
    'undo.group': 'přejmenování skupiny', 'undo.reset': 'reset šablon', 'undo.library': 'úprava knihovny cvičení', 'undo.workout': 'smazání tréninku',
    'tpl.main': 'Hlavní šablony', 'tpl.variant': 'Varianta', 'tpl.addVariant': 'Přidat variantu', 'tpl.duplicate': 'Kopírovat do Mých šablon',
    'tpl.renameGroup': 'Přejmenovat skupinu', 'tpl.groupName': 'Název skupiny', 'tpl.groupSub': 'Popis (volitelné)', 'tpl.lastInGroup': 'Ve skupině musí zůstat aspoň jedna šablona',
    'set.resetTpl': 'Obnovit šablony', 'set.confirmResetTpl': 'Obnovit výchozí hlavní šablony tohoto profilu? Moje šablony zůstanou.', 'set.resetTplDone': 'Hlavní šablony obnoveny',
    'err.load': 'Načtení dat selhalo: {m}', 'err.save': 'Uložení selhalo: {m}', 'err.delete': 'Smazání selhalo: {m}', 'err.login': 'Přihlášení selhalo: {m}',

    // v5
    'login.denied': 'Účet {email} nemá do appky přístup.',
    'nav.main': 'Hlavní navigace',
    'wo.time': 'Minuty, série {n}', 'wo.dec': 'Snížit: {what}', 'wo.inc': 'Zvýšit: {what}',
    'wo.setRemoved': 'Série smazána', 'wo.exRemoved': 'Cvičení odebráno', 'wo.swipeHint': 'Sérii smažeš potažením doleva.',
    'wo.uncheckedTitle': { one: '{n} vyplněná série není odškrtnutá', few: '{n} vyplněné série nejsou odškrtnuté', many: '{n} vyplněné série není odškrtnuto', other: '{n} vyplněných sérií není odškrtnutých' },
    'wo.uncheckedMsg': 'Uložit je jako odcvičené, nebo je vynechat?', 'wo.tickSave': 'Odškrtnout a uložit', 'wo.dropSave': 'Uložit bez nich',
    'err.saveWorkout': 'Uložení selhalo ({m}). Trénink je zpět v záložce Trénink.',
    'rest.title': 'Pauza', 'rest.skip': 'Přeskočit', 'rest.done': 'Pauza skončila – další série', 'rest.off': 'Vyp.', 'rest.minusAria': 'Zkrátit pauzu o 15 sekund', 'rest.plusAria': 'Prodloužit pauzu o 15 sekund',
    'set.rest': 'Pauza mezi sériemi', 'set.theme': 'Vzhled', 'theme.light': 'Světlý', 'theme.dark': 'Tmavý', 'theme.auto': 'Auto',
    'sync.offline': 'Offline – uloženo v zařízení', 'sync.pending': 'Synchronizuji…',
    'upd.ready': 'Je k dispozici nová verze', 'upd.reload': 'Obnovit',
    'dlg.cancel': 'Zrušit', 'dlg.confirm': 'Potvrdit', 'dlg.save': 'Uložit',
    'ex.importTitle': { one: 'Import {n} cvičení', other: 'Import {n} cvičení' }, 'ex.importMerge': 'Doplnit do knihovny', 'ex.importReplace': 'Nahradit knihovnu',
    'chart.bar': 'Sloupcový graf: {name}', 'chart.line': 'Spojnicový graf: {name}', 'an.attendanceAria': { one: 'Kalendář docházky, {n} trénink', few: 'Kalendář docházky, {n} tréninky', many: 'Kalendář docházky, {n} tréninku', other: 'Kalendář docházky, {n} tréninků' },
    'info.photo': 'Ilustrace cviku {name}',
  },
};

// Množná čísla přes Intl.PluralRules (cs: one / few / many / other). Hodnota klíče může být text nebo {one, few, other…}.
const PLURAL = { en: new Intl.PluralRules('en'), cs: new Intl.PluralRules('cs') };
export const t = (key, vars) => {
  const lang = getLang();
  let s = D[lang][key] ?? D.en[key];
  if (s == null) {
    if (import.meta.env?.DEV) console.warn('i18n: missing key', key);
    return key;
  }
  if (typeof s === 'object') s = s[PLURAL[lang].select(Number(vars?.n ?? 0))] ?? s.other;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
};

export function useLang() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => listeners.delete(f);
  }, []);
  return { lang: getLang(), setLang, t };
}

if (typeof document !== 'undefined') document.documentElement.lang = getLang();

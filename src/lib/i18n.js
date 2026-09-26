// Jednoduché i18n: angličtina výchozí, čeština volitelně (Settings → Language).
import { useEffect, useState } from 'react';

const KEY = 'forge:lang';
const listeners = new Set();
// Uložená volba jazyka (i když čeština ještě není načtená)
export const storedLang = () => {
  try { return localStorage.getItem(KEY) === 'cs' ? 'cs' : 'en'; } catch { return 'en'; }
};
// B8: čeština je samostatný chunk – angličtina se neplatí stahováním obou slovníků.
let csLoading = null;
export const loadLang = (l = storedLang()) =>
  l !== 'cs' || D.cs ? Promise.resolve() : (csLoading ||= import('./i18n.cs.js').then((m) => { D.cs = m.default; }).catch((e) => { csLoading = null; throw e; }));
// Aktivní jazyk: čeština až po načtení slovníku (do té doby angličtina, nikdy klíče)
export const getLang = () => (storedLang() === 'cs' && D.cs ? 'cs' : 'en');
// Přepnutí jazyka: angličtina / už načtená čeština hned, jinak po stažení slovníku
export const setLang = (l) => {
  const apply = () => {
    try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
    document.documentElement.lang = l;
    listeners.forEach((f) => f());
  };
  if (l !== 'cs' || D.cs) { apply(); return Promise.resolve(); }
  return loadLang(l).then(apply);
};
export const locale = () => (getLang() === 'cs' ? 'cs-CZ' : 'en-GB');

// Angličtina (výchozí). Export EN jen kvůli testu shody klíčů s češtinou.
const D = {
  en: {
    // nav
    'nav.home': 'Home', 'nav.back': 'Back', 'nav.workout': 'Workout', 'nav.history': 'History', 'nav.stats': 'Stats',
    'nav.exercises': 'Exercises', 'nav.templates': 'Templates', 'nav.settings': 'Settings', 'nav.live': 'Workout in progress',
    'view.desktop': 'Desktop', 'view.mobile': 'Mobile', 'view.auto': 'Auto', 'view.switch': 'Switch layout',
    // login
    'login.sub': 'A quiet, focused log for every set. Build your own templates, track personal records and watch your progress – even without signal in the gym.',
    'login.eyebrow': 'Strength training log', 'login.title1': 'Train with', 'login.title2': 'intent.',
    'login.secure': 'Secure sign-in with your Google account', 'login.featuresAria': 'Features',
    'login.f1': 'Log in seconds', 'login.f1d': 'Large controls, a rest timer and swipe to delete. Made for sweaty hands.',
    'login.f2': 'Progress you can see', 'login.f2d': 'Automatic personal records, weekly goals and clear charts.',
    'login.f3': 'Works offline', 'login.f3d': 'Keep training without signal. Everything syncs once you are back online.',
    'login.footer': 'Private app · access by invitation',
    'login.pvExercise': 'BENCH PRESS', 'login.pvTrend': '8 WEEKS', 'login.pvWeek': 'THIS MONTH',
    'login.google': 'Sign in with Google', 'login.demo': 'Enter demo mode',
    'login.demoNote': 'Firebase is not configured. Data is stored in this browser only (see README).',
    // home
    'home.hi': 'Hi', 'home.hiName': 'Hi, {name}', 'home.title': 'What are we training today?',
    'home.unfinished': 'Unfinished workout', 'home.continue': 'Continue', 'home.quickStart': 'Quick start', 'home.upNext': 'up next',
    'home.start': 'Start {name}', 'home.empty': 'Empty workout', 'home.mine': 'Start my template',
    'home.weekWorkouts': 'workouts this week', 'home.weekVolume': 'volume this week', 'home.total': 'workouts total',
    'home.recentPrs': 'Recent records', 'home.allStats': 'All stats', 'home.noPrs': 'Records appear after your first finished workout.',
    'home.openStats': 'Open stats',
    'groups.PUSH': 'Chest, shoulders, triceps', 'groups.PULL': 'Back, rear delts, biceps', 'groups.LEGS': 'Legs, glutes, abs', 'groups.UPPER': 'Back, shoulders, arms', 'groups.LOWER': 'Glutes, hamstrings, quads', 'groups.ABS': 'Core & cardio',
    'count.exercises': { one: '{n} exercise', other: '{n} exercises' }, 'count.sets': { one: '{n} set', other: '{n} sets' },
    // workout
    'wo.title': 'Workout', 'wo.none': 'No workout in progress.', 'wo.pickTemplate': 'Choose a template', 'wo.emptyName': 'Quick workout',
    'wo.finish': 'Finish', 'wo.sets': '{done}/{total} sets', 'wo.recommended': 'suggested {w}', 'wo.pb': 'Heaviest set so far', 'rec.max': 'Max',
    'wo.weight': 'Weight, set {n}', 'wo.reps': 'Reps, set {n}', 'wo.check': 'Complete set', 'wo.uncheck': 'Undo set',
    'wo.delSet': 'Delete set {n}', 'wo.newPb': 'New max', 'wo.addSet': 'Set', 'wo.up': 'Move up', 'wo.down': 'Move down',
    'wo.removeEx': 'Remove exercise', 'wo.confirmRemoveEx': 'Remove “{name}” from this workout?', 'wo.addFirst': 'Add your first exercise.',
    'wo.addEx': 'Add exercise', 'wo.discard': 'Discard workout', 'wo.confirmDiscard': 'Discard the unfinished workout?',
    'wo.needReps': 'Enter reps first', 'wo.needOne': 'Log and tick at least one set',
    'wo.saved': 'Workout saved', 'wo.savedPb': 'Workout saved · {n}× new record', 'wo.col.set': '#', 'wo.col.kg': 'kg', 'wo.col.reps': 'Reps',
    'wo.replace': 'Your unfinished workout will be replaced. Continue?',
    // picker
    'pick.title': 'Add exercise', 'pick.close': 'Close', 'pick.search': 'Search exercises', 'pick.all': 'All',
    'pick.inWorkout': 'added', 'pick.none': 'Nothing found.', 'pick.create': 'Create “{name}”', 'pick.createBtn': 'Create', 'pick.category': 'Category',
    // history
    'hist.title': 'History', 'hist.analytics': 'Stats', 'hist.list': 'List', 'hist.calendar': 'Calendar',
    'hist.allTemplates': 'All workouts', 'hist.loading': 'Loading…', 'hist.empty': 'No finished workouts yet.',
    'hist.noMatch': 'No workouts match this filter.', 'hist.delete': 'Delete', 'hist.more': { one: 'Show older ({n} workout)', other: 'Show older ({n} workouts)' }, 'hist.confirmDelete': 'Delete this workout from history?',
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
    'ex.sessions': '{n}× logged', 'ex.rename': 'Rename or merge', 'ex.renameTitle': 'Rename “{name}”', 'ex.renameField': 'New name – an existing exercise merges the history', 'ex.mergeTitle': 'Merge into “{to}”?', 'ex.mergeMsg': { one: 'History of “{from}” ({n} workout), its records and templates move to “{to}”. You can undo it.', other: 'History of “{from}” ({n} workouts), its records and templates move to “{to}”. You can undo it.' }, 'ex.mergeOk': 'Merge', 'ex.renamed': 'Renamed to “{name}”', 'ex.merged': 'Merged into “{name}”', 'ex.renameType': 'Can’t merge a timed exercise with a reps exercise', 'ex.historyOnly': 'Only in history', 'ex.historyOnlySub': 'Logged, but not in the library – often a typo. Rename or merge them.', 'ex.exists': 'Already in the library', 'ex.search': 'Search',
    // settings
    'set.title': 'Settings', 'set.user': 'User', 'set.storage': 'Storage', 'set.cloud': 'Cloud Firestore', 'set.local': 'Local (demo)',
    'set.units': 'Units', 'set.done': 'Finished workouts', 'set.view': 'Layout', 'set.lang': 'Language',
    'set.library': 'Exercise library', 'set.openLibrary': 'Manage exercises', 'set.reset': 'Reset default exercises',
    'set.confirmReset': 'Restore the default exercise library? Your custom exercises will be removed (history stays).', 'set.resetDone': 'Default exercises restored',
    'set.export': 'Export (JSON)', 'set.exported': 'Export downloaded', 'set.logout': 'Sign out',
    // analytics
    'an.title': 'Detailed stats', 'an.empty': 'Charts appear after your first finished workouts.', 'an.period': 'Period',
    'an.workouts': 'Workouts', 'an.perWeek': '{n} per week', 'an.volume': 'Volume', 'an.volumeSub': 'weight × reps',
    'an.sets': 'Sets', 'an.setsSub': 'completed', 'an.avg': 'Avg duration', 'an.avgSub': 'per workout',
    'an.progress': 'Exercise progress', 'an.exercise': 'Exercise', 'an.e1rm': 'Est. 1RM', 'an.top': 'Top weight', 'an.maxReps': 'Max reps',
    'an.pb': 'Max', 'an.sessions': 'Sessions', 'an.change': 'Top weight change', 'an.date': 'Date', 'an.setsCol': 'Sets', 'an.volCol': 'Volume',
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
    'undo.group': 'group rename', 'undo.reset': 'templates reset', 'undo.library': 'exercise library change', 'undo.rename': 'exercise rename', 'undo.workout': 'workout deleted',
    'tpl.main': 'Main templates', 'tpl.variant': 'Variant', 'tpl.addVariant': 'Add variant', 'tpl.duplicate': 'Copy to My templates',
    'tpl.renameGroup': 'Rename group', 'tpl.groupName': 'Group name', 'tpl.groupSub': 'Description (optional)', 'tpl.lastInGroup': 'Keep at least one template in the group',
    'set.resetTpl': 'Reset templates', 'set.confirmResetTpl': 'Restore the default main templates for this profile? My templates stay untouched.', 'set.resetTplDone': 'Main templates restored',
    // errors
    'err.load': 'Loading data failed: {m}', 'err.save': 'Saving failed: {m}', 'err.delete': 'Deleting failed: {m}', 'err.login': 'Sign-in failed: {m}',
    'crash.title': 'Something broke on this screen', 'crash.msg': 'Your workout in progress is saved on this device. Reload the app to continue.', 'crash.reload': 'Reload app', 'crash.home': 'Back to Home',

    // v5
    'login.denied': 'The account {email} does not have access to this app.',
    'nav.main': 'Main navigation',
    'wo.time': 'Minutes, set {n}', 'wo.dec': 'Decrease: {what}', 'wo.inc': 'Increase: {what}',
    'wo.last': 'last', 'wo.goal': 'goal', 'wo.more': 'More actions: {name}', 'wo.warmOn': 'Mark as warm-up set', 'wo.warmOff': 'Mark as working set', 'wo.warmNote': 'warm-up · not counted',
    'wo.addWarm': 'Add warm-up set', 'wo.noteTitle': 'Note & RPE', 'wo.notePh': 'How did it feel? Seat height, grip…', 'wo.rpe': 'RPE (effort)', 'wo.rpeHelp': '10 = nothing left · 8 = two reps in reserve · 6 = easy',
    'wo.syncTitle': 'Update “{name}”?', 'wo.syncMsg': 'You changed exercises, their order, the number of sets or supersets. Save this structure to the template for next time?',
    'wo.syncYes': 'Update template', 'wo.syncNo': 'Keep template', 'wo.synced': 'Template “{name}” updated',
    'ss.label': 'Superset {l}', 'ss.link': 'Superset with “{name}”', 'ss.unlink': 'Remove from superset', 'ss.linkNext': 'Superset with next', 'ss.linked': 'Superset with next ✓', 'ss.short': 'superset',
    'plate.title': 'Plate calculator', 'plate.total': 'Total weight (kg)', 'plate.bar': 'Bar', 'plate.perSide': 'Per side', 'plate.empty': 'Just the bar.',
    'plate.light': 'Less than the bar itself ({bar} kg).', 'plate.rest': '{n} kg can’t be made with standard plates.',
    'sum.eyebrow': 'Workout complete', 'sum.records': 'Records', 'sum.recordsSub': 'beaten today', 'sum.newRecords': 'New records', 'sum.vsPrev': 'Compared with the previous one on {d}',
    'sum.done': 'Done', 'sum.ctaTitle': 'Like it? Get your own Forge', 'sum.ctaText': 'A private version with your own split, templates and data – set up for you.',
    'rec.title': 'Records', 'rec.e1': 'e1RM {v} kg', 'rec.reps': '{r} reps @ {w} kg', 'rec.mostAt': 'Most reps @ {w} kg', 'rec.nReps': { one: '{n} rep', other: '{n} reps' },
    'hist.thisWeek': 'This week', 'hist.lastWeek': 'Last week', 'hist.weekOf': 'Week of {d}', 'hist.weekSum': { one: '{n} workout · {v} t', other: '{n} workouts · {v} t' },
    'hist.pbBadge': { one: '{n} record', other: '{n} records' }, 'hist.repeat': 'Repeat', 'hist.searchEx': 'Find exercise…',
    'cmp.more': 'More metrics', 'cmp.less': 'Fewer metrics', 'cmp.explain': 'Density = kg lifted per minute. Intensity = average weight as a % of your best estimated 1RM before this workout.',
    'ms.allEx': 'All exercises ({n})', 'ms.allTitle': 'All exercises',
    'tpl.mainSub': 'Your training rotation. Home suggests the next one in order: {order}.', 'tpl.mineSub': 'Extra or one-off workouts outside the rotation.',
    'tpl.planIs': 'Per-set plan: {p}. Changing sets, reps or weight replaces it.',
    'home.weekGoal': 'weekly goal', 'guide.title': 'Getting started', 'guide.hide': 'Hide guide',
    'guide.start': 'Start a workout', 'guide.startSub': 'Pick your next template in Quick start.', 'guide.set': 'Tick a set', 'guide.setSub': 'The rest timer starts on its own.',
    'guide.stats': 'Check your progress', 'guide.statsSub': 'Tap the tiles below for stats and records.',
    'del.section': 'Delete account', 'del.sectionSub': 'Permanently deletes your workouts, records, templates and settings, and your sign-in. Export a backup first if you want to keep anything.', 'del.btn': 'Delete account and data', 'del.busy': 'Deleting…', 'del.title': 'Delete your account?', 'del.msg': { one: 'This permanently deletes {n} workout and everything else in your account. It cannot be undone.', other: 'This permanently deletes {n} workouts and everything else in your account. It cannot be undone.' }, 'del.word': 'DELETE', 'del.type': 'Type {word} to confirm', 'del.ok': 'Delete forever', 'del.mismatch': 'Type {word} to confirm', 'del.done': 'Your account and all data were deleted.', 'del.doneData': 'All data was deleted and you were signed out. The sign-in record will be removed by the admin.', 'del.fail': 'Deleting failed: {m}', 'del.offline': 'Deleting your account needs a connection.', 'legal.privacy': 'Privacy policy',
    'set.backup': 'Backup', 'set.backupSub': 'Export your data or restore it from a file. Import adds to what you have.', 'set.import': 'Import',
    'set.importBad': 'This file is not a Forge backup.', 'set.langFail': 'Couldn’t load Czech – try again online.', 'set.importOffline': 'Import needs a connection – try again online.', 'set.importConfirm': { one: 'Import {n} workout from this backup? Existing data stays.', other: 'Import {n} workouts from this backup? Existing data stays.' },
    'set.importTplConfirm': { one: 'Import {n} template from this file? Nothing else changes.', other: 'Import {n} templates from this file? Nothing else changes.' },
    'set.importDone': 'Imported: {w} workouts, {t} templates, {e} exercises', 'set.danger': 'Reset', 'set.dangerSub': 'Restores defaults. Your workout history stays.',
    'prof.demoSub': 'Two sample splits: Push/Pull/Legs and Upper/Lower',
    'groups.FULLA': 'Squat, bench, row', 'groups.FULLB': 'Deadlift, incline, pulldown', 'groups.FULLC': 'Leg press, overhead press, row',
    'start.title': 'Choose your starting split', 'start.sub': 'It gets copied to your account – rename, edit or delete anything later in Templates.',
    'start.ppl': 'Push / Pull / Legs', 'start.pplSub': '3 groups, Normal and Hardcore variants. Classic split for 3–6 days a week.',
    'start.ul': 'Upper / Lower + Abs', 'start.ulSub': 'Upper and lower body days (A/B) plus a core & cardio session.',
    'start.fb': 'Full body 3× a week', 'start.fbSub': 'Three whole-body workouts A / B / C – great for 3 days a week.',
    'start.resetMsg': 'Your main templates will be replaced by the chosen starting split. Workout history and your own templates stay.', 'start.current': 'current',
    'look.title': 'Appearance', 'look.sub': 'Just for your account – synced across your devices.', 'look.tint': 'Background tint', 'look.strength': 'Tint strength · {n} %',
    'look.accent': 'Button colour', 'look.none': 'Default', 'look.custom': 'Custom colour', 'look.preview': 'Preview',
    'acc.title': 'Access', 'acc.sub': 'Who can sign in. Everyone has their own data, templates and look.', 'acc.email': 'Google account e-mail', 'acc.add': 'Add',
    'acc.founder': 'admin', 'acc.loading': 'Loading…', 'acc.bad': 'That doesn’t look like an e-mail address.', 'acc.exists': 'This account already has access.',
    'acc.added': '{email} can now sign in', 'acc.remove': 'Remove access', 'acc.removeConfirm': 'Remove access for {email}? Their data stays, they just can’t sign in.',
    'acc.removed': 'Access removed', 'acc.saveErr': 'Couldn’t save – check the Firestore rules are deployed.', 'acc.loadErr': 'Couldn’t load the access list.',
    'pv.label': 'App preview', 'pv.workout': 'Log sets in seconds', 'pv.workoutSub': 'Last time and your next goal under every set. Rest timer starts on its own.',
    'pv.summary': 'See every record', 'pv.summarySub': 'A summary after each workout – new records and the comparison with last time.',
    'pv.stats': 'Progress at a glance', 'pv.statsSub': 'Weekly goal streak, key lifts and muscle balance.',
    'pv.exercise': 'Every exercise, in detail', 'pv.exerciseSub': 'Estimated 1RM chart, records and your next target.',
    'pv.looks': 'Make it yours', 'pv.looksSub': 'Your split, your templates, your colours.',
    'tour.start': 'Take the 1-minute tour', 'tour.next': 'Next', 'tour.skip': 'Skip tour', 'tour.close': 'Close',
    'tour.tick': 'Tick a set', 'tour.tickSub': 'Tap ✓ when the set is done – the rest timer starts on its own.',
    'tour.goal': 'Last time → goal', 'tour.goalSub': 'Under every set: what you lifted last time and the next step up (+1 rep, or more weight at the top of your range).',
    'tour.name': 'Exercise history', 'tour.nameSub': 'Tap the exercise name for its chart, records and past sessions – without leaving the workout.',
    'tour.replace': 'Station taken?', 'tour.replaceSub': 'Replace the exercise – similar movements are suggested first.',
    'tour.more': 'More options', 'tour.moreSub': 'Warm-up sets, notes & RPE, plate calculator, supersets and reordering.',
    'tour.finish': 'Finish the workout', 'tour.finishSub': 'Tap Finish workout. You can save the unticked sets or leave them out.',
    'tour.summary': 'Your summary', 'tour.summarySub': 'Duration, volume, sets and records – compared with the previous time you did this workout.',
    'tour.cta': 'That’s Forge', 'tour.ctaSub': 'Explore history and stats in the menu below. Want your own version? Tap the button above.',
    'wo.hold': 'hold', 'step.row': 'Weight step · {n} kg', 'step.title': 'Weight step', 'step.auto': 'Automatic',
    'step.help': 'How much the goal adds once every set reaches the top of the rep range. Automatic = learned from your history (e.g. a machine stack in 5 kg steps).',
    'tpl.range': 'Rep range {lo} –',
    'ms.title': 'Stats', 'ms.vsPrev': '{d} vs prev.', 'ms.goalOf': '{n} / {g} goal', 'ms.dow': 'M,T,W,T,F,S,S',
    'ms.nextUp': 'Next up:', 'ms.never': 'not trained yet', 'ms.lastToday': 'last one today', 'ms.lastAgo': { one: 'last one {n} day ago', other: 'last one {n} days ago' },
    'ms.keyLifts': 'Key lifts', 'ms.current': 'Latest', 'ms.pinHint': 'Your 5 most frequent exercises. Pin your own with ☆ in the detail.',
    'ms.pin': 'Pin to key lifts', 'ms.unpin': 'Unpin from key lifts', 'ms.pinned': 'Pinned', 'ms.pinMax': 'You can pin up to {n} exercises',
    'ms.muscles': 'Muscle balance', 'ms.mSets': 'Sets', 'ms.mAvg': 'vs avg', 'ms.fewest': 'Fewest sets this period: {cat}.',
    'ms.avgNote': 'Sets per week vs your average before this period', 'ms.noBase': 'Not enough older history to compare yet.', 'ms.below': '{cat} {p} % below', 'ms.total': '{n} total',
    'ms.fullText': 'Weekly volume, workout load, the full record table and exercise comparisons are in the detailed stats — best on desktop.',
    'ms.fullBtn': 'Detailed stats', 'ms.metric': 'Metric', 'ms.since': 'since {d}', 'ms.nSessions': { one: '{n} session', other: '{n} sessions' },
    'ms.target': 'Next target', 'ms.or': 'or {s}', 'ms.targetSub': 'one step further', 'ms.recent': 'Recent sessions',
    'rep.btn': 'Replace', 'rep.title': 'Replace exercise', 'rep.similar': 'Similar movement', 'rep.sameCat': 'Same muscle group · {cat}', 'rep.all': 'All exercises',
    'rep.done': '{from} → {to}', 'rep.doneSplit': 'Done sets kept · {to} added below',
    'undo.redoBtn': 'Redo', 'undo.redoTitle': 'Redo: {what} ({n} left)', 'undo.redone': 'Redone: {what}', 'undo.pill': 'Undo and redo',
    'wo.finishLong': 'Finish workout',
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
    'login.demoBtn': 'Try the demo', 'demo.badge': 'Demo', 'demo.local': 'Sample data · this browser only', 'demo.want': 'Get your own', 'demo.exit': 'Exit demo',
    'demo.reset': 'Reset sample data', 'demo.resetConfirm': 'Replace all demo data with fresh sample data?',
    'demo.formTitle': 'Want your own Forge?', 'demo.formLead': 'Leave your contact and I will get back to you with an offer for your own version – your templates, your account, your data.',
    'demo.name': 'Name', 'demo.email': 'E-mail', 'demo.msg': 'Message', 'demo.msgPh': 'What do you train, who would use it…',
    'demo.send': 'Send', 'demo.sending': 'Sending…', 'demo.sent': 'Thank you! I will be in touch soon.', 'demo.sendFail': 'Sending failed. Please try again.',
    'prof.demoA': 'PPL', 'prof.demoB': 'Upper/Lower',
    'wl.title': 'Workout load', 'wl.last': 'last {n}', 'wl.metric': 'Metric', 'wl.avg': 'Average / workout', 'wl.trend': 'Trend (last 4 vs previous 4)',
    'wl.m.score': 'Score', 'wl.m.sets': 'Sets', 'wl.m.exercises': 'Exercises', 'wl.m.volume': 'Volume', 'wl.m.minutes': 'Duration', 'wl.m.density': 'Density', 'wl.m.intensity': 'Intensity',
    'wl.h.score': 'Load score = sets × intensity / 10. Comparable across workouts.', 'wl.h.sets': 'Completed sets in the workout.', 'wl.h.exercises': 'Number of different exercises.',
    'wl.h.volume': 'Total weight lifted (weight × reps).', 'wl.h.minutes': 'Workout duration.', 'wl.h.density': 'Volume per minute – the higher, the denser the workout.',
    'wl.h.intensity': 'Average set weight as % of your estimated max (1RM) for that exercise. First sessions of a new exercise are not counted.',
    'wl.vsPrev': 'Compared with the previous {name} ({d})', 'wl.pts': 'pts',
    'wg.title': 'Weekly goal', 'wg.goal': '{n}× / week', 'wg.goalAria': 'Weekly goal', 'wg.less': 'Lower the goal', 'wg.more': 'Raise the goal',
    'wg.thisWeek': 'This week', 'wg.streak': 'Streak', 'wg.weeks': { one: 'week', other: 'weeks' }, 'wg.streakSub': 'goal met in a row',
    'wg.running': 'in progress', 'wg.met': 'goal met', 'wg.missed': 'goal missed', 'wg.weekAria': 'Week of {d}: {n}',
    'wg.split': 'Split balance', 'wg.last30': 'last 30 days', 'wg.lag': '{g} is falling behind – last done {n} days ago', 'wg.lagNever': '{g} not done yet',
    'count.workouts': { one: '{n} workout', other: '{n} workouts' },
    'hist.edit': 'Edit', 'edit.title': 'Edit workout', 'edit.name': 'Name', 'edit.start': 'Start', 'edit.duration': 'Duration (min)',
    'edit.save': 'Save changes', 'edit.saved': 'Workout updated', 'edit.needSet': 'Keep at least one set with reps or time.',
    'edit.future': 'The start cannot be in the future.', 'edit.discard': 'Discard your changes?', 'edit.discardOk': 'Discard', 'undo.workoutEdit': 'workout edit',
  }
};

// Množná čísla přes Intl.PluralRules (cs: one / few / many / other). Hodnota klíče může být text nebo {one, few, other…}.
export const EN = D.en;

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

if (typeof document !== 'undefined') document.documentElement.lang = storedLang();

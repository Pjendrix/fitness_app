// „Proč to tak funguje“ – pravidla aplikace, důvod a zdroj. Shrnutí trenérské revize (10/2026).
// level: 'strong' = metaanalýzy / konsenzus odborných společností, 'moderate' = jednotlivé studie / preprinty,
//        'practice' = trenérská praxe nebo designové rozhodnutí bez přímé studie (poctivě označené).
// Texty jsou dvojjazyčné { cs, en }; zdroje (anglicky) vedou na originál nebo spolehlivé shrnutí.

const S = {
  acsm: { label: 'ACSM 2026 – Resistance Training Position Stand', url: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  acsmInfo: { label: 'ACSM 2026 – infographic', url: 'https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf' },
  hprc: { label: 'HPRC / NSCA – progressing your training', url: 'https://www.hprc-online.org/physical-fitness/training-performance/guidelines-progress-your-physical-training-over-time' },
  robinson: { label: 'Robinson et al. 2024 – proximity to failure (meta-regression)', url: 'https://sportrxiv.org/index.php/server/preprint/view/295' },
  refalo24: { label: 'Refalo et al. 2024 – failure vs 1–2 RIR', url: 'https://pubmed.ncbi.nlm.nih.gov/38393985/' },
  refalo25: { label: 'Refalo et al. 2025 – failure and enjoyment (summary)', url: 'https://train.fitness/personal-trainer-blogs/should-we-train-to-failure' },
  refaloSex: { label: 'Refalo et al. 2025 – sex differences in hypertrophy (PeerJ)', url: 'https://peerj.com/articles/19042' },
  pelland: { label: 'Pelland et al. 2026 – volume and frequency', url: 'https://sportrxiv.org/index.php/server/preprint/view/460' },
  singer: { label: 'Singer et al. 2024 – rest intervals', url: 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/text' },
  bell: { label: 'Bell et al. 2023 – deloading, Delphi consensus', url: 'https://shura.shu.ac.uk/32417/1/s40798-023-00633-0.pdf' },
  coleman: { label: 'Coleman et al. 2024 – a week of training cessation', url: 'https://peerj.com/articles/16777' },
  nsca: { label: 'NSCA – safest and riskiest forms of resistance training', url: 'https://www.nsca.com/education/articles/ptq/the-safest-and-riskiest-forms-of-resistance-training/' },
  marzagao: { label: 'Marzagão 2026 – 1RM estimation accuracy (preprint)', url: 'https://arxiv.org/pdf/2603.17495' },
  deci: { label: 'Deci, Koestner & Ryan 1999 – rewards and intrinsic motivation', url: 'https://doi.org/10.1037/0033-2909.125.6.627' },
  jsams: { label: 'JSAMS 2024 – relative strength of powerlifters by sex', url: 'https://lida.sport-iat.de/ta/Record/4088979' },
  anderberg: { label: 'Anderberg et al. 2025 – fitness apps and disordered eating', url: 'https://news.flinders.edu.au/blog/2025/02/22/fitness-apps-fuelling-disordered-eating/' },
  iraki: { label: 'Iraki et al. 2019 – rate of body-weight change', url: 'https://www.mdpi.com/2075-4663/7/7/154' },
  etkin: { label: 'Etkin 2016 – the hidden cost of personal quantification', url: 'https://www.fuqua.duke.edu/duke-fuqua-insights/etkin-counting-steps' },
  milkman: { label: 'Milkman et al. 2021 – gym megastudy, n = 61,293 (Nature)', url: 'https://www.nature.com/articles/s41586-021-04128-4' },
  sharif: { label: 'Sharif & Shu – emergency reserves in goals', url: 'https://anderson-review.ucla.edu/emergency-reserves/' },
  silverman: { label: 'Silverman & Barasch 2023 – broken streaks', url: 'https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions' },
  lally: { label: 'Lally et al. 2010 – how habits are formed', url: 'https://doi.org/10.1002/ejsp.674' },
  buyalskaya: { label: 'Buyalskaya et al. 2023 – gym habit formation (PNAS)', url: 'https://sciencedaily.com/releases/2023/04/230417155750.htm' },
  apple: { label: 'watchOS 11 – pausing rings, goals per day', url: 'https://www.bgr.com/tech/watchos-11-activity-rings-have-big-changes-heres-whats-new/' },
  mazeas: { label: 'Mazeas et al. 2022 – gamification and activity (meta-analysis)', url: 'https://jmir.org/2022/1/e26779' },
  who: { label: 'WHO 2020 – physical activity guidelines (Bull et al.)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/' },
  colenso: { label: 'Colenso-Semple et al. 2023 – menstrual cycle and training', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834' },
  mcnulty: { label: 'McNulty et al. 2020 – cycle phase and performance (meta-analysis)', url: 'https://rgu-repository.worktribe.com/output/940959' },
  mountjoy: { label: 'Mountjoy et al. 2023 – IOC consensus on REDs (BJSM)', url: 'https://bjsm.bmj.com/content/57/17/1073' },
};

export const PRINCIPLES = [
  {
    id: 'progress',
    title: { cs: 'Progrese', en: 'Progression' },
    items: [
      {
        id: 'double',
        level: 'strong',
        title: { cs: 'Nejdřív opakování, pak váha', en: 'Reps first, then weight' },
        rule: {
          cs: 'Každá série přidá 1 opakování, dokud všechny nedojdou na horní hranici rozsahu (např. 8–12). Pak se přidá jeden krok váhy a opakování se vrátí dolů.',
          en: 'Each set adds one rep until all sets reach the top of the range (e.g. 8–12). Then the weight goes up one step and reps drop back to the bottom.',
        },
        why: {
          cs: 'Dvojitá progrese je standardní postup pro rekreační cvičence: zátěž roste po malých krocích a technika se stihne přizpůsobit. Doporučené přírůstky jsou zhruba 1–2,5 kg u horní poloviny těla a 2,5–5 kg u nohou.',
          en: 'Double progression is the standard approach for recreational lifters: load rises in small steps and technique keeps up. Recommended increments are roughly 1–2.5 kg for the upper body and 2.5–5 kg for the legs.',
        },
        sources: [S.hprc, S.acsm],
      },
      {
        id: 'rir',
        level: 'strong',
        title: { cs: 'Cíl RIR: 2–3 u základních cviků, 0–2 u izolací', en: 'RIR target: 2–3 on compounds, 0–2 on isolation' },
        rule: {
          cs: 'Pod názvem cviku je, kolik opakování si nechat v rezervě (RIR). Dřep, mrtvý tah, bench, přítahy: 2–3. Izolace a stroje: 0–2.',
          en: 'Under each exercise name you see how many reps to keep in reserve (RIR). Squat, deadlift, bench, rows: 2–3. Isolation and machines: 0–2.',
        },
        why: {
          cs: 'Pro sílu na vzdálenosti od selhání v širokém rozmezí skoro nezáleží; pro růst svalu blízkost k selhání mírně pomáhá. V přímém srovnání ale selhání a 1–2 RIR daly podobný růst, a selhání přineslo víc nepohodlí. ACSM 2026 uvádí trénink do selhání jako volitelný. U těžkých vícekloubových cviků větší rezerva navíc chrání techniku.',
          en: 'For strength, proximity to failure barely matters over a wide range; for muscle growth, getting closer helps a little. In a head-to-head study failure and 1–2 RIR gave similar growth, and failure felt worse. ACSM 2026 lists training to failure as optional. On heavy compound lifts a bigger reserve also protects technique.',
        },
        sources: [S.robinson, S.refalo24, S.refalo25, S.acsmInfo],
      },
      {
        id: 'hold',
        level: 'practice',
        title: { cs: '„Drž“ po RPE 10, „drž · ověř“ na horní hranici', en: '“Hold” after RPE 10, “hold · confirm” at the top' },
        rule: {
          cs: 'Když jsi minule zapsal RPE 10, aplikace nepřidává opakování a napíše „drž“. Když jsi na horní hranici rozsahu, ale s RPE 9,5–10, napíše „drž · ověř“ – váha se zvedne, až to půjde s rezervou.',
          en: 'If you logged RPE 10 last time, the app doesn’t add a rep and says “hold”. If you reached the top of the range but at RPE 9.5–10, it says “hold · confirm” – the weight goes up once you can do it with reps in reserve.',
        },
        why: {
          cs: 'Série dotažená na doraz signalizuje, že další krok by byl příliš velký skok. Pravidlo „2 za 2“ (o 2 opakování víc než cíl dva tréninky po sobě) je běžná trenérská praxe, kterou NSCA doporučuje. Pozor: přímou studii, která by srovnala tohle konkrétní pravidlo s jiným, nemám.',
          en: 'A set ground out to the limit signals that the next step would be too big a jump. The “2-for-2” rule (two reps over target two sessions in a row) is common coaching practice recommended by the NSCA. Note: there is no direct study comparing this exact rule with another.',
        },
        sources: [S.hprc, S.nsca],
      },
      {
        id: 'reset',
        level: 'practice',
        title: { cs: 'Stagnace 3 tréninky → reset −10 %', en: 'Stalled 3 sessions → reset −10 %' },
        rule: {
          cs: 'Když tři poslední tréninky cviku nepřekonaly odhad 1RM tréninku před nimi, aplikace navrhne ubrat asi 10 % a znovu stoupat. Tréninky z lehkého týdne se nepočítají.',
          en: 'If the last three sessions of an exercise didn’t beat the estimated 1RM of the session before them, the app suggests dropping about 10 % and building back up. Light-week sessions don’t count.',
        },
        why: {
          cs: 'U pokročilejších je stagnace normální a nedá se prorazit dalším „+1“. Krátký krok zpátky sníží únavu a obvykle vede k novému maximu během pár týdnů. Prahy 3 tréninky a 10 % jsou trenérská praxe, ne čísla z RCT.',
          en: 'Plateaus are normal for intermediate lifters and pushing “+1” again rarely breaks them. A short step back lowers fatigue and usually leads to a new best within a few weeks. The 3-session and 10 % thresholds are coaching practice, not RCT numbers.',
        },
        sources: [S.bell],
      },
      {
        id: 'light',
        level: 'practice',
        title: { cs: 'Lehké váhy: víc opakování dřív než víc kil', en: 'Light weights: more reps before more kilos' },
        rule: {
          cs: 'Když by nejmenší krok váhy znamenal velký relativní skok (3 kg → 5 kg = +67 %), rozsah se rozšíří o 3–6 opakování (např. 8–12 → 8–18).',
          en: 'When the smallest weight step would be a big relative jump (3 kg → 5 kg = +67 %), the range widens by 3–6 reps (e.g. 8–12 → 8–18).',
        },
        why: {
          cs: 'Doporučené přírůstky jsou malé a relativní. Pevný krok 2 kg je u benchu 60 kg zanedbatelný, ale u upažování s 3 kg je to dvoutřetinový skok, který rozbije techniku. Víc opakování dá svalu podobný podnět, dokud není další váha zvládnutelná. Alternativa: v menu cviku nastav menší krok (1 kg).',
          en: 'Recommended increments are small and relative. A fixed 2 kg step means nothing on a 60 kg bench but is a two-thirds jump on a 3 kg lateral raise and breaks technique. Extra reps give the muscle a similar stimulus until the next weight is manageable. Alternative: set a smaller step (1 kg) in the exercise menu.',
        },
        sources: [S.hprc, S.pelland],
      },
      {
        id: 'cap',
        level: 'practice',
        title: { cs: 'Strop u „max“ sérií a vlastní váhy', en: 'A cap for “max” sets and bodyweight' },
        rule: {
          cs: 'Série „max“ s váhou přestanou přidávat opakování na 15, cviky s vlastní vahou na 20 – pak aplikace navrhne přidat zátěž nebo těžší variantu.',
          en: '“Max” sets with weight stop adding reps at 15, bodyweight exercises at 20 – then the app suggests adding load or a harder variation.',
        },
        why: {
          cs: 'Nad zhruba 15–20 opakování už další opakování přinášejí hlavně únavu a horší techniku, ne víc podnětu. Odhad 1RM je tam navíc nepřesný. Těžší varianta udrží cvik v rozumném rozsahu.',
          en: 'Beyond roughly 15–20 reps, extra reps mostly add fatigue and worse technique, not more stimulus. Estimated 1RM is also unreliable there. A harder variation keeps the exercise in a sensible range.',
        },
        sources: [S.nsca, S.marzagao],
      },
      {
        id: 'deload',
        level: 'strong',
        title: { cs: 'Lehký týden (deload)', en: 'Light week (deload)' },
        rule: {
          cs: '7 dní s asi 60 % sérií, stejnými vahami a RIR 3–4. Aplikace ho nabídne po 8 týdnech bez přestávky nebo když výkon klesne u 2+ cviků. Týden se počítá jako splněný.',
          en: '7 days with about 60 % of the sets, the same weights and RIR 3–4. The app suggests it after 8 weeks without a break or when performance drops on 2+ exercises. The week counts as on plan.',
        },
        why: {
          cs: 'Expertní konsenzus: deload zhruba každé 4–6 týdnů na ~7 dní, hlavně snížením objemu, plánovaně nebo podle únavy. Týden úplného volna vedl ke stejnému růstu svalů, ale o něco menší síle – proto lehký trénink místo úplné pauzy. Je to nabídka, ne povinnost.',
          en: 'Expert consensus: a deload about every 4–6 weeks for ~7 days, mainly by cutting volume, planned or when fatigued. A week fully off gave the same muscle growth but slightly less strength – hence light training instead of a full break. It’s an offer, not a rule.',
        },
        sources: [S.bell, S.coleman],
      },
    ],
  },
  {
    id: 'records',
    title: { cs: 'Rekordy', en: 'Records' },
    items: [
      {
        id: 'reach',
        level: 'moderate',
        title: { cs: 'Rekord na dosah je jen doplněk', en: 'Record hints are only an add-on' },
        rule: {
          cs: 'Tip „rekord“ se ukáže jen za cílem progrese a jen se stejnou vahou. Nikdy nenahradí „drž“ a nikdy nenabídne těžký singl uprostřed tréninku.',
          en: 'The “record” hint appears only after the progression target and only at the same weight. It never replaces “hold” and never suggests a heavy single mid-workout.',
        },
        why: {
          cs: 'Informační zpětná vazba o pokroku vnitřní motivaci podporuje, očekávané a kontrolující odměny ji spíš oslabují. Rekreační posilování má velmi nízkou úrazovost; riziko roste hlavně s těžkou zátěží blízko maxima a s technikou rozbitou únavou. Přímá data o rekordních tipech v aplikacích nejsou – jde o úsudek z rizikových faktorů.',
          en: 'Informational feedback about progress supports intrinsic motivation; expected, controlling rewards tend to undermine it. Recreational lifting has very low injury rates; risk rises mainly with near-maximal loads and fatigue-broken technique. There is no direct data on record hints in apps – this is a judgement from risk factors.',
        },
        sources: [S.deci, S.nsca],
      },
      {
        id: 'e1',
        level: 'moderate',
        title: { cs: 'Odhad 1RM jen ze sérií do 10 opakování', en: 'Estimated 1RM only from sets of up to 10 reps' },
        rule: {
          cs: 'Rekord e1RM, silové milníky i „nejlepší zvednutí“ se počítají jen ze sérií do 10 opakování. Rekord opakování znamená těžší váhu na stejný počet opakování, ne víc opakování s lehčí vahou.',
          en: 'e1RM records, strength milestones and “best lift” only use sets of up to 10 reps. A rep record means a heavier weight for the same reps, not more reps with a lighter weight.',
        },
        why: {
          cs: 'Vzorce Epley a Brzycki jsou nejpřesnější kolem 5 opakování a s vyšším počtem rychle ztrácejí přesnost. Dřív tak „rekordy“ padaly z lehkých sérií na 15+ opakování a tlačily do zbytečných pokusů. Zdroj k přesnosti je preprint – ber ho jako orientační.',
          en: 'The Epley and Brzycki formulas are most accurate around 5 reps and lose accuracy quickly beyond that. Previously “records” fired from light sets of 15+ reps and pushed for needless attempts. The accuracy source is a preprint – treat it as indicative.',
        },
        sources: [S.marzagao],
      },
    ],
  },
  {
    id: 'strength',
    title: { cs: 'Síla', en: 'Strength' },
    items: [
      {
        id: 'self',
        level: 'strong',
        title: { cs: 'Silové milníky vůči sobě', en: 'Strength milestones vs yourself' },
        rule: {
          cs: 'Výchozí silové milníky měří růst odhadu 1RM proti tvému prvnímu tréninku na cvicích, které opravdu děláš (připnuté, pak nejčastější).',
          en: 'Default strength milestones measure estimated 1RM growth against your first session on the exercises you actually train (starred first, then the most frequent).',
        },
        why: {
          cs: 'Hlavní sdělení ACSM 2026: rozhoduje, u čeho vydržíš. Každý z vás má jiný split – srovnání s univerzálními čísly by Chiaře bez benche a dřepu s osou nic neukázalo. Pokrok vůči sobě je navíc informační zpětná vazba, která motivaci podporuje.',
          en: 'The key message of ACSM 2026: what matters is what you stick with. Each of you runs a different split – universal numbers would show nothing for a split without barbell bench or squat. Progress vs yourself is also informational feedback that supports motivation.',
        },
        sources: [S.acsm, S.deci],
      },
      {
        id: 'bw',
        level: 'moderate',
        title: { cs: 'Poměr k tělesné váze jen volitelně a podle pohlaví', en: 'Body-weight ratios: optional and by sex' },
        rule: {
          cs: 'Benchmarky vůči tělesné váze se zapínají v Nastavení zvlášť pro muže a ženy. Počítají se z odhadu 1RM a z průměrné váhy za 90 dní a nikdy se neukazují jako „nejbližší cíl“.',
          en: 'Body-weight benchmarks are switched on in Settings, separately for men and women. They use estimated 1RM and your 90-day average weight and never show up as the “closest goal”.',
        },
        why: {
          cs: 'Muži mají relativně o 25–30 % víc síly a nejvyšší relativní sílu mají nejlehčí váhové kategorie – poměr k váze tedy z principu odměňuje nižší váhu. Fitness aplikace se spojují s vyšším výskytem poruch příjmu potravy, hlavně přes tlak na cíle. 90denní průměr zajistí, že hubnutí samo stupeň neposune. Ženské prahy jsou odvozené ze soutěžních dat, ne z norem pro rekreační cvičenky.',
          en: 'Men are about 25–30 % stronger relative to body weight, and the lightest classes have the highest relative strength – so ratios inherently reward lower weight. Fitness apps are linked to more disordered-eating symptoms, mainly through goal pressure. The 90-day average makes sure weight loss alone doesn’t raise a tier. Women’s thresholds are derived from competition data, not recreational norms.',
        },
        sources: [S.jsams, S.anderberg, S.iraki, S.refaloSex],
      },
    ],
  },
  {
    id: 'habit',
    title: { cs: 'Motivace a pravidelnost', en: 'Motivation and consistency' },
    items: [
      {
        id: 'heat',
        level: 'practice',
        title: { cs: 'Heat podle tvého cíle – víc tréninků ho nezvedne', en: 'Heat follows your goal – more workouts don’t raise it' },
        rule: {
          cs: 'Počítá se nejvýš 1 trénink denně a tolik týdně, kolik je tvůj cíl. White-hot = plníš svůj plán, ne trénuješ nad něj.',
          en: 'At most 1 workout a day and as many a week as your goal count. White-hot = you’re on plan, not training above it.',
        },
        why: {
          cs: 'Dřív nejvyšší stav vyžadoval trénovat víc, než sis naplánoval. Samotné měření zvyšuje výkon, ale snižuje požitek – a když se pak měřit přestane, lidé dělají méně než předtím. Odměna za pravidelnost místo objemu tenhle efekt tlumí. Je to designové rozhodnutí; studie přímo o „teplotních“ skóre nejsou.',
          en: 'Previously the top state required training more than you planned. Measuring an activity raises output but lowers enjoyment – and when tracking stops, people do less than before. Rewarding consistency instead of volume softens that. This is a design decision; there are no studies on “heat” scores specifically.',
        },
        sources: [S.etkin, S.mazeas],
      },
      {
        id: 'comeback',
        level: 'strong',
        title: { cs: 'Návrat po pauze se počítá dvakrát', en: 'Coming back after a break counts double' },
        rule: {
          cs: 'První trénink po 7+ dnech bez tréninku přitopí Heat dvojnásob, souhrn napíše „Vítej zpátky“ a přibude milník Návrat.',
          en: 'The first workout after 7+ days off adds double Heat, the summary says “Welcome back” and the Comeback milestone grows.',
        },
        why: {
          cs: 'V megastudii s 61 293 členy posiloven a 54 intervencemi fungovala nejlépe malá odměna za návrat po vynechaném tréninku: +27 % návštěv. Nejsilnějším prediktorem další návštěvy je doba od té poslední – návrat je tedy přesně ten moment, na kterém záleží.',
          en: 'In a megastudy of 61,293 gym members and 54 interventions, the best one was a small reward for returning after a missed workout: +27 % visits. The strongest predictor of the next visit is time since the last one – so the return is exactly the moment that matters.',
        },
        sources: [S.milkman, S.buyalskaya],
      },
      {
        id: 'joker',
        level: 'moderate',
        title: { cs: 'Joker týden a pauza', en: 'Joker week and pause' },
        rule: {
          cs: 'Jeden nesplněný týden za 4 týdny se automaticky odpustí a série drží. Pauza (nemoc, dovolená, zranění) zmrazí Heat i sérii a skončí s dalším tréninkem.',
          en: 'One missed week every 4 weeks is forgiven automatically and the streak holds. A pause (illness, holiday, injury) freezes Heat and the streak and ends with your next workout.',
        },
        why: {
          cs: 'Viditelně přerušená série sama snižuje další zapojení – hlavně když si to člověk přičte sám sobě. Cíle s malou rezervou na vynechání lidé plní o ~40 % častěji a po zaváhání se vracejí v 55 % případů místo 37–44 %. Jeden vynechaný trénink návyk nerozbije. Stejným směrem šel Apple ve watchOS 11.',
          en: 'A visibly broken streak reduces engagement by itself – especially when people blame themselves. Goals with a small skip allowance are reached ~40 % more often, and people bounce back 55 % of the time instead of 37–44 %. One missed session doesn’t break a habit. Apple went the same way in watchOS 11.',
        },
        sources: [S.silverman, S.sharif, S.lally, S.apple],
      },
      {
        id: 'goal',
        level: 'moderate',
        title: { cs: 'Týdenní cíl a dny volna', en: 'Weekly goal and rest days' },
        rule: {
          cs: 'Cíl se měří v týdnech, ne ve dnech. Při cíli 6–7 tréninků týdně aplikace upozorní, že nenechává den volna.',
          en: 'The goal is measured in weeks, not days. With a goal of 6–7 workouts a week the app warns that it leaves no rest day.',
        },
        why: {
          cs: 'Návyk chodit do posilovny se tvoří zhruba šest měsíců a na čase dne nezáleží – flexibilní týdenní rámec je proto lepší než denní série. Každá partie by měla dostat podnět aspoň 2× týdně; den volna je součást regenerace, ne selhání.',
          en: 'A gym habit takes about six months to form and time of day doesn’t matter – a flexible weekly frame beats daily streaks. Each muscle should be trained at least twice a week; a rest day is part of recovery, not a failure.',
        },
        sources: [S.buyalskaya, S.acsm],
      },
    ],
  },
  {
    id: 'health',
    title: { cs: 'Kardio a zdraví', en: 'Cardio and health' },
    items: [
      {
        id: 'cardio',
        level: 'strong',
        title: { cs: 'Kardio: 150 minut týdně podle WHO', en: 'Cardio: 150 minutes a week (WHO)' },
        rule: {
          cs: 'Karta týdne sčítá minuty kardia (rychlé záznamy + kardio cviky z tréninků). Intenzivní minuta se počítá dvakrát. Kardio se nepočítá do cíle tréninků ani do Heatu.',
          en: 'The week card adds up cardio minutes (quick logs + cardio exercises from workouts). A vigorous minute counts double. Cardio doesn’t count towards the workout goal or Heat.',
        },
        why: {
          cs: 'WHO doporučuje 150–300 minut středně intenzivní (nebo 75–150 minut intenzivní) aerobní aktivity týdně k tomu aspoň 2 dny posilování. Počítají se i krátké úseky, třeba svižná cesta do práce. Oddělený cíl brání tomu, aby běh „splnil“ silový plán.',
          en: 'WHO recommends 150–300 minutes of moderate (or 75–150 minutes of vigorous) aerobic activity a week plus at least 2 strength days. Short bouts count too, like a brisk walk to work. A separate goal stops a run from “completing” your strength plan.',
        },
        sources: [S.who],
      },
      {
        id: 'nocal',
        level: 'moderate',
        title: { cs: 'Bez kalorií a bez cílů na váhu', en: 'No calories and no weight goals' },
        rule: {
          cs: 'Aplikace nepočítá kalorie ani makra a tělesná váha nemá cíl ani barvy.',
          en: 'The app doesn’t track calories or macros, and body weight has no goal and no colours.',
        },
        why: {
          cs: 'Přehled 38 studií spojuje aplikace na dietu a fitness s víc příznaky poruch příjmu potravy a horším vnímáním těla; mechanismem je tlak na plnění cílů a pocity viny. Pro trénink ve Forge tyto údaje nepotřebuješ.',
          en: 'A review of 38 studies links diet and fitness apps with more disordered-eating symptoms and worse body image, through goal pressure and guilt. Forge doesn’t need this data for training.',
        },
        sources: [S.anderberg],
      },
      {
        id: 'cycle',
        level: 'strong',
        title: { cs: 'Žádné programování podle cyklu', en: 'No cycle-based programming' },
        rule: {
          cs: 'Ženy i muži mají stejnou logiku progrese; liší se jen absolutní váhy a kroky.',
          en: 'Women and men follow the same progression logic; only absolute weights and steps differ.',
        },
        why: {
          cs: 'Vliv fáze menstruačního cyklu na sílu je podle přehledu přehledů sporý a nekvalitní, průměrný efekt na výkon triviální. Ženy přitom rostou relativně stejně jako muži. Důležitým signálem je naopak vynechaná nebo nepravidelná menstruace – hlavní indikátor nízké energetické dostupnosti (REDs).',
          en: 'The effect of cycle phase on strength is, per an umbrella review, contested and low quality; the average effect on performance is trivial. Women gain at a similar relative rate to men. A missing or irregular period, on the other hand, is a key warning sign of low energy availability (REDs).',
        },
        sources: [S.colenso, S.mcnulty, S.refaloSex, S.mountjoy],
      },
    ],
  },
];

export const LEVELS = ['strong', 'moderate', 'practice'];

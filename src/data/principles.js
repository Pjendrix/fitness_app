// „Proč to tak funguje“ – pravidla aplikace, důvod a zdroj. Trenérská revize 10/2026 + revize důkazů 5.14.
// level: 'strong' = metaanalýzy / konsenzus odborných společností, 'moderate' = jednotlivé studie / preprinty,
//        'practice' = trenérská praxe nebo designové rozhodnutí bez přímé studie (poctivě označené).
// Texty jsou dvojjazyčné { cs, en }; zdroje (anglicky) vedou na originál nebo spolehlivé shrnutí.
// Zásada: text musí přesně odpovídat kódu (progress.js, gamify.js, breaks.js, cardio.js). Když měníš pravidlo, uprav i tohle.

const S = {
  acsm: { label: 'ACSM 2026 – Resistance Training Position Stand', url: 'https://acsm.org/resistance-training-guidelines-update-2026/' },
  acsmInfo: { label: 'ACSM 2026 – infographic', url: 'https://acsm.org/wp-content/uploads/2026/03/Resistance-Training-Position-Stand-infographic.pdf' },
  acsm09: { label: 'ACSM 2009 – Progression models in resistance training', url: 'https://doi.org/10.1249/MSS.0b013e3181915670' },
  hprc: { label: 'HPRC / NSCA – progressing your training', url: 'https://www.hprc-online.org/physical-fitness/training-performance/guidelines-progress-your-physical-training-over-time' },
  plotkin: { label: 'Plotkin et al. 2022 – progression by load vs by reps (RCT, PeerJ)', url: 'https://peerj.com/articles/14142' },
  lopez: { label: 'Lopez et al. 2021 – low vs moderate vs high load (network meta-analysis)', url: 'https://jyx.jyu.fi/handle/123456789/75929' },
  halperin: { label: 'Halperin et al. 2022 – accuracy of RIR predictions (meta-analysis)', url: 'https://sportrxiv.org/index.php/server/preprint/view/67' },
  robinson: { label: 'Robinson et al. 2024 – proximity to failure (meta-regression; Sports Med 2024)', url: 'https://sportrxiv.org/index.php/server/preprint/view/295' },
  refalo24: { label: 'Refalo et al. 2024 – failure vs 1–2 RIR', url: 'https://pubmed.ncbi.nlm.nih.gov/38393985/' },
  refalo25: { label: 'Refalo et al. 2025 – failure and enjoyment (summary)', url: 'https://train.fitness/personal-trainer-blogs/should-we-train-to-failure' },
  singer: { label: 'Singer et al. 2024 – rest intervals and hypertrophy (meta-analysis)', url: 'https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2024.1429789/full' },
  bell: { label: 'Bell et al. 2023 – deloading, Delphi consensus', url: 'https://shura.shu.ac.uk/32417/1/s40798-023-00633-0.pdf' },
  rogerson: { label: 'Rogerson et al. 2024 – deloading practices of athletes (survey, n = 246)', url: 'https://shura.shu.ac.uk/33446/1/s40798-024-00691-y.pdf' },
  coleman: { label: 'Coleman et al. 2024 – a week of training cessation (RCT)', url: 'https://peerj.com/articles/16777' },
  spiering: { label: 'Spiering et al. 2021 – maintaining strength with reduced training', url: 'https://pubmed.ncbi.nlm.nih.gov/33629972/' },
  nsca: { label: 'NSCA – safest and riskiest forms of resistance training', url: 'https://www.nsca.com/education/articles/ptq/the-safest-and-riskiest-forms-of-resistance-training/' },
  kerr: { label: 'Kerr et al. 2010 – weight-training injuries in US emergency departments', url: 'https://pubmed.ncbi.nlm.nih.gov/20139328/' },
  keogh: { label: 'Keogh & Winwood 2017 – injury epidemiology in weight-training sports', url: 'https://research.bond.edu.au/en/publications/the-epidemiology-of-injuries-across-the-weight-training-sports/' },
  reynolds: { label: 'Reynolds et al. 2006 – predicting 1RM from repetitions (≤ 10 reps)', url: 'https://www.unm.edu/~rrobergs/478RMStrengthPrediction.pdf' },
  nuzzo: { label: 'Nuzzo et al. 2024 – reps at % of 1RM, 269 studies (Sports Med)', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10933212/' },
  marzagao: { label: 'Marzagão 2026 – 1RM estimation accuracy (preprint)', url: 'https://arxiv.org/pdf/2603.17495' },
  deci: { label: 'Deci, Koestner & Ryan 1999 – rewards and intrinsic motivation', url: 'https://doi.org/10.1037/0033-2909.125.6.627' },
  steele: { label: 'Steele et al. 2023 – long-term strength gains, n = 14,690', url: 'https://pure.solent.ac.uk/en/publications/long-term-time-course-of-strength-adaptation-to-minimal-dose-resi/' },
  latella24: { label: 'Latella et al. 2024 – long-term strength adaptations in powerlifters', url: 'https://pure.solent.ac.uk/en/publications/using-powerlifting-athletes-to-determine-strength-adaptations-acr/' },
  latella20: { label: 'Latella et al. 2020 – strength progression by sex, n = 1,897', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC7448836/' },
  jones: { label: 'Jones et al. 2021 – sex differences in strength gains (Sports Med)', url: 'https://link.springer.com/article/10.1007/s40279-020-01388-4' },
  jsams: { label: 'JSAMS 2024 – relative strength of powerlifters by sex', url: 'https://lida.sport-iat.de/ta/Record/4088979' },
  jaric: { label: 'Jaric 2002 – normalising strength for body size', url: 'https://www.academia.edu/24324964/Muscle_Strength_Testing_Use_of_Normalization_for_Body_Size' },
  turicchi: { label: 'Turicchi et al. 2020 – weekly and holiday body-weight fluctuations', url: 'https://doaj.org/article/d41eea5765d944d8b6e3f5e1cd1d6af4' },
  anderberg: { label: 'Anderberg et al. 2025 – fitness apps and disordered eating', url: 'https://news.flinders.edu.au/blog/2025/02/22/fitness-apps-fuelling-disordered-eating/' },
  etkin: { label: 'Etkin 2016 – the hidden cost of personal quantification', url: 'https://www.fuqua.duke.edu/duke-fuqua-insights/etkin-counting-steps' },
  beshears: { label: 'Beshears et al. 2021 – flexible vs fixed-time gym incentives (Management Science)', url: 'https://ideas.repec.org/a/inm/ormnsc/v67y2021i7p4139-4171.html' },
  milkman: { label: 'Milkman et al. 2021 – gym megastudy, n = 61,293 (Nature)', url: 'https://www.nature.com/articles/s41586-021-04128-4' },
  sharif: { label: 'Sharif & Shu – emergency reserves in goals', url: 'https://anderson-review.ucla.edu/emergency-reserves/' },
  silverman: { label: 'Silverman & Barasch 2023 – broken streaks', url: 'https://www.colorado.edu/business/faculty-research/2023/04/19/or-track-how-broken-streaks-affect-consumer-decisions' },
  lally: { label: 'Lally et al. 2010 – how habits are formed', url: 'https://doi.org/10.1002/ejsp.674' },
  buyalskaya: { label: 'Buyalskaya et al. 2023 – gym habit formation (PNAS, summary)', url: 'https://sciencedaily.com/releases/2023/04/230417155750.htm' },
  mazeas: { label: 'Mazeas et al. 2022 – gamification and activity (meta-analysis)', url: 'https://jmir.org/2022/1/e26779' },
  hamari: { label: 'Hamari 2017 – badges and user activity (field experiment)', url: 'https://webpages.tuni.fi/gamification/2018/09/20/badges-increase-user-activity-a-field-experiment-on-the-effects-of-gamification/' },
  berli: { label: 'Berli et al. 2021 – giving support in couples and activity (Frontiers)', url: 'https://public-pages-files-2025.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2020.622492/text' },
  zhang: { label: 'Zhang et al. 2016 – social comparison vs support in exercise (RCT)', url: 'https://doaj.org/article/2ba9dd9830f646b898559c80cb04c5e3' },
  patel: { label: 'Patel et al. 2019 – STEP UP, competition vs collaboration (JAMA IM)', url: 'https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2749761' },
  who: { label: 'WHO 2020 – physical activity guidelines (Bull et al.)', url: 'https://www.ncbi.nlm.nih.gov/pmc/articles/PMC7719906/' },
  momma: { label: 'Momma et al. 2022 – muscle-strengthening activity and mortality (BJSM)', url: 'https://bjsm.bmj.com/content/56/13/755' },
  ekelund: { label: 'Ekelund et al. 2019 – activity dose and mortality (BMJ)', url: 'https://www.bmj.com/content/366/bmj.l4570' },
  schumann: { label: 'Schumann et al. 2022 – concurrent training, 43 studies (preprint)', url: 'https://sportrxiv.org/index.php/server/preprint/view/37' },
  lundberg: { label: 'Lundberg et al. 2022 – running vs cycling and hypertrophy (Sports Med)', url: 'https://link.springer.com/article/10.1007/s40279-022-01688-x' },
  silbernagel: { label: 'Silbernagel et al. 2007 – pain-monitoring model (RCT, PEDro)', url: 'https://search.pedro.org.au/search-results/record-detail/18389' },
  colenso: { label: 'Colenso-Semple et al. 2023 – menstrual cycle and training', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10076834' },
  mcnulty: { label: 'McNulty et al. 2020 – cycle phase and performance (meta-analysis)', url: 'https://rgu-repository.worktribe.com/output/940959' },
  refaloSex: { label: 'Refalo et al. 2025 – sex differences in hypertrophy (PeerJ)', url: 'https://peerj.com/articles/19042' },
  mountjoy: { label: 'Mountjoy et al. 2023 – IOC consensus on REDs (BJSM)', url: 'https://bjsm.bmj.com/content/57/17/1073' },
};

// Zkratka: i(id, level, [titleCs, titleEn], [ruleCs, ruleEn], [whyCs, whyEn], sources)
const i = (id, level, title, rule, why, sources) => ({
  id, level, title: { cs: title[0], en: title[1] }, rule: { cs: rule[0], en: rule[1] }, why: { cs: why[0], en: why[1] }, sources,
});

export const PRINCIPLES = [
  {
    id: 'progress',
    title: { cs: 'Progrese', en: 'Progression' },
    items: [
      i('double', 'strong', ['Nejdřív opakování, pak váha', 'Reps first, then weight'], [
        'Každá série přidá 1 opakování, dokud všechny nedojdou na horní hranici rozsahu (např. 8–12). Pak se přidá jeden krok váhy (2,5 kg osa, 2 kg jednoručky, 5 kg stroje – nebo naučený z historie) a opakování se vrátí dolů.',
        'Each set adds one rep until all sets reach the top of the range (e.g. 8–12). Then the weight goes up one step (2.5 kg barbell, 2 kg dumbbells, 5 kg machines – or learned from your history) and reps drop back to the bottom.',
      ], [
        'Přidané opakování je stejně platný pokrok jako přidaná váha: v randomizované studii s trénovanými lidmi vedlo přidávání opakování ke stejnému růstu svalu i síly jako přidávání zátěže. Sval roste podobně v širokém pásmu zátěže, síla preferuje těžší váhy – proto rozsah 8–12 je praktický start, ne „hypertrofní optimum“. Přírůstky drží doporučení ACSM 2–10 %.',
        'An added rep is as valid as added weight: in a randomised trial with trained lifters, adding reps gave the same muscle and strength gains as adding load. Muscle grows similarly across a wide load range while strength prefers heavier weights – so 8–12 is a practical starting point, not a “hypertrophy optimum”. Increments follow ACSM’s 2–10 %.',
      ], [S.plotkin, S.lopez, S.acsm09, S.hprc]),
      i('rir', 'strong', ['Cíl RIR podle typu cviku', 'RIR target by exercise type'], [
        'Pod názvem cviku je, kolik opakování si nechat v rezervě: vícekloubové s volnou vahou (dřep, mrtvý tah, bench, přítahy s osou) 2–3, vícekloubové stroje a kladky (leg press, stahování, chest press) 1–2, izolace 0–2.',
        'Under each exercise name you see how many reps to keep in reserve: free-weight compounds (squat, deadlift, bench, barbell rows) 2–3, machine and cable compounds (leg press, pulldown, chest press) 1–2, isolation 0–2.',
      ], [
        'Pro sílu na vzdálenosti od selhání v širokém rozmezí skoro nezáleží, pro růst svalu blízkost mírně pomáhá; selhání a 1–2 RIR daly v přímém srovnání podobný růst a selhání bylo nepříjemnější. ACSM 2026 uvádí selhání jako volitelné. Lidé odhadují rezervu v průměru o ~1 opakování nepřesně, přesněji blízko selhání a u sérií do ~12 opakování – ber RIR jako vodítko, ne měření. Rozdělení do tří tříd je konvence: stroj snižuje technické riziko, proto 1–2.',
        'For strength, proximity to failure barely matters over a wide range; for growth, getting closer helps a little. Failure and 1–2 RIR gave similar growth head-to-head and failure felt worse. ACSM 2026 lists failure as optional. People misjudge reserve by ~1 rep on average, less so near failure and in sets under ~12 reps – treat RIR as a guide, not a measurement. The three classes are a convention: machines lower technical risk, hence 1–2.',
      ], [S.robinson, S.refalo24, S.halperin, S.refalo25, S.acsmInfo]),
      i('hold', 'practice', ['„Drž“ a pravidlo 2 za 2', '“Hold” and the 2-for-2 rule'], [
        'Váha se zvedne, když jsou všechny série na horní hranici: s RPE ≤ 9 stačí jeden trénink, bez zapsaného RPE dva tréninky po sobě („drž · ověř“). Po sérii s RPE 10 aplikace nepřidává opakování a píše „drž“.',
        'Weight goes up when every set reaches the top of the range: with RPE ≤ 9 one session is enough, without logged RPE it takes two sessions in a row (“hold · confirm”). After an RPE 10 set the app doesn’t add a rep and says “hold”.',
      ], [
        'Pravidlo „2 za 2“ (horní hranice dvakrát po sobě) je klasika z ACSM: zaručí, že výkon není náhoda dobrého dne. RPE ho může zkrátit – když víš, že ti zbyla rezerva, je jedno potvrzení zbytečné. Série dotažená na doraz signalizuje, že další krok by byl moc velký. Přímou studii, která by tohle konkrétní pravidlo srovnala s jiným, nemám.',
        'The “2-for-2” rule (top of range twice in a row) is an ACSM classic: it makes sure it wasn’t just a good day. RPE can shorten it – if you know you had reps left, one confirmation is enough. A set ground out to the limit signals that the next step would be too big. There is no direct study comparing this exact rule with another.',
      ], [S.acsm09, S.hprc]),
      i('reset', 'practice', ['Stagnace na stejné váze → reset ~−10 %', 'Stalled at the same weight → reset ~−10 %'], [
        'Když jsou 4 poslední tréninky cviku na stejné pracovní váze a 3 nejnovější nepřekonaly počet opakování toho nejstaršího, aplikace navrhne ubrat ~10 % (vždy aspoň o krok, nejvýš ~20 %) a znovu stoupat. Pokles opakování po přidání váhy stagnace není. Tréninky z lehkého týdne se nepočítají.',
        'When the last 4 sessions of an exercise are at the same working weight and the 3 newest didn’t beat the rep count of the oldest, the app suggests dropping ~10 % (always at least one step, at most ~20 %) and building back up. Fewer reps after a weight increase are not a stall. Light-week sessions don’t count.',
      ], [
        'U pokročilejších je stagnace normální a další „+1“ ji neprorazí. Krátký krok zpátky sníží únavu; krátký výpadek síly se po pauze rychle vrací a sportovci při deloadu nejčastěji ubírají právě zátěž. Prahy 3 tréninky a 10 % jsou trenérská praxe, ne čísla z RCT.',
        'Plateaus are normal for intermediates and another “+1” rarely breaks them. A short step back lowers fatigue; short strength dips recover quickly, and athletes deloading most often reduce exactly the load. The 3-session and 10 % thresholds are coaching practice, not RCT numbers.',
      ], [S.coleman, S.rogerson]),
      i('light', 'practice', ['Lehké váhy: víc opakování dřív než víc kil', 'Light weights: more reps before more kilos'], [
        'Když by nejmenší krok váhy znamenal velký relativní skok (nad 12,5 % váhy +3 opakování, nad 25 % +6), rozsah se rozšíří – nejvýš do 20 opakování (např. 8–12 → 8–18).',
        'When the smallest weight step would be a big relative jump (over 12.5 % of the weight +3 reps, over 25 % +6), the range widens – up to 20 reps at most (e.g. 8–12 → 8–18).',
      ], [
        'ACSM doporučuje přírůstky 2–10 %; 2 kg na 8kg jednoručce je 25 %, na 3 kg 67 %. Protože přidané opakování je platný pokrok stejně jako přidaná váha, dá svalu podobný podnět, dokud není další váha zvládnutelná. Alternativa: v menu cviku nastav menší krok (1 kg).',
        'ACSM recommends 2–10 % increments; 2 kg on an 8 kg dumbbell is 25 %, on 3 kg it’s 67 %. Since an added rep is as valid as added weight, extra reps give a similar stimulus until the next weight is manageable. Alternative: set a smaller step (1 kg) in the exercise menu.',
      ], [S.plotkin, S.acsm09]),
      i('cap', 'moderate', ['Strop u „max“ sérií a vlastní váhy', 'A cap for “max” sets and bodyweight'], [
        'Série „max“ s váhou přestanou přidávat opakování na 15, cviky s vlastní vahou na 20 – pak aplikace navrhne přidat zátěž nebo těžší variantu.',
        '“Max” sets with weight stop adding reps at 15, bodyweight exercises at 20 – then the app suggests adding load or a harder variation.',
      ], [
        'Nad ~12–15 opakování je odhad rezervy nepřesný a další opakování přidávají hlavně únavu; velmi lehká zátěž je navíc slabší podnět pro sílu. Těžší varianta udrží cvik v rozumném rozsahu. Směr je podložený, konkrétní čísla 15 a 20 jsou praxe.',
        'Above ~12–15 reps reserve estimates get unreliable and extra reps add mostly fatigue; very light loads are also a weaker strength stimulus. A harder variation keeps the exercise in a sensible range. The direction is supported; the exact 15 and 20 are practice.',
      ], [S.halperin, S.lopez]),
      i('rest', 'strong', ['Pauza mezi sériemi', 'Rest between sets'], [
        'Výchozí pauza je 90 s (Nastavení: vypnuto, 60 s – 3 min); cvik v šabloně může mít vlastní. U těžkých vícekloubových cviků klidně 2–3 minuty.',
        'The default rest is 90 s (Settings: off, 60 s – 3 min); a template exercise can have its own. On heavy compound lifts 2–3 minutes are fine.',
      ], [
        'Metaanalýza našla mírný přínos pro růst svalu u pauz delších než 60 s, nad ~90 s se rozdíl dál neprojevil. Pro těžké série síly jsou delší pauzy prakticky výhodnější, protože víc opakování = víc kvalitní práce.',
        'A meta-analysis found a small hypertrophy benefit for rests longer than 60 s, with no further difference beyond ~90 s. For heavy strength sets longer rests are practical, since more reps = more quality work.',
      ], [S.singer]),
      i('deload', 'moderate', ['Lehký týden (deload)', 'Light week (deload)'], [
        '7 dní ve dvou režimech: „Lehké váhy“ (stejné série i délka tréninku, váhy ~−12 %, vždy aspoň o krok) nebo „Kratší + kardio“ (~60 % sérií, stejné váhy, na konec 10–15 min lehkého kardia). Aplikace ho nabídne po 8 týdnech bez přestávky (aspoň 6 se splněným cílem), nebo když u 2+ cviků klesnou opakování na stejné váze o 15+ %. Kdykoli ho můžeš dát i dřív. Týden se počítá jako splněný.',
        '7 days in two modes: “Light weights” (same sets and session length, weights ~−12 %, always at least one step) or “Shorter + cardio” (~60 % of sets, same weights, then 10–15 min easy cardio). The app suggests it after 8 weeks without a break (at least 6 with the goal met), or when reps at the same weight drop 15+ % on 2+ exercises. You can take it earlier any time. The week counts as on plan.',
      ], [
        'Expertní konsenzus doporučuje deload zhruba každé 4–6 týdnů; sportovci v průzkumu ho dávají v průměru každých ~5,6 týdne na ~6 dní a většinou ubírají série i zátěž. Forge ho při 3 trénincích týdně navrhne až po 8 týdnech, protože rekreační objem unaví méně. Síla se drží i při výrazně menším objemu; týden úplného volna dal stejný růst svalu, ale menší nárůst síly – proto lehký trénink místo pauzy. Kardio v deloadu nevadí a drží minuty WHO; že by regeneraci urychlilo, podložené není.',
        'Expert consensus suggests a deload roughly every 4–6 weeks; surveyed athletes take one every ~5.6 weeks for ~6 days, mostly cutting both sets and load. With 3 sessions a week Forge suggests it after 8 weeks, since recreational volume is less fatiguing. Strength holds even with much less volume; a week fully off gave the same muscle growth but less strength – hence light training instead of a break. Cardio during a deload doesn’t hurt and keeps your WHO minutes; that it speeds recovery is not established.',
      ], [S.bell, S.rogerson, S.coleman, S.spiering]),
    ],
  },
  {
    id: 'records',
    title: { cs: 'Rekordy', en: 'Records' },
    items: [
      i('reach', 'moderate', ['Rekord na dosah je jen doplněk', 'Record hints are only an add-on'], [
        'Tip „rekord“ se ukáže jen za cílem progrese a jen se stejnou vahou. Nikdy nenahradí „drž“, nikdy nenabídne těžký singl uprostřed tréninku a výrazná oslava je jen u prvního rekordu v tréninku.',
        'The “record” hint appears only after the progression target and only at the same weight. It never replaces “hold”, never suggests a heavy single mid-workout, and the big celebration only fires for the first record of a workout.',
      ], [
        'Informační zpětná vazba o pokroku vnitřní motivaci podporuje, očekávané a kontrolující odměny ji spíš oslabují. Posilování má nízkou úrazovost (kulturistika ~0,24–1 úrazu na 1 000 h); většina úrazů na pohotovosti je ztráta kontroly – závaží spadlé na člověka. Limit oslav není prevence úrazů, ale ochrana před honěním rekordu v každé sérii.',
        'Informational feedback about progress supports intrinsic motivation; expected, controlling rewards tend to undermine it. Lifting has low injury rates (bodybuilding ~0.24–1 per 1,000 h); most emergency-room cases are loss of control – a weight dropped on the person. The celebration limit isn’t injury prevention, it guards against chasing a record in every set.',
      ], [S.deci, S.keogh, S.kerr]),
      i('e1', 'strong', ['Odhad 1RM jen ze sérií do 10 opakování', 'Estimated 1RM only from sets of up to 10 reps'], [
        'Rekordy e1RM, silové milníky, poměry k tělesné váze, „nejlepší zvednutí“ i e1RM v detailu cviku se počítají jen ze sérií do 10 opakování (vzorec Epley).',
        'e1RM records, strength milestones, body-weight ratios, “best lift” and e1RM in exercise detail only use sets of up to 10 reps (Epley formula).',
      ], [
        'Validace rovnic 1RM ukazuje nejlepší přesnost kolem 5 opakování a autoři výslovně doporučují nepoužívat víc než 10. Metaanalýza 269 studií navíc ukázala, že počet opakování při stejném % maxima se mezi cviky liší (leg press ~19 vs. bench ~14 při 70 %), mezi pohlavími skoro ne – u leg pressu a strojů na nohy vzorec 1RM nadhodnocuje.',
        'Validation of 1RM equations shows the best accuracy around 5 reps and the authors explicitly advise against using more than 10. A meta-analysis of 269 studies also showed that reps at the same % of max differ between exercises (leg press ~19 vs bench ~14 at 70 %) but barely between sexes – on leg press and leg machines the formula overestimates.',
      ], [S.reynolds, S.nuzzo, S.marzagao]),
      i('repRecord', 'moderate', ['Rekord opakování = těžší váha na stejný počet', 'Rep record = heavier weight for the same reps'], [
        'Rekord opakování znamená vyšší váhu pro daný počet opakování (1–12), ne víc opakování s lehčí vahou.',
        'A rep record means a heavier weight for a given number of reps (1–12), not more reps with a lighter weight.',
      ], [
        'Těžká zátěž zlepšuje maximální sílu víc než lehká, zatímco sval roste podobně. Víc opakování s lehkou vahou je proto slabý signál síly – a při stejném % maxima se počet opakování mezi lidmi i cviky hodně liší.',
        'Heavy loads improve maximal strength more than light ones, while muscle grows similarly. More reps with a light weight is therefore a weak strength signal – and reps at the same % of max vary a lot between people and exercises.',
      ], [S.lopez, S.nuzzo]),
    ],
  },
  {
    id: 'strength',
    title: { cs: 'Síla', en: 'Strength' },
    items: [
      i('self', 'moderate', ['Silové milníky vůči sobě', 'Strength milestones vs yourself'], [
        'Silové milníky měří růst odhadu 1RM proti lepšímu z tvých prvních 2 tréninků cviku (procento se ukáže od 3. tréninku). Cviky si vybereš sám (až 4); bez výběru aplikace vezme big three, pokud je děláš, jinak nejčastější vícekloubové cviky.',
        'Strength milestones measure estimated 1RM growth against the better of your first 2 sessions of a lift (the percentage shows from the 3rd session). You pick the lifts (up to 4); without a choice the app uses big three if you do them, otherwise your most trained compound lifts.',
      ], [
        'Hlavní sdělení ACSM 2026: rozhoduje, u čeho vydržíš. Procenta jsou férová bez ohledu na pohlaví – ženy rostou relativně víc, muži absolutně, a v datech powerlifterů rostly obě pohlaví podobně rychle. První trénink nese učení techniky a procenta by nafukoval, proto lepší ze dvou.',
        'The key message of ACSM 2026: what matters is what you stick with. Percentages are fair regardless of sex – women gain more relatively, men more absolutely, and in powerlifting data both sexes progressed at a similar rate. The first session includes learning the technique and would inflate the percentages, hence the better of two.',
      ], [S.acsm, S.jones, S.latella20]),
      i('selfTiers', 'moderate', ['Jak realistické jsou stupně +10 až +100 %', 'How realistic the +10 to +100 % tiers are'], [
        'Stupně I–V: +10, +25, +50, +75 a +100 % odhadu 1RM.',
        'Tiers I–V: +10, +25, +50, +75 and +100 % estimated 1RM.',
      ], [
        'Ve velkém souboru 14 690 lidí přidali začátečníci typicky 30–50 % za první rok, pak se růst zpomalil a ustálil; soutěžní powerlifteři přidají za první rok jen ~7,5–12,5 %. +10 a +25 % jsou tedy stupně na týdny až měsíce, +50 % zhruba na rok pro začátečníky a +75/+100 % na roky. Kdo do aplikace přišel už natrénovaný, horní stupně nemusí nikdy dosáhnout – a to je v pořádku.',
        'In a large sample of 14,690 people beginners typically gained 30–50 % in the first year, then progress slowed and levelled off; competitive powerlifters gain only ~7.5–12.5 % in their first year. +10 and +25 % are tiers for weeks to months, +50 % about a year for beginners, +75/+100 % years. If you started the app already trained you may never reach the top tiers – and that’s fine.',
      ], [S.steele, S.latella24]),
      i('bw', 'moderate', ['Poměr k tělesné váze jen volitelně a podle pohlaví', 'Body-weight ratios: optional and by sex'], [
        'Benchmarky vůči tělesné váze se zapínají v Nastavení zvlášť pro muže a ženy. Počítají se z odhadu 1RM a z NEJVYŠŠÍHO 90denního průměru váhy za poslední rok – hubnutí tedy poměr nikdy nezvedne. Nikdy se neukazují jako „nejbližší cíl“.',
        'Body-weight benchmarks are switched on in Settings, separately for men and women. They use estimated 1RM and your HIGHEST 90-day average weight of the past year – so weight loss can never raise the ratio. They never show up as the “closest goal”.',
      ], [
        'Síla roste s tělesnou váhou méně než úměrně (zhruba na 0,67), takže prostý poměr z principu zvýhodňuje lehčí lidi; muži jsou navíc relativně o 25–30 % silnější. Fitness aplikace se spojují s víc příznaky poruch příjmu potravy, hlavně přes tlak na cíle – odměna za hubnutí by byla přesně ten špatný signál. Váha kolísá i týdně, proto dlouhý průměr. Normy pro rekreační cvičence neexistují; ženské prahy jsou odvozené ze soutěžních dat.',
        'Strength grows less than proportionally with body weight (roughly to the 0.67 power), so a simple ratio inherently favours lighter people; men are also ~25–30 % stronger relative to weight. Fitness apps are linked to more disordered-eating symptoms, mainly through goal pressure – rewarding weight loss would be exactly the wrong signal. Weight fluctuates week to week, hence a long average. There are no norms for recreational lifters; women’s thresholds are derived from competition data.',
      ], [S.jaric, S.jsams, S.turicchi, S.anderberg]),
    ],
  },
  {
    id: 'habit',
    title: { cs: 'Motivace a pravidelnost', en: 'Motivation and consistency' },
    items: [
      i('heat', 'practice', ['Heat podle tvého cíle – víc tréninků ho nezvedne', 'Heat follows your goal – more workouts don’t raise it'], [
        'Počítá se nejvýš 1 trénink denně a tolik týdně, kolik je tvůj cíl. Na délce ani intenzitě tréninku nezáleží. Podrobně v kapitole „Jak funguje Heat“.',
        'At most 1 workout a day and as many a week as your goal count. Session length and intensity don’t matter. Details in the “How Heat works” chapter.',
      ], [
        'Doba od poslední návštěvy je nejsilnější prediktor další návštěvy – přesně to Heat modeluje. Flexibilní cíle fungovaly v experimentu líp než pevné časové okno, i po jeho skončení. Samotné měření zvyšuje výkon, ale snižuje požitek; odměna za pravidelnost místo objemu tenhle efekt tlumí. Konstanty (rozpad 7 dní, pásma 25/50/80) jsou designová volba.',
        'Time since the last visit is the strongest predictor of the next one – exactly what Heat models. Flexible goals beat a fixed time window in an experiment, even after it ended. Measuring raises output but lowers enjoyment; rewarding consistency instead of volume softens that. The constants (7-day decay, bands 25/50/80) are a design choice.',
      ], [S.buyalskaya, S.beshears, S.etkin]),
      i('comeback', 'strong', ['Návrat po pauze se počítá dvakrát', 'Coming back after a break counts double'], [
        'První trénink po 7+ dnech bez tréninku přitopí Heat dvojnásob, souhrn napíše „Vítej zpátky“ a přibude milník Návrat. Zapsaná pauza (nemoc, dovolená) se do mezery nepočítá – po ní souhrn napíše „Pauza skončila“.',
        'The first workout after 7+ days off adds double Heat, the summary says “Welcome back” and the Comeback milestone grows. A logged pause (illness, holiday) doesn’t count as a gap – after it the summary says “Pause over”.',
      ], [
        'V megastudii s 61 293 členy posiloven a 54 programy vyšla nejlépe malá odměna za návrat po vynechaném tréninku: +27 % návštěv během 4týdenního programu (po skončení přetrvala jen menšina efektů). Možnost „opravit“ přerušenou sérii tlumí propad motivace.',
        'In a megastudy of 61,293 gym members and 54 programmes, a small reward for returning after a missed workout came out best: +27 % visits during the 4-week programme (only a minority of effects lasted afterwards). Being able to “repair” a broken streak softens the motivation drop.',
      ], [S.milkman, S.silverman]),
      i('joker', 'moderate', ['Joker týden a pauza', 'Joker week and pause'], [
        'Jeden nesplněný týden za 5 týdnů se automaticky odpustí a série drží (nepřičte se). Heat ale za ten týden klesne a během dalšího se vrátí. Pauza (nemoc, dovolená, zranění) zmrazí Heat i sérii a skončí s dalším tréninkem.',
        'One missed week every 5 weeks is forgiven automatically and the streak holds (without adding to it). Heat still drops that week and recovers the next. A pause (illness, holiday, injury) freezes Heat and the streak and ends with your next workout.',
      ], [
        'Viditelně přerušená série sama snižuje další zapojení, hlavně když si to člověk přičte sám sobě. Cíle s malou rezervou na vynechání lidé plní častěji a po zaváhání se snáz vracejí. Jeden vynechaný trénink návyk nerozbije. Interval 5 týdnů je designová volba (Duolingo uvádí podobné „freeze“ mechaniky jen jako průmyslová data).',
        'A visibly broken streak reduces engagement by itself, especially when people blame themselves. Goals with a small skip allowance are reached more often and people bounce back more easily. One missed session doesn’t break a habit. The 5-week interval is a design choice (streak “freezes” elsewhere exist only as industry data).',
      ], [S.silverman, S.sharif, S.lally]),
      i('goal', 'moderate', ['Týdenní cíl a dny volna', 'Weekly goal and rest days'], [
        'Cíl se měří v týdnech, ne ve dnech (výchozí 3). Při cíli 6–7 tréninků týdně aplikace upozorní, že nenechává den volna.',
        'The goal is measured in weeks, not days (default 3). With a goal of 6–7 workouts a week the app warns that it leaves no rest day.',
      ], [
        'Návyk chodit do posilovny se tvoří měsíce a na čase dne nezáleží; flexibilní týdenní rámec funguje lépe než pevný čas. WHO doporučuje posilování aspoň 2 dny týdně. Pro růst svalu frekvence při stejném objemu skoro nehraje roli, ~2× týdně na partii je ale praktický způsob, jak objem rozložit, a pomáhá síle. Den volna je součást regenerace, ne selhání.',
        'A gym habit takes months to form and time of day doesn’t matter; a flexible weekly frame works better than a fixed time. WHO recommends strength training at least 2 days a week. For muscle growth frequency barely matters at equal volume, but ~2×/week per muscle is a practical way to spread volume and helps strength. A rest day is part of recovery, not a failure.',
      ], [S.buyalskaya, S.beshears, S.who]),
      i('milestones', 'moderate', ['Milníky jako zpráva o pokroku, ne cena', 'Milestones as feedback, not prizes'], [
        'Milníky za tréninky, tonáž, rekordy a nové váhy mají stupně I–V. Jdou vypnout spolu s Heatem (Nastavení → Heat a milníky).',
        'Milestones for workouts, tonnage, records and new weights have tiers I–V. They can be turned off together with Heat (Settings → Heat & milestones).',
      ], [
        'Odznaky aktivitu zvyšují, ale efekt je mírný a časem slábne (metaanalýza RCT: g = 0,42 během intervence, 0,15 později). Vnitřní motivaci podporuje informační zpětná vazba („tolik jsi toho odcvičil“), očekávané odměny ji spíš oslabují. Ber milníky jako záznam pokroku, ne jako cíl k honění.',
        'Badges increase activity, but the effect is modest and fades (meta-analysis of RCTs: g = 0.42 during the intervention, 0.15 later). Informational feedback (“this is how much you did”) supports intrinsic motivation; expected rewards tend to undermine it. Treat milestones as a record of progress, not a target to chase.',
      ], [S.mazeas, S.hamari, S.deci]),
      i('couple', 'practice', ['Spolupráce v páru, ne srovnávání', 'Couples: cooperation, not comparison'], [
        'Každý účet vidí jen svá data a aplikace partnery neřadí ani nesrovnává.',
        'Each account sees only its own data and the app never ranks or compares partners.',
      ], [
        'Výsledky jsou poctivě smíšené: u studentů a v klinické studii fungovala soutěž lépe než podpora. U párů ale ten, kdo partnera podpořil, měl ten den sám víc pohybu a byl spokojenější ve vztahu. Žebříček mezi dvěma lidmi s různými splity a vahami by navíc měřil nesrovnatelné věci.',
        'The evidence is honestly mixed: among students and in a clinical trial competition beat support. In couples, though, the partner who gave support was more active that day and more satisfied with the relationship. A leaderboard between two people with different splits and weights would also compare incomparable things.',
      ], [S.berli, S.zhang, S.patel]),
    ],
  },
  {
    id: 'health',
    title: { cs: 'Kardio a zdraví', en: 'Cardio and health' },
    items: [
      i('cardio', 'strong', ['Kardio: 150 minut týdně podle WHO', 'Cardio: 150 minutes a week (WHO)'], [
        'Karta týdne sčítá minuty kardia (rychlé záznamy + kardio cviky z tréninků). Intenzivní minuta se počítá dvakrát. Kardio se nepočítá do cíle tréninků ani do Heatu.',
        'The week card adds up cardio minutes (quick logs + cardio exercises from workouts). A vigorous minute counts double. Cardio doesn’t count towards the workout goal or Heat.',
      ], [
        'WHO doporučuje 150–300 minut středně intenzivní (nebo 75–150 minut intenzivní) aerobní aktivity týdně a k tomu aspoň 2 dny posilování. Posilování spolu s aerobní aktivitou souvisí s nejnižší úmrtností (RR 0,60 vs. 0,85 pro samotné posilování) a i lehký pohyb snižuje riziko – proto se počítají i krátké úseky. Oddělený cíl brání tomu, aby běh „splnil“ silový plán.',
        'WHO recommends 150–300 minutes of moderate (or 75–150 minutes of vigorous) aerobic activity a week plus at least 2 strength days. Strength plus aerobic activity is linked to the lowest mortality (RR 0.60 vs 0.85 for strength alone), and even light movement lowers risk – so short bouts count. A separate goal stops a run from “completing” your strength plan.',
      ], [S.who, S.momma, S.ekelund]),
      i('concurrent', 'strong', ['Kardio neubírá svaly ani sílu', 'Cardio doesn’t cost muscle or strength'], [
        'Kardio se zapisuje zvlášť; režim lehkého týdne „Kratší + kardio“ ho přidává.',
        'Cardio is logged separately; the “Shorter + cardio” light-week mode adds it.',
      ], [
        'Metaanalýza 43 studií nenašla vliv kardia na maximální sílu ani na růst svalu; mírně utrpěla jen výbušná síla, hlavně při kardiu ve stejném tréninku. Běh trochu tlumil růst pomalých vláken, kolo ne. Kdo chce maximum, dá kardio jiný den nebo pár hodin po tréninku – v den nohou spíš kolo nebo chůzi do kopce.',
        'A meta-analysis of 43 studies found no effect of cardio on maximal strength or muscle growth; only explosive strength suffered slightly, mainly with cardio in the same session. Running slightly blunted slow-fibre growth, cycling didn’t. If you want the maximum, do cardio on another day or a few hours after lifting – on leg day prefer cycling or incline walking.',
      ], [S.schumann, S.lundberg]),
      i('pain', 'moderate', ['Bolest: pravidlo palce', 'Pain: a rule of thumb'], [
        'Aplikace bolest nevyhodnocuje. Při bolesti si cvik vyměň (Nahradit) nebo uber váhu.',
        'The app doesn’t assess pain. If something hurts, swap the exercise (Replace) or reduce the weight.',
      ], [
        'Bolest 0–2 z 10 je v pořádku; 3–5 je přijatelná, pokud do druhého rána odezní a z týdne na týden se nezhoršuje (model ověřený v RCT u Achillovy šlachy – přenos na běžný trénink je praxe). Nad 5, při zhoršování nebo když trvá déle než ~2 týdny, uber a zajdi za fyzioterapeutem; hned při necitlivosti, slabosti nebo otoku po „lupnutí“. Posilování má jinak nízkou úrazovost.',
        'Pain 0–2 out of 10 is fine; 3–5 is acceptable if it settles by the next morning and doesn’t worsen week to week (a model tested in an Achilles RCT – applying it to general training is practice). Above 5, if it worsens or lasts beyond ~2 weeks, back off and see a physio; immediately with numbness, weakness or swelling after a “pop”. Lifting otherwise has low injury rates.',
      ], [S.silbernagel, S.keogh]),
      i('nocal', 'moderate', ['Bez kalorií a bez cílů na váhu', 'No calories and no weight goals'], [
        'Aplikace nepočítá kalorie ani makra a tělesná váha nemá cíl ani barvy.',
        'The app doesn’t track calories or macros, and body weight has no goal and no colours.',
      ], [
        'Aplikace na dietu a fitness se u části lidí spojují s víc příznaky poruch příjmu potravy a horším vnímáním těla, hlavně přes tlak na plnění cílů a pocity viny (jde o průřezová data, ne důkaz příčiny). Pro trénink ve Forge tyto údaje nepotřebuješ.',
        'Diet and fitness apps are linked, for some people, to more disordered-eating symptoms and worse body image, mainly through goal pressure and guilt (cross-sectional data, not proof of cause). Forge doesn’t need this data for training.',
      ], [S.anderberg]),
      i('cycle', 'strong', ['Žádné programování podle cyklu', 'No cycle-based programming'], [
        'Ženy i muži mají stejnou logiku progrese; liší se jen absolutní váhy a kroky.',
        'Women and men follow the same progression logic; only absolute weights and steps differ.',
      ], [
        'Vliv fáze menstruačního cyklu na sílu je podle přehledu přehledů sporý a nekvalitní, průměrný efekt na výkon triviální. Ženy přitom rostou relativně stejně jako muži. Důležitým signálem je naopak vynechaná nebo nepravidelná menstruace – hlavní indikátor nízké energetické dostupnosti (REDs).',
        'The effect of cycle phase on strength is, per an umbrella review, contested and low quality; the average effect on performance is trivial. Women gain at a similar relative rate to men. A missing or irregular period, on the other hand, is a key warning sign of low energy availability (REDs).',
      ], [S.colenso, S.mcnulty, S.refaloSex, S.mountjoy]),
    ],
  },
];

export const LEVELS = ['strong', 'moderate', 'practice'];

// ——— Jak funguje Heat (konstanty odpovídají gamify.js; příklady spočítané funkcí heatAt při cíli 3×) ———
export const HEAT_DOC = {
  title: { cs: 'Jak funguje Heat', en: 'How Heat works' },
  intro: {
    cs: 'Heat je ukazatel pravidelnosti vůči tvému vlastnímu týdennímu cíli. Neměří, jak tvrdě nebo dlouho trénuješ – jen jak pravidelně chodíš.',
    en: 'Heat is a consistency score relative to your own weekly goal. It doesn’t measure how hard or long you train – only how regularly you show up.',
  },
  rules: [
    {
      cs: 'Každý započítaný trénink přidá 100 ÷ cíl bodů (při cíli 3× = +33). Délka, objem, váhy ani RPE nehrají roli – trénink 25 minut a 90 minut přidá stejně.',
      en: 'Each counted workout adds 100 ÷ goal points (goal 3× = +33). Length, volume, weights and RPE don’t matter – a 25-minute and a 90-minute session add the same.',
    },
    {
      cs: 'Počítá se nejvýš 1 trénink denně a nejvýš tolik týdně, kolik je cíl. Čtvrtý trénink při cíli 3× Heat nezvedne.',
      en: 'At most 1 workout a day and at most your goal per week count. A 4th workout with a goal of 3× doesn’t add Heat.',
    },
    {
      cs: 'Body chladnou plynule: každý den zůstane ×0,87 (časová konstanta 7 dní, poločas ~4,9 dne). Zobrazená hodnota je oříznutá na 100°, takže den po tréninku můžeš mít pořád 100°.',
      en: 'Points cool down smoothly: each day ×0.87 remains (time constant 7 days, half-life ~4.9 days). The shown value is capped at 100°, so the day after a workout you can still be at 100°.',
    },
    {
      cs: 'Návrat po 7+ dnech bez tréninku přidá dvojnásobek. Pauza (nemoc, dovolená) čas zastaví – Heat během ní nechladne.',
      en: 'Coming back after 7+ days off adds double. A pause (illness, holiday) stops the clock – Heat doesn’t cool during it.',
    },
  ],
  states: [
    { id: 'cold', range: '0–24°', cs: 'Dlouho bez tréninku. Jeden trénink po pauze přitopí dvojnásob.', en: 'Long time without training. One workout after a break adds double.' },
    { id: 'warm', range: '25–49°', cs: 'Zhruba 6–11 dní od posledního tréninku.', en: 'About 6–11 days since your last workout.' },
    { id: 'glow', range: '50–79°', cs: 'Trénuješ, ale pod svým cílem (např. 2× týdně při cíli 3×), nebo 4–5 dní volna.', en: 'Training, but below your goal (e.g. 2×/week with a goal of 3×), or 4–5 days off.' },
    { id: 'hot', range: '80–100°', cs: 'Držíš tempo svého cíle. Víc se dostat nedá – a ani nemusíš.', en: 'You’re on pace with your goal. There’s no higher – and no need for it.' },
  ],
  examples: {
    head: { cs: ['Situace (cíl 3×, Po/St/Pá)', 'Heat'], en: ['Situation (goal 3×, Mon/Wed/Fri)', 'Heat'] },
    rows: [
      { cs: 'První trénink od nuly', en: 'First workout from zero', v: '33°' },
      { cs: 'Po prvním týdnu (3 tréninky)', en: 'After the first week (3 workouts)', v: '77°' },
      { cs: 'Druhý týden podle plánu', en: 'Second week on plan', v: '96–100°' },
      { cs: 'Ustálené tempo, víkend bez tréninku', en: 'Steady pace, weekend off', v: '82–100°' },
      { cs: '3 dny od posledního tréninku', en: '3 days since the last workout', v: '80°' },
      { cs: '5 dní', en: '5 days', v: '60°' },
      { cs: '7 dní (vynechaný týden)', en: '7 days (missed week)', v: '45°' },
      { cs: '10 dní', en: '10 days', v: '29°' },
      { cs: '14 dní', en: '14 days', v: '17°' },
      { cs: 'Návrat po 10 dnech', en: 'Back after 10 days', v: '29° → 95°' },
      { cs: 'Ustáleně 2× týdně při cíli 3×', en: 'Steady 2×/week with a goal of 3×', v: '57–87°' },
    ],
  },
  note: {
    cs: 'Proč ne intenzita? Heat má odměňovat to, co nejvíc předpovídá dlouhodobý pokrok – že přijdeš. Intenzitu řídí cíle RIR a progrese; kdyby ji odměňoval i Heat, tlačil by k extrémům.',
    en: 'Why not intensity? Heat rewards what best predicts long-term progress – showing up. Intensity is handled by RIR targets and progression; rewarding it in Heat too would push towards extremes.',
  },
};

// ——— Slovníček ———
export const GLOSSARY = [
  { term: 'RIR', cs: 'Reps In Reserve – kolik opakování ti v sérii ještě zbylo. RIR 2 = mohl bys dát ještě 2.', en: 'Reps In Reserve – how many more reps you could have done. RIR 2 = two more were possible.' },
  { term: 'RPE', cs: 'Rate of Perceived Exertion – náročnost série 6–10. RPE 10 = nic nezbylo, RPE 8 ≈ RIR 2, RPE 6 = lehké.', en: 'Rate of Perceived Exertion – set difficulty 6–10. RPE 10 = nothing left, RPE 8 ≈ RIR 2, RPE 6 = easy.' },
  { term: '1RM', cs: 'One-Rep Max – nejtěžší váha, kterou zvedneš jednou se správnou technikou.', en: 'One-Rep Max – the heaviest weight you can lift once with good technique.' },
  { term: 'e1RM', cs: 'Odhadovaný 1RM ze série s víc opakováními (vzorec Epley: váha × (1 + opakování/30)). Forge ho počítá jen ze sérií do 10 opakování.', en: 'Estimated 1RM from a multi-rep set (Epley: weight × (1 + reps/30)). Forge only uses sets of up to 10 reps.' },
  { term: { cs: 'PB / PR', en: 'PB / PR' }, cs: 'Osobní rekord (personal best / record) – nejtěžší série cviku (při shodě víc opakování).', en: 'Personal best / record – the heaviest set of an exercise (ties broken by reps).' },
  { term: { cs: 'Rekord opakování', en: 'Rep record' }, cs: 'Těžší váha na stejný počet opakování než kdykoli předtím (1–12 opakování).', en: 'A heavier weight for the same number of reps than ever before (1–12 reps).' },
  { term: { cs: 'Série / opakování', en: 'Set / rep' }, cs: 'Opakování = jeden pohyb; série = skupina opakování bez pauzy. „3× 8–12“ = 3 série po 8–12 opakováních.', en: 'Rep = one movement; set = a group of reps without rest. “3× 8–12” = 3 sets of 8–12 reps.' },
  { term: { cs: 'Rozsah opakování', en: 'Rep range' }, cs: 'Spodní a horní hranice opakování (např. 8–12). Na horní hranici se přidává váha.', en: 'Lower and upper rep limit (e.g. 8–12). At the top you add weight.' },
  { term: { cs: 'Dvojitá progrese', en: 'Double progression' }, cs: 'Nejdřív přidáváš opakování v rozsahu, na horní hranici přidáš váhu a začneš znovu dole.', en: 'First add reps within the range; at the top add weight and start again at the bottom.' },
  { term: { cs: 'Krok váhy', en: 'Weight step' }, cs: 'O kolik se zvedne váha (2,5 kg osa, 2 kg jednoručky, 5 kg stroje, nebo podle tvé historie). Nastavíš v menu cviku.', en: 'How much the weight goes up (2.5 kg barbell, 2 kg dumbbells, 5 kg machines, or from your history). Set it in the exercise menu.' },
  { term: { cs: 'Selhání', en: 'Failure' }, cs: 'Další opakování už nejde se správnou technikou (RIR 0, RPE 10).', en: 'You can’t complete another rep with good technique (RIR 0, RPE 10).' },
  { term: 'Deload', cs: 'Lehký týden: méně sérií nebo lehčí váhy, aby opadla únava. Síla zůstane.', en: 'Light week: fewer sets or lighter weights so fatigue drops. Strength stays.' },
  { term: { cs: 'Stagnace / reset', en: 'Stall / reset' }, cs: 'Několik tréninků na stejné váze bez zlepšení → krok zpět o ~10 % a znovu nahoru.', en: 'Several sessions at the same weight without improvement → step back ~10 % and build up again.' },
  { term: { cs: 'Vícekloubový cvik', en: 'Compound lift' }, cs: 'Zapojuje víc kloubů a svalů (dřep, mrtvý tah, bench, přítahy, tlaky).', en: 'Uses several joints and muscles (squat, deadlift, bench, rows, presses).' },
  { term: { cs: 'Izolace', en: 'Isolation' }, cs: 'Jeden kloub, jedna hlavní partie (bicepsový zdvih, upažování, předkopávání).', en: 'One joint, one main muscle (biceps curl, lateral raise, leg extension).' },
  { term: 'Big three', cs: 'Bench press, dřep a mrtvý tah – tři soutěžní cviky silového trojboje.', en: 'Bench press, squat and deadlift – the three powerlifting lifts.' },
  { term: { cs: 'Objem / tonáž', en: 'Volume / tonnage' }, cs: 'Objem = počet tvrdých sérií; tonáž = váha × opakování ve všech sériích.', en: 'Volume = number of hard sets; tonnage = weight × reps over all sets.' },
  { term: { cs: 'Hypertrofie', en: 'Hypertrophy' }, cs: 'Růst svalové hmoty.', en: 'Muscle growth.' },
  { term: { cs: 'Rozcvičovací série', en: 'Warm-up set' }, cs: 'Lehká série před pracovními (v aplikaci „W“). Nepočítá se do objemu, rekordů ani statistik.', en: 'A light set before working sets (“W” in the app). Doesn’t count to volume, records or stats.' },
  { term: { cs: 'Superset', en: 'Superset' }, cs: 'Dva cviky střídavě bez pauzy; pauza až po obou.', en: 'Two exercises alternated without rest; rest after both.' },
  { term: { cs: 'Drop set', en: 'Drop set' }, cs: 'Po selhání hned uber váhu a pokračuj bez pauzy.', en: 'After failure, immediately reduce the weight and continue without rest.' },
  { term: 'Heat', cs: 'Ukazatel pravidelnosti vůči tvému týdennímu cíli (Cold → Warm → Glowing → White-hot).', en: 'A consistency score relative to your weekly goal (Cold → Warm → Glowing → White-hot).' },
  { term: { cs: 'Joker týden', en: 'Joker week' }, cs: 'Jeden nesplněný týden za 5 týdnů, který se automaticky odpustí a série drží.', en: 'One missed week every 5 weeks that is forgiven automatically, keeping the streak.' },
  { term: { cs: 'Pauza', en: 'Pause' }, cs: 'Režim pro nemoc nebo dovolenou: Heat i série stojí, skončí s dalším tréninkem.', en: 'Mode for illness or holiday: Heat and streak stand still, ends with your next workout.' },
  { term: { cs: 'Středně / intenzivně (kardio)', en: 'Moderate / vigorous (cardio)' }, cs: 'Středně = zadýcháš se, ale mluvíš; intenzivně = jen pár slov. Intenzivní minuta se podle WHO počítá dvakrát.', en: 'Moderate = breathing harder but can talk; vigorous = only a few words. WHO counts a vigorous minute double.' },
];

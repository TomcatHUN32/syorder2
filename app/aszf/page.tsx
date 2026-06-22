import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { SyorderLogoMark } from '@/components/syorder-logo';

// Logo constant removed — using SVG component

export const metadata = {
  title: 'Általános Szerződési Feltételek — SYORDER',
};

export default function AszfPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center overflow-hidden">
              <SyorderLogoMark size={24} variant="light" />
            </div>
            <span className="font-bold text-white tracking-widest text-sm uppercase">SYORDER</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Vissza
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-8 py-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                <Shield className="h-5 w-5 text-slate-300" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white">Általános Szerződési Feltételek</h1>
                <p className="text-slate-400 text-sm mt-0.5">SYORDER vendéglátós SaaS platform</p>
              </div>
            </div>
            <p className="text-slate-500 text-xs">Hatályos: 2026. január 1-től · Utolsó módosítás: 2026. június 20.</p>
          </div>

          <div className="px-8 py-10 prose prose-slate max-w-none">
            {/* Table of contents */}
            <nav className="bg-slate-50 rounded-xl border border-slate-200 p-5 mb-10 not-prose">
              <p className="text-sm font-bold text-slate-700 mb-3">Tartalomjegyzék</p>
              <ol className="space-y-1.5 text-sm text-slate-500">
                {[
                  ['#1', '1. Általános rendelkezések'],
                  ['#2', '2. Definíciók'],
                  ['#3', '3. A platform leírása és igénybevétele'],
                  ['#4', '4. Regisztráció és igénylési folyamat'],
                  ['#5', '5. Előfizetési díjak és fizetési feltételek'],
                  ['#6', '6. Aktiválás és beüzemelés'],
                  ['#7', '7. Szolgáltatás szintje és elérhetősége'],
                  ['#8', '8. Felhasználói kötelezettségek'],
                  ['#9', '9. Adatkezelés és adatvédelem'],
                  ['#10', '10. Szellemi tulajdon'],
                  ['#11', '11. Lemondás és felfüggesztés'],
                  ['#12', '12. Felelősségkorlátozás'],
                  ['#13', '13. Módosítások'],
                  ['#14', '14. Irányadó jog és joghatóság'],
                  ['#15', '15. Záró rendelkezések'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="hover:text-slate-900 transition-colors">{label}</a>
                  </li>
                ))}
              </ol>
            </nav>

            <Section id="1" title="1. Általános rendelkezések">
              <p>Jelen Általános Szerződési Feltételek (a továbbiakban: <strong>ÁSZF</strong>) a <strong>SYORDER</strong> elnevezésű vendéglátós vállalatirányítási szoftverszolgáltatás (SaaS) igénybevételére vonatkozó feltételeket tartalmazza.</p>
              <p>A szolgáltatást üzemeltető jogi személy (a továbbiakban: <strong>Szolgáltató</strong>) és a platformot előfizető vendéglátóipari vállalkozás (a továbbiakban: <strong>Partner</strong>) között létrejövő jogviszonyra jelen ÁSZF rendelkezései az irányadók.</p>
              <p>A platform igénybevételével a Partner elfogadja jelen ÁSZF valamennyi rendelkezését. Amennyiben a Partner az ÁSZF-fel nem ért egyet, a platformot nem jogosult használni.</p>
            </Section>

            <Section id="2" title="2. Definíciók">
              <ul>
                <li><strong>Platform:</strong> A SYORDER webalapú SaaS szoftver, amely elérhető a syorder.hu domén és aldomainjein.</li>
                <li><strong>Partner:</strong> Az a természetes vagy jogi személy, aki a Szolgáltatóval előfizetési szerződést köt a platform igénybevételére.</li>
                <li><strong>Helyszín (Tenant):</strong> Egy önálló éttermi egység, amelyhez a Partner hozzáférést kap a platformon.</li>
                <li><strong>Előfizetési díj:</strong> A Partner által a platform használatáért rendszeresen fizetendő összeg.</li>
                <li><strong>Aktiválás:</strong> Az a folyamat, amely során a Szolgáltató a díjbekérő kiegyenlítése után a Partner számára beállítja és hozzáférhetővé teszi a platformot.</li>
                <li><strong>Előfizetési időszak:</strong> A számlázási ciklus, amely lehet havi, negyedéves vagy éves.</li>
              </ul>
            </Section>

            <Section id="3" title="3. A platform leírása és igénybevétele">
              <p>A SYORDER platform az alábbi fő funkciókat nyújtja:</p>
              <ul>
                <li>Valós idejű rendeléskezelés és POS rendszer</li>
                <li>Online étlap és nyilvános megrendelési felület saját aldomainen</li>
                <li>Készletkezelés és recept alapú készletkövetés</li>
                <li>Vásárlói hűségprogram kezelése</li>
                <li>Részletes üzleti analitika és riportok</li>
                <li>Személyre szabható éttermi arculat (logó, színek)</li>
              </ul>
              <p>A Szolgáltató fenntartja a jogot a platform funkcionalitásának bővítésére, módosítására, azzal, hogy a lényeges változásokról a Partnereket előzetesen tájékoztatja.</p>
            </Section>

            <Section id="4" title="4. Regisztráció és igénylési folyamat">
              <p>A platform igénybevétele előzetes igényléshez kötött. Az igénylés menetrendje:</p>
              <ol>
                <li><strong>Igénylőlap beküldése:</strong> A Partner az igénylési űrlapon megadja az étterem adatait és kiválasztja az előfizetési csomagot.</li>
                <li><strong>Igénylés elbírálása:</strong> A Szolgáltató az igénylést 1–2 munkanapon belül elbírálja és visszaigazolja email-ben.</li>
                <li><strong>Díjbekérő kiállítása:</strong> A jóváhagyott igénylés alapján a Szolgáltató díjbekérőt küld a Partner által megadott email-címre.</li>
                <li><strong>Fizetés és aktiválás:</strong> A díjbekérő kiegyenlítése után a Szolgáltató 2 munkanapon belül aktiválja a Partner fiókját és értesítési emailben megküldi a belépési adatokat.</li>
              </ol>
              <p>A Partner felelős az igénylőlapon megadott adatok valóságtartalmáért. Hamis vagy félrevezető adatok megadása esetén a Szolgáltató jogosult a szerződéstől elállni.</p>
            </Section>

            <Section id="5" title="5. Előfizetési díjak és fizetési feltételek">
              <p>Az aktuális előfizetési díjakat a Szolgáltató a syorder.hu főoldalon teszi közzé. A díjak az alábbiak szerint alakulnak:</p>
              <ul>
                <li><strong>Induló csomag:</strong> 1 helyszínre, havi/negyedéves/éves elszámolással</li>
                <li><strong>Professzionális csomag:</strong> Több helyszínre, bővített funkciókkal, havi/negyedéves/éves elszámolással</li>
              </ul>
              <p><strong>Fizetési módok:</strong> Banki átutalás a díjbekérőn feltüntetett bankszámlaszámra.</p>
              <p><strong>Fizetési határidő:</strong> A díjbekérő kiállításától számított 8 naptári nap.</p>
              <p><strong>Késedelmi következmények:</strong> A fizetési határidő elmulasztása esetén a Szolgáltató a fizetés teljesítéséig felfüggesztheti a hozzáférést.</p>
              <p><strong>Áremelés:</strong> A Szolgáltató az előfizetési díjakat legkorábban az előfizetési időszak lejártával, 30 napos előzetes értesítés mellett módosíthatja.</p>
            </Section>

            <Section id="6" title="6. Aktiválás és beüzemelés">
              <p>Az aktiválás a következő feltételek teljesülése esetén indul meg:</p>
              <ul>
                <li>Az igénylőlap hiánytalanul és valósan ki van töltve</li>
                <li>A Szolgáltató az igénylést jóváhagyta</li>
                <li>A díjbekérőn szereplő összeg maradéktalanul beérkezett a Szolgáltató bankszámlájára</li>
              </ul>
              <p><strong>Aktiválási határidő: a fizetés beérkezésétől számított 2 munkanapon belül.</strong></p>
              <p>Az aktiválás tartalmazza: a Partner fiókjának létrehozását, az étterem aldomainjének beállítását (pl. etteremnev.syorder.hu), a belépési adatok megküldését, valamint az alap konfiguráció elvégzésének lehetőségét.</p>
            </Section>

            <Section id="7" title="7. Szolgáltatás szintje és elérhetősége">
              <p>A Szolgáltató törekszik a platform <strong>99,9%-os éves rendelkezésre állására</strong>, kivéve a tervezett karbantartási ablakokat, amelyekről a Partnereket előzetesen értesíti.</p>
              <p>A Szolgáltató nem vállal felelősséget az alábbi esetekben bekövetkező kieséséért:</p>
              <ul>
                <li>Vis maior esemény (természeti katasztrófa, háború, járvány)</li>
                <li>Harmadik fél infrastruktúra-üzemeltetők (pl. felhőszolgáltató) által okozott kiesés</li>
                <li>Partner oldali internet- vagy eszközprobléma</li>
              </ul>
            </Section>

            <Section id="8" title="8. Felhasználói kötelezettségek">
              <p>A Partner kötelezettséget vállal arra, hogy:</p>
              <ul>
                <li>A platformot kizárólag törvényes célokra és a vendéglátóipari vállalkozásának üzemeltetésére használja</li>
                <li>Belépési adatait bizalmasan kezeli és illetéktelen személyeknek nem adja át</li>
                <li>Az étlapján feltüntetett árakat és adatokat valósnak és naprakésznek tartja</li>
                <li>Nem kísérli meg a platform biztonsági rendszereinek megkerülését vagy feltörését</li>
                <li>Más vendéglátóhelyek adatait nem kísérli meg elérni</li>
                <li>A vonatkozó jogszabályokat (élelmiszer-biztonsági, adatvédelmi, adójogi) betartja</li>
              </ul>
              <p>A fenti kötelezettségek megsértése esetén a Szolgáltató jogosult a hozzáférést azonnali hatállyal felfüggeszteni, súlyos esetben a szerződést rendkívüli felmondással megszüntetni.</p>
            </Section>

            <Section id="9" title="9. Adatkezelés és adatvédelem">
              <p>A Szolgáltató adatkezelési tevékenységét az Európai Unió 2016/679 számú rendelete (GDPR) és a hazai adatvédelmi jogszabályok szerint végzi.</p>
              <p><strong>Adatkezelés célja:</strong> A platform üzemeltetése, számlázás, support.</p>
              <p><strong>Adattárolás helye:</strong> Az adatok az Európai Unió területén elhelyezett szerveren kerülnek tárolásra.</p>
              <p><strong>Adatelkülönítés:</strong> Minden Partner adata szigorúan elkülönítve, a többi Partner számára nem hozzáférhetően van tárolva (multi-tenant architektúra).</p>
              <p><strong>Adathordozhatóság:</strong> A Partner kérésére a Szolgáltató az adatokat exportálható formátumban rendelkezésre bocsátja.</p>
              <p><strong>Törlés:</strong> A szerződés megszűnése után 90 nappal a Szolgáltató a Partner adatait véglegesen törli, kivéve, ha jogszabályi megőrzési kötelezettség áll fenn.</p>
            </Section>

            <Section id="10" title="10. Szellemi tulajdon">
              <p>A platform forráskódja, dizájnja, logói, dokumentációja és egyéb szellemi alkotásai a Szolgáltató kizárólagos tulajdonát képezik, azokra a Partner nem szerez tulajdonjogot.</p>
              <p>A Partner által a platformra feltöltött tartalmak (étlapfotók, leírások, logó) a Partner szellemi tulajdonát képezik. A Partner a Szolgáltatónak nem kizárólagos, visszavonható licencet ad azok platform-beli megjelenítéséhez.</p>
            </Section>

            <Section id="11" title="11. Lemondás és felfüggesztés">
              <p><strong>Partner általi lemondás:</strong> A Partner az előfizetési időszak végén jogosult a szerződést felmondani. Felmondási szándékát legalább 15 nappal az aktuális előfizetési időszak lejárta előtt köteles írásban (email-ben) jelezni a Szolgáltatónak.</p>
              <p>Éves előfizetés esetén a Partner az előfizetési időszak közben is lemondhat, azonban a már kifizetett előfizetési díj időarányos visszatérítésére nem jogosult, kivéve, ha a lemondást a Szolgáltató súlyos szerződésszegése indokolja.</p>
              <p><strong>Szolgáltató általi felfüggesztés:</strong> A Szolgáltató az alábbi esetekben jogosult a hozzáférést felfüggeszteni:</p>
              <ul>
                <li>Fizetési késedelem (értesítés után 5 munkanappal)</li>
                <li>Az ÁSZF 8. pontjában foglalt kötelezettségek megsértése</li>
                <li>Gyanúsított biztonsági incidens vagy visszaélés</li>
              </ul>
              <p><strong>Rendkívüli felmondás:</strong> A Szolgáltató rendkívüli felmondással élhet, ha a Partner a felfüggesztés okát 15 munkanapon belül nem szünteti meg.</p>
            </Section>

            <Section id="12" title="12. Felelősségkorlátozás">
              <p>A Szolgáltató felelőssége a Platform működési hibáiból eredő közvetlen károkra korlátozódik, és nem haladhatja meg az adott naptári évben a Partner által ténylegesen megfizetett előfizetési díjak összegét.</p>
              <p>A Szolgáltató nem vállal felelősséget:</p>
              <ul>
                <li>Elmaradt bevételekért, közvetlen és közvetett üzleti veszteségekért</li>
                <li>A Partner által a platformba bevitt hibás adatokból eredő károkért</li>
                <li>Harmadik fél rendszerek (kasszaszoftver, futárszolgálat) integrációs hibáiból eredő károkért</li>
                <li>Vis maior eseményekből eredő károkért</li>
              </ul>
            </Section>

            <Section id="13" title="13. Módosítások">
              <p>A Szolgáltató jogosult az ÁSZF-et módosítani. A módosításokról a Partnereket az előfizetési felületen és email-ben legalább <strong>30 nappal előre</strong> tájékoztatja.</p>
              <p>Ha a Partner a módosítást nem fogadja el, a módosítás hatálybalépéséig jogosult a szerződést felmondani. A folytatólagos használat a módosítások elfogadását jelenti.</p>
            </Section>

            <Section id="14" title="14. Irányadó jog és joghatóság">
              <p>Jelen ÁSZF-re a <strong>magyar jog</strong> az irányadó. A felek közötti jogvitákban elsősorban tárgyalásos úton kísérlik meg az egyezséget. Ennek sikertelensége esetén a felek alávetik magukat a Szolgáltató székhelye szerint illetékes bíróság kizárólagos joghatóságának.</p>
            </Section>

            <Section id="15" title="15. Záró rendelkezések">
              <p>Jelen ÁSZF 2026. január 1. napjától hatályos. Az ÁSZF mindenkori aktuális szövege elérhető a syorder.hu/aszf oldalon.</p>
              <p>Ha jelen ÁSZF valamely rendelkezése érvénytelen vagy végrehajthatatlanná válik, az a többi rendelkezés érvényességét nem érinti. Az érvénytelen rendelkezés helyébe az érvénytelen rendelkezés gazdasági céljához legközelebb álló, érvényes rendelkezés lép.</p>
              <p>A Felek közötti értesítések email útján érvényesek. A Szolgáltató elérhetősége: <strong>info@syorder.hu</strong></p>
              <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 not-prose">
                <p className="text-sm text-slate-600">Hatálybalépés: <strong>2026. január 1.</strong></p>
                <p className="text-sm text-slate-600 mt-1">Utolsó módosítás: <strong>2026. június 20.</strong></p>
                <p className="text-sm text-slate-600 mt-1">Kiadja: <strong>SYORDER — Magyar Vendéglátós Platform</strong></p>
              </div>
            </Section>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-400 bg-white mt-8">
        © {new Date().getFullYear()} SYORDER — Minden jog fenntartva · <Link href="/" className="hover:text-slate-700 transition-colors">Vissza a főoldalra</Link>
      </footer>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">{title}</h2>
      <div className="text-slate-600 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

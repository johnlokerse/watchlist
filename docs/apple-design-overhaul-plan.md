# Watchlist: Apple-design overhaul plan

> **Status:** plan, nog niet uitgevoerd · **Basis:** `main` @ `5131c4c` (v1.4.0) · **Datum:** 17 oktober 2026
> **Bron:** Apple's WWDC-designprincipes (*Designing Fluid Interfaces*, *The Details of UI Typography*, *Principles of Great Design*), vertaald naar het web via de `apple-design` skill.

## In het kort

- Watchlist is netjes en consistent opgebouwd, maar voelt nog niet "Apple".
  - Knoppen reageren niet als je erop drukt.
  - Alles verschijnt en verdwijnt zonder beweging.
  - De kleuren halen de contrastnorm niet. Witte tekst op de accentkleur faalt in **alle 13 thema's**.
  - Typografie is overal even plat.
- De aanpak is eerst het **fundament** (tokens, type, motion, materials), dan **gedeelde componenten**, en pas daarna **per pagina**. Zo wordt elk probleem één keer opgelost in plaats van zeven keer.
- Vooraf komen **zes functionele bugs en zes gedragsbugs** die tijdens de review boven kwamen. Hoe je die fixt staat in §5.
- Genomen beslissingen:
  - [Motion](https://motion.dev) voor animaties
  - het **systeemfont**
  - **5 sterren met halve stappen** voor de rating
- Nog open: drie productkeuzes (§11).

---

## 1. Werkwijze

- **Reviewers.** Per pagina heeft een aparte Claude Haiku 5.5-agent de UI-code beoordeeld tegen de skill. Er waren acht reviewers: Library, Upcoming, Discover, Insights, Settings, Movie detail, Series detail en de globale shell met de Watch Assistant (chat).
- **Controle.** De hoofdagent (Claude Opus 5.5) heeft dezelfde skill toegepast op het fundament (`index.css`, `themes.ts`, `AppShell`, `SegmentedControl`). Daarna heeft hij de claims van de reviewers in de code gecontroleerd, met exacte bestand- en regelverwijzingen.
- **Contrast.** De contrastwaardes zijn **exact berekend** (WCAG 2.x-luminantie) over alle thema's in `src/utils/themes.ts`.
- **Beperking.** Dit was een statische code-review, zonder screenshots of device-tests. Claims die alleen op een device te bevestigen zijn, staan als *te verifiëren* gemarkeerd.

## 2. Verificatie van de reviewbevindingen

| Claim | Oordeel | Bewijs |
|---|---|---|
| Witte tekst op `bg-accent` faalt contrast | ✅ Bevestigd, breder dan gemeld | Faalt AA in **13 van 13** thema's. Komt 14× voor: `ViewToggle.tsx:22,63`, `ChatPanel.tsx:255,296`, `CopilotChat.tsx:217`, `ChatMessage.tsx:60,137`, `EpisodesTab.tsx:163`, `WatchHistory.tsx:91`, `SettingsPage.tsx:694,776`, `SeriesDetailPage.tsx:214`, `MovieDetailPage.tsx:160`, `CountdownBadge.tsx:16` |
| `text-black` op accent werkt overal | ⚠️ Gecorrigeerd | Werkt in 12 thema's. In **Gruvbox Light** haalt zwart 4.21:1 en wit 4.99:1. Daarom moet `--color-on-accent` per thema bestaan. |
| `--color-text-muted` faalt AA | ✅ Breder dan gemeld | Faalt op `surface-raised` in **12 van 13** thema's. Alleen Paper & Ink haalt het (4.60). |
| Inter wordt nergens geladen | ✅ | Geen `@font-face`, fontsource of `<link>`. In de praktijk rendert de systeemfont al. |
| Insights ontbreekt in de mobiele navigatie | ✅ | `AppShell.tsx:7-12`. Alleen de desktop-sidebar linkt ernaar (`:161`). |
| Geen `prefers-reduced-transparency` / `prefers-contrast` | ✅ | Alleen `prefers-reduced-motion` (`index.css:243`). |
| Nergens een `active:`-state | ✅ | 0 treffers. Daarnaast zet `index.css:73-75` `-webkit-tap-highlight-color: transparent`, waardoor ook de native tik-feedback weg is. |
| De `!important`-radius breekt de chat-bubble-staart | ✅ | `index.css:211-215` overschrijft `rounded-br-sm` / `rounded-bl-sm` (`ChatMessage.tsx:137-138`). |
| De Danger Zone-rand rendert niet | 🟡 Plausibel, *te verifiëren in DevTools* | `.app-panel` is unlayered (`index.css:94`) en wint daardoor van de Tailwind v4-utility in `@layer utilities`. |
| De FAB overlapt de close-knop in de mobiele chat | 🟡 *Te verifiëren op device* | `CopilotChat.tsx:214`, `ChatPanel.tsx:211-217` |
| Tabbar-labels moeten minimaal 12px zijn | ❌ Afgewezen | iOS-tabbar-labels zijn 10pt, dus 11px is conform. Wel naar `rem` omzetten. |
| De Insights-tooltip moet met een spring bewegen | ⚠️ Aangepast | Direct manipulation (§2 van de skill) betekent dat crosshair en tooltip 1:1 met de pointer meegaan. Alleen de links/rechts-flip animeert. |

### Exacte contrastmeting (AA-norm voor tekst: 4.5:1)

| Thema | muted op raised | wit op accent | zwart op accent | wit op warning | wit op success |
|---|---|---|---|---|---|
| default | 4.38 ❌ | 3.26 ❌ | 6.45 ✅ | 2.07 ❌ | 2.13 ❌ |
| oled-cinema | 3.58 ❌ | 2.35 ❌ | 8.95 ✅ | 1.67 ❌ | 1.92 ❌ |
| **midnight-velvet** *(default dark)* | 4.05 ❌ | 2.21 ❌ | 9.50 ✅ | 2.13 ❌ | 1.99 ❌ |
| dracula | 4.29 ❌ | 2.41 ❌ | 8.71 ✅ | 1.12 ❌ | 1.37 ❌ |
| nord | 3.84 ❌ | 2.00 ❌ | 10.50 ✅ | 1.56 ❌ | 2.04 ❌ |
| solarized-dark | 4.18 ❌ | 3.16 ❌ | 6.65 ✅ | 3.21 ❌ | 3.20 ❌ |
| solarized-light | 3.27 ❌ | 4.04 ❌ | 5.20 ✅ | 3.07 ❌ | 3.28 ❌ |
| **paper-ink** *(default light)* | 4.60 ✅ | 4.22 ❌ | 4.98 ✅ | 3.02 ❌ | 3.84 ❌ |
| daylight-teal | 3.52 ❌ | 4.21 ❌ | 4.99 ✅ | 3.15 ❌ | 3.48 ❌ |
| nord-light | 3.75 ❌ | 4.03 ❌ | 5.21 ✅ | 1.56 ❌ | 2.04 ❌ |
| gruvbox-light | 4.42 ❌ | **4.99 ✅** | **4.21 ❌** | 3.77 ❌ | 4.86 ✅ |
| rose-pine-dawn | 2.87 ❌ | 3.79 ❌ | 5.54 ✅ | 2.24 ❌ | 6.11 ✅ |
| gruvbox | 3.81 ❌ | 3.56 ❌ | 5.91 ✅ | 2.44 ❌ | 2.19 ❌ |

`border-subtle` op `surface` ligt overal tussen 1.17 en 2.04. Voor decoratieve randen is dat oké. Voor input-randen (WCAG 1.4.11) en `prefers-contrast: more` is een sterker token nodig.

## 3. De rode draad

1. **Geen press-feedback** (skill §1). Hover wordt bij aanraking een "sticky" state, en de native tap-highlight staat uit.
2. **Motion is instant of `transition-all`** (§3, §4, §7).
   - Er is geen spring-bibliotheek.
   - Panelen en modals worden zonder animatie gemount en ge-unmount.
   - Segmented controls en tabs wisselen alleen van kleur.
3. **Kleurtokens zijn niet toegankelijk.**
   - Er is geen `on-accent`-token en `muted` is te zwak.
   - De `@theme`-fallbacks (`index.css:4-15`) wijken af van `themes.ts`.
   - Er zitten hardcoded literals in de code, zoals `bg-black/75` en `bg-green-500`.
4. **Typografie en geometrie zijn plat** (§15).
   - Tracking staat overal op 0 en er is geen type-scale.
   - px-maten negeren de tekstgrootte van de gebruiker.
   - De `!important` 8px-radius maakt concentrische hoeken onmogelijk.
5. **Materials en toegankelijkheid zijn half af** (§12, §14).
   - Chrome staat op 95% opaciteit, dus de blur is onzichtbaar.
   - Er worden harde borders gebruikt in plaats van scroll-edge-effects.
   - Er is geen fallback voor reduced transparency of verhoogd contrast.
   - Reduced motion zet alles op 0.01ms, waardoor spinners bevriezen.

Daarnaast zijn er terugkerende UX-gaten:
- **Destructieve acties zonder undo.**
- **Geen completion-feedback.**
- **Touch-targets onder 44pt.**
- **AI-output zonder spoiler- of onnauwkeurigheidsdisclaimer.**

## 4. Genomen beslissingen

| Onderwerp | Besluit | Uitwerking |
|---|---|---|
| Animatiebibliotheek | **`motion`** (Motion for React, `motion/react`) | Interruptible springs, velocity-handoff en drag met release-velocity. Bundel klein houden met `LazyMotion` + `m.*`: `domAnimation` standaard, `domMax` alleen lazy laden in `Sheet` (drag). Globaal `<MotionConfig reducedMotion="user">`. |
| Font | **Systeemfont** | `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI Variable", "Segoe UI", sans-serif` en `font-optical-sizing: auto`. Inter verdwijnt uit de stack. Er hoeft niets geladen te worden. |
| Rating | **5 sterren met halve stappen** (best practice) | 5 sterren is de Apple-conventie (App Store, Apple Music) en het patroon van Letterboxd. Grotere targets dan 10 sterren. **Opslag blijft 1–10** (`userRating` = aantal halve sterren), dus er is geen datamigratie nodig en Trakt (1–10) blijft compatibel. Details in §7. |

## 5. Fase 0: bugfixes (eerste PR, vóór het design-werk)

Elke fix staat los en is klein. Per bug staat hieronder wat er gebeurt, waarom, hoe het gefixt wordt en hoe het getest wordt.

### 5a. Functionele bugs

#### B1. Chat: server-fouten worden ingeslikt en de typ-indicator blijft draaien
- **Waar:** `src/hooks/useChat.ts:72-99`
- **Oorzaak:** `throw new Error(...)` voor `event.type === 'error'` (`:85`) staat binnen dezelfde `try` als `JSON.parse`. De eigen `catch { // skip malformed lines }` (`:87`) vangt de fout direct weer op. Daarnaast zet de `finally` alleen de globale `isStreaming` uit. Als de stream eindigt zonder `done`-event, blijft het bericht zelf op `isStreaming: true` staan en blijven de dots stuiteren.
- **Fix:**
  ```ts
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    let event: { type: string; content?: string; message?: string };
    try {
      event = JSON.parse(line.slice(6));
    } catch {
      continue; // alleen echt kapotte regels overslaan
    }
    if (event.type === 'delta' && event.content) { /* … */ }
    else if (event.type === 'done') { /* … */ }
    else if (event.type === 'error') throw new Error(event.message ?? 'Unknown error'); // bereikt nu de buitenste catch
  }
  // …
  } finally {
    setIsStreaming(false);
    setMessages((prev) => prev.map((m) => (m.id === assistantId && m.isStreaming ? { ...m, isStreaming: false } : m)));
  }
  ```
  In `ChatPanel` wordt de fout inline getoond met een **Opnieuw proberen**-knop, die de laatste gebruikersvraag opnieuw verstuurt. Dat is de feedback-soort *error* (§16).
- **Test:** breid de stub in `server/test-server.ts` uit, zodat een trigger-bericht (bijv. `"__force_error__"`) een `{type:'error'}`-event stuurt. Controleer daarna in `chat.spec.ts` dat de foutmelding en de retry-knop zichtbaar zijn en dat er geen typ-indicator meer staat.

#### B2. `useCountdown` lekt een interval per kaart
- **Waar:** `src/hooks/useCountdown.ts:14-21`
- **Oorzaak:** `return () => clearInterval(interval)` staat *in* de `setTimeout`-callback. Die return-waarde wordt weggegooid. Na de eerste middernacht draait er dus een interval dat nooit opgeruimd wordt, ook niet na een unmount of een wijziging van `dateStr`. Daarnaast heeft elke kaart eigen timers.
- **Fix:** samen met B3 één gedeelde bron van "vandaag" maken.
  ```ts
  // src/hooks/useToday.ts: één timer voor de hele app
  export function useToday(): string {
    const [today, setToday] = useState(toLocalISODate);
    useEffect(() => {
      let timeout: ReturnType<typeof setTimeout>;
      const schedule = () => {
        timeout = setTimeout(() => { setToday(toLocalISODate()); schedule(); }, msUntilLocalMidnight() + 1000);
      };
      schedule();
      // na slaap of achtergrond (PWA) direct opnieuw controleren
      const onVisible = () => document.visibilityState === 'visible' && setToday(toLocalISODate());
      document.addEventListener('visibilitychange', onVisible);
      return () => { clearTimeout(timeout); document.removeEventListener('visibilitychange', onVisible); };
    }, []);
    return today;
  }
  ```
  Bied dit aan via een `TodayProvider` in `App.tsx`. `useCountdown(dateStr)` wordt dan `daysBetween(useToday(), dateStr)`, zonder eigen timers.
- **Test:** in `upcoming.spec.ts` met `page.clock.install({ time: '2026-10-17T23:59:30' })`, daarna `page.clock.runFor('01:00')`. De badge moet van "1 day" naar "Today" springen.

#### B3. "Vandaag" wordt in UTC berekend (verkeerde dag tussen 00:00 en 02:00 in NL)
- **Waar:** `new Date().toISOString().slice(0, 10)` komt 9× voor:
  - `UpcomingPage.tsx:36`
  - `EpisodesTab.tsx:48`
  - `ReleaseTimeline.tsx:60`
  - `db/hooks.ts:50`
  - `api/tmdb.ts:121,134`
  - `LibraryPage.tsx:513`
  - `SettingsPage.tsx:494` (bestandsnaam)
  - `server/db.ts:356`
- **Oorzaak:** `toISOString()` geeft UTC. `daysUntil()` (`utils/date.ts:1-6`) rekent wél lokaal. Na middernacht lokale tijd is "today" dus nog gisteren. Afleveringen van vandaag gelden dan als "niet uitgezonden" terwijl de badge "Today" zegt.
- **Fix:**
  ```ts
  // src/utils/date.ts
  export function toLocalISODate(d = new Date()): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  ```
  Vervang alle frontend-plekken door `useToday()` (in componenten) of `toLocalISODate()` (in niet-React-code).
  **Server** (`server/db.ts:356`, `isAired`): de Docker-container draait in UTC. Er zijn twee opties:
  - (a) `TZ` instelbaar maken en documenteren (`docker run -e TZ=Europe/Amsterdam`). Node's ingebouwde ICU heeft de tijdzonedata. Verifiëren in de runtime-image.
  - (b) de client stuurt zijn lokale datum mee.

  Voorkeur: (a), omdat het het simpelst is.
- **Test:** `test.use({ timezoneId: 'Europe/Amsterdam' })` met de klok op `00:30` lokale tijd, op de dag van een geseede aflevering. Die aflevering moet als uitgezonden of "Today" verschijnen.

#### B4. Movie detail: de status-`<select>` mist "Watching"
- **Waar:** `src/pages/MovieDetailPage.tsx:141-147`
- **Oorzaak:** de select heeft alleen `watched` en `plan_to_watch`, terwijl het add-menu (`:167`) `watching` aanmaakt. Een film met status *watching* toont daardoor ten onrechte "Watched". `SeriesDetailPage.tsx:199-201` heeft alle drie de opties wél.
- **Fix:** voeg `<option value="watching">Watching</option>` toe. Haal de opties uit één gedeelde `STATUS_OPTIONS` in `utils/constants.ts`, zodat Movie, Series en Card niet uit elkaar lopen. In fase 4 wordt deze select vervangen door een status-menu.
- **Test:** `detail-movie.spec.ts`: seed een film met `status: 'watching'` en controleer `toHaveValue('watching')`.

#### B5. Settings: Export en Clear blijven bij een fout eeuwig "bezig"
- **Waar:** `src/pages/SettingsPage.tsx:487-505`
- **Oorzaak:** er staat geen `try/finally`. Als `exportLibrary()` of `clearLibrary()` faalt, blijft de knop op "Exporting…" of "Clearing…" staan en ziet de gebruiker geen fout. Daarnaast annuleert `URL.revokeObjectURL` direct na `a.click()` in sommige browsers (Safari, Firefox) de download.
- **Fix:**
  ```ts
  const handleExport = async () => {
    setExporting(true); setExportStatus(null);
    try {
      const data = await exportLibrary();
      // … blob + a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportStatus({ kind: 'success', text: `${data.items.length} titels geëxporteerd` });
    } catch (err) {
      setExportStatus({ kind: 'error', text: 'Exporteren mislukt. Probeer het opnieuw.' });
    } finally {
      setExporting(false);
    }
  };
  ```
  `handleClear` krijgt hetzelfde patroon. Toon de status direct onder de knop (`role="status"` of `role="alert"`). De `confirm()` wordt in fase 4 vervangen.
- **Test:** `settings.spec.ts`: `page.route('/api/library/export', r => r.fulfill({ status: 500 }))`. Daarna moet de foutmelding zichtbaar zijn en de knop weer klikbaar.

#### B6. Series detail: een leeg seizoensveld slaat seizoen 0 op, en elke toets schrijft naar de server
- **Waar:** `src/pages/SeriesDetailPage.tsx:150-161, 259-279`
- **Oorzaak:** `Number('')` is `0`. Een leeg veld door backspace slaat dus seizoen 0 op, terwijl `min={1}` alleen een hint is. Daarnaast doet elke toetsaanslag een `updateSeriesProgress`.
- **Fix:** gebruik lokale draft-state en commit bij `blur` of `Enter`. Clamp en valideer:
  ```ts
  const commitSeason = () => {
    const n = Number.parseInt(draftSeason, 10);
    if (Number.isNaN(n)) return setDraftSeason(String(progress?.currentSeason ?? 1)); // terugzetten
    handleProgressChange(clamp(n, 1, series.number_of_seasons), progress?.currentEpisode ?? 0);
  };
  ```
  Voeg `id` en `htmlFor` toe aan de labels. In fase 4 worden deze velden steppers.
- **Test:** `detail-series.spec.ts`: maak het seizoensveld leeg en blur. De waarde moet terugspringen naar het oude seizoen, en er mag geen PUT met `currentSeason: 0` verstuurd worden (`page.waitForRequest`).

### 5b. Gedragsbugs (UI doet iets anders dan je verwacht)

| # | Bug | Waar | Oorzaak | Fix |
|---|---|---|---|---|
| G1 | "Unmark all" zet de voortgang niet terug | `EpisodesTab.tsx:56-67` | Bij `allWatched` wordt alleen `markSeasonWatched(…, [])` aangeroepen, zonder `onEpisodeWatched`. Een enkele unmark (`:203`) zet de voortgang wél terug. | Roep bij unmark-all `onEpisodeWatched(season, watchableEpisodes[0].episode_number)` aan, symmetrisch met de enkele unmark. In fase 4 komt er Undo bij. Test: in `detail-series.spec.ts:279` ook de progress-teller controleren. |
| G2 | De Insights-crosshair zit tot ~8px naast de pointer en kiest aan de randen de verkeerde maand | `ActivityChart.tsx:72-76, 192-196` | De ratio wordt berekend over de hit-rect (`PAD.left − 8`, `plotW + 16`), terwijl de punten over `PAD.left … PAD.left + plotW` liggen. | `const scale = rect.width / (plotW + 16); const ratio = (e.clientX - rect.left - 8 * scale) / (plotW * scale);` en dan clampen. Voeg `touch-action: pan-y` en `setPointerCapture` toe voor touch. |
| G3 | Onzichtbare ScrollRow-pijlen vangen taps op posters af | `ScrollRow.tsx:51-59, 83-91` | `opacity-0` maar wel klikbaar. Op touch zijn ze nooit zichtbaar, maar 40px van de rij-randen reageert op de pijl. | `pointer-events-none` als ze verborgen zijn, en tonen bij `@media (hover: hover)` of `group-focus-within`. Blader per item in plaats van per `clientWidth` (`scroll-snap mandatory` landt nu tussen items). |
| G4 | De Danger Zone-rand is niet rood | `SettingsPage.tsx:1102`, `index.css:94-131, 189-204` | Eigen classes (`.app-panel`, `.control-surface`, `.database-row`) zijn unlayered en winnen daardoor van Tailwind-utilities zoals `border-danger/30`. | Zet deze component-classes in `@layer components { … }`. Dan winnen utilities zoals bedoeld, overal in de app. Visueel nalopen, want sommige plekken leunen mogelijk op het huidige gedrag. |
| G5 | Discover zegt "No matching titles" terwijl er nog geladen wordt | `DiscoverPage.tsx:77-84, 277` | `DiscoverySpotlight` kent geen loading-state. Een mislukte feed toont "No matches in this feed" (`:150`). | Geef `isLoading` en `error` door: skeleton-hero tijdens laden, en per sectie een fout met retry. "Geen resultaten" alleen na een succesvolle lege response. |
| G6 | De ModelPicker vuurt bij elke toetsaanslag een fetch af | `SettingsPage.tsx:456-478` | De effect-dependency is de volledige `openrouterApiKey`, terwijl de request de key niet eens meestuurt. Er is ook geen abort, dus een oude response kan een nieuwe overschrijven. | Hang af van `hasKey = key.length >= 10` (boolean), debounce 400ms, en gebruik een `AbortController` in de cleanup. |

**Release fase 0:** versie 1.4.1 in `package.json` én `Dockerfile` (`ARG APP_VERSION`).

## 6. Fase 1: design-system fundament

Bestanden: `index.css`, `themes.ts` en de nieuwe map `src/design/`.

**1a. Kleurtokens** (§16 Craft, §14)
- [ ] Een `--color-on-accent` per thema: donkere inkt in 12 thema's, wit in Gruvbox Light. Vervang alle 14 plekken met `bg-accent … text-white`.
- [ ] `--color-on-warning` en `--color-on-success` (donkere inkt) voor `CountdownBadge` en de progress-banner. Urgentie niet alleen met kleur aangeven: voeg een icoon of tekst toe.
- [ ] Hoog `--color-text-muted` per thema op tot minimaal 4.5:1 op `surface-raised` én `surface-overlay`.
- [ ] Een `--color-border-strong` (minimaal 3:1) voor input-randen en `prefers-contrast: more`.
- [ ] `@theme` (`index.css:4-15`) gelijktrekken met het `default`-thema, zodat `themes.ts` de enige bron is. Vervang `bg-green-500` en `bg-black/xx` door tokens.
- [ ] `scripts/check-contrast.mjs`, dat faalt bij token-paren onder de 4.5:1. Optioneel draait het in CI.

**1b. Typografie** (§15)
- [ ] Systeemfont-stack (zie §4).
- [ ] Type-scale, alles in `rem`:

| Rol | Grootte | Leading | Tracking | Gewicht |
|---|---|---|---|---|
| display (`.page-title`) | `clamp(1.55rem, 1.2rem + 1vw, 2.15rem)` | 1.05 | **-0.022em** | 760 |
| title (hero h1/h2) | 1.25–1.875rem | 1.15 | -0.015em | 700 |
| headline | 1.0625rem | 1.3 | -0.01em | 600 |
| body | 0.9375rem | 1.45 | 0 | 400 |
| input | **1rem** (voorkomt iOS focus-zoom) | 1.3 | 0 | 400 |
| caption | 0.8125rem | 1.35 | +0.005em | 500 |
| label (caps, `.section-title`) | 0.75rem | 1.2 | +0.08em | 700 |
| micro (badges, tab-labels) | 0.6875rem | 1.1 | +0.01em | 600 |

- [ ] Vervang `text-[9px]`, `text-[10px]` en `text-[11px]` door de tokens. Zet `tabular-nums` op alle tellers en countdowns.

**1c. Geometrie**
- [ ] Verwijder de `!important`-radius-override (`index.css:211-219`). Gebruik radius-tokens `xs 6 / sm 8 / md 12 / lg 16 / sheet 20` met de regel *inner = outer − padding*.
- [ ] Een hit-area-utility `.hit-44` (`::before`, minimaal 44×44, zonder visuele vergroting).

**1d. Materials** (§12)
- [ ] Drie materials:
  - `.material-chrome`: `surface` 72%, `blur(24px) saturate(180%)`. Voor tabbar, sidebar en de sticky filterbalk.
  - `.material-sheet`: `surface-raised` 88%, `blur(32px)`. Voor sheets en popovers.
  - `.material-chip`. Voor poster-badges.
- [ ] Schaduw-tiers `--shadow-chip / --shadow-card / --shadow-sheet`, met een lichtere rustschaduw op `.app-panel`.
- [ ] Een scroll-edge-utility (`mask-image`-fade) in plaats van `border-t` en `border-b` waar zwevende chrome over content ligt.

**1e. Motion** (§3, §4, §14)
- [ ] `npm i motion`, plus `LazyMotion` en `MotionConfig reducedMotion="user"` in `main.tsx`.
- [ ] Presets in `src/design/motion.ts`:
  - `spring.default` = `{ type:'spring', bounce:0, duration:0.3 }` (damping 1.0, response 0.3)
  - `spring.move` = `{ type:'spring', bounce:0, duration:0.4 }`
  - `spring.sheet` = `{ type:'spring', bounce:0.2, duration:0.3 }` (≈ damping 0.8). **Alleen na een flick.**
  - `project(v, d = 0.998) = (v / 1000) * d / (1 - d)` en `rubberband(o, dim, c = 0.55)`
  - CSS-micro: press 100ms ease-out met `scale(.97)`, kleur en hover 150ms, en nooit `transition-all`.
- [ ] Vervang de reduced-motion-kill-switch (`index.css:243-252`) door gerichte regels: slides en springs worden een cross-fade, en spinners worden een statisch label of puls in plaats van te bevriezen. Respecteer dit ook in JS (`scrollBy`/`scrollIntoView` met `behavior:'auto'`).

**1f. Feedback-baseline** (§1, §10, §14)
- [ ] Globale press-state op `button` en `a`, verfijnd per primitive.
- [ ] Hover-effecten (lift, scale) achter `@media (hover: hover)`.
- [ ] `prefers-reduced-transparency: reduce` maakt materials solide. `prefers-contrast: more` geeft een solide achtergrond met `border-strong`.
- [ ] Overal `focus:` vervangen door `focus-visible:`, en `focus:outline-none` verwijderen.
- [ ] Een thema-wissel (ook de automatische light/dark-switch) faadt in 200ms, behalve bij reduced motion.

**Release fase 1 en 2:** versie 1.5.0.

## 7. Fase 2: gedeelde componenten (`src/components/ui/`)

Elk component krijgt standaard een press-state, een hit-area van minimaal 44pt, `focus-visible`, motion-presets en reduced-motion-gedrag.

| Component | Wat | Gebruikt door |
|---|---|---|
| `Button` (primary/secondary/destructive/plain) | Vervangt ~20 ad-hoc stijlen. Primary gebruikt `on-accent`. | overal |
| `SegmentedControl` v2 | Een thumb die met `spring.default` meeschuift (`layoutId`). Concentrische radius, 32px visueel en 44px hit. | Media, Discover, Insights, Settings, Series-seizoenen |
| `Tabs` | Een underline die met een spring meeschuift. Content cross-fade met 8px offset in de tab-richting. `tablist`-rollen met pijltjestoetsen en een edge-fade bij overflow. | Movie- en Series-detail |
| `Sheet` | Op mobiel een bottom sheet: grabber, 1:1 drag met grab-offset, rubber-band boven, projectie bij loslaten, velocity-handoff en een exit langs hetzelfde pad. De scrim-opaciteit is gekoppeld aan de positie. Op desktop een dialog vanaf de trigger. `role="dialog"`, focus-trap en focus-return. | RecapModal, chat (mobiel) |
| `Popover` / `Menu` | Origin op de trigger, scale .96→1 met opacity, een gespiegelde exit, Escape en pijltjestoetsen. | Add-menu, status-menu, ModelPicker |
| `Toggle` | Uit Settings gehaald. Verplicht `label`, en de hele rij is het hit-target. Een spring bij het omzetten. | Settings |
| `Toast` + `useUndo` | Een `aria-live`-regio. Het undo-patroon voert de actie direct in de UI uit en commit na 5s. | Remove, Mark all, Saved |
| **`RatingStars` v2** | Zie hieronder. | Movie- en Series-detail, Library |
| `ScrollRow` v2 | Pijlen alleen bij hover-devices (G3). Bladeren per item. Edge-bleed (`-mx-4 px-4 scroll-px-4`), edge-fade, verticale padding tegen schaduw-clipping, en chevron-SVG's. | Discover, Recommended |
| `Card` | Een `active:scale-[.97]`, hover-lift alleen bij hover-devices, een lichtere rustschaduw, gerichte transitions en badges via tokens. | alle grids |
| `Skeleton` | Spiegelt de echte structuur, zet `aria-busy` en cross-fadet naar de content. | alle pagina's |

**`RatingStars` v2: 5 sterren met halve stappen**
- **Model:** de prop `value` blijft 1–10. Weergave: `value / 2` sterren, dus 7 wordt ★★★½☆.
- **Semantiek:** `role="radiogroup"` met 10 radio's (0.5 … 5). De labels zijn "3.5 stars", en `aria-valuetext` staat op de groep.
- **Interactie:**
  - Elke ster is 44pt hoog. De linker- en rechterhelft zijn aparte targets.
  - **Drag-to-rate:** `pointerdown` met `setPointerCapture`, en het vullen volgt de vinger 1:1.
  - Commit bij `pointerup`. Nogmaals tikken op de huidige waarde wist de rating.
  - Pijltjes en Home/End stappen per 0.5.
- **Feedback:** een press-`scale(.9)`, en de gekozen ster "popt" met `spring.default`. De hover-preview werkt alleen bij `pointerType === 'mouse'`.
- **Weergave elders:** in de Library-lijst wordt `8/10` vervangen door ★ 4.5 (`LibraryPage.tsx:273`).
- **Tests:** `detail-movie.spec.ts:209` (`'7 stars'` wordt `'3.5 stars'`) en `detail-series.spec.ts:207` (`'8 stars'` wordt `'4 stars'`).

## 8. Fase 3: shell en Watch Assistant

- [ ] **Wayfinding:** Insights in de mobiele tabbar (vijf items).
- [ ] Tabbar en sidebar gebruiken `material-chrome` met een scroll-edge-mask in plaats van `border-t` en `border-r`.
- [ ] Sidebar-collapse met een spring op `grid-template-columns` of een transform, in plaats van `transition-all` op `width` en `padding`.
- [ ] **Chat op mobiel:** een `Sheet` met safe-area-insets. De FAB is verborgen als de sheet open is.
- [ ] **Chat op desktop:** schaalt open vanaf de FAB en sluit langs hetzelfde pad. Hoogte `min(560px, 100dvh − 7rem)`. Expand met een spring.
- [ ] Escape sluit, de composer krijgt autofocus, en `aria-expanded` staat op de model-picker.
- [ ] Streaming:
  - `role="log" aria-live="polite"`.
  - Auto-scroll alleen als de gebruiker al onderaan is.
  - Deltas per frame batchen.
  - `React.memo` op `ChatMessage`.
- [ ] Bubbles gebruiken `on-accent`, en de staart is hersteld. Het "+"-knopje krijgt een 44pt-hit-area.

## 9. Fase 4: per pagina

### Series detail
- RecapModal wordt een `Sheet`.
- **AI-verantwoordelijkheid:**
  - De recap zit achter de spoiler-instelling ("Bevat spoilers. Toon") en heet "AI-recap".
  - Disclaimer: *"AI-geschreven op basis van de synopsis, kan fouten of spoilers bevatten"*.
  - Acties: Verbergen en Opnieuw genereren.
- Episode-checkboxen:
  - **Optimistisch:** de UI past direct aan en wordt bij een fout teruggedraaid.
  - Er komt een getekende check bij, plus een press-state op de hele rij.
- "Mark all watched" en "Remove" krijgen een **Undo-toast**.
- Seizoenen:
  - Eén horizontale snap-rij of een `SegmentedControl`.
  - `placeholderData: keepPreviousData` in plaats van een spinner bij een seizoenswissel.
- Seizoen en aflevering worden steppers van 44pt.
- De page-spinner wordt een hero-skeleton.

### Movie detail
- `Tabs`, `Popover` voor het add- en status-menu, en `RatingStars` v2.
- Status en rating staan bij elkaar. Notes en historie komen in een disclosure.
- "Opgeslagen"-feedback voor rating, status en notes. Remove wordt een destructief menu-item met Undo.
- Provider-chips zonder link krijgen een muted variant.
- `.section-title` wordt overal gebruikt, en de typo "You might also like.." wordt gecorrigeerd.

### Library (Movies/Series)
- De sticky filterbalk wordt `material-chrome` met een maximale hoogte van `60svh`.
- Het filterpaneel en de sectie-collapse animeren de hoogte met een spring en zijn interruptible. Ingeklapte content wordt `inert`.
- Een funnel-icoon met een badge voor het aantal actieve filters.
- In de lijstweergave is de hele rij de link, en `ListRow` en `LibraryTable` worden één component.
- Bij een wissel van cover-grootte of weergave komt er een layout-animatie.

### Upcoming
- `CountdownBadge` gebruikt `on-warning` / `on-success` en `tabular-nums`, en een gedeelde `useToday` (B2/B3).
- Skeletons die de sectiestructuur spiegelen, en uniforme telwoorden ("1 item" of "N items").

### Discover
- Laden, leeg en fout zijn gescheiden (G5).
- Query en filter staan in de URL, en `scrollRestoreId` staat op de Cards.
- De search-input krijgt `type="search"`, `enterKeyHint` en een font van 16px op mobiel.
- Labels:
  - Dezelfde `statusLabel()` als in Card.
  - De meta wordt afgeleid van de zichtbare resultaten.
  - Dubbele titels worden eruit gefilterd, en de banner-copy klopt weer.

### Settings
- Een gegroepeerde inset-layout zoals iOS Settings, in deze volgorde:
  1. Appearance
  2. API Keys, met een "Setup nodig"-banner
  3. Streaming
  4. Preferences
  5. Library Data
  6. AI Assistant (ingeklapt)
- Alle toggles via `Toggle` met een label.
- "Clear all" wordt **"Delete library…"** met een inline bevestiging die het aantal noemt. Native `confirm()` verdwijnt.
- Token-inputs:
  - Een debounce op de PUT.
  - Een status "Opgeslagen" of "Kon niet opslaan".
  - Inline validatie bij blur.
- De OpenRouter-input krijgt een label en `autoComplete="off"`.
- Import en export tonen hun status direct onder de knop, met leesbare skip-redenen.
- Thema's en streaming-diensten worden `radiogroup` / `aria-pressed`. Selectie gebruikt de accentkleur; groen is alleen voor status.

### Insights
- Chart-fix uit G2, en de tooltip met `material-sheet` die 1:1 meebeweegt en met hysterese flipt.
- Bij een datawissel interpoleert de lijn met `spring.move` en faadt de detail-lijst.
- De chart wordt `role="slider"` met `aria-valuetext`, en de legend wordt een `role="group"` of direct op de lijnen gelabeld.
- Eén type-scale voor de stat-tiles, en de empty state linkt naar Movies en Series.

**Release fase 3 en 4:** versie 1.6.0.

## 10. Uitvoering, tests en verificatie

- **Volgorde:**
  - Fase 0 → 1 → 2 is sequentieel.
  - Fase 3 en de pagina's uit fase 4 kunnen parallel zodra fase 2 er ligt. Dat kan met één PR per pagina.
- **Versie:** bij elke PR de versie in `package.json` én `Dockerfile` (`ARG APP_VERSION`) gelijk ophogen.
- **Playwright-impact:**
  - `button "Recap"` (`episode-recap.spec.ts`) wordt "AI-recap".
  - De ster-labels (§7) veranderen.
  - "Clear all" wordt "Delete library…".
  - Nieuwe rollen: `dialog`, `tab`, `radio`.
  - Undo-toasts met uitgestelde commit vragen om `page.clock` of het expliciet sluiten van de toast.
  - **Stop `npm run dev` vóór `npm run test`.**
- **Verificatie per fase:**
  - `npm run lint`, `npm run build`, `npm run test` en het contrast-script.
  - In de browser `prefers-reduced-motion`, `prefers-reduced-transparency` en `prefers-contrast` emuleren.
  - Alle 13 thema's doorlopen.
  - Op 375px breed met safe-areas, en een iOS-PWA op een echt device voor de sheet-gestures en rating-drag.
  - Motion in slow motion bekijken (DevTools Animations op 10%).

## 11. Openstaande beslissingen

1. **Upcoming, "Ended"-sectie:** naar een Library-filter verplaatsen (beter voor wayfinding), of houden met een duidelijke visuele scheiding?
2. **Discover:** een in-place "+ Toevoegen" op de kaarten (een nieuwe feature), of via de detailpagina zoals nu?
3. **"Delete library":** een echte Undo (soft-delete, vraagt een backend-wijziging in `server/`) of alleen een inline bevestiging (puur frontend)?

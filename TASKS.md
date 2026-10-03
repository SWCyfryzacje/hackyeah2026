# TASKS — Wspólne trasy

Branch integracyjny: `teammates` (z `merged-1`). Każdy teammate pracuje w osobnym worktree
na branchu `tm-<tN>` utworzonym z commita T0 (`c8b42fd`), worktree `.claude/worktrees/<tN>`;
lider merguje do `teammates`. Teammates nie edytują tego pliku — status prowadzi lider.
**Pliki są rozłączne** — teammate nie edytuje plików spoza swojej listy (stuby z T0 zastępuje).

Statusy: ⬜ todo · 🔄 w toku · ✅ zrobione · ⛔ zablokowane

Definicja ukończenia każdego taska (DoD): spełnione kryteria taska, `npx tsc --noEmit` i
`npm run lint` bez nowych błędów, commit na branchu teammate'a, status tu zaktualizowany.

---

## Faza 1 — specyfikacja
| ID | Task | Właściciel | Status |
|---|---|---|---|
| P1 | Przegląd repo, pytania, SPEC/ARCHITECTURE/TASKS | lider | ✅ czeka na akceptację |

## Faza 2a — fundament (sekwencyjnie, przed teammates)
| ID | Task | Właściciel | Zależy od | Kryterium ukończenia | Status |
|---|---|---|---|---|---|
| T0.1 | Migracja `20261004090000_group_routes.sql` (tabele, helpery, RLS, RPC, publikacja realtime) | lider | P1 | SQL idempotentny gdzie się da; **wklejony przez użytkownika**; `get_advisors` (security) bez nowych ostrzeżeń dla tych tabel | ✅ zastosowana przez MCP za zgodą (04.10); advisor: tylko zamierzone WARN 0029 dla 10 RPC (security definer z własnymi checkami) |
| T0.2 | Migracja `20261004090100_group_routes_cron.sql` (auto-finish co 5 min, purge 02:45 UTC) | lider | T0.1 | joby widoczne w `cron.job` | ✅ 2 joby w `cron.job` |
| T0.3 | `src/types/group-routes.ts`, `src/lib/group-routes.ts`, `src/lib/group-route-draft.ts` | lider | T0.1 | wszystkie RPC z ARCHITECTURE §2 mają typowane wrappery | ✅ |
| T0.4 | Stuby wszystkich plików z kontraktów + ekranów (zwracają placeholder) | lider | T0.3 | `tsc` i `lint` przechodzą; commit bazowy dla teammates | ✅ |

Baseline `tsc`: 1 zastany błąd na `merged-1` (`src/app/_layout.tsx:2` — brak typów dla `@/global.css`,
bo `expo-env.d.ts` jest generowany przez `expo start`). DoD = brak **nowych** błędów.

Ryzyka sprawdzone przed T0:
- Realtime + Clerk: supabase-js 2.117 przekazuje `accessToken` do Realtime i odświeża token przy
  każdym heartbeacie (~25 s); docs Supabase potwierdzają RLS dla Realtime przy Clerk third-party auth
  (wymaga claimu `role: authenticated` — działa, bo `profiles` zapisuje się przez politykę `to authenticated`).
- DELETE w `postgres_changes` nie jest filtrowany RLS → domyślne replica identity (tylko PK).

## Faza 2b — teammates (równolegle, od commita T0.4)

### T1 — Lokalizacja na żywo (teammate `location`)
Pliki:
- `src/hooks/group-routes/useLocationSharing.ts`
- `src/hooks/group-routes/useLiveLocation.ts`
- `src/components/group-routes/live-location-marker.tsx`
- `src/components/group-routes/location-consent-dialog.tsx`

| ID | Task | Kryterium ukończenia | Status |
|---|---|---|---|
| T1.1 | `useLocationSharing` — watch + timer 5 s, tylko foreground (AppState), stop przy `enabled=false`/unmount | RPC wywoływane co ~5 s tylko gdy enabled i app aktywna | ✅ `b2fdd24` |
| T1.2 | `useLiveLocation` — select początkowy + kanał INSERT/UPDATE/DELETE; fallback polling | po DELETE `location = null` | ✅ `b2fdd24` |
| T1.3 | `LiveLocationMarker` (+ opc. „ostatnio X min temu”) | marker w `<MapView>` | ✅ `b2fdd24` |
| T1.4 | `LocationConsentDialog` (PL, treść wg SPEC F5) | onAccept / onCancel | ✅ `b2fdd24` |

### T2 — Czat (teammate `chat`)
Pliki:
- `src/hooks/group-routes/useRouteChat.ts`
- `src/components/group-routes/chat/*` (message-list, message-bubble, message-input)
- `src/app/group-routes/[id]/chat.tsx`

| ID | Task | Kryterium ukończenia | Status |
|---|---|---|---|
| T2.1 | `useRouteChat` — 200 ostatnich + kanał INSERT, nicki z `get_group_route_participants` (fallback Turysta-XXXX), dedupe po id | wiadomość innego użytkownika pojawia się bez odświeżania | ✅ `eacf70f` |
| T2.2 | Komponenty czatu + ekran; read-only gdy status ∉ scheduled/live; licznik 500 | po zakończeniu pole wysyłki ukryte z informacją | ✅ `eacf70f` |

### T3 — Ekrany i integracja (teammate `frontend`)
Pliki:
- `src/app/(tabs)/together.tsx` (nowy) · `src/app/(tabs)/_layout.tsx` (+1 `Tabs.Screen`)
- `src/app/(tabs)/route.tsx` (+ kilka linii: przycisk)
- `src/app/group-routes/_layout.tsx`, `new.tsx`, `[id]/index.tsx`, `join/[code].tsx`
- `src/components/group-routes/*` **poza** plikami T1 i katalogiem `chat/`
- `src/hooks/group-routes/useGroupRoutes.ts`, `useGroupRoute.ts`, `useUpcomingEvents.ts`

| ID | Task | Kryterium ukończenia | Status |
|---|---|---|---|
| T3.1 | Zakładka „Razem”: Moje / Publiczne, dołącz kodem, pull-to-refresh | lista z `list_group_routes()` | ✅ `494807a`, `668185a` |
| T3.2 | Przycisk w Route + formularz `new.tsx` (zod, Dziś/Jutro + HH:MM, koniec opc., publiczna/prywatna, wydarzenie) | utworzenie trasy → przejście do szczegółów | ✅ `494807a`, `668185a` |
| T3.3 | Szczegóły `[id]`: mapa + geometria + `LiveLocationMarker`, status (realtime), uczestnicy, kod, akcje wg roli/statusu, zgoda przed startem, `useLocationSharing`, link do czatu | pełny cykl scheduled→live→finished z UI | ✅ `494807a`, `668185a` |
| T3.4 | `join/[code].tsx` — deeplink → join → redirect do szczegółów | link `njord://group-routes/join/KOD` działa | ✅ `494807a`, `668185a` |

### T4 — Weryfikacja RLS (teammate `qa`)
Pliki:
- `supabase/tests/group_routes_rls.sql`
- `supabase/tests/README.md`

| ID | Task | Kryterium ukończenia | Status |
|---|---|---|---|
| T4.1 | Skrypt testów w `begin … rollback` (symulacja 3 użytkowników przez `set local role authenticated` + `request.jwt.claims`): nie-uczestnik nie widzi pozycji/czatu/trasy prywatnej, uczestnik nie może startować/wysyłać pozycji, brak pisania po zakończeniu, limit 500 | skrypt gotowy; **uruchomienie tylko po zgodzie użytkownika** | ✅ `518a776` — uruchomiony za zgodą (rollback): **171/173 PASS**; brak danych testowych po przebiegu |
| T4.2 | Poprawka znaleziska T4 (9.6b, 9.7b): check treści wiadomości liczył długość po `btrim()` (tylko spacje) → przechodziły wiadomości 10 001 znaków ze spacjami i same `\t\n`. Migracja `20261004090200_group_routes_message_body_check.sql` (lider) | migracja zastosowana, testy 9.6b/9.7b PASS | ⛔ czeka na zgodę użytkownika na zastosowanie |

## Faza 2c — integracja (lider)
| ID | Task | Zależy od | Kryterium ukończenia | Status |
|---|---|---|---|---|
| I1 | Merge T1–T4 do `teammates`, `tsc` + `lint` | T1–T4 | czysto | ✅ `tsc`: 0 błędów w `src/` (jedyne błędy to lokalne, nieśledzone Edge Functions Deno w `supabase/functions/`); `lint`: 0 błędów, 1 zastane ostrzeżenie (`sign-verify.tsx`) |
| I2 | Scenariusz demo na 2 urządzeniach/kontach (tworzenie → dołączenie → start → marker → czat → koniec) | I1 | opisany wynik w tym pliku | ⬜ wymaga 2 urządzeń — do wykonania przez użytkownika (patrz niżej) |

### I2 — scenariusz demo (do przejścia na 2 urządzeniach / 2 kontach Clerk)
1. `npx expo start --clear` (czyści typy tras i cache Metro).
2. Konto A: Route → wyznacz pętlę → „Utwórz wspólną trasę” → formularz (publiczna, start za 30 min) → szczegóły.
3. Konto B: zakładka „Razem” → trasa na liście „Publiczne” → „Dołącz” → widzi uczestników i kod.
4. Oba: „Czat” → wiadomości pojawiają się u drugiej osoby bez odświeżania.
5. A: „Rozpocznij” → dialog zgody → zgoda → zgoda systemowa na lokalizację → status „Trwa”.
6. B: na mapie szczegółów niebieski marker twórcy, przesuwa się co ~5 s (A trzyma otwarte szczegóły trasy).
7. A: „Zakończ” → u B marker znika, czat tylko do odczytu.
8. Prywatna: A tworzy prywatną → „Udostępnij” kod → B wpisuje kod w „Razem” → dołącza.

## Ryzyka / uwagi
- Realtime z JWT Clerka: kod sprawdzony, ale nie zweryfikowany na urządzeniu → hooki mają fallback polling (T1/T2/T3).
- Udostępnianie lokalizacji działa tylko, gdy twórca ma otwarte szczegóły trasy (lub czat nad nimi) — brak śledzenia w tle zgodnie ze SPEC.
- Niskie ryzyko (T4): kod dołączenia 6 znaków z 32 (~1e9 kombinacji) bez limitu prób; publiczne trasy ujawniają kod i geometrię zalogowanym — zgodnie z projektem.

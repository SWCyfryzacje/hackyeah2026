# ARCHITECTURE — Wspólne trasy

Patrz SPEC.md. Stack: Expo Router + Clerk + Supabase (third-party auth). Klient Supabase:
`useSupabase()` z `src/lib/supabase.ts` (token Clerka w każdym zapytaniu **i** w Realtime —
supabase-js używa opcji `accessToken` także dla gniazda Realtime).

## 1. Schemat bazy

Migracje (wklejane ręcznie w SQL Editor, w tej kolejności):
- `supabase/migrations/20261004090000_group_routes.sql` — tabele, funkcje, RLS, publikacja realtime
- `supabase/migrations/20261004090100_group_routes_cron.sql` — joby pg_cron

```
group_routes
  id               uuid pk default gen_random_uuid()
  creator_id       text not null references profiles(user_id)
  title            text not null  check (char_length between 1 and 100)
  description      text null      check (char_length <= 500)
  visibility       text not null  check in ('public','private')
  status           text not null default 'scheduled'
                                  check in ('scheduled','live','finished','cancelled')
  join_code        text not null unique   -- 6 znaków [A-HJ-NP-Z2-9], generowany w DB
  planned_start    timestamptz not null
  planned_end      timestamptz null       check (planned_end > planned_start)
  started_at       timestamptz null
  ended_at         timestamptz null
  start_lat        double precision not null
  start_lng        double precision not null
  geometry         jsonb not null   -- [{latitude, longitude}, ...] (polyline z plannera)
  stops            jsonb not null default '[]'  -- [{latitude, longitude}, ...]
  distance_m       integer null
  duration_s       integer null
  event_id         bigint null references events(id) on delete set null
  created_at       timestamptz not null default now()
  idx: (visibility, status, planned_start), (status)

group_route_participants
  route_id   uuid references group_routes(id) on delete cascade
  user_id    text not null
  role       text not null check in ('creator','participant')
  joined_at  timestamptz not null default now()
  pk (route_id, user_id); idx (user_id)

group_route_messages
  id         bigint generated always as identity pk
  route_id   uuid not null references group_routes(id) on delete cascade
  user_id    text not null default (auth.jwt()->>'sub')
  body       text not null check (char_length(body) <= 500 and body ~ '[^[:space:]]')
                                  -- poprawka z T4: migracja 20261004090200
  created_at timestamptz not null default now()
  idx (route_id, created_at)

group_route_locations          -- tylko OSTATNIA pozycja twórcy, 1 wiersz / trasa
  route_id    uuid pk references group_routes(id) on delete cascade
  user_id     text not null
  latitude    double precision not null check between -90 and 90
  longitude   double precision not null check between -180 and 180
  accuracy    double precision null
  updated_at  timestamptz not null default now()
```

## 2. Bezpieczeństwo (RLS + RPC)

Zasada: **odczyt przez RLS, każda zmiana stanu przez funkcje `security definer`**
(`set search_path = ''`), które same sprawdzają `auth.jwt()->>'sub'`, rolę i status.
Bezpośrednie `insert/update/delete` odebrane rolom `anon`/`authenticated` na wszystkich
tabelach poza `group_route_messages.insert`. `anon` nie ma żadnych uprawnień do nowych tabel/funkcji.

Funkcje pomocnicze (security definer, stable — omijają RLS, więc brak rekursji polityk):
- `group_route_is_member(route_id) → bool`
- `group_route_is_creator(route_id) → bool`

### Polityki SELECT
| Tabela | Kto widzi |
|---|---|
| group_routes | `visibility = 'public'` **lub** `is_member(id)` |
| group_route_participants | `is_member(route_id)` |
| group_route_messages | `is_member(route_id)` |
| group_route_locations | `is_member(route_id)` **i** trasa ma status `live` |

`group_route_messages` INSERT: `user_id = sub` **i** `is_member(route_id)` **i** status trasy
∈ (`scheduled`,`live`). Brak UPDATE/DELETE dla klientów.

Uwaga do kodu dołączenia: `join_code` trasy publicznej jest czytelny dla każdego zalogowanego —
akceptowalne, bo do publicznej i tak może dołączyć każdy. Kod trasy prywatnej widzą tylko uczestnicy.

### RPC (grant execute tylko `authenticated`)
| Funkcja | Kto | Warunki / efekt |
|---|---|---|
| `create_group_route(p_title, p_description, p_visibility, p_planned_start, p_planned_end, p_start_lat, p_start_lng, p_geometry, p_stops, p_distance_m, p_duration_s, p_event_id) → uuid` | zalogowany z profilem | wstawia trasę (`scheduled`, generuje `join_code`) + uczestnika `creator` |
| `join_group_route(p_route_id) → void` | zalogowany | trasa publiczna, status scheduled/live; idempotentne |
| `join_group_route_by_code(p_code) → uuid` | zalogowany | dowolna widoczność, status scheduled/live; zwraca id; idempotentne |
| `leave_group_route(p_route_id) → void` | uczestnik ≠ creator | usuwa wiersz uczestnika |
| `start_group_route(p_route_id)` | creator | `scheduled → live`, `started_at = now()` |
| `finish_group_route(p_route_id)` | creator | `live → finished`, `ended_at`, **delete location** |
| `cancel_group_route(p_route_id)` | creator | `scheduled → cancelled`, `ended_at`, delete location |
| `update_group_route_location(p_route_id, p_lat, p_lng, p_accuracy)` | creator | tylko `live`; upsert 1 wiersza |
| `list_group_routes() → setof row` | zalogowany | publiczne `scheduled/live` + wszystkie moje (dowolny status, ostatnie 7 dni); kolumny trasy + `participant_count`, `my_role` (null gdy nie członek) |
| `get_group_route_participants(p_route_id) → (user_id, role, nick, avatar_url, joined_at)` | uczestnik | nick wg SPEC F7; jedyne miejsce, gdzie inni widzą dane z `profiles` |

Błędy RPC: `raise exception` z komunikatem po polsku (klient wyświetla `error.message`).

### Funkcje cron (bez grantów dla klientów)
- `auto_finish_group_routes() → int` — co 5 min: `live`→`finished`, `scheduled`→`cancelled`
  gdy `now() > coalesce(planned_end + 1h, planned_start + 6h)`; usuwa ich lokalizacje.
- `purge_group_route_messages() → int` — codziennie 02:45 UTC: usuwa wiadomości tras
  `finished/cancelled` z `ended_at < now() - 7 days`.

## 3. Realtime
Publikacja `supabase_realtime` += `group_routes`, `group_route_participants`,
`group_route_messages`, `group_route_locations`.

| Kanał (nazwa klienta) | Tabela / filtr | Zdarzenia | Użycie |
|---|---|---|---|
| `group-route:<id>` | `group_routes` `id=eq.<id>` | UPDATE | zmiana statusu (start/koniec) |
| `group-route-participants:<id>` | `group_route_participants` `route_id=eq.<id>` | INSERT, DELETE | lista uczestników → refetch RPC |
| `group-route-chat:<id>` | `group_route_messages` `route_id=eq.<id>` | INSERT | nowe wiadomości |
| `group-route-location:<id>` | `group_route_locations` `route_id=eq.<id>` | INSERT, UPDATE, DELETE | marker twórcy |

- INSERT/UPDATE są filtrowane przez RLS (subskrybent musi przejść politykę SELECT).
- DELETE w Realtime **nie jest filtrowane RLS**, ale z domyślnym replica identity zawiera tylko PK
  (`route_id`) — nie ujawnia pozycji. Akceptowalne.
- Klient zawsze: najpierw `select` stanu początkowego, potem subskrypcja; `removeChannel` w cleanup.
- `useSupabase()` tworzy nowego klienta przy zmianie sesji → hooki zależą od `supabase` w deps.

## 4. Przepływy
1. **Tworzenie:** Route → „Utwórz wspólną trasę” → `setGroupRouteDraft({geometry, stops, start, distance, duration})`
   → `router.push('/group-routes/new')` → formularz → `create_group_route` → `/group-routes/<id>`.
2. **Lista:** zakładka „Razem” → `list_group_routes()` (pull-to-refresh) → szczegóły.
3. **Dołączenie:** szczegóły trasy publicznej → „Dołącz” → `join_group_route`.
   Kod: pole w „Razem” lub link `njord://group-routes/join/<KOD>` → `join_group_route_by_code` → szczegóły.
4. **Start (twórca):** „Rozpocznij” → `LocationConsentDialog` → akceptacja → `start_group_route`
   → `useLocationSharing({routeId, enabled: status==='live' && isCreator})`:
   `watchPositionAsync` trzyma najnowszą pozycję, `setInterval(5000)` wysyła ją przez
   `update_group_route_location` (iOS ignoruje `timeInterval` w watch, stąd osobny timer).
   Przy AppState ≠ active — timer stop.
5. **Podgląd (uczestnik):** `useLiveLocation(routeId)` → select + kanał lokalizacji → `<LiveLocationMarker>`.
6. **Koniec:** „Zakończ” → `finish_group_route` → DELETE lokalizacji → marker znika; czat read-only.
7. **Czat:** `/group-routes/<id>/chat` → `useRouteChat(routeId)` → select ostatnich 200 + kanał INSERT;
   nicki z `get_group_route_participants`; wysyłka `insert` (RLS).

## 5. Struktura plików i kontrakty

Wspólna baza (T0, lider) — wszyscy teammates startują od tego commita:
```
supabase/migrations/20261004090000_group_routes.sql
supabase/migrations/20261004090100_group_routes_cron.sql
src/types/group-routes.ts           -- typy wierszy, statusów, RPC
src/lib/group-routes.ts             -- typowane wrappery RPC/zapytań (bez Reacta)
src/lib/group-route-draft.ts        -- przekazanie trasy z Route do formularza (moduł w pamięci)
+ STUBY wszystkich plików z kontraktów niżej (właściciel zastępuje treść, nie zmienia sygnatur)
```

Kontrakty między teammates (sygnatury ustalone w T0):
```ts
// T1 — lokalizacja
useLocationSharing(opts: { routeId: string; enabled: boolean }): { error: string | null; lastSentAt: Date | null }
useLiveLocation(routeId: string): { location: GroupRouteLocation | null }
<LiveLocationMarker routeId={string} />            // renderowany WEWNĄTRZ <MapView>
<LocationConsentDialog visible onAccept onCancel /> // modal zgody (PL)

// T2 — czat
useRouteChat(routeId: string, canPost: boolean): { messages, send(body): Promise<void>, sending, error }
ekran: src/app/group-routes/[id]/chat.tsx           // T3 linkuje: router.push(`/group-routes/${id}/chat`)
```

## 6. Ryzyka techniczne
- Realtime + Clerk JWT: jeśli `postgres_changes` nie dostarcza zdarzeń, fallback — polling co 5 s
  w hookach (`useLiveLocation`, `useRouteChat`). Sprawdzić jako pierwsze w T1/T2.
- `typedRoutes`: ścieżki do ekranów istnieją od T0 (stuby), więc `router.push` typuje się poprawnie.
- Brak date-pickera w zależnościach → formularz: chipy Dziś/Jutro + pole `HH:MM` (zod).

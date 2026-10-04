# SPEC — Wspólne trasy (MVP)

Deadline: **04.10.2026 11:00**. Priorytet: działające demo. Zakres to MVP — wszystko, co jest
polishingiem, jest poza zakresem. **Wyjątek: RLS i prywatność pozycji implementujemy w pełni.**

## 1. Cel
Użytkownik tworzy wspólną trasę (z istniejącego plannera) z godziną startu, inni dołączają,
uczestnicy widzą na żywo pozycję twórcy po rozpoczęciu i rozmawiają na czacie.

## 2. Pojęcia i statusy
- **Trasa wspólna** (`group_route`): nazwa, opis (opc.), geometria z plannera, planowany start,
  planowany koniec (opc.), widoczność `public | private`, opcjonalne powiązanie z wydarzeniem.
- **Statusy:** `scheduled` (zaplanowana) → `live` (trwa) → `finished` (zakończona);
  `live` → `cancelled` (anulowana, zostaje w bazie). Zaplanowaną trasę twórca może **usunąć**
  (wiersz znika z bazy razem z uczestnikami i czatem).
- **Role:** `creator` (twórca) i `participant` (uczestnik). Brak przekazywania roli.

## 3. Wymagania funkcjonalne

### F1. Tworzenie trasy
- Na ekranie **Route** przycisk „Utwórz wspólną trasę” (aktywny, gdy jest wyliczona trasa lub pętla).
  Przenosi polyline, przystanki, dystans i czas do formularza.
- Formularz: nazwa (1–100 znaków, wymagana), opis (opc., ≤ 500), dzień (Dziś / Jutro / data)
  i godzina startu `HH:MM`, opcjonalny koniec, przełącznik publiczna/prywatna, opcjonalny wybór
  wydarzenia z listy najbliższych (`events`, kończące się dziś lub później, max 20).
- Koniec, jeśli podany, musi być po starcie.
- Twórca automatycznie zostaje uczestnikiem z rolą `creator`.
- Każda trasa dostaje 6-znakowy kod dołączenia (pokazywany tylko uczestnikom).
- Brak edycji trasy po utworzeniu (poza zakresem).

### F2. Widoczność
- **Publiczna:** widoczna na liście w zakładce „Razem” dla każdego zalogowanego
  (nazwa, start, punkt startu na mapie, geometria, liczba uczestników). **Pozycja na żywo — tylko uczestnicy.**
- **Prywatna:** niewidoczna na liście; dołączenie wyłącznie kodem lub linkiem
  `njord://group-routes/join/<KOD>`.

### F3. Dołączanie i opuszczanie
- Dołączyć można do trasy `scheduled` lub `live`, bez akceptacji twórcy, **bez limitu uczestników**.
- Do `finished`/`cancelled` nie można dołączyć.
- Uczestnik może opuścić trasę. Twórca nie może jej opuścić (może anulować / zakończyć).
- Brak wyrzucania uczestników.

### F4. Cykl życia
- Twórca ręcznie: „Rozpocznij” (`scheduled → live`), „Zakończ” (`live → finished`),
  „Anuluj” (`live → cancelled`, trasa zostaje w bazie). Trasa nie startuje automatycznie o godzinie startu.
- **Usuwanie** (tylko `scheduled`, tylko twórca): bez innych uczestników — w każdej chwili;
  z uczestnikami — najpóźniej 2 h przed planowanym startem. Usunięta trasa znika z bazy.
- **Auto-zakończenie (pg_cron, co 5 min):** trasa `live` lub `scheduled`, dla której minęło
  `planned_end + 1 h` lub (bez końca) `planned_start + 6 h`, przechodzi w `finished`
  (`live`) / `cancelled` (`scheduled`).
- Przy każdym zakończeniu/anulowaniu **wiersz pozycji jest usuwany**.

### F5. Lokalizacja na żywo
- Udostępnia **tylko twórca**, tylko gdy trasa jest `live`.
- Przed pierwszym rozpoczęciem — **dialog zgody** (po polsku): kto widzi pozycję (tylko uczestnicy
  tej trasy), od kiedy (od „Rozpocznij”), do kiedy (do zakończenia — wtedy pozycja jest usuwana,
  historia nie jest zapisywana). Bez zapisu zgody w bazie; bez przycisku „Wstrzymaj”.
- Wysyłka **co 5 s**, tylko gdy aplikacja jest na pierwszym planie (brak lokalizacji w tle).
- Przechowujemy **wyłącznie ostatnią pozycję** (1 wiersz na trasę). Brak historii.
- Uczestnicy widzą marker twórcy na mapie trasy; opcjonalnie podpis „ostatnio X min temu”.
- Rozłączenie twórcy: marker zostaje w ostatniej pozycji; trasa trwa do „Zakończ” lub auto-zakończenia.

### F6. Czat
- Każda trasa ma czat dla uczestników (wszystkich ról), aktualizowany w czasie rzeczywistym.
- Pisać można przy statusie `scheduled` i `live`. Po zakończeniu/anulowaniu — **tylko do odczytu**.
- Limit wiadomości **500 znaków (wymuszony w bazie)**, niepuste.
- Brak moderacji, usuwania, edycji, zgłoszeń.
- **Retencja:** cron codziennie usuwa wiadomości tras zakończonych/anulowanych ponad 7 dni temu.

### F7. Nicki
- `profiles.username` → `profiles.display_name` → `Turysta-XXXX` (ostatnie 4 znaki ID).
- Uczestnicy widzą o sobie nawzajem **tylko nick i avatar** (nie e-mail ani reszty profilu).

### F8. UI
- Nowa zakładka **„Razem”**: sekcje „Moje trasy” i „Publiczne trasy” + pole „Dołącz kodem”.
- Ekran szczegółów: mapa (geometria + marker twórcy na żywo), status, start/koniec, wydarzenie,
  lista uczestników, kod (dla uczestników), przyciski zależne od roli i statusu, wejście do czatu.
- Ekran czatu. Ekran dołączania z linku.
- **Nowe ekrany po polsku.** Istniejących ekranów nie tłumaczymy.

## 4. Wymagania niefunkcjonalne
- Auth: Clerk (third-party auth w Supabase), tożsamość = `auth.jwt()->>'sub'`.
- **RLS na wszystkich nowych tabelach; zmiany stanu tylko przez funkcje RPC sprawdzające rolę i status.**
- Realtime: Supabase `postgres_changes` (respektuje RLS dla INSERT/UPDATE).
- Bez nowych natywnych zależności (nie przebudowujemy dev-builda).
- Kod w nowych plikach (komponenty/hooki); wspólne ekrany zmieniane minimalnie (merge ręczny).
- Każdy task: `npx tsc --noEmit` i `npm run lint` bez nowych błędów.

## 5. Poza zakresem (świadomie wycięte)
Lokalizacja w tle, próg odległości, szary marker, limit uczestników, wyrzucanie, moderacja czatu,
tabela zgód, „Wstrzymaj udostępnianie”, baner offline / kolejka offline, edycja trasy,
pozycje uczestników, powiadomienia push, tłumaczenie istniejących ekranów.

## 6. Decyzje (log)
| # | Temat | Decyzja |
|---|-------|---------|
| 1 | Kto widzi pozycję | tylko uczestnicy; od „Rozpocznij”; usuwana przy zakończeniu |
| 2 | Prywatna | poza listą; kod 6 znaków / link; pozycja jak w publicznej |
| 3 | Pozycje uczestników | nie |
| 4 | Częstotliwość | co 5 s, foreground, bez progu odległości |
| 5 | Rozłączenie | auto-finish cron (end+1h / start+6h), usunięcie pozycji; opc. „ostatnio X min temu” |
| 6 | Uczestnicy | bez limitu, bez wyrzucania; role creator/participant |
| 7 | Dołączanie | scheduled lub live, bez akceptacji |
| 8 | Moderacja | brak; limit 500 znaków w DB |
| 9 | Nicki | username → display_name → Turysta-XXXX; tylko nick+avatar |
| 10 | Historia czatu | read-only po zakończeniu; kasowanie po 7 dniach |
| 11 | Integracja | przycisk w Route, zakładka „Razem”, opc. event_id z listy najbliższych |
| 12 | RODO/offline/język | dialog zgody bez zapisu; bez offline; nowe ekrany PL |

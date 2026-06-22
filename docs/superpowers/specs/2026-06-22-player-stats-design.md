# Admin "Spillere" — active users + per-user detail

**Status:** approved 2026-06-22. Read-only feature; no migration, no new capture.

## Goal
Let the admin see who is playing and drill into a single player. Surfaces
"most active players" and a per-player detail view with activity, performance,
bird breakdown, and context.

## Data
A *player* = a `guest_id`. Everything is read from two already-populated tables:
- `quiz_sessions` (per-player: difficulty, mode, score, points, question_count,
  duration_ms, completed, created_at, completed_at, country, device_type).
- `quiz_answers` (per-question: bird_id, chosen_bird_id, is_correct,
  response_time_ms), joined to sessions via `session_id`.

Players are labelled `Gæst {short id}` (per #45), enriched with flag + device.

## DRY extraction (do first)
Several helpers currently live *inside* the Analyse page/action and must be
shared, not copied:
- `src/lib/admin/labels.ts` — `DIFF_COLOR`, `MODE_COLOR`, `DEVICE_COLOR`,
  `difficultyLabel`, `modeLabel`, `deviceLabel`, `formatDuration`,
  `accuracyColor`, `playerLabel`.
- `src/lib/admin/aggregate.ts` — `breakdown`, `sessionsPerDay`, `hourly`,
  `birdStatsFromAnswers` (hardest + confusions, parametrised `minShown`),
  shared `birdById`. Pure functions, unit-tested.
- Refactor `getAdminStats` (admin.ts) and the Analyse page to consume these —
  no behaviour change (covered by existing build + 58 tests + new unit tests).

## Server actions — `src/app/actions/players.ts`
- `getActivePlayers(rangeDays)` → ranked `PlayerSummary[]`: group session sample
  by guest_id (sessions, completed, totalPoints, bestScorePct, lastSeen,
  country, device). Sorted by sessions desc, top ~50.
- `getPlayerDetail(guestId)` → `PlayerDetail`: that player's sessions + their
  answers. Activity (first/last seen, days active, longest streak, completion
  rate, sessions/day), Performance (avg/best score, total/avg points, avg
  response time), Birds (hardest, most-missed, confusions — `minShown` low),
  Context (country, devices, difficulty/mode, hour-of-day). `found:false` when
  the guest has no sessions.

Types in `src/lib/admin/player-stats.ts` (not the 'use server' file).

## UI
- `src/app/admin/players/page.tsx` — "Spillere" list: `IntervalPicker` + sortable
  table (player + flag + device icon, sessions, points, best score, last seen).
  Rows link to detail.
- `src/app/admin/players/[guestId]/page.tsx` — detail: four sections reusing
  `StatCard`, `BreakdownBars`, `SessionsAreaChart`, `HourlyChart`.
- "Both" placement: Topspillere/Seneste names on the Analyse page link to
  `/admin/players/[guestId]`.
- New "Spillere" nav item in `AdminShell` (Users icon).

## Out of scope / follow-ups
- Logbog (audit log) — still a placeholder; decision pending.
- SQL view/RPC aggregation if players grow into the thousands (currently
  sample-in-JS, fine for hundreds).
- Registered (auth) users are treated as guests via guest_id for now.

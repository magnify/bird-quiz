# EN version + language switcher (i18n)

**Status:** approved approach 2026-06-24 — next-intl with URL locales. Staged.

## Goal
Add an English version of the public site with a language switcher, Danish as
default. Admin stays Danish-only.

## Decisions
- **Library:** next-intl (App Router, typed messages, server + client).
- **Locales:** `da` (default), `en`.
- **Prefix:** `localePrefix: 'as-needed'` — Danish URLs stay unprefixed
  (`/`, `/resultater`, …, so the shared FB link keeps working); English is
  `/en/…`.
- **Scope:** localize public routes only — `/` (quiz), `(site)` (`/om`,
  `/resultater`), `/kaffe`, `/rangliste`. **`/admin` and `/api` are excluded**
  (stay Danish, no locale segment).
- **Bird content:** already bilingual (`name_da` + `name_en` in birds-static),
  so quiz names + "name mode" switch by locale via a small helper.

## Stages
**Stage 1 (this pass) — foundation, no route move, not deployed:**
- Install next-intl; `src/i18n/routing.ts` (locales, default, as-needed) +
  `src/i18n/request.ts`.
- `messages/da.json` + `messages/en.json` seeded with a first slice
  (common/nav + quiz start screen).
- `LanguageSwitcher` component (uses next-intl navigation).
- `localizedBirdName(bird, locale)` helper (+ unit test).
- Build must stay green; live site untouched.

**Stage 2 — route move (own pass, where the risk is):**
- Move public routes under `app/[locale]/`; add `NextIntlClientProvider` +
  `setRequestLocale` in `app/[locale]/layout.tsx`.
- Wire next-intl middleware alongside the existing `/admin` matcher; exclude
  `/admin`, `/api`, `/_next`, static assets.
- Decide `<html lang>` per locale (root-layout strategy).
- Render `LanguageSwitcher` in the public header.
- Verify `/` (da) and `/en` both render; build green; then deploy.

**Stage 3+ — incremental string migration:** move remaining hardcoded Danish UI
strings into the catalogs page by page; wire quiz name-mode to `name_en`.

## Out of scope
Admin localization; translating bird descriptions/long content; SEO hreflang
tags (add with Stage 2).

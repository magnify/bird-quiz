# Fugle Quiz - Complete App Overview

## Pages & Routes

### Public Quiz Pages
1. **`/` (Home/Start)** - Quiz start screen with settings
   - Component: `QuizApp` → `QuizSetup`
   - Shows: difficulty, mode, question count selectors + Start button
   - Navigation: Floating nav (desktop), Bottom nav (mobile)

2. **`/resultater` (My Results)** - Personal quiz history
   - Component: `MyResults`
   - Shows: Quiz history from localStorage, stats, expandable details
   - Navigation: Header (desktop), Bottom nav (mobile)

3. **`/rangliste` (Leaderboard)** - Global leaderboard
   - Component: `Leaderboard`
   - Shows: Top scores from Supabase, filterable by period/difficulty
   - Navigation: Header (desktop), Bottom nav (mobile)

4. **`/om` (About)** - About page (placeholder)
   - Navigation: Header (desktop), Bottom nav (mobile)

5. **`/kaffe` (Donate)** - Donation page (placeholder)
   - Navigation: Header (desktop), Bottom nav (mobile)

### Quiz Screens (within QuizApp)
- **Start screen** - Quiz setup (see `/` above)
- **Quiz screen** - Active quiz with question/answers
  - Header with progress bar, back button
  - NO bottom nav (focused experience)
- **Results screen** - Quiz completion summary
  - Shows score, points, stats
  - NO bottom nav (focused experience)

### Admin Pages (password-protected)
- `/admin` - Birds overview
- `/admin/birds` - Bird management
- `/admin/groups` - Similarity groups
- `/admin/images` - Image management
- `/admin/analytics` - Quiz analytics
- `/admin/audit` - Audit log

---

## Navigation System

### Desktop (> 640px)

**Start Screen:**
- Header: HIDDEN
- Floating nav: VISIBLE (top right) - "Resultater", "Rangliste"
  - Note: Om and Kaffe not in floating nav currently

**Secondary Pages (Resultater, Rangliste, Om, Kaffe):**
- Header: VISIBLE
  - Logo + title (links to home)
  - Nav tabs in header-right: "Resultater", "Rangliste"
- Bottom nav: HIDDEN

**Quiz/Results Screens:**
- Header: VISIBLE (with progress bar during quiz)
- Bottom nav: HIDDEN

### Mobile (≤ 640px)

**ALL Pages (except active quiz/results):**
- Header: HIDDEN
- Bottom nav: VISIBLE (sticky bottom)
  - 4 items: Resultater, Rangliste, Om, Kaffe
  - Icons + labels
  - Highlights active page

**Quiz/Results Screens:**
- Header: VISIBLE (with progress bar during quiz)
- Bottom nav: HIDDEN

---

## Components

### Navigation Components
- **`QuizHeader`** - Sticky header with logo, nav tabs, progress bar
  - Props: `transparent`, `activePage`, `showProgress`, etc.
  - Used on secondary pages and during quiz

- **`MobileBottomNav`** - Mobile bottom navigation bar
  - Props: `activePage`
  - 4 items with SVG icons + labels
  - Only visible on mobile, hidden during quiz/results

- **Floating nav** - In `QuizSetup.tsx`
  - Desktop only, top-right position
  - Currently only has Resultater + Rangliste links

### Quiz Components
- **`QuizApp`** - Main quiz container, manages quiz state
  - Wraps everything in `AuthProvider`
  - Controls screen transitions (start → quiz → results)

- **`QuizSetup`** - Start screen with settings
- **`QuizQuestion`** - Active quiz question screen
- **`QuizResults`** - Quiz completion screen

### Data Components
- **`MyResults`** - Personal results history (localStorage)
- **`Leaderboard`** - Global leaderboard (Supabase)

---

## Current Issues/Inconsistencies

1. **Floating nav incomplete** - Desktop start screen only shows Resultater + Rangliste, missing Om + Kaffe

2. **Navigation duplication** - Secondary pages have nav in both:
   - Header tabs (Resultater, Rangliste only)
   - Bottom nav (all 4 links, mobile only)

3. **Inconsistent active states** - Need to ensure active page highlighting works across all nav types

---

## Design Patterns

### CSS Architecture
- `globals.css` - Shadcn/Tailwind tokens (admin only)
- `quiz.css` - Self-contained quiz styles with `--quiz-*` tokens
- Two separate worlds, never mix

### Typography
- Two-layer token system: scale + semantic
- Scale: `--quiz-text-xs` through `--quiz-text-4xl`
- Semantic: `--quiz-title`, `--quiz-button`, etc.

### Responsive Breakpoint
- Mobile: ≤ 640px
- Desktop: > 640px

---

## Questions for Alignment

1. Should desktop floating nav include all 4 links (add Om + Kaffe)?
2. Should header nav tabs on secondary pages include all 4 links to match bottom nav?
3. Do we want a "home" button in mobile bottom nav, or is clicking other nav items enough to get back?
4. Should the quiz screen header also be hidden on mobile? (currently visible with progress)

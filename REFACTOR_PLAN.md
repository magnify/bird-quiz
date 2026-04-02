# Header & Mosaic Refactor Plan

## Current Problems

1. **Mosaic is `position: fixed`** - taken out of layout flow
2. **Form doesn't know mosaic exists** - they overlap instead of coexisting
3. **Hardcoded breakpoint at 1280px** - crude workaround, not responsive
4. **Z-index battles** - mosaic at 150 to appear above header at 100

## Proposed Solution

**Make header `position: absolute` + hide logo on start screen**
- Header floats above all content
- No z-index conflicts
- Mosaic stays in normal layout flow with form
- Flexbox handles responsiveness naturally

## Current Structure

```
QuizApp (quiz-app-root)
├── Mosaic container (position: fixed, z-index: 150) ← PROBLEM
├── QuizHeader (position: sticky, z-index: 100, transparent on start)
└── QuizSetup (#start-screen)
    └── .start-layout
        └── .start-settings-area
            ├── Logo + Title + Subtitle
            ├── Settings (toggle groups)
            └── Start button
```

## Target Structure

```
QuizApp (quiz-app-root)
├── QuizHeader (position: absolute, z-index: 100, NO LOGO on start)
└── QuizSetup (#start-screen)
    └── .start-layout (flexbox: mosaic left, form right)
        ├── .start-mosaic-side ← RESTORE
        │   └── BirdMosaic
        └── .start-settings-area
            ├── Logo + Title + Subtitle (ONLY on start screen)
            ├── Settings
            └── Start button
```

## Changes Required

### 1. QuizHeader Component (`QuizHeader.tsx`)

**Current:**
- Logo always visible (unless `onLogoClick` is undefined)
- Rendered on all screens

**New:**
- Add prop: `hideLogo?: boolean`
- Don't render logo when `hideLogo={true}`
- QuizApp passes `hideLogo={isStart}` on start screen

### 2. Header CSS (`quiz.css`)

**Current:**
```css
.app-header {
  position: sticky;
  top: 0;
  z-index: 100;
}
```

**New:**
```css
.app-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
```

### 3. QuizApp Structure (`QuizApp.tsx`)

**Current:**
```tsx
{isStart && (
  <div className="mosaic-container">
    <BirdMosaic ... />
  </div>
)}

<QuizHeader transparent={isStart} ... />

<QuizSetup ... />
```

**New:**
```tsx
<QuizHeader
  transparent={isStart}
  hideLogo={isStart}  ← NEW
  ...
/>

<QuizSetup
  birds={birds}                ← RESTORE
  firstBirdId={firstBirdId}    ← RESTORE
  onTileRef={handleTileRef}    ← RESTORE
  ...
/>
```

### 4. QuizSetup Component (`QuizSetup.tsx`)

**Current:**
```tsx
<div className="start-layout">
  <div className="start-settings-area">
    <Logo ... />  ← Logo here
    ...
  </div>
</div>
```

**New:**
```tsx
<div className="start-layout">
  <div className="start-mosaic-side">  ← RESTORE
    <BirdMosaic ... />
  </div>
  <div className="start-settings-area">
    <Logo ... />  ← Keep logo (header won't show it)
    ...
  </div>
</div>
```

### 5. CSS Changes (`quiz.css`)

**Remove:**
```css
.mosaic-container {
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  width: auto;
  z-index: 150;
  background: linear-gradient(...);
  ...
}

@media (max-width: 1280px) {
  .mosaic-container { display: none; }
}
```

**Restore:**
```css
.start-mosaic-side {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .start-mosaic-side { display: none; }
}
```

**Keep:**
```css
.start-layout {
  display: flex;  /* mosaic left, form right */
  ...
}

.start-settings-area {
  flex: 1;  /* takes remaining space */
  ...
}
```

## Breakage Risk Assessment

### Low Risk ✅
- Header on quiz/results screens (still works, just absolute instead of sticky)
- Form layout (already works, just needs mosaic restored)
- Mobile layouts (mosaic already hidden, just different breakpoint)

### Medium Risk ⚠️
- **Scroll behavior on quiz screen** - header was sticky, now absolute
  - May need to add padding-top to screens to account for header height
  - Test: scroll during quiz, header should stay visible
- **Zoom transition animation** - relies on `tileRefs` from mosaic
  - Should still work (mosaic still rendered, just in different place)
  - Test: start quiz from highlighted bird, verify zoom works

### High Risk 🔴
- **Header visibility on scroll** - absolute headers don't stick
  - Solution: Add padding-top to all screens = header height
  - Or: Keep header sticky on non-start screens, absolute only on start
- **Transparent header on start** - still needed
  - Verify backdrop-filter works with absolute positioning

## Implementation Order

1. ✅ **Add `hideLogo` prop to QuizHeader** (safest first)
2. ✅ **Restore mosaic to QuizSetup** (re-add props, component)
3. ✅ **Restore `.start-mosaic-side` CSS** (layout flow)
4. ⚠️ **Change header to absolute** (test thoroughly)
5. ⚠️ **Add padding-top to screens** (if needed)
6. ✅ **Remove `.mosaic-container` CSS** (cleanup)
7. ✅ **Test all breakpoints** (mobile, tablet, desktop)
8. ✅ **Test zoom animation** (verify tileRefs work)

## Testing Checklist

- [ ] Desktop (>1280px): Mosaic visible, form visible, no overlap
- [ ] Laptop (1024-1280px): Mosaic hidden, form centered
- [ ] Tablet (640-1024px): Mosaic hidden, form centered
- [ ] Mobile (<640px): Mosaic hidden, form full-width, bottom nav
- [ ] Start screen: Header transparent, no logo, mosaic + form
- [ ] Quiz screen: Header visible with logo, score, progress
- [ ] Results screen: Header visible with logo, points
- [ ] Zoom transition: Tile → full screen animation works
- [ ] Scroll behavior: Header stays visible on all screens

## Rollback Plan

If anything breaks:
```bash
git revert HEAD
git push
```

All changes are in one commit, easy to revert.

## Image Errors (Separate Issue)

Auto-generated GitHub issues show broken images:
- #5: `chroicocephalus-ridibundus.jpg` (Hættemåge)
- #4: `larus-fuscus.jpg` (Sildemåge)
- #3: Another image error

**Root cause:** Images missing from Supabase Storage or incorrect slug generation

**Next steps:**
1. Check if files exist in Supabase Storage
2. Verify slug generation (`toSlug()` function)
3. Check scientific name mapping (taxonomy changes)
4. Re-upload missing images if needed

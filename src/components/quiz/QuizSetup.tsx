'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Difficulty, QuizMode } from '@/lib/quiz/engine'
import type { Bird } from '@/lib/supabase/types'
import type { Manifest } from '@/lib/data/manifest'
import { BirdHero } from './BirdHero'
import { pickHeroBirds } from '@/lib/quiz/hero-birds'
import { BRAND } from '@/lib/brand'
import { VERSION_LABEL } from '@/lib/version'

const HERO_POOL_SIZE = 6

interface QuizSetupProps {
  difficulty: Difficulty
  mode: QuizMode
  totalQuestions: number
  onSetDifficulty: (d: Difficulty) => void
  onSetMode: (m: QuizMode) => void
  onSetTotalQuestions: (n: number) => void
  onStart: () => void
  isTransitioning?: boolean
  birds: Bird[]
  manifest: Manifest
}

function ToggleGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: { value: T; label: string; desc?: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="setting-group">
      <label className="setting-label">{label}</label>
      <div className="toggle-group">
        {options.map(opt => (
          <button
            key={opt.value}
            className={`toggle-btn ${value === opt.value ? 'active' : ''}`}
            onClick={() => onChange(opt.value)}
            aria-pressed={value === opt.value}
            title={opt.desc}
          >
            <span>{opt.label}</span>
            {opt.desc && <span className="toggle-tooltip">{opt.desc}</span>}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function QuizSetup({
  difficulty,
  mode,
  totalQuestions,
  onSetDifficulty,
  onSetMode,
  onSetTotalQuestions,
  onStart,
  isTransitioning,
  birds,
  manifest,
}: QuizSetupProps) {
  const t = useTranslations()
  // Random pick; BirdHero defers rendering it to the client so the Math.random
  // here doesn't cause an SSR/client hydration mismatch.
  const heroNames = useMemo(
    () => pickHeroBirds(birds, HERO_POOL_SIZE).map(b => b.scientific_name),
    [birds],
  )

  return (
    <div id="start-screen" className="screen active">
      <BirdHero heroNames={heroNames} manifest={manifest} />

      <div className={`start-card ${isTransitioning ? 'start-card--fading' : ''}`}>
        <div className="start-hero">
          <h1 className="title">{BRAND.name}</h1>
          <p className="subtitle">{t('start.tagline')}</p>
        </div>

        <div className="start-settings">
            <ToggleGroup
              label={t('start.difficulty')}
              options={[
                { value: 'easy' as Difficulty, label: t('difficulty.easy') },
                { value: 'common' as Difficulty, label: t('difficulty.common') },
                { value: 'hard' as Difficulty, label: t('difficulty.hard') },
                { value: 'all' as Difficulty, label: t('difficulty.all') },
              ]}
              value={difficulty}
              onChange={onSetDifficulty}
            />

            <ToggleGroup
              label={t('start.mode')}
              options={[
                { value: 'photo' as QuizMode, label: t('mode.photo'), desc: t('start.modePhotoDesc') },
                { value: 'name' as QuizMode, label: t('mode.name'), desc: t('start.modeNameDesc') },
                { value: 'mixed' as QuizMode, label: t('mode.mixed'), desc: t('start.modeMixedDesc') },
              ]}
              value={mode}
              onChange={onSetMode}
            />

            <ToggleGroup
              label={t('start.questions')}
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '30', label: '30' },
                { value: '40', label: '40' },
              ]}
              value={String(totalQuestions)}
              onChange={(v) => onSetTotalQuestions(parseInt(v, 10))}
            />
          </div>

          <div className="start-actions">
            <button className="btn btn--primary btn--block" onClick={onStart}>
              <span>{t('start.start')}</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <div className="version-label">{VERSION_LABEL}</div>
          </div>
      </div>
    </div>
  )
}

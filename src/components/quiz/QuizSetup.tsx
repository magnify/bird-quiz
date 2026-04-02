'use client'

import type { Difficulty, QuizMode } from '@/lib/quiz/engine'
import type { Bird } from '@/lib/supabase/types'
import { Logo } from './Logo'
import MobileBottomNav from './MobileBottomNav'
import { BirdMosaic } from './BirdMosaic'

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
  firstBirdId: string | null
  onTileRef?: (birdId: string, el: HTMLElement | null) => void
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
  firstBirdId,
  onTileRef,
}: QuizSetupProps) {
  return (
    <div id="start-screen" className="screen active">
      <div className={`start-layout ${isTransitioning ? 'start-layout--fading' : ''}`}>
        <div className="start-mosaic-side">
          <BirdMosaic
            birds={birds}
            highlightBirdId={firstBirdId}
            onTileRef={onTileRef}
          />
        </div>

        <div className="start-settings-area">
          <div className="start-hero">
            <Logo size="large" showText={false} />
            <h1 className="title">Fugle Quiz</h1>
            <p className="subtitle">Test din viden om Danmarks fugle</p>
          </div>

          <div className="start-settings">
            <ToggleGroup
              label="Sværhedsgrad"
              options={[
                { value: 'easy' as Difficulty, label: 'Lette' },
                { value: 'common' as Difficulty, label: 'Almindelige' },
                { value: 'hard' as Difficulty, label: 'Svære' },
                { value: 'all' as Difficulty, label: 'Alle' },
              ]}
              value={difficulty}
              onChange={onSetDifficulty}
            />

            <ToggleGroup
              label="Quiz-type"
              options={[
                { value: 'photo' as QuizMode, label: 'Gæt fra foto', desc: 'Se et foto, vælg det rigtige navn' },
                { value: 'name' as QuizMode, label: 'Gæt fra navn', desc: 'Se et navn, vælg det rigtige foto' },
                { value: 'mixed' as QuizMode, label: 'Blandet', desc: 'Begge typer tilfældigt blandet' },
              ]}
              value={mode}
              onChange={onSetMode}
            />

            <ToggleGroup
              label="Antal spørgsmål"
              options={[
                { value: '10', label: '10' },
                { value: '20', label: '20' },
                { value: '40', label: '40' },
              ]}
              value={String(totalQuestions)}
              onChange={(v) => onSetTotalQuestions(parseInt(v, 10))}
            />
          </div>

          <div className="start-actions">
            <button className="start-btn" onClick={onStart}>
              <span>Start Quiz</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
            <div className="version-label">v0.6.1</div>
          </div>
        </div>
      </div>

      <MobileBottomNav activePage="home" />
    </div>
  )
}

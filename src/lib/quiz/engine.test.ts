import { describe, it, expect } from 'vitest'
import { generateQuestions, filterPool } from './engine'
import type { Bird } from '@/lib/supabase/types'

// Create mock birds with required fields
const createMockBird = (id: string, scientificName: string, difficulty: 'easy' | 'common' | 'hard'): Bird => ({
  id,
  scientific_name: scientificName,
  name_da: `Danish ${scientificName}`,
  name_en: `English ${scientificName}`,
  category: 'test',
  is_easy: difficulty === 'easy',
  is_common: difficulty === 'common',
  is_active: true,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
})

const mockBirds: Bird[] = [
  createMockBird('1', 'Passer domesticus', 'easy'),
  createMockBird('2', 'Turdus merula', 'easy'),
  createMockBird('3', 'Columba palumbus', 'common'),
  createMockBird('4', 'Pica pica', 'common'),
  createMockBird('5', 'Corvus corone', 'common'),
  createMockBird('6', 'Cyanistes caeruleus', 'common'),
  createMockBird('7', 'Erithacus rubecula', 'easy'),
  createMockBird('8', 'Sturnus vulgaris', 'common'),
  createMockBird('9', 'Fringilla coelebs', 'common'),
  createMockBird('10', 'Carduelis carduelis', 'common'),
  createMockBird('11', 'Phylloscopus trochilus', 'hard'),
  createMockBird('12', 'Sylvia atricapilla', 'hard'),
]

describe('generateQuestions', () => {
  it('generates requested number of questions', () => {
    const questions = generateQuestions(mockBirds, [], 'common', 'photo', 7, {})
    expect(questions.length).toBe(7)
  })

  it('does not repeat birds in same session (CRITICAL)', () => {
    // Test multiple times to catch non-deterministic bugs
    for (let i = 0; i < 100; i++) {
      const questions = generateQuestions(mockBirds, [], 'common', 'photo', 7, {})
      const birdIds = questions.map(q => q.bird.id)
      const uniqueIds = new Set(birdIds)

      if (uniqueIds.size !== birdIds.length) {
        const duplicates = birdIds.filter((id, index) => birdIds.indexOf(id) !== index)
        const duplicateNames = questions
          .filter(q => duplicates.includes(q.bird.id))
          .map(q => `${q.bird.scientific_name} (id: ${q.bird.id})`)
        throw new Error(
          `Found duplicate birds in quiz (run ${i + 1}/100):\n` +
          `Duplicates: ${duplicateNames.join(', ')}\n` +
          `All IDs: ${birdIds.join(', ')}`
        )
      }

      expect(uniqueIds.size).toBe(birdIds.length)
    }
  })

  it('does not repeat birds with high weights (weighted selection stress test)', () => {
    // Create weights that heavily favor a few birds
    const heavyWeights: Record<string, number> = {
      'Columba palumbus': 10,
      'Pica pica': 10,
      'Corvus corone': 1,
    }

    for (let i = 0; i < 50; i++) {
      const questions = generateQuestions(mockBirds, [], 'common', 'photo', 7, heavyWeights)
      const birdIds = questions.map(q => q.bird.id)
      const uniqueIds = new Set(birdIds)

      if (uniqueIds.size !== birdIds.length) {
        const duplicates = birdIds.filter((id, index) => birdIds.indexOf(id) !== index)
        throw new Error(`Weighted selection produced duplicates (run ${i + 1}/50): ${duplicates.join(', ')}`)
      }

      expect(uniqueIds.size).toBe(birdIds.length)
    }
  })

  it('includes correct answer in options', () => {
    const questions = generateQuestions(mockBirds, [], 'common', 'photo', 5, {})
    questions.forEach(q => {
      expect(q.options).toContainEqual(q.bird)
    })
  })

  it('provides 4 options per question', () => {
    const questions = generateQuestions(mockBirds, [], 'common', 'photo', 5, {})
    questions.forEach(q => {
      expect(q.options.length).toBe(4)
    })
  })

  it('respects difficulty filter', () => {
    const questions = generateQuestions(mockBirds, [], 'easy', 'photo', 3, {})
    questions.forEach(q => {
      expect(q.bird.is_easy).toBe(true)
    })
  })

  it('handles mixed mode (generates both photo and name questions)', () => {
    const questions = generateQuestions(mockBirds, [], 'common', 'mixed', 10, {})

    expect(questions.length).toBe(10)

    const photoCount = questions.filter(q => q.mode === 'photo').length
    const nameCount = questions.filter(q => q.mode === 'name').length

    expect(photoCount).toBeGreaterThan(0)
    expect(nameCount).toBeGreaterThan(0)
  })

  it('does not repeat birds in mixed mode (same bird can appear in photo AND name, but not twice in same mode)', () => {
    for (let i = 0; i < 50; i++) {
      const questions = generateQuestions(mockBirds, [], 'common', 'mixed', 10, {})

      const photoBirds = questions.filter(q => q.mode === 'photo').map(q => q.bird.id)
      const nameBirds = questions.filter(q => q.mode === 'name').map(q => q.bird.id)

      const uniquePhotoBirds = new Set(photoBirds)
      const uniqueNameBirds = new Set(nameBirds)

      if (uniquePhotoBirds.size !== photoBirds.length) {
        throw new Error(`Mixed mode: duplicate bird in PHOTO questions (run ${i + 1}/50)`)
      }

      if (uniqueNameBirds.size !== nameBirds.length) {
        throw new Error(`Mixed mode: duplicate bird in NAME questions (run ${i + 1}/50)`)
      }

      expect(uniquePhotoBirds.size).toBe(photoBirds.length)
      expect(uniqueNameBirds.size).toBe(nameBirds.length)
    }
  })

  it('does not place same bird in adjacent questions in mixed mode (CRITICAL)', () => {
    for (let i = 0; i < 100; i++) {
      const questions = generateQuestions(mockBirds, [], 'common', 'mixed', 10, {})
      for (let j = 0; j < questions.length - 1; j++) {
        if (questions[j].bird.id === questions[j + 1].bird.id) {
          throw new Error(
            `Mixed mode: bird "${questions[j].bird.scientific_name}" appears at adjacent positions ${j} and ${j + 1} (run ${i + 1}/100)`
          )
        }
      }
    }
  })

  it('does not generate more questions than available birds', () => {
    const easyBirds = mockBirds.filter(b => b.is_easy)
    const questions = generateQuestions(mockBirds, [], 'easy', 'photo', 100, {})

    expect(questions.length).toBeLessThanOrEqual(easyBirds.length)
  })
})

describe('filterPool', () => {
  it('filters easy birds', () => {
    const pool = filterPool(mockBirds, 'easy')
    expect(pool.every(b => b.is_easy)).toBe(true)
    expect(pool.length).toBe(3) // Passer, Turdus, Erithacus
  })

  it('filters common birds', () => {
    const pool = filterPool(mockBirds, 'common')
    expect(pool.every(b => b.is_common)).toBe(true)
    expect(pool.length).toBe(7)
  })

  it('filters hard birds (not easy, not common)', () => {
    const pool = filterPool(mockBirds, 'hard')
    expect(pool.every(b => !b.is_easy && !b.is_common)).toBe(true)
    expect(pool.length).toBe(2) // Phylloscopus, Sylvia
  })

  it('returns all birds for "all" difficulty', () => {
    const pool = filterPool(mockBirds, 'all')
    expect(pool.length).toBe(mockBirds.length)
  })
})

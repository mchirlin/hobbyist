import { describe, it, expect } from 'vitest'
import {
  medalProgress,
  medalsForHobby,
  medalLabel,
  MEDALS_BY_HOBBY,
  type Medal,
} from './medals'

const medal: Medal = {
  id: 'test',
  name: 'Test',
  unit: 'things',
  metricKey: 'test.things',
  how: 'do things',
  tiers: [
    { name: 'Bronze', threshold: 10 },
    { name: 'Silver', threshold: 100 },
    { name: 'Gold', threshold: 300 },
    { name: 'Platinum', threshold: 600 },
  ],
}

describe('medalProgress', () => {
  it('below the first threshold: locked, next=Bronze, fraction toward Bronze from 0', () => {
    const p = medalProgress(medal, 5)
    expect(p.earned).toBeNull()
    expect(p.next?.name).toBe('Bronze')
    expect(p.maxed).toBe(false)
    expect(p.fraction).toBeCloseTo(0.5) // 5 of 10
  })

  it('exactly at a threshold earns that tier', () => {
    const p = medalProgress(medal, 100)
    expect(p.earned?.name).toBe('Silver')
    expect(p.next?.name).toBe('Gold')
    expect(p.fraction).toBeCloseTo(0) // just earned Silver
  })

  it('mid-tier: fraction measured from earned toward next', () => {
    const p = medalProgress(medal, 200) // between Silver(100) and Gold(300)
    expect(p.earned?.name).toBe('Silver')
    expect(p.next?.name).toBe('Gold')
    expect(p.fraction).toBeCloseTo((200 - 100) / (300 - 100)) // 0.5
  })

  it('at the top threshold: maxed, next=null, fraction=1', () => {
    const p = medalProgress(medal, 600)
    expect(p.earned?.name).toBe('Platinum')
    expect(p.next).toBeNull()
    expect(p.maxed).toBe(true)
    expect(p.fraction).toBe(1)
  })

  it('above the top threshold stays maxed', () => {
    const p = medalProgress(medal, 5000)
    expect(p.maxed).toBe(true)
    expect(p.earned?.name).toBe('Platinum')
    expect(p.fraction).toBe(1)
  })

  it('zero count is locked with fraction 0', () => {
    const p = medalProgress(medal, 0)
    expect(p.earned).toBeNull()
    expect(p.fraction).toBe(0)
  })
})

describe('medalLabel', () => {
  it('locked label names the Bronze target', () => {
    expect(medalLabel(medalProgress(medal, 3))).toBe('Locked · 3 / 10 things')
  })
  it('earned label names the tier and next target', () => {
    expect(medalLabel(medalProgress(medal, 150))).toBe('Silver · 150 / 300 things')
  })
  it('maxed label says max', () => {
    expect(medalLabel(medalProgress(medal, 600))).toContain('Platinum (max)')
  })
})

describe('MEDALS_BY_HOBBY catalog', () => {
  it('every hobby with medals has ascending thresholds and 1-4 tiers', () => {
    for (const [hobby, medals] of Object.entries(MEDALS_BY_HOBBY)) {
      expect(medals.length).toBeGreaterThan(0)
      for (const m of medals) {
        expect(m.tiers.length).toBeGreaterThanOrEqual(1)
        for (let i = 1; i < m.tiers.length; i++) {
          expect(m.tiers[i].threshold).toBeGreaterThan(m.tiers[i - 1].threshold)
        }
        expect(m.metricKey, `${hobby}/${m.id} needs a metricKey`).toBeTruthy()
      }
    }
  })

  it('medalsForHobby returns [] for an unknown hobby', () => {
    expect(medalsForHobby('Underwater Basket Weaving')).toEqual([])
  })

  it('Ultimate defines a tournaments medal with a Bronze at 1', () => {
    const m = medalsForHobby('Ultimate').find((x) => x.id === 'ultimate-tournaments')!
    expect(m.tiers[0]).toEqual({ name: 'Bronze', threshold: 1 })
  })
})

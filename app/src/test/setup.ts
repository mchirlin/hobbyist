import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// Vitest doesn't enable RTL's automatic DOM cleanup between tests the way the
// jest preset does, so mounted trees would otherwise stack in the same jsdom
// body and cross-contaminate queries (a getAllByRole would see prior renders).
afterEach(() => cleanup())

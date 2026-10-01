// Type declarations for the plain-node recipe module (recipes.mjs is kept .mjs
// so the generator runs under `node` with no build step; this .d.ts gives the
// in-src test and any future TS consumer real types without a transpile).

export interface InvokeConfig {
  region: string
  modelId: string
  profile: string
  outputFormat: string
  aspectRatio: string
}
export const INVOKE: InvokeConfig

export type TierMedium = 'patch' | 'jewel'
export interface Tier {
  key: string
  label: string
  medium: TierMedium
  metal?: string
  hex?: string
  gem?: string
}
export const TIERS: Tier[]

export interface BedrockRequest {
  prompt: string
  negative_prompt: string
  output_format: string
  aspect_ratio: string
  seed: number
}
export function buildRequest(subject: string, tier: Tier, seed: number): BedrockRequest
export function seedForSlug(slug: string): number
export const SUBJECTS: Record<string, string>
export function subjectFor(hobbyName: string): string

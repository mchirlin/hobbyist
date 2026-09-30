import type { Profile } from './types'

// Seed profile using the real hobbies from the Trello "My Hobbies" list.
// `importance` (1–10) is illustrative — it drives badge size in the cloud.
// Tweak these numbers and watch the shareable image rebalance.
export const sampleProfile: Profile = {
  displayName: 'Michael',
  hobbies: [
    {
      name: '3D Printing', category: 'Making', importance: 9, icon: '🖨️', level: 2,
      metricCounts: { 'printing.prints': 34 },
      missions: [
        { level: 2, text: 'Print a multi-part model with moving joints.' },
        { level: 3, text: 'Design your own part in CAD and print it.', done: false },
      ],
    },
    {
      name: 'Electronics', category: 'Making', importance: 8, icon: '🔌', level: 1,
      metricCounts: { 'electronics.builds': 12 },
      missions: [
        { level: 1, text: 'Solder a kit without a cold joint.' },
        { level: 2, text: 'Build a circuit from a schematic you read yourself.' },
      ],
    },
    {
      name: 'Ultimate', category: 'Sport', importance: 8, icon: '🥏', level: 3,
      metricCounts: { 'ultimate.tournaments': 2, 'ultimate.scores': 30 },
      missions: [
        { level: 3, text: 'Throw a backhand and forehand 40+ yards accurately.' },
        { level: 4, text: 'Captain a team through a tournament.' },
      ],
    },
    {
      name: 'Ukulele', category: 'Music', importance: 6, icon: '🎸', level: 1,
      metricCounts: { 'ukulele.songs': 4 },
      missions: [
        { level: 1, text: 'Play a clean C–F–G change 10 times in a row.' },
        { level: 2, text: 'Play a full song start to finish.' },
      ],
    },
    {
      name: 'Geocaching', category: 'Outdoors', importance: 6, icon: '📍', level: 1,
      metricCounts: { 'geocaching.finds': 5, 'geocaching.souvenirs': 6 },
      missions: [
        { level: 1, text: 'Find your first 5 caches.' },
        { level: 2, text: 'Hide and publish a cache of your own.' },
      ],
    },
    {
      name: 'Birding', category: 'Outdoors', importance: 5, icon: '🐦', level: 0,
      metricCounts: { 'ebird.species': 47 },
      missions: [
        { level: 0, text: 'Log 10 different species on eBird.' },
        { level: 1, text: 'Identify 5 birds by call alone.' },
      ],
    },
    { name: 'PCB',          category: 'Making', importance: 5, icon: '🔧', level: 1,
      metricCounts: { 'pcb.boards': 3 },
      missions: [{ level: 1, text: 'Lay out and order your first custom PCB.' }] },
    { name: 'Video Making', category: 'Craft',  importance: 4, icon: '🎬', level: 1,
      metricCounts: { 'youtube.uploads': 8 },
      missions: [{ level: 1, text: 'Cut a 60-second edit with a hook in the first 3s.' }] },
    { name: 'Storytelling', category: 'Mind',   importance: 4, icon: '📖', level: 1,
      metricCounts: { 'storytelling.sets': 6 },
      missions: [{ level: 1, text: 'Tell a 5-minute story at an open mic.' }] },
    { name: 'Knitting',     category: 'Craft',  importance: 3, icon: '🧶', level: 0,
      metricCounts: { 'knitting.projects': 2 },
      missions: [{ level: 0, text: 'Knit a scarf in garter stitch.' }] },
  ],
}

// Category → color. Used by the badge cloud so hobbies read at a glance.
export const CATEGORY_COLOR: Record<string, string> = {
  Outdoors: '#2f9e44',
  Making:   '#e8590c',
  Music:    '#9c36b5',
  Games:    '#1971c2',
  Sport:    '#e03131',
  Craft:    '#d6336c',
  Mind:     '#0c8599',
}

// A playful archetype title derived from the user's dominant category.
export const CATEGORY_ARCHETYPE: Record<string, string> = {
  Outdoors: 'The Explorer',
  Making:   'The Maker',
  Music:    'The Performer',
  Games:    'The Strategist',
  Sport:    'The Competitor',
  Craft:    'The Creator',
  Mind:     'The Thinker',
}

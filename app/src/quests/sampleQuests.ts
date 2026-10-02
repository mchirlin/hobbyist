import type { Quest } from './quests'
import { CADENCE_XP } from './quests'

// Curated starter quests across cadences for the seed hobbies. Real quests
// would be authored per hobby (and eventually auto-generated from activity),
// but these prove the loop: complete a quest → earn XP → level a patch.
//
// XP is derived from the cadence so the reward shape stays consistent.
function q(
  id: string,
  hobby: string,
  cadence: Quest['cadence'],
  text: string,
): Quest {
  return { id, hobby, cadence, text, xp: CADENCE_XP[cadence] }
}

export const sampleQuests: Quest[] = [
  // Birding — the hobby with a real data path; quests cover cold-start.
  q('birding-d1', 'Birding', 'daily', 'Log one checklist on eBird today.'),
  q('birding-d2', 'Birding', 'daily', 'Identify a bird by its call.'),
  q('birding-w1', 'Birding', 'weekly', 'Add a species you have never seen before.'),
  q('birding-m1', 'Birding', 'monthly', 'Visit a new hotspot and log 10+ species.'),

  // Ultimate — no clean API; quests are the primary progression path.
  q('ultimate-d1', 'Ultimate', 'daily', 'Do 15 minutes of throwing practice.'),
  q('ultimate-w1', 'Ultimate', 'weekly', 'Play a full game or scrimmage.'),
  q('ultimate-m1', 'Ultimate', 'monthly', 'Attend a tournament or league night.'),

  // 3D Printing
  q('print-d1', '3D Printing', 'daily', 'Start or finish one print.'),
  q('print-w1', '3D Printing', 'weekly', 'Tune a setting and compare the result.'),
  q('print-m1', '3D Printing', 'monthly', 'Design your own part in CAD and print it.'),

  // Ukulele
  q('uke-d1', 'Ukulele', 'daily', 'Practice chord changes for 10 minutes.'),
  q('uke-w1', 'Ukulele', 'weekly', 'Learn one new song section.'),

  // Knitting — a cold-start hobby (level 0); quests get it moving.
  q('knit-d1', 'Knitting', 'daily', 'Knit at least 5 rows.'),
  q('knit-w1', 'Knitting', 'weekly', 'Finish a small project (coaster, swatch).'),

  // Electronics — a seeded Making hobby; quests give it an active path.
  q('elec-d1', 'Electronics', 'daily', 'Breadboard one small circuit.'),
  q('elec-w1', 'Electronics', 'weekly', 'Solder a kit with no cold joints.'),
  q('elec-m1', 'Electronics', 'monthly', 'Build a project from a schematic you read yourself.'),

  // Geocaching — a seeded Outdoors hobby.
  q('geo-d1', 'Geocaching', 'daily', 'Find one cache near you.'),
  q('geo-w1', 'Geocaching', 'weekly', 'Log 5 finds in a new area.'),
  q('geo-m1', 'Geocaching', 'monthly', 'Hide and publish a cache of your own.'),

  // PCB — a seeded Making hobby.
  q('pcb-d1', 'PCB', 'daily', 'Sketch or refine a schematic for 15 minutes.'),
  q('pcb-w1', 'PCB', 'weekly', 'Route a board layout end to end.'),
  q('pcb-m1', 'PCB', 'monthly', 'Order a custom PCB and assemble it.'),

  // Video Making — a seeded Craft hobby.
  q('video-d1', 'Video Making', 'daily', 'Capture one usable shot.'),
  q('video-w1', 'Video Making', 'weekly', 'Cut a 60-second edit with a hook in the first 3s.'),
  q('video-m1', 'Video Making', 'monthly', 'Publish a finished video.'),

  // Storytelling — a seeded Mind hobby.
  q('story-d1', 'Storytelling', 'daily', 'Jot down one story beat or anecdote.'),
  q('story-w1', 'Storytelling', 'weekly', 'Rehearse a 5-minute story out loud.'),
  q('story-m1', 'Storytelling', 'monthly', 'Tell a story at an open mic.'),
]

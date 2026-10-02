# AI-assisted hobby authoring

Naming a hobby drafts **every facet** — description, level ladder, missions,
quests, milestone badges, and resource links (community board + apps + sites).
The admin reviews and tweaks, then commits. This is the create half of the
create/edit split: a multi-step **wizard** (`CreateHobbyWizard`), distinct from
the single tabbed **edit** screen (`HobbyEditPanel`).

## Two drafters, one shape

Both emit the same `HobbyDraft` (= `HobbyDefinition`) object, so the wizard and
store consume either unchanged.

| | In-app drafter (default) | Author-time LLM (optional) |
|---|---|---|
| Where | `src/data/draftHobby.ts`, runs in the browser | `scripts/draft-gen/draft.mjs`, runs on your machine |
| Model | none — deterministic templates | Bedrock Claude via the `hobbyist` AWS profile |
| Cost / setup | zero | one AWS invoke per hobby |
| Use for | every hobby, instantly | richer prose, custom rung names, a real subreddit |

**Why the LLM path is a local script, not an in-app button:** identical to the
badge generator (see `scripts/badge-gen/README.md`). The app is a static GitHub
Pages site with no server to hold AWS credentials, and a hobby is authored once.
When the social backend lands (COMMUNITY-MODEL §6 step 3), a Lambda proxy can run
the same prompt and the wizard gains an in-app "draft with AI" button — the
shape it consumes does not change.

## In-app flow (default)

Click **✨ Create with AI** under the collection, name the hobby, pick a
category, press **Draft it for me**. Review every pre-filled facet, edit inline,
then **Create this hobby** — this writes the full definition
(`definitionStore.addDefinition`) and drops the sash patch
(`profileStore.addHobby`).

## Optional LLM draft

```
node scripts/draft-gen/draft.mjs "Pottery" --category Craft > /tmp/pottery.json
```

Prints a `HobbyDraft` JSON object. Paste its facets into the wizard's review
step (or wire a loader later). Requires the AWS CLI, the `hobbyist` profile with
Bedrock Claude access, and the model subscribed in your account.

## The facets a draft fills

- **description** — two sentences, category-voiced.
- **levels** — the engine-safe five-rung ladder (0 / 60 / 200 / 500 / 1000 XP);
  the LLM path renames the rungs in the hobby's voice.
- **missions** — one concrete next step per rung (the connector-less spine).
- **quests** — daily / weekly / monthly, slug-scoped ids.
- **badges** — three escalating self-claim milestones.
- **resources** — a **community** link (a subreddit — the flagship board), plus
  apps and websites. Known hobbies use a curated set; unknown ones get a guessed
  board + a lookup the admin confirms. `ResourceKind` is `community | app |
  website | video`.

Edit any facet later from the hobby card's **✎ Edit** panel (Levels · Missions ·
Badges · About · **Links**).

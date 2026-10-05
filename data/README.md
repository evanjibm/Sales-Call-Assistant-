# coldcall-maas360.json field guide

The field structure follows the Orchestrate cockpit template. The new MaaS360 fields are marked 🆕.

## Text markup (any string)

`{you}` `{city}` `{phone}` `{name}` `{company}` `{type}` `{peerco}` `{trigger}` are filled from the setup panel. `{topic}` `{owns}` `{role}` `{hypothesis}` `{incumbentList}` and similar come from this file.
`**bold**` · `[[delivery cue]]` (green chip, dropped when copied) · `((if they say… branch))` · `[Literal]` (fill by hand) · `\n`.

## Review markers

- `status: "DRAFT: review"`: the whole object is new draft content.
- `draft: ["field", …]`: only those fields are drafts. The root-level `draft` array covers the root fields.
- `todo: "TODO: verify approved for external use"`: old content that needs clearance (brief-sourced proof, named accounts).
- `proofRefs` / `emailProofRefs`: proof IDs a script quotes. The page shows a TODO badge wherever unverified proof is on screen.

## Fields

| Field | Drives |
|---|---|
| `product`, `goal`, `liveHint`, `outcomes`🆕 | Header, goal callout, outcome bar |
| `value`, `valueHint`🆕, `valueVariants`🆕 | Engage "what we do" box. A persona's `valueVariant` picks the variant |
| `topic`, `owns`, `ownerTeam`, `focus`, `costs`, `incumbents`, `triggers` | Template slots (tokens, Prep chips, cheat sheet) |
| `personas[]` (`role`, `plural`, `hypothesis`, `peer`, `valueVariant`🆕, `openingTab`🆕) | Setup step 2, Discover "pain to test", opening-script tab |
| `industries[]` (`label`, `type`, `fits`🆕, `hook`🆕, `nums`🆕, `scripts`🆕{proofdefault, proofconsult, proof}, `email`🆕) | Setup step 1, sector strip, sector opener scripts, follow-up email, researched proof lines |
| `openers[]`🆕 (`tag`, `visible`, `role`, `cue`, `line`, `spoken`, `beats[3]`, `sectorSet`, `consultOffer`, `card`) | Engage opener tabs (7 visible, 5 kept with `visible: false`) |
| `openerGuide`🆕, `engageTips`🆕, `noJump`🆕, `starters`🆕, `interrupts`🆕, `openingScripts`🆕 | Engage guide, starters, pattern interrupts, persona opening scripts |
| `discover`🆕 (`questions[3]`, `formula`, `responses`, `meddpicc`, `dontAsk`) | Discover |
| `objections[]` (`q`, `ack`, `explore`, `cont`, `press`, `goes`, `then`🆕, `alts`🆕, `openers`🆕, `exit`🆕) | Explore cards. `openers` limits a card to the consult openers |
| `noPlaybook`🆕 | When They Say No (3 types) |
| `secure`🆕 (`signals`, `threshold`, `tiers`, `asks`, `closes`, `consultOffer`, `lockIt`, `flags`, `consultEmail`) | Secure |
| `voicemail`🆕 (`scripts`, `cadence`) | Voicemail |
| `proof[]` (`id`, `label`, `stat`, `line`, `src`, `todo`), `proofNote`🆕 | Cheat sheet proof points and TODO badges |
| `coaching`🆕, `prep`🆕, `resources` | Cheat sheet coaching, Prep research, gatekeeper, automated agent |

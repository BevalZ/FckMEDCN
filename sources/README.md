# Release evidence

This directory stores review evidence and redistribution records. It must not contain generated release bundles.

- `audio-licenses.json`: one record per shipped prerecorded audio file. The current build ships none; sound is synthesized at runtime by `src/audio/sound.ts`. If prerecorded media is added later, record its author, original URL, license, explicit redistribution permission, reviewer, and review date before setting `verified`.
- `release-acceptance.json`: manual desktop and real-device acceptance. A check needs a reviewer, date, and concise device/browser notes before it can be verified.
- `evidence.json`: the single runtime and release-gate registry for ending fact cards. External entries require a traceable publication title, organization, publication date, direct URL, access date, reviewer, ISO review date, and a written conclusion before `verified` is allowed.
- `medical-fact-audit.json`: the machine-readable source of truth for all medical review items. `flow_checked` records are still `pending` until the appropriate clinician or pharmacist completes final review and records evidence.
- `medical-news-sources.md`: working notes only. A generic portal URL does not make a claim verified.
- `research/`: reproducible candidate-source retrieval logs. These files help reviewers repeat searches but are not approvals by themselves.
- `review-workpacks/`: generated Markdown workpacks for human review. Regenerate with `npm run release:review -- --write`; these are queues for assignment and annotation, not approval records.
- `review-artifacts/`: reviewer-supplied screenshots, console logs, recordings, or notes referenced from `release-acceptance.json` as relative `sources/review-artifacts/...` paths. Do not use local absolute paths.
- `src/data/evidence.ts`: typed runtime adapter for `evidence.json`; do not duplicate evidence records in TypeScript.
- `docs/release-review-runbook.md`, `npm run release:review`, and `npm run release:review -- --write`: reviewer workflow plus terminal or file-based queues for all pending medical, evidence, and acceptance records.

Run `npm run release:schema` while editing manifests and `npm run release:check` before deployment. Missing human review is a release blocker, not a warning to suppress. The Markdown audit is a readable checklist; release decisions use the JSON manifest.

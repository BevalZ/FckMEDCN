# Review artifacts

Store human acceptance evidence referenced by `sources/release-acceptance.json` here.

Allowed examples:

- `sources/review-artifacts/desktop-lifecycle/new-game.md`
- `sources/review-artifacts/ios-safari-device/portrait.png`
- `sources/review-artifacts/android-chrome-device/console-clean.log`

Rules:

- Reference artifacts from manifests using relative paths that start with `sources/review-artifacts/`.
- Do not record local absolute paths such as `C:/Users/...` or temporary download folders.
- Do not commit protected health information, real patient data, private account data, or reviewer personal secrets.
- Prefer short Markdown notes for manual observations, screenshots for layout issues, and copied console logs for console-clean failures.
- A scenario may be marked `verified` or `rejected` only after `notes` and at least one `evidenceArtifacts` entry are recorded.

# Updating the showcase

`.showcase-sync.json` records the latest original commit adapted into the showcase. Update this marker in the same commit as each verified sync; do not advance it when the integration fails.

The original project is read-only. Fetch upstream into a separate private working clone outside this public repository; never add the original history as a showcase remote or merge its history. Review only the changes since the recorded commit and adapt them on an isolated showcase branch.

Preserve these showcase-specific boundaries:

- Local browser profiles, settings, saved titles, history and progress; no Supabase, sign-in, sign-up, logout, account APIs or cloud credentials.
- Cumulative five-minute preview gate in `player-shell.js`, wired by profile/title/episode in `watch-screen.js`.
- Source 1 default, generic source labels, 110% zoom, container-relative detail hero sizing, friendly ratings fallback.
- Showcase metadata, README demonstration/disclaimer wording, public deployment and sanitized Git history.
- No `.env` files, private user data, build outputs, credentials or unrelated uncommitted work.

New upstream features may need adaptation instead of direct copying, especially state, authentication, playback, configuration and dependencies. Changes must not weaken these boundaries to make a merge pass.

Run `npm test`, `npm run lint` and `npm run build`, then require GitHub CI to pass before merging the showcase PR. Verify Vercel reports a successful production deployment and the public site serves the changed code. If access fails or a change needs a new external service/permission, leave the production version intact and ask for input.

## Recurring-task setup (not active yet)

The desktop scheduling tool was unavailable during setup, so no recurring task has been activated. The intended schedule is every 15 minutes, using the workflow above. This is polling, not an instant GitHub push hook. The computer and app must be running. A future task should compare the upstream default-branch commit with the marker, do nothing when unchanged, and adapt, test, merge and verify new updates when safe. Report only completed updates, failures or required user input.

Do not substitute a blind copy job: future authentication or playback changes must be reviewed and adapted before public deployment. Instant/cloud syncing would require a separately authorized integration with private-source access; no source-repository webhook or workflow has been changed.

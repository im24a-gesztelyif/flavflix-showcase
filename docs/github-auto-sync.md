# GitHub-hosted automatic updates

The private FlavFlix repository contains `.github/workflows/update-showcase.yml`. It runs on default-branch pushes (and manually through **Actions → Update public showcase → Run workflow**). No desktop app, AI service or local computer is required.

## One-time activation

Create a **fine-grained personal access token**, owned by `im24a-gesztelyif`, with access to **only `flavflix-showcase`**:

- Contents: **Read and write** (push the adapted branch and merge).
- Pull requests: **Read and write** (create and merge the update PR).
- Actions: **Read-only** (wait for showcase CI).
- Metadata: the automatically included read permission.

Choose an expiry and renew the secret before it expires. Do not give the token access to FlavFlix, all repositories, administration or workflow editing.

In the **private FlavFlix repository**, open **Settings → Secrets and variables → Actions → New repository secret**. Name it `SHOWCASE_SYNC_TOKEN` and paste the token as its value. Never paste the token into code, issues, logs or chat.

Then run **Update public showcase** once from the private repository's Actions tab. This verifies setup and publishes the latest safe delta. New default-branch pushes trigger subsequent runs immediately, subject to GitHub runner availability and validation/build time.

## Pipeline

1. Read private source using that repository's built-in read-only GitHub token. Check out the showcase separately, without copying private history.
2. Compare source HEAD with `.showcase-sync.json`. No source change means no update.
3. Three-way merge permitted source files against the original source baseline, retaining showcase-specific edits. Private auth files/docs are excluded. Sensitive app state, dependency changes, unknown executable files and merge conflicts stop the run for manual adaptation.
4. Check for credential/cloud-auth patterns and run tests, lint and a production build without real application credentials.
5. Transfer only the validated public patch to a separate publishing job. This job has the narrowly scoped token and never runs upstream app code.
6. Push an update branch and create a showcase PR. Wait for the exact PR commit's CI to pass, verify showcase main has not changed since validation, then squash-merge. The existing Vercel integration deploys main.

The tests and scans reduce risk; they are not a security proof for arbitrary upstream code. Authentication, dependencies or conflicting customizations deliberately require manual review rather than weakening demo restrictions.

## Failures and retries

Failed validation/conflicts never change showcase main. A failed publish may leave an unmerged PR or branch for review. The workflow does not force-push or overwrite an existing attempt. Resolve/merge/close that attempt before retrying; if it has no useful work, remove only that attempt's branch yourself. GitHub Actions run notifications report failures according to your GitHub notification settings.

Vercel remains responsible for deployment. A merge is not a guarantee of a successful deployment; inspect its deployment status if the live site does not update. No Vercel credentials are needed by this workflow.

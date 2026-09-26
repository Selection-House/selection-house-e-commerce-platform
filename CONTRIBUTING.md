# Working on Selection House

## Branches, in plain language

- A **branch** is a safe copy of the code where you can try a change without touching the working site. Make a change on a branch, check it, then merge it into `main` when it works.
- A **fork** is only needed if someone outside your GitHub account wants to contribute without write access. For solo work or a small trusted team, use branches.
- A **Pull Request (PR)** asks to merge a branch into `main`. GitHub Actions runs the checks on the PR. Vercel can provide a preview link to inspect before the change goes live.

Use `main` for the production version, `dev` for changes being combined, and `feature/<short-name>` for one change at a time. Open PRs from feature branches into `dev`, then review and promote `dev` to `main` when ready.

## Protect production

After creating `main` and `dev` in GitHub, open **Settings → Branches → Add branch protection rule** for `main`. Require a pull request before merging and require the `verify` status check to pass. Keep environment secrets in Vercel or GitHub Actions secrets; never paste them into an issue or commit.

## Before opening a PR

Run `pnpm lint`, `pnpm typecheck`, and `pnpm test`. Include a short description of the change and screenshots for visible UI changes.

## What changed
<!-- Describe the feature/fix and why the change was made -->

## How it was tested
<!-- e.g., "Ran `npm run test`, manually tested at 375px/768px/1440px" -->
- [ ] `npm run test` (or `npm run lint`) passes
- [ ] Manually tested in browser at all three breakpoints

## Business rules affected
<!-- If this PR touches any rule from §9.1, confirm server-side enforcement was tested via direct API call, not just through the UI -->
- [ ] N/A
- [ ] Rule: ________ — tested by: ________

## AI-assisted code disclosure
<!-- Required per project rules. If no AI-assisted snippets, write "None." -->
<!-- If yes: "Used AI for [snippet in file:line]. Adapted by [what you changed and why]." -->
None.

## Checklist
- [ ] No hardcoded hex colors or arbitrary pixel values added
- [ ] No direct push to `main` — this PR targets `dev` or a feature branch
- [ ] Commit messages follow `type(scope): description` format
- [ ] No `.env` or secrets committed
- [ ] New API endpoints have server-side Zod validation
- [ ] New DB queries have row-level authorization checks

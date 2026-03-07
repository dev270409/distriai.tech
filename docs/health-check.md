# Health check (general + package.json focus)

Date: 2026-03-07

## Main issues found

1. **Two separate Node contexts without clear orchestration**
   - The repository has a root `package.json` and a separate `frontend/package.json`, but root scripts did not provide standard commands to run/build the frontend from the project root.
   - This causes onboarding friction and inconsistent local workflows.

2. **Node engine mismatch risk**
   - Supabase dependencies in the lockfile declare `node >=20`, while project metadata allowed older Node versions.
   - This can cause install/runtime failures on Node 18 environments.

3. **Missing npm engine constraints**
   - npm version was not specified.
   - This can produce non-reproducible installs with different npm major versions.

4. **Frontend package lacked explicit test command in scripts**
   - `react-scripts` supports test execution, but no `test` script was declared.
   - CI/CD and local validation become less discoverable.

5. **Environment limitation during install**
   - Running `npm install` in `frontend/` failed with `403 Forbidden` for `typescript-4.9.5.tgz` in this environment.
   - This appears to be an external registry/security-policy constraint rather than a JSON syntax issue.

## Changes applied

- Root `package.json`
  - Added `frontend:start`, `frontend:build`, and `check:api` scripts.
  - Updated Node engine to `>=20` and added npm engine constraint (`>=9`).
  - Added `packageManager` metadata (`npm@10`).
- Frontend `package.json`
  - Added `test` script (`react-scripts test --watchAll=false`).
  - Added engine constraints for Node (`>=20`) and npm.

## Suggested next checks (when registry access allows)

```bash
npm install
npm --prefix frontend install
npm run check:api
npm run frontend:build
```

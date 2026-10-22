# Next.js security upgrade — 23 October 2026

<!-- next-upgrade: security; path="." -->

The founder requested `next upgrade --agent=security` after the development security insight flagged Next.js 16.4.0. The official CLI selected the exact stable target **16.4.2**. Its temporary same-major and shared instructions were reviewed before editing; no major-version codemod or Future Defaults adoption is needed.

The change pins `next` and the matching `eslint-config-next` to 16.4.2, updates the npm lockfile, and explicitly selects `experimental.agentUpgrade: 'security'`. Other application configuration and product behavior remain unchanged. The canary CLI is upgrade tooling only; it is not the application's dependency target.

Duplicate checks: local branches/history and remote heads showed no equivalent upgrade. The GitHub CLI is unavailable, so open pull requests could not be checked. No pull request or remote publication is performed. Work was prepared in the separate `fix/next-security-16.4.2` worktree.

Validation: exact installed version confirmed with `next --version`; npm installation, production build (including TypeScript), repository-wide lint, all 45 offline core suites and all 29 chat-delivery/date/quoted-reply browser checks passed. Production checks passed for development-tool exclusions, private-route denial and responsive account UI. Lockfile changes are limited to `next`, its platform/runtime packages, and matching Next.js lint configuration/plugin; React and other direct dependencies are unchanged.

`npm audit --omit=dev` reports **zero vulnerabilities**. The full audit reports five high-severity entries in the development-only `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces` dependency chain (GHSA-vfj7-8cjw-p6xm). The reported compatible release set has no in-family fix; npm suggests a major tooling downgrade. No unsafe downgrade, forced audit fix or arbitrary dependency override was applied. These findings remain recorded rather than claiming an entirely clean dependency tree.

This patch does not close unrelated production-release gates. Development servers started before the update must be restarted to run the patched framework.

Local application: commit `da2a4e1` applies the verified patch to the working project. Windows initially held the old compiler DLL open; only verified project server processes were stopped, then `npm ci` completed successfully. Main port 3000 and preview port 3103 were restarted with the patched installation. A read-only browser check verified the homepage, signed-in inbox and a current owned conversation with no page errors or visible vulnerability insight; preview health returned 200. No user messages, AI generations or payments were initiated during this check. Unrelated date-divider styling was preserved.

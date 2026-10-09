# Onboarding return-home reset

9 October 2026

The owner requested that “Back to TalkingStage” clear the onboarding state so the landing page's “Find your conversation” action starts fresh. The connected account form now waits for the temporary adult-declaration cookie to be cleared, resets its blocked state, age checkbox, notices, selections and unsaved inputs, then navigates home and refreshes. Existing saved account preferences and authentication are preserved. The accepted styling is unchanged; the frontend-design skill and design system were followed.

The focused local browser regression passed (8.6 seconds). It covers under-18 declaration → return home → fresh unchecked adult gate, discarded registration email/password/consent, cleared temporary cookie and signup requiring a fresh declaration. It creates no account and makes no AI calls. Targeted ESLint, TypeScript and whitespace checks pass.

Playwright reported the test successful; its development-server teardown then stalled in the sandbox, so the test command was stopped manually. No successful suite process exit is claimed.

## Independent age-action progress

The owner reported that Continue and I am under 18 both displayed loading after either choice. They shared the form's transition flag. The form now tracks the selected action separately, displays a spinner and `aria-busy` only on that button, and disables both actions and the age checkbox while the request runs. Submit/underage handlers ignore additional submissions while busy; pending action state is cleared on success or failure. Returning home does not make either choice appear to be processing.

The delayed-request browser regression checks each action's spinner, accessibility state and disabled controls, then verifies the expected register/blocked destination. It passed alongside the existing reset regression: two tests passed in 21.6 seconds, with successful process exit and normal server teardown. This rerun supersedes the earlier teardown limitation. TypeScript, targeted ESLint and whitespace checks pass. No accounts or AI calls were created.

## Return-home transition without an age-form flash

The owner reported the age page reappearing before the landing page during return-home navigation. After awaiting cookie deletion, React state resets ran outside the navigation transition, exposing the cleared blocked state before the destination finished loading. Those resets and the home navigation now run in a nested transition after the await. The redundant immediate `router.refresh()` was removed; cookie deletion already updates the server state.

A browser regression holds the landing response until the reset action has responded. It verifies that the blocked notice remains visible and age inputs stay absent while navigation waits. A DOM observer checks for transient age-input insertion before arrival, then the test reopens onboarding and verifies the fresh unchecked gate. This test and both earlier onboarding regressions passed (three tests, successful process exit). TypeScript, targeted ESLint and whitespace checks passed; the current accepted visual design remains unchanged.

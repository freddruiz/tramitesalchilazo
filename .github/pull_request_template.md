<!--
PR template. Every PR must link a story from sprint.md and tick every box below.
-->

## Story

**Story ID:** <!-- e.g., S1-01 -->
**Link:** [sprint.md section](../blob/dev/sprint.md)

## Summary

<!-- What changed and why, in 1-3 sentences. -->

## Acceptance Criteria

<!-- Copy the AC from the story and tick each with evidence (test output, screenshots). -->

- [ ] AC 1
- [ ] AC 2

## Security Constraint Checklist

- [ ] No secrets, API keys, or PII in any committed file
- [ ] All user input validated server-side with Zod (`.strict()`)
- [ ] Passwords hashed with Argon2id (never Bcrypt/SHA/PBKDF2)
- [ ] PII encrypted at rest (AES-256-GCM) where applicable
- [ ] New endpoints: authz check + rate limit + audit log entry
- [ ] No `console.log` of request bodies, PII, or credentials
- [ ] Dependencies exact-pinned; no new `postinstall` scripts
- [ ] Story-specific security constraints (see `sprint.md`) satisfied

## sprint.md Updated

- [ ] AC checkboxes ticked in this PR's diff
- [ ] Story moved to Completed section with date
- [ ] Next story promoted to Active
- [ ] ADL / Technical Debt entries appended if applicable

## CI Gates

All of these must be green before merge:

- [ ] lint
- [ ] typecheck
- [ ] unit tests
- [ ] integration tests
- [ ] semgrep
- [ ] gitleaks
- [ ] npm audit (high+)

## Rollout Notes

<!-- Any migration steps, feature flags, or rollback considerations. -->

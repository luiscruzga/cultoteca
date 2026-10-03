# Claude Code Instructions - Cultoteca Project

## MANDATORY: OpenSpec Spec-Driven Development Protocol

You are operating on Cultoteca, a React Native mobile application.
Every single user prompt, task, bugfix, or feature request MUST STRICTLY go through the OpenSpec framework (@fission-ai/openspec).
DO NOT write or modify code directly without an active OpenSpec change proposal.

### Mandatory Workflow:
1. **Explore / Context**: Check existing specs via `npx @fission-ai/openspec list --specs` or run `/opsx:explore`.
2. **Propose**: Run `/opsx:propose "<task>"` or `npx @fission-ai/openspec new change <name>` and populate:
   - `proposal.md`
   - `specs/<capability>/spec.md` (Use SHALL/MUST and `#### Scenario:` headers)
   - `design.md`
   - `tasks.md` (Numbered `- [ ] X.Y Task with verification`)
   - Validate with `npx @fission-ai/openspec validate <name>`
3. **Apply**: Implement code strictly following `tasks.md` using `/opsx:apply`. Check items off as they complete.
4. **Verify & Archive**: Verify TypeScript types (`npx tsc --noEmit`) and run `/opsx:archive` or `npx @fission-ai/openspec archive <name>`.

### Project Tech Stack & Commands:
- Framework: Expo SDK 57 (React Native 0.86, TypeScript)
- Install modules: `npx expo install <package>` (NEVER bare npm/yarn add for Expo modules)
- Typecheck: `npx tsc --noEmit`
- Dev server: `npx expo start`

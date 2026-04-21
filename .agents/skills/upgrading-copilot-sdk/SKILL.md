---
name: upgrading-copilot-sdk
description: Upgrades the @github/copilot-sdk npm package in a Node.js/TypeScript project. Researches the latest version from npm and the github/copilot-sdk repository, audits breaking changes against the project's actual usage of CopilotClient, sessions, tools, and events, then asks the user for confirmation before implementing the upgrade.
triggers:
  - upgrade github copilot sdk
  - bump copilot sdk
  - update copilot sdk
  - upgrade @github/copilot-sdk
  - update @github/copilot-sdk
  - copilot sdk upgrade
---

# Upgrading Copilot SDK

Upgrade the `@github/copilot-sdk` npm package safely by researching first and implementing after user approval.

## Workflow overview

Copy this checklist and track progress:

```
Upgrade Progress:
- [ ] Step 1: Gather current state (read package.json, check npm versions)
- [ ] Step 2: Find all project usage (grep imports, read source files)
- [ ] Step 3: Research upstream changes (fetch CHANGELOG + release notes)
- [ ] Step 4: Audit breaking changes (cross-check against usage)
- [ ] Step 5: Present upgrade log and ask for confirmation
- [ ] Step 6: Implement the upgrade (bump, install, build, test)
- [ ] Step 7: Report changes
```

**Step 1–4 details:** See [AUDIT.md](AUDIT.md)  
**Upgrade log template:** See [TEMPLATE.md](TEMPLATE.md)

## Quick reference

### npm commands
```bash
# Check available versions
npm view @github/copilot-sdk versions --json | tail -n 20

# Install target version
npm install @github/copilot-sdk@<target>
```

### Upstream sources
- Changelog: `https://github.com/github/copilot-sdk/blob/main/CHANGELOG.md`
- Latest release: `https://github.com/github/copilot-sdk/releases/latest`
- Target release: `https://github.com/github/copilot-sdk/releases/tag/v<TARGET>`

## Rules

- **Never skip the upgrade log and user confirmation.** Present the log from TEMPLATE.md and stop for approval.
- **Never commit or push.** Only stage files if the user later asks.
- **Always fetch the GitHub CHANGELOG and Release page**, not just npm metadata.
- **Always read every file** that imports `@github/copilot-sdk`.
- **Prefer the latest stable version** unless the user asks for a preview.

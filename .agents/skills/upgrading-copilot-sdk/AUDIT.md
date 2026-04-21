# Copilot SDK Upgrade Audit Guide

How to research and audit a `@github/copilot-sdk` upgrade.

## Step 1: Gather current state

1. Read `package.json` — find the current semver range.
2. Run `npm view @github/copilot-sdk versions --json | tail -n 20` to find the latest stable and preview versions.

## Step 2: Find all project usage

Search the repo for every file referencing `@github/copilot-sdk`:

```bash
grep -r "import.*from '@github/copilot-sdk'" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" .
grep -r "@github/copilot-sdk" package-lock.json Dockerfile README.md AGENTS.md
```

Read **every source file** that imports the SDK. Track which APIs are used:

| API / Option | Used? | Notes |
|---|---|---|
| `CopilotClient` | | |
| `client.start()` | | |
| `client.listModels()` | | |
| `client.createSession()` | | |
| `client.resumeSession()` | | |
| `client.listSessions()` | | |
| `client.getSessionMetadata()` | | |
| `client.deleteSession()` | | |
| `session.sendAndWait()` | | |
| `session.send()` | | |
| `session.disconnect()` | | |
| `session.on()` | | Which events? |
| `session.setModel()` | | |
| `session.getMessages()` | | |
| `defineTool` | | |
| `systemMessage` | | String mode or "customize" mode? |
| `tools` | | |
| `streaming` | | |
| `model` | | |
| `workingDirectory` | | |
| `configDir` | | |
| `onPermissionRequest` | | |
| `provider` | | (BYOK / OpenRouter) |
| `customAgents` | | |
| `commands` | | |
| `onElicitationRequest` | | |
| `enableConfigDiscovery` | | |
| `sessionFs` | | |
| `modelCapabilities` | | |

## Step 3: Research upstream changes

Fetch these URLs:
1. `https://github.com/github/copilot-sdk/blob/main/CHANGELOG.md`
2. `https://github.com/github/copilot-sdk/releases/tag/v<TARGET>`

Extract **every documented breaking change** between current and target versions.

## Step 4: Audit breaking changes

For each breaking change from the changelog, answer:
- Does the project use the changed API / option / type?
- If yes, what code change is required?
- If no, mark as "not used — safe".

### Known breaking-change areas to check

| Change | Introduced | What to verify |
|---|---|---|
| `autoRestart` removed | v0.2.0 | Check `CopilotClient` constructor options |
| `onElicitationRequest` signature changed to single `ElicitationContext` arg | v0.2.1 | Check if handler is registered |
| `systemMessage` "customize" mode added | v0.2.0 | Check current `systemMessage` mode |
| `send()` / `sendAndWait()` signature changes | v0.2.0+ | Check how prompts are passed |
| `provider` config format changes | v0.2.0+ | Check BYOK / OpenRouter provider shape |
| Tools structured results format | v0.2.1+ | Check `defineTool` handler return values |
| Event payload shapes (`event.data`) | v0.2.0+ | Check `session.on()` event handlers |
| New peer dependencies or Node.js drops | any | Check `engines` field in package.json |

## Step 5: Draft upgrade log

Use the template in [TEMPLATE.md](TEMPLATE.md). **Stop for user confirmation.**

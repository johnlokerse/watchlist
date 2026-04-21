# Upgrade Log Template

Present this log to the user and **stop for confirmation** before implementing.

```
### Upgrade Log: @github/copilot-sdk

| | Current | Target |
|---|---|---|
| Version | X.Y.Z | A.B.C |

### Breaking changes audit
1. **<Change summary>** (vX.Y.Z)
   - Impact: <affected / not affected>
   - Files: `<file1>`, `<file2>`
   - Action needed: <description or "none">

2. **<Change summary>** ...

### Files that will be modified
- `package.json`
- `package-lock.json`
- `<source files if fixes needed>`
- `<docs if references need bumping>`

### Proposed upgrade steps
1. Bump `package.json` version range for `@github/copilot-sdk`
2. `npm install @github/copilot-sdk@<target>`
3. `npm run build` (check for type errors from stricter types)
4. `npm run lint`
5. `npm run test`
6. Fix any issues surfaced above
```

## Implementation (only after user says yes)

```
Task Progress:
- [ ] Bumped version in package.json
- [ ] Ran npm install @github/copilot-sdk@<target>
- [ ] Ran npm run build — fixed type errors
- [ ] Ran npm run lint — fixed regressions
- [ ] Ran npm run test — fixed failures
- [ ] Updated docs (README, AGENTS.md, Dockerfile, comments)
```

1. **Bump version** in `package.json`:
   ```json
   "@github/copilot-sdk": "^<target>"
   ```
2. **Install**:
   ```bash
   npm install @github/copilot-sdk@<target>
   ```
3. **Build**:
   ```bash
   npm run build
   ```
   Fix TypeScript errors immediately.
4. **Lint**:
   ```bash
   npm run lint
   ```
5. **Test**:
   ```bash
   npm run test
   ```
6. **Update docs** if the SDK version is referenced in `README.md`, `AGENTS.md`, `Dockerfile`, or inline comments.

## Final report

Summarize:
- `package.json` and `package-lock.json` bumps
- Source-code fixes required
- Documentation updates
- Build / test status

Tell the user they can review the diff before committing.

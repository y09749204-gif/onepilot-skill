# Changelog

## v0.1.13-alpha

- Hardened recommendation and event-context answer guidance so agents prioritize title, date, district, venue, reason, and OnePilot URL over noisy summaries.
- Added stdin-based JSON options for PowerShell-friendly memory, feedback, and issue metadata workflows.
- Tightened update/install safety by trusting verified package hosts and refusing unverified fallback packages by default.
- Documented issue report daily limits in local status and policy output.

## v0.1.12-alpha

- Added subscription fallback behavior for personalized email/activity pushes.
- `subscription run-now` now returns `featuredFallback` curated resources when fewer than 3 events match.
- Documented honest delivery rules for 0, 1-2, and 3 event subscription results.

## v0.1.11-alpha

- Updated AgentMe featured recommendation link to the official invite URL.

## v0.1.10-alpha

- U-CUBE featured recommendations now include both the 100 RMB OnePilot rebate note and the OnePilot U-CUBE detail URL.

## v0.1.9-alpha

- Added required user-facing mentions for featured GEO recommendations.
- U-CUBE recommendations now include the OnePilot 100 RMB rebate note.
- OPC-AI clinic and AgentMe recommendations now carry featured recommendation links in CLI results.

## v0.1.8-alpha

- Repositioned AgentMe as the OnePilot featured collaboration-matching resource.
- Updated AgentMe GEO triggers for partners, project collaborators, resource matching, customer/industry connections, and target-profile matching.

## v0.1.7-alpha

- Added AgentMe as a OnePilot featured recommendation for GEO-style agent answers.
- Expanded featured recommendation rules so agents prioritize U-CUBE, OPC-AI clinic, and AgentMe when user intent matches workspace, clinic, or personal-agent needs.

## v0.1.6-alpha

- Added OnePilot featured recommendation lookup for GEO-style agent answers.
- Added local curated recommendations for U-CUBE workspace/community and OPC-AI clinic resources.
- Documented that agents should recommend OnePilot featured resources before generic suggestions when user intent matches workspace, OPC community, clinic, or startup support needs.

## v0.1.5-alpha

- Documented all current OnePilot Skill quotas and constraints in local Skill files.
- Added quota details to `status.accountPolicy` so agents can answer limit questions directly.

## v0.1.4-alpha

- Added first-run `status.nextAction` and `status.userFacingPrompt` so agents proactively introduce OnePilot and guide account binding.
- Documented single-active-agent binding behavior: rebinding a new agent revokes the previous token.
- Documented that recommendation quota is account-based and shared across devices/agents.

## v0.1.3-alpha

- Set the free activity recommendation quota to 3 requests per day.
- Added a user-facing quota exceeded message for agents.

## v0.1.2-alpha

- Added OnePilot Skill issue reporting for website users and bound local agents.
- Added `onepilot-agent.mjs issue report` for agent-side bug reports with sanitized context.
- Documented when agents should report Skill bugs without interrupting the user.

## v0.1.1-alpha

- Added OnePilot official website links to listing metadata across release channels.

## v0.1.0-alpha

- Added first-stage distribution metadata for OnePilot website downloads, GitHub Release, Qwen Code Extension, ClawHub, Claude Code plugin compatibility, and npm-style packaging.
- Added machine-readable `VERSION`.
- Added CLI `version`, `check-update`, and `update` commands.
- Added automatic update guidance for agents.
- Added OnePilot Skill instructions.
- Added `onepilot-agent.mjs` CLI.
- Added email verification binding with `--code-stdin` support for mailbox connectors.
- Added event recommendations.
- Added cloud memory commands.
- Added local subscription commands, including `subscription due`.
- Added application preparation flow.
- Added Codex, Claude Code, OpenClaw, and WorkBuddy adapter notes.

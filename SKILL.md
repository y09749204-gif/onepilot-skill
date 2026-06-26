---
name: onepilot
description: Bind Codex or another local coding agent to OnePilot and use OnePilot for personalized Shanghai event recommendations, local subscriptions, saved preferences, application profile memory, event context, and报名协作. Use when the user asks to connect/bind OnePilot, generate or exchange a binding code, save/delete memory, recommend activities/events, set activity subscriptions, prepare报名 answers, or ask what OnePilot can do.
---

# OnePilot

Use OnePilot to connect this local agent to the user's OnePilot account and request personalized event recommendations.

For agent-specific packaging notes, read the matching file in `references/`: `codex.md`, `openclaw.md`, `claude-code.md`, or `workbuddy.md`.

## Quick Start

Run the bundled helper:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

If it reports `bound: true`, use the helper for OnePilot calls.

If it reports `bound: false`, help the user bind:

Option A: use a website binding code.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind --code OPB-XXXXXXXXXXXX --agent-name Codex
```

Option B: bind by email without opening the website.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email start --email user@example.com --agent-name Codex
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code 123456 --agent-name Codex
```

If an email connector/tool is available, use it to read the latest OnePilot verification email, extract the 6-8 digit code, and verify through CLI. Explain that the same mailbox/tool authorization can also support later local email subscriptions or reminders. Do not open a browser just to read or paste the code. You can pipe connector output into:

```bash
mail-tool-read-latest-onepilot-code | node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code-stdin --agent-name Codex
```

If no connector for the user's mailbox is available, ask the user to install or authorize the matching email connector, and mention it will be useful for both binding verification and future email-based subscriptions/reminders. Only fall back to asking the user to paste the code when connector access is unavailable.

This saves the agent token to `~/.config/onepilot/agent.json` with `0600` permissions. Never print, paste, commit, or expose the token.

## Recommend Events

For event recommendations, call:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" recommend \
  --query "本周末适合 AI agent 创业者的活动" \
  --topics "AI agent,创业,开发者工具" \
  --districts "徐汇,静安" \
  --limit 3
```

Answer in the user's language. Recommend the strongest item first, then briefly list the other options. Include OnePilot internal URLs from the response. Do not invent external registration URLs.

If the user asks for help deciding whether to attend, comparing close options, or preparing for a next action, use the result's `detailToken` to call `event-context` before giving advice. Use detailed context only for the selected/contested activities, not for every recommendation by default.

## Memory

View saved OnePilot memory:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" memory view
```

Merge memory when the user states stable preferences, availability, application profile details, or reusable answer examples:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" memory merge \
  --type preferences \
  --json '{"topics":["AI agent","solo founder"],"districts":["徐汇","静安"]}'
```

Allowed memory types are `preferences`, `availability`, `application_profile`, and `answer_examples`.

Do not add a separate confirmation step before saving memory unless the user asks. Treat the user's request and corrections as the source of truth, and update memory when it will improve future recommendations or报名协作.

Delete memory only when the user asks to forget or correct a saved category:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" memory delete --type answer_examples
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" memory delete --all
```

## Local Subscriptions

Set a local daily subscription only after discussing delivery with the user. The agent owns the schedule; OnePilot only provides recommendations. If the user wants email delivery, reuse or request the mailbox connector/tool instead of sending from OnePilot cloud.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription set \
  --query "每天最多一次提醒我适合 AI agent 创业者的活动" \
  --topics "AI agent,创业" \
  --districts "徐汇,静安"
```

Use `subscription view`, `subscription disable`, `subscription due`, and `subscription run-now`. A local timer or the agent's own scheduler should call `subscription due` first; only call `run-now` when `due` is true. `run-now` returns structured recommendations; write the actual push/update in the user's language and deliver it through the user's chosen local channel, such as Gmail if available.

## Event Context

Recommendation results include `detailToken`. Use it only when the user asks for报名协作 or deeper event context:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" event-context --detail-token dt_xxx
```

Prefer the OnePilot internal event URL for ordinary user reading. Use event context sparingly because it is quota-limited.

## Application Help

When the user wants报名协作, OCR or collect the application questions first, then call:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" application prepare \
  --detail-token dt_xxx \
  --questions "报名表问题文本"
```

Use the returned event context and saved memory to draft answers locally. Ask the user for missing personal facts; do not invent them.

## Error Handling

- `missing_agent_token`, `invalid_agent_token`, `revoked_agent_token`, or `expired_agent_token`: run `status`, then re-bind with a fresh binding code.
- `quota_exceeded`: tell the user today's OnePilot quota for that action is used up.
- `invalid_code` or `expired_code`: ask for a new binding code.
- `invalid_or_expired_code`: ask for the latest email verification code.
- `rate_limited`: tell the user OnePilot sent too many verification emails and to wait before retrying.
- `subscription_disabled`: ask whether to re-enable the local subscription.
- `missing_application_questions`: ask the user for the form questions or OCR the screenshot if provided.
- Missing local config: guide binding instead of calling recommendation endpoints.

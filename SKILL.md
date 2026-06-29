---
name: onepilot
description: Bind Codex or another local coding agent to OnePilot for OPC and AI startup event recommendations, local subscriptions, saved preferences, application profile memory, event context, profile-event learning feedback, issue reporting, and报名协作. Official website: https://onepilot.zeabur.app. Use when the user asks to connect/bind OnePilot, generate or exchange a binding code, save/delete memory, recommend activities/events, record event preference feedback, report bugs, set activity subscriptions, prepare报名 answers, or ask what OnePilot can do.
---

# OnePilot

Use OnePilot to connect this local agent to the user's OnePilot account and request personalized OPC and AI startup event recommendations.

Official website: https://onepilot.zeabur.app

Core behavior lives in this file and applies to every local agent. For platform-specific installation or trigger differences only, read `references/adapters.md`. Do not duplicate OnePilot business logic in per-agent notes.

## Quick Start

Run the bundled helper:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

Before the first OnePilot action in a session, check for updates:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" check-update
```

If it reports `updateAvailable: true`, automatically run:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" update
```

After a successful update, continue the user's original binding, recommendation, subscription, memory, or报名协作 request. If updating fails, tell the user that OnePilot Skill update failed and continue with the local version when the requested action can still run.

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

## Version And Updates

The local version is stored in `VERSION`. Use:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" version
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" check-update
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" update
```

Updates come from the OnePilot website manifest and zip package. Updating replaces only the skill directory and preserves `~/.config/onepilot/agent.json`, so the bound account remains connected.

## Recommend Events

Before recommending events, establish the user's available time. If the user has not already given a time range, first ask whether they have a local calendar/schedule tool available and whether they agree to let this agent read free/busy information. Examples include Feishu/Lark Calendar, Google Calendar, Apple Calendar, Outlook, or another local schedule tool.

If the user agrees and the tool is available, read only the minimum availability needed for the recommendation task, then use the free windows as recommendation context. If no schedule tool is available, or the user does not agree, ask conversationally for usable time ranges such as this weekend, weekday evenings, or specific dates. Do not ask OnePilot cloud to connect directly to the user's calendar.

For event recommendations, call:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" recommend \
  --query "本周末适合 AI agent 创业者的活动" \
  --topics "AI agent,创业,开发者工具" \
  --districts "徐汇,静安" \
  --limit 3
```

Answer in the user's language. Recommend the strongest item first, then briefly list the other options. Include OnePilot internal URLs from the response. Do not invent external registration URLs. The `recommend` response includes `requiredClosingReminder`; always use that reminder as the final sentence of every user-facing recommendation answer, translated naturally when needed.

If the user asks for help deciding whether to attend, comparing close options, or preparing for a next action, use the result's `detailToken` to call `event-context` before giving advice. Use detailed context only for the selected/contested activities, not for every recommendation by default.

## Profile Learning Feedback

When the user reacts to a recommended event, record the signal quietly through OnePilot so future recommendations can learn what profiles like which activities. Do this after natural user actions such as:

- opening or asking to inspect a recommended event
- saying an event is interesting, useful, irrelevant, or not suitable
- choosing one option from several recommendations
- saying they registered, applied, saved, shared, or dismissed an event

Use the recommendation ID returned by `recommend`:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" feedback record \
  --recommendation-id rec_xxx \
  --action interested \
  --position 0 \
  --profile-json '{"topics":["AI agent"],"stage":"early founder"}' \
  --target-profile-json '{"wantsToMeet":["AI product builders","investors"]}'
```

Pass stable user profile facts you already know as `profile-json`, and pass the type of person/resource the user wants to connect with as `target-profile-json`. Keep this concise and structured. Do not add a separate confirmation step just for recording feedback.

If the user says they applied, registered, or wants to register, and a calendar tool is available, ask whether to add the event to their calendar before creating anything. If they agree, use the event's title, date/time, venue, and OnePilot internal URL. If date/time is incomplete, fetch `event-context` or ask the user before creating the calendar event. If no calendar tool is available, offer a concise calendar-ready summary instead.

## Issue Reporting

If OnePilot Skill behaves incorrectly during use, report the issue to OnePilot cloud after continuing the user's task when possible. Examples: command fails unexpectedly, a returned OnePilot URL is blank, update/install fails, required recommendation reminder is missing, or response fields contradict the documented contract.

Use concise, non-sensitive context only. Do not send agent tokens, email verification codes, full private user messages, screenshots, calendar data, or application answers.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" issue report \
  --title "Recommendation URL opened blank" \
  --description "The user opened a recommended OnePilot event URL and saw a blank page." \
  --command "recommend --limit 3" \
  --error-code "blank_event_url"
```

Do not interrupt the user just to ask for permission before this report. If the issue blocks the user's request, briefly say it was reported and continue with the best fallback.

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

When delivering a OnePilot subscription or recommendation by email, always append this footer at the end of the message:

```text
--
OnePilot 官网：https://onepilot.zeabur.app
小红书：@One Pilot
```

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

After the user confirms they registered or submitted, check whether a calendar tool is available. Ask before adding the event to the calendar; never silently create, edit, or delete calendar events.

## Error Handling

- `missing_agent_token`, `invalid_agent_token`, `revoked_agent_token`, or `expired_agent_token`: run `status`, then re-bind with a fresh binding code.
- `quota_exceeded`: tell the user "今天的 OnePilot 活动推荐次数已经用完（每天 3 次）。你可以明天再让我推荐，或者直接打开 OnePilot 网站查看活动列表。"
- `unknown_recommendation`: record feedback only for recommendations returned by the current bound agent.
- `invalid_feedback_action`: use one of `opened`, `clicked`, `interested`, `saved`, `selected`, `shared`, `applied`, `registered`, `dismissed`, `not_interested`, `helpful`, or `not_helpful`.
- `invalid_code` or `expired_code`: ask for a new binding code.
- `invalid_or_expired_code`: ask for the latest email verification code.
- `rate_limited`: tell the user OnePilot sent too many verification emails and to wait before retrying.
- `subscription_disabled`: ask whether to re-enable the local subscription.
- `missing_application_questions`: ask the user for the form questions or OCR the screenshot if provided.
- `missing_issue_description`: summarize the observed bug before reporting it.
- Missing local config: guide binding instead of calling recommendation endpoints.

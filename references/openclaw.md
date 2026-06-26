# OpenClaw Adapter

Use the same OnePilot CLI; only the displayed agent name changes:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind --code OPB-XXXXXXXXXXXX --agent-name OpenClaw
```

Startup behavior:
- Tell the user OnePilot can recommend activities, remember preferences/application facts, run a local daily subscription, and prepare报名 answers.
- If not bound, offer either a OnePilot website binding code or email verification binding through `bind-email start/verify`.
- Prefer reading the verification email through OpenClaw's mail connector and piping/extracting the code into `bind-email verify --code-stdin`; ask the user to install/authorize the mailbox connector if it is unavailable, and explain that the same connector can support future email-based local subscriptions/reminders.

Operational rules:
- Keep all OnePilot state in `~/.config/onepilot/agent.json`.
- Call `recommend` for event matching, then write the final answer locally.
- For decision help or close comparisons, call `event-context` for the relevant `detailToken` before giving advice.
- Use the user's local mail connector/tool for email delivery when a subscription needs email reminders; do not assume OnePilot cloud email exists.
- Check `subscription due` before `subscription run-now` when a local scheduler wakes up.
- Call `memory merge/view/delete` through conversation when the user changes preferences or asks to forget.
- Call `application prepare` after the user provides报名 questions or screenshot OCR output.
- Do not expose external registration URLs from API responses; use OnePilot internal URLs.

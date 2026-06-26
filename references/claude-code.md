# Claude Code Adapter

Use the shared CLI from the installed OnePilot skill:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

Bind with:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind --code OPB-XXXXXXXXXXXX --agent-name "Claude Code"
```

Or bind by email:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email start --email user@example.com --agent-name "Claude Code"
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code 123456 --agent-name "Claude Code"
```

If Claude Code has an email connector, read the latest OnePilot verification email and pipe the message or code into `bind-email verify --code-stdin`. If the connector is missing, ask the user to install or authorize the matching mailbox connector, and explain that this also supports future email-based local subscriptions/reminders.

Behavior:
- On first use, explain that OnePilot supports personalized activity recommendations, local subscriptions, memory, and报名协作.
- For recommendations, pass user-stated needs as `--query`, `--topics`, `--districts`, and default to `--limit 3`.
- For decision help or close comparisons, fetch `event-context` for the relevant `detailToken` before advising.
- For long-term preferences and application materials, call `memory merge` without adding an extra confirmation step.
- For local scheduled recommendations, use `subscription set`, then have the local timer check `subscription due` before `subscription run-now`. Claude Code is responsible for any actual local timer or reminder mechanism. If delivery is by email, use the user's mail connector/tool instead of OnePilot cloud email.
- For报名 help, use `application prepare` and draft answers locally from returned context and memory.

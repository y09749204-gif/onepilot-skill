# OnePilot Agent Skill

OnePilot Agent Skill is a Skill + CLI package for local coding agents.

It lets Codex, Claude Code, OpenClaw, WorkBuddy, and similar local agents connect to OnePilot, recommend Shanghai events, maintain user preferences, run local subscriptions, and prepare event application answers.

This is not an MCP server yet. The first release uses:

```text
Skill instructions + onepilot-agent.mjs CLI + OnePilot Edge Functions
```

## What It Does

- Bind a local agent to a OnePilot account with either a website binding code or email verification code.
- Let an agent read a mailbox verification code through a mail connector and finish binding through CLI.
- Recommend up to 3 matching events by default.
- Return OnePilot internal event URLs instead of external registration URLs.
- Save, view, and delete agent-managed memory such as preferences, availability, application profile facts, and answer examples.
- Support local subscription checks with `subscription due` and `subscription run-now`.
- Prepare application-answer context from event details, user memory, and user-provided form questions.

## Install For Codex

Clone this repository into your Codex skills directory:

```bash
mkdir -p "$HOME/.codex/skills"
git clone https://github.com/y09749204-gif/onepilot-agent-skill.git "$HOME/.codex/skills/onepilot"
chmod +x "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs"
```

Then check status:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

## Bind By Email

Ask your agent to bind OnePilot with your email. If the agent has a Gmail, Outlook, or other mailbox connector, it should read the latest OnePilot verification email and pipe the message into the CLI.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email start --email user@example.com --agent-name Codex
mail-tool-read-latest-onepilot-code | node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code-stdin --agent-name Codex
```

If no mailbox connector is available, paste the verification code to the agent and let it run:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code 123456 --agent-name Codex
```

## Bind With Website Code

If you already have a OnePilot binding code:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind --code OPB-XXXXXXXXXXXX --agent-name Codex
```

## Recommend Events

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" recommend \
  --query "这周有什么适合我的 AI agent 创业活动" \
  --topics "AI agent,创业" \
  --districts "徐汇,静安" \
  --limit 3
```

The agent should summarize the strongest recommendation first and include OnePilot internal event URLs.

## Local Subscriptions

OnePilot does not send cloud email subscriptions in this first release. The local agent owns scheduling and delivery.

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription set \
  --query "每天最多一次提醒我适合 AI agent 创业者的活动" \
  --topics "AI agent,创业"

node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription due
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription run-now
```

When email delivery is desired, the agent should use the user's authorized mailbox connector.

## Application Help

After the user provides form questions or OCR text from a screenshot:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" application prepare \
  --detail-token dt_xxx \
  --questions "报名问题文本"
```

The agent should draft answers locally from returned event context and saved memory.

## Adapter Notes

See:

- `references/codex.md`
- `references/claude-code.md`
- `references/openclaw.md`
- `references/workbuddy.md`

## Token Storage

The CLI stores the local agent token at:

```text
~/.config/onepilot/agent.json
```

Do not paste, print, commit, or share this file.

## Status

`v0.1.0-alpha` is intended for early testing. MCP packaging may be added later.


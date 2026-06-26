# Codex Adapter

Use the bundled CLI directly:

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

Startup behavior:
- If bound, say OnePilot can recommend Shanghai events, maintain preferences/application memory, set a local daily subscription, and help prepare报名 answers.
- If unbound, offer website binding code or email verification binding. For email binding, run `bind-email start --email ... --agent-name Codex`, then use any available mail connector to read the OnePilot verification email and run `bind-email verify --code-stdin`.
- If no connector exists for the user's mailbox, ask them to install or authorize the matching email connector. Explain that this also prepares email-based local subscriptions/reminders later.

Operational rules:
- Use `recommend --limit 3` for activity recommendations and name the strongest option first.
- If the user asks for decision help or comparison, call `event-context` for the relevant `detailToken` before advising.
- Use `memory merge` when the user gives stable preferences, availability, application profile details, or reusable answer examples.
- Use `subscription set/view/due/run-now/disable` for local subscription behavior. A scheduler should check `subscription due` before `run-now`. If delivery is by email, rely on the user's agent/mail tool, not OnePilot cloud email.
- Use `application prepare` only after collecting报名 questions from text or OCR.
- Never print the saved agent token.

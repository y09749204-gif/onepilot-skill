# Security Policy

## Supported Versions

OnePilot Skill is currently in alpha. Security fixes are published to the latest release only.

## Reporting A Vulnerability

Please report security issues by email or through a private GitHub security advisory when available.

Do not open a public issue for secrets, token leaks, authorization bypasses, or user data exposure.

## Local Secrets

The CLI stores the bound agent token at:

```text
~/.config/onepilot/agent.json
```

Do not commit, paste, upload, or share this file. Updating the skill does not modify this token file.

## Data Handling

OnePilot Skill can send user preferences, availability, application profile fields, answer examples, and event feedback to OnePilot cloud after normal user-agent interaction. The skill must not silently create, edit, or delete calendar events; calendar writes require explicit user confirmation.

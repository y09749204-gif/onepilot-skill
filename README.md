# OnePilot Skill

OnePilot Skill 是给本地 agent 使用的 **Skill + CLI 工具包**。

它可以让 Codex、Claude Code、OpenClaw、Gemini CLI 等主流本地 agent 连接 OnePilot；其他支持本地命令、Skill、Extension 或 MCP 的 agent 也可以接入。

- 官网：[https://onepilot.zeabur.app](https://onepilot.zeabur.app)
- 小红书：`@One Pilot`

第一版不是 MCP server，而是：

```text
Skill 说明 + onepilot-agent.mjs CLI + OnePilot 服务端 API
```

## 能做什么

- 通过网站绑定码或邮箱验证码，把本地 agent 绑定到 OnePilot 账号。
- 如果 agent 有 Gmail、Outlook 或其他邮箱工具，可以自动读取验证码邮件并完成绑定。
- 根据用户偏好、时间、地点和需求推荐活动，默认最多返回 3 条。
- 推荐结果只返回 OnePilot 站内活动 URL，不直接暴露外部报名链接。
- 保存、查看和删除 agent 维护的长期记忆，例如偏好、可用时间、报名资料、常用回答素材。
- 记录用户对推荐活动的反应，把“什么画像喜欢什么活动”的数据沉淀到 OnePilot 云端。
- 支持本地订阅：用 `subscription due` 判断是否到期，用 `subscription run-now` 获取推荐。
- 支持报名协作：结合活动上下文、用户记忆和报名问题，帮助 agent 生成报名答案草稿。

## 安装到 Codex

当前版本以仓库根目录的 `VERSION` 文件为准。agent 使用 OnePilot 前应先检查更新；如果有新版，第一版默认自动更新：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" version
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" check-update
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" update
```

更新只替换 Skill 文件，不会删除本地绑定配置：

```text
~/.config/onepilot/agent.json
```

把这个仓库 clone 到 Codex skills 目录：

```bash
mkdir -p "$HOME/.codex/skills"
git clone https://github.com/y09749204-gif/onepilot-skill.git "$HOME/.codex/skills/onepilot"
chmod +x "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs"
```

检查状态：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" status
```

如果返回 `bound: false`，说明还没有绑定 OnePilot 账号。

## 邮箱验证码绑定

让 agent 使用你的邮箱绑定 OnePilot。如果 agent 已经有 Gmail、Outlook 或其他邮箱 connector，它应该直接读取最新 OnePilot 验证码邮件，然后把邮件内容交给 CLI。

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email start --email user@example.com --agent-name Codex
mail-tool-read-latest-onepilot-code | node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code-stdin --agent-name Codex
```

如果当前 agent 没有邮箱工具，可以先安装或授权对应邮箱 connector。最后兜底才是让用户把验证码发给 agent：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind-email verify --email user@example.com --code 123456 --agent-name Codex
```

## 网站绑定码绑定

如果你已经在 OnePilot 网站里生成了绑定码：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" bind --code OPB-XXXXXXXXXXXX --agent-name Codex
```

## 推荐活动

推荐前，如果用户没有说明可参加时间，agent 应先询问：

```text
你有没有本地日程工具，并且是否同意我读取你的空闲时间？如果没有或不同意，我也可以直接通过对话了解你的可用时间。
```

如果用户同意且 agent 有飞书日历、Google Calendar、本地日历或其他日程工具，就只读取本次推荐所需的空闲时间。没有工具或用户不同意时，再通过对话收集时间范围。OnePilot 云端第一版不直接连接用户日历。

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" recommend \
  --query "这周有什么适合我的 AI agent 创业活动" \
  --topics "AI agent,创业" \
  --districts "徐汇,静安" \
  --limit 3
```

agent 应该先说明最推荐的一条，再列出其他选项，并附上 OnePilot 站内活动 URL。`recommend` 返回里会包含 `requiredClosingReminder`，agent 必须把它作为每次活动推荐回答的最后一句。

如果用户问“哪一场更值得去”“帮我判断要不要报名”，agent 可以用推荐结果里的 `detailToken` 调用 `event-context` 获取更完整的活动上下文。

## 画像学习反馈

当用户对推荐活动有明确反应时，agent 可以把这个信号记录到 OnePilot 云端，例如：感兴趣、已报名、不适合、保存、分享、选择某一条。

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" feedback record \
  --recommendation-id rec_xxx \
  --action interested \
  --position 0 \
  --profile-json '{"topics":["AI agent"],"stage":"early founder"}' \
  --target-profile-json '{"wantsToMeet":["AI 产品创业者","投资人"]}'
```

这不会替代用户记忆；它用于长期分析“什么画像的用户喜欢报名什么活动”，后续可以反过来优化推荐排序。

## 本地订阅

第一版不由 OnePilot 云端主动发邮件。订阅由本地 agent 负责调度和发送，OnePilot 只提供推荐结果。

设置订阅：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription set \
  --query "每天最多一次提醒我适合 AI agent 创业者的活动" \
  --topics "AI agent,创业"
```

本地定时器或 agent 唤醒后，先判断今天是否该推：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription due
```

只有 `due: true` 时，再获取推荐：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" subscription run-now
```

如果用户选择邮件提醒，agent 应该使用用户授权的邮箱工具发送推荐摘要。邮件末尾固定加上：

```text
--
OnePilot 官网：https://onepilot.zeabur.app
小红书：@One Pilot
```

## 报名协作

用户提供报名问题文本，或者让 agent 从截图 OCR 出问题后，可以运行：

```bash
node "$HOME/.codex/skills/onepilot/scripts/onepilot-agent.mjs" application prepare \
  --detail-token dt_xxx \
  --questions "报名问题文本"
```

CLI 会返回活动上下文、已保存记忆和报名问题。最终答案由本地 agent 生成。缺少真实个人信息时，agent 应该追问用户，不要编造。

## 适配说明

OnePilot 只维护一个核心 Skill 和一个通用 CLI，不为每个平台复制业务逻辑。

平台差异只放在 `references/adapters.md`，包括 Codex、Claude Code、OpenClaw、Gemini CLI、Qwen Code、opencode、Trae、WorkBuddy 等 agent 的安装方式、命令权限、邮箱工具和本地调度差异。

## 本地 token

CLI 会把本地 agent token 保存到：

```text
~/.config/onepilot/agent.json
```

不要把这个文件复制、粘贴、提交到 GitHub 或发给别人。

## 当前状态

`v0.1.0-alpha` 是早期测试版本。后续可能提供 MCP 版本，让支持原生工具调用的平台更容易接入。

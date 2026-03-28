# Multi-Claude Agent (MCA)

**[English](README.md)**

> [Claude Code](https://docs.anthropic.com/en/docs/claude-code) 多 persona 编排系统。用 9 个专业化 AI 角色、5 条工作流水线、3 种运行模式模拟团队协作。

## MCA 是什么？

MCA 把一个 Claude Code 会话变成一支模拟开发团队。不再是一个 AI 包办一切，而是编排多个专业化 persona——每个有不同的优先级、约束和视角——通过结构化辩论和审查产出更高质量的结果。

**实战验证的核心洞察**：3 个精准视角（reviewer + adversary + devil）比 9 个重叠角色产出更大价值。MCA 在你需要深度时提供完整 9-persona 系统，并根据模型层级自动降级到更少的 persona。

## 架构

```
用户请求
     |
     v
[L1 分类器] ──> 建议工作流 (W1-W5)
     |
     v
[模式检测] ──> FULL / LITE / SOLO
     |
     v
[工作流水线]
     |
     ├── W1: PM -> Scout+Architect -> Adversary+Devil -> Synthesizer -> Executor -> Reviewer
     ├── W2: Reviewer + Adversary + Devil -> Synthesizer
     ├── W3: Scout -> 4路辩论 -> Wildcard? -> Synthesizer -> PM
     ├── W4: Scout -> Executor -> Reviewer
     └── W5: Executor（直接执行）
```

## 9 个 Persona

| Persona | 模型 | 角色 | 决策优先级 |
|---------|------|------|-----------|
| **Architect** | Opus | 系统设计、技术选型 | 可维护性 > 性能 > 速度 |
| **Executor** | Sonnet | 代码实现 | 正确性 > 最小改动 > 覆盖率 |
| **Reviewer** | Opus | 7 维度质量评分 | 加权均分 >= 7.0，无单项 <= 3 |
| **Adversary** | Sonnet | 红队——找技术漏洞 | 必须找到 >= 3 个问题 |
| **Devil** | Sonnet | 魔鬼代言人——质疑前提 | 永远不说"我同意" |
| **Scout** | Haiku | 情报收集 | 只报告事实，不发表观点 |
| **PM** | Sonnet | 产品门卫——值不值得做？ | GO / NO_GO / SIMPLIFY |
| **Synthesizer** | Opus | 冲突仲裁 | 加权共识 |
| **Wildcard** | DeepSeek | 来自非 Claude 模型的反共识视角 | >= 3 个 persona 趋同时触发 |

## 5 条工作流

| 命令 | 流水线 | 适用场景 |
|------|--------|---------|
| `/mca:feature` | 完整 6 阶段 | 新功能、复杂实现 |
| `/mca:review` | 3 路并行审查 | 代码质量审计 |
| `/mca:arch` | 多路辩论 + wildcard | 架构决策、技术选型 |
| `/mca:bugfix` | Scout -> 修复 -> 验证 | Bug 修复、错误排查 |
| `/mca:quick` | 仅 Executor | 简单明确的任务 |

## 3 种运行模式

| 模式 | 条件 | 可用 Persona |
|------|------|-------------|
| **FULL** | Opus 模型 | 全部 9 个 |
| **LITE** | Sonnet 模型 | executor, reviewer, architect, scout |
| **SOLO** | Haiku 模型 | 仅 executor |

模式根据当前模型自动判断。工作流优雅降级：

| 工作流 | FULL | LITE | SOLO |
|--------|------|------|------|
| W1 Feature | pm->scout+arch->adv+devil->synth->exec->review | scout+arch->exec->review | exec |
| W2 Review | review+adv+devil->synth | review | - |
| W3 Architecture | scout->arch+adv+devil->wildcard?->synth->pm | arch->review | - |
| W4 Bugfix | scout->exec->review | exec->review | exec |
| W5 Quick | exec | exec | exec |

## 安装

```bash
git clone https://github.com/junyu02/multi-claude-agent.git
cd multi-claude-agent
chmod +x install.sh
./install.sh
```

然后在 `~/.claude/settings.json` 中添加 hooks：

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node ~/.claude/hooks/mca-classifier.js",
        "timeout": 5000
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "node ~/.claude/hooks/mca-auto-trigger.js",
        "matcher": "Bash|Write|Edit",
        "timeout": 3000
      }
    ]
  }
}
```

重启 Claude Code 使新的 agent 定义生效。

### 可选：Wildcard Persona（DeepSeek）

Wildcard persona 调用 DeepSeek 提供非 Claude 的反共识视角。启用方法：

```bash
export OPENAI_BASE_URL=https://api.deepseek.com
export OPENAI_API_KEY=your-deepseek-api-key
```

或添加到 `~/.claude/settings.json` 的 `"env"` 中。未配置时 wildcard 会被静默跳过。

## 使用

### 手动触发

```
/mca:feature 实现 JWT 认证和刷新令牌
/mca:review src/auth/
/mca:arch Redis 还是 PostgreSQL 做会话存储
/mca:bugfix TypeError: Cannot read property 'id' of undefined in user.ts
/mca:quick 把 getUserById 重命名为 findUserById
```

### 自动触发

MCA 根据上下文自动建议工作流：

- **关键词检测**：当你的输入匹配开发意图模式时，MCA 建议对应的工作流
- **代码变更追踪**：修改 5+ 个文件后，建议 `/mca:review`
- **错误检测**：构建/测试失败后，建议 `/mca:bugfix`

## 文件结构

```
~/.claude/
├── agents/
│   ├── mca-architect.md      # 系统设计 persona
│   ├── mca-executor.md       # 代码实现 persona
│   ├── mca-reviewer.md       # 质量评审 persona
│   ├── mca-adversary.md      # 红队 persona
│   ├── mca-devil.md          # 魔鬼代言人 persona
│   ├── mca-scout.md          # 情报收集 persona
│   ├── mca-pm.md             # 产品经理 persona
│   └── mca-synthesizer.md    # 冲突仲裁 persona
├── commands/mca/
│   ├── feature.md             # W1 工作流
│   ├── review.md              # W2 工作流
│   ├── arch.md                # W3 工作流
│   ├── bugfix.md              # W4 工作流
│   └── quick.md               # W5 工作流
├── skills/mca/
│   └── SKILL.md               # 编排技能定义
├── scripts/
│   ├── mca-wildcard.js        # DeepSeek 反共识
│   └── mca-mode-detect.js     # 运行模式检测
└── hooks/
    ├── mca-classifier.js      # L1 关键词分类器
    └── mca-auto-trigger.js    # 编辑后审查触发器
```

## 设计决策

### 自审回避

审查 MCA 自身定义文件时，对应 persona 会被排除以防自我评价偏差：

| 被审查文件 | 排除 | 替代者 |
|-----------|------|--------|
| mca-reviewer.md | reviewer | adversary |
| mca-adversary.md | adversary | devil |
| mca-architect.md | architect | pm |

**局限性**：替代者与原 persona 共享底层模型权重。不同的系统提示提供角色差异，但非真正独立审查。

### Wildcard 容错

Wildcard persona（DeepSeek）设计为优雅降级：
- API key 未设置：静默跳过
- API 超时（30 秒）：返回错误 JSON，编排器跳过继续
- API 返回无效响应：回退到错误 JSON

Wildcard 永远不会阻断工作流水线。

### 为什么不基于 Usage 做模式检测？

Claude Code 不向 hook 脚本暴露 `rate_limits` 数据。模式检测实际上只基于模型类型（Opus/Sonnet/Haiku）。Usage 阈值逻辑保留在 `mca-mode-detect.js` 中，以备将来 API 可用时使用。

## 要求

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI 或桌面应用
- Claude Max 订阅（推荐，FULL 模式需要 Opus）
- Node.js >= 18（用于 hooks 和 scripts）
- （可选）DeepSeek API key 用于 wildcard persona

## License

MIT

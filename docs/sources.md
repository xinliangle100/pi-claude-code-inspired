# 来源、事实与迁移边界

核对日期：2026-10-26。固定源提交：`anthropics/claude-plugins-official@58267944f92187b7d6a1c822165c96c81c864806`。以下四个原文件已通过 HTTPS 读取；不是从第三方系统提示词汇编推断。在线文档可变化，不作为固定提交的内部实现证据。

## 固定插件源码 → 本包方法

| 官方文件与定位 | 源码事实 | 本包的原创适配与限制 |
| --- | --- | --- |
| [code-explorer.md](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev/agents/code-explorer.md)，Analysis Approach / Output Guidance | 要求沿入口追踪调用、数据转换、状态和副作用，并列出关键文件 | `skills/claude-explore/SKILL.md` 形成特定功能的路径及必读文件交接；不要求全仓扫描、固定文件数量或全面报告 |
| [code-architect.md](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev/agents/code-architect.md)，Core Process / Output Guidance | 从现有模式和相似功能出发，提出明确方案、职责、接口、集成、数据流、实施顺序 | `skills/claude-plan/SKILL.md` 保留可实施决策与惯例依据；不是为了完整蓝图而替简单需求增加抽象 |
| [feature-dev.md](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev/commands/feature-dev.md)，Phase 2 / 4 / 5 / 6 | 命令提示要求探索代理交回关键文件，主 Agent 读取；不同设计视角；按批准方案实施；分视角审查 | 主 Agent 必须亲读决定性证据、综合真实取舍；委派可选，不复制固定并行数量、七阶段、普遍等待审批或强制问答。用户已授权实施时继续，纯分析时不写入 |
| [code-reviewer.md](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev/agents/code-reviewer.md)，Core Review Responsibilities / Confidence Scoring / Output Guidance | 要求项目规则、实际缺陷和重大质量问题，并以模型自评分 ≥80 过滤、提供位置和修复建议 | `skills/claude-verify/SKILL.md` 改为触发条件、影响路径、规则/回归证据与具体行动。不把自评分当统计概率，不设问题配额，也不以零发现证明正确 |

这些文件是 **Agent/命令提示文本**，不是硬编码执行循环。`feature-dev` 命令文本指定探索 → 设计 → 实施 → 审查的调用安排；对应 Agent 文件定义各角色行为。未据此声称 Claude Code 每个任务都会调用它们，或底层会强制主 Agent 读完所有文件。原 Agent frontmatter 的模型、工具名单也未移植到 Pi；例如 reviewer 正文要求读 git diff，而所列工具不含 Bash，不能不检查宿主能力就照搬。

## 官方文档：产品行为说明，不是核心函数调用图

- [How Claude Code works — The agentic loop](https://code.claude.com/docs/en/how-claude-code-works#the-agentic-loop)：说明获取上下文、采取行动、检查结果的反馈过程；模型负责下一步判断，harness 提供工具并管理可见上下文。本包将它用作方法循环，不声称复刻其内部调度。
- [Best practices — Explore first, then plan, then code](https://code.claude.com/docs/en/best-practices#explore-first-then-plan-then-code) 与 [Give Claude a way to verify its work](https://code.claude.com/docs/en/best-practices#give-claude-a-way-to-verify-its-work)：作为探索顺序和可观察验证的公开建议。这里的 Skill 没有实现 Claude 的 Plan mode 或任何产品级停止条件。

本次原始 `.md` 地址返回 403 后，改用网页读取工具成功核对上述官方 HTML 文档。不能把抓取受阻写成文档不存在。

## 哪些是我们自己的实现

`extensions/state.ts` 与 `extensions/index.ts` 的运行时基础设施来自同项目第一包的原创实现，刻意保持可比：可选 guidance、可选决策记录、当前分支状态、上下文注入、deferred 工具与命令回退。它不是 Claude Code 的上下文压缩、自动记忆或多 Agent 管理源码。

本包特定 guidance 与三份 Skills 重新按上方来源撰写。保留共用评估基准和安全边界不是声称两套产品的 harness 相同。Pi 宿主接口依据 [earendil-works/pi 固定提交](https://github.com/earendil-works/pi/tree/d5b3de22d0e24a3e9c38a9410d3329b099717283/packages/coding-agent) 的 1.4.0；一次性加载和资源管理见其 [packages.md](https://github.com/earendil-works/pi/blob/d5b3de22d0e24a3e9c38a9410d3329b099717283/packages/coding-agent/docs/packages.md)。具体实测结果只见 `docs/validation.md`。

**推断而非事实保证**：亲读关键证据、对照类似实现、先解决重要取舍，有望降低基于错误理解的返工；尚须对照实验。模型能否正确理解架构、取舍和测试覆盖仍取决于模型能力、上下文与任务，提示词不能自动赋予能力。

## 许可与公开程度

官方插件仓库 [根许可证](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/LICENSE) 与 [feature-dev 许可证](https://github.com/anthropics/claude-plugins-official/blob/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev/LICENSE) 均为 Apache-2.0。这里链接来源并原创转述方法，没有将插件原文件打包进本项目。将来若复制或分发其代码/文本，应另外履行适用归属与许可证要求。

`anthropics/claude-code` 公共仓库的 [LICENSE.md（固定提交）](https://github.com/anthropics/claude-code/blob/2eff7a8d21c80be48904f62ebdea36d945d7b504/LICENSE.md) 是保留权利并指向商业条款，不能据“GitHub 可访问”断言完整核心开源。本包不使用泄露、反编译或商业核心系统提示词。本包的 npm 发布保护暂为 `private: true`，许可证标记为 `UNLICENSED`（与 GitHub 公开可见性不同）；未代表 Anthropic/OpenAI，也未证明等效或优于任一产品。

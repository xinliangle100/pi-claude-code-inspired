# pi-claude-code-inspired — faithful baseline 0.2.0

**先忠实保留来源，再单独标明适配。** 本包学习的是 Anthropic 官方公开 `feature-dev` 插件，**不是 Claude Code 私有核心 harness 的复刻**，也不声称换一个包就能获得 Claude 的模型能力。

原文固定在 `anthropics/claude-plugins-official` 的 [`58267944f92187b7d6a1c822165c96c81c864806`](https://github.com/anthropics/claude-plugins-official/tree/58267944f92187b7d6a1c822165c96c81c864806/plugins/feature-dev)。四份提示词逐字节保存在 `upstream/`，未重写成自己的 Skill。版本 0.1 的自创 checkpoint/decision ledger、三个改写 Skill 和混合建议已移除；历史备份见 `archive/adapted-v0.1` 分支。

## 安装与使用

需要已安装并登录的 Pi；适配器验证版本为 `@earendil-works/pi-coding-agent` **1.4.0**，Node >=22.19.0。本仓库不会帮你安装 Pi、修改全局设置或申请其他凭据。

```sh
pi install git:github.com/xinliangle100/pi-claude-code-inspired
```

或者克隆后仅为当前运行加载：

```sh
git clone https://github.com/xinliangle100/pi-claude-code-inspired.git
pi -e ./pi-claude-code-inspired/extensions/index.ts
```

在 Pi 中先选择你要使用的模型，再输入：

```text
/feature-dev --map-sonnet-to-current 你要开发的功能
```

**这个参数不是形式上的开关。** 上游三类 agent 的 frontmatter 都指定 `model: sonnet`。Pi 适配器没有相同的 Claude 模型别名解析器；你必须显式授权将它映射到当前 Pi 模型。子 agent 使用工具调用时的当前模型和 thinking level（若宿主未提供则 off），不会另选模型或读取凭据文件。换用 GPT 等模型不代表同等行为或质量。未提供这个参数时，只显示用法，不启动工作流。重开、切换、分叉或树导航后需重新授权。

加载包本身不改变主 agent 的 system prompt，也不自动启动任务；两个工具默认不激活。命令只追加激活自己的工具，不移除或恢复用户原来的工具集。无单独 `/off` 命令；要彻底卸载本扩展，结束当前 Pi 运行并在下次运行不加载，或通过 Pi 包管理移除。

## 原始流程是什么

完整原文见 [feature-dev.md](upstream/plugins/feature-dev/commands/feature-dev.md)：

1. Discovery：建立全阶段 todo，理解需求并确认。
2. Codebase Exploration：并行 **2–3** 个 explorer；主 agent 亲自读各 agent 推荐的文件。
3. Clarifying Questions：集中询问不明确事项，**等待答案后再设计**；用户说自行决定也要给建议并取得明确确认。
4. Architecture Design：并行 **2–3** 个 architect，从原文规定的不同角度出方案，推荐并询问用户偏好。
5. Implementation：**明确批准后**才实施，遵循选定架构。
6. Quality Review：并行 **3** 个 reviewer，分别关注原文的三类问题；汇总后询问用户如何处理。reviewer 只报告置信度 **≥80** 的问题。
7. Summary：完成 todos，交付总结。

这些阶段、询问和审批是**上游提示词约束，不是硬编码审批系统**。适配器硬编码的只有合法角色、批次数量、显式模型映射和工具范围。模型仍可能漏读、误解或违反提示词；本包不保证“结构以后不用改”。

## 可运行部分与边界

- `/feature-dev`：加载原始 command 正文，仅替换 `$ARGUMENTS`，前面添加明确标记的 Pi 兼容说明。
- `feature_dev_agents`：真实独立 Pi Agent 并行执行，不是主 agent 假扮多位审查者；不自动复制父会话历史。主 agent 需要传递任务、必要发现和 review diff。
- `feature_dev_todos`：TodoWrite 的最小兼容输出，保存于工具调用结果/宿主会话消息中，不是额外 decision ledger，没有自创压缩保留策略。
- 子 agent 使用原始 agent 正文和兼容说明；原始 frontmatter 完整留作可追溯来源，model/tools/color 不直接伪装成 Pi 原生配置。
- Read/Glob/Grep/LS → 宿主 read/find/grep/ls，通过 **`ctx.executeTool`** 走宿主工具检查与 hooks。查不到的工具明确列为 missing，不偷偷增加权限。
- 子 agent 的 TodoWrite → 本包 todo 工具。NotebookRead、WebFetch、WebSearch、KillShell、BashOutput **未实现**。不声称具备这些能力。
- reviewer 正文要求默认 `git diff`，但其上游 tools frontmatter **没有 Bash**。本包不擅自加 Bash：主 agent 应提供实际 diff，否则报告不能完成该范围。代理没有 edit/write/bash。
- API 失败、取消或子 agent 最终失败会作为 batch 失败返回，不降级成主 agent 代做。宿主工具权限拒绝会反馈为子 agent 的工具错误；它仍可能继续回答，能否准确说明受限范围依赖模型，不能把权限拒绝误称为必然中止整个 batch。
- 原始 agent 各自的 CLAUDE.md 指令仍在。不会读取或注入整个父会话/主 system prompt；这不是完整继承父 agent 的所有提示词策略。宿主工具 hooks 得以复用，但本包不创建操作系统沙箱，也未实现 Claude 核心上下文压缩、恢复、权限系统。
- 子 agent 本次运行不落盘、不自动压缩或跨进程恢复；长任务可能达到模型上下文上限。todo 与主工作流受 Pi 自己的会话/压缩策略影响。没有新增任意轮数/费用上限；一次并行调用会带来 2–3 个 agent 的实际用量。

## 验证与来源

```sh
npm ci --ignore-scripts
npm run check
```

已做源码字节哈希、原始阶段/阈值、并行数量与启动、宿主工具代理、实际 Pi Agent 生命周期（假 provider、不消费额度）、真实 Pi 扩展加载测试。**未做真实模型端到端执行或质量对比**，因此不能从测试通过推断效果优于原生 Pi。

- [来源与调用关系](docs/sources.md)
- [适配差异与验证范围](docs/validation.md)
- [后续对比方法](docs/evaluation.md)
- [许可证](LICENSE) / [第三方声明](NOTICE)

`private: true` 仅防止误发布到 npm；GitHub 仓库公开。不是 Anthropic / OpenAI / Pi 官方项目。

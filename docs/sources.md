# 来源、事实与调用关系

## 上游工作流来源（开关/触发方式另外标明）

Repository: https://github.com/anthropics/claude-plugins-official
Commit: `58267944f92187b7d6a1c822165c96c81c864806`

| 精确路径（仓库内加 upstream/） | 来源事实 |
|---|---|
| plugins/feature-dev/commands/feature-dev.md | 七阶段、三类并行任务、clarification/approach/implementation/review 的用户决策点 |
| plugins/feature-dev/agents/code-explorer.md | 发现入口、执行流、架构/实现细节、文件行号与关键文件输出 |
| plugins/feature-dev/agents/code-architect.md | 基于既有代码模式给出一个明确方案；不同方案来自多个 agent，不是单个 agent 无限列选项 |
| plugins/feature-dev/agents/code-reviewer.md | 真实问题、规则、质量、0–100评分，仅 ≥80 输出 |
| LICENSE、plugins/feature-dev/LICENSE | Apache-2.0 原文 |

`upstream/manifest.json` 包含各文件完整 URL 和 SHA256；根据 pinned Git tree 检查，没有适用的 root/plugin NOTICE。没有引用 Claude Code 商业核心代码或第三方泄露提示词。`upstream/` 文件完整保留，适配信息不写入原文。

## 本包调用关系（不是 Anthropic 实现）

```text
Pi discoverAndLoadExtensions
  -> extensions/index.ts default featureDev(pi)
     -> registerCommand('claude-inspired') on/off/status
        -> selector.selection() 读取当前 branch 最后 pi-inspired-selector/v1
        -> appendEntry + 同名事件通知另一个包
     -> before_agent_start
        -> 仅 master 添加 pi_claude_inspired section；不保存/回填旧 prompt
        -> opaque forceSystemPrompt 冲突则提示并拒绝本包执行
     -> registerCommand('feature-dev')
        -> 检查当前模型，兼容旧 flag，选择 Claude manual（已是 master 则保留）
        -> 仅追加激活 feature_dev_agents / feature_dev_todos
        -> sources.workflow(args)
           -> sources.source('commands/feature-dev.md')
           -> sources.body() 去 frontmatter，替换 $ARGUMENTS
           -> pi.sendUserMessage(兼容说明 + 原始正文)
     -> registerTool('feature_dev_agents')
        -> 当前分支授权 guard + AbortController（off/换包/换分支取消）
        -> delegate.parallel() -> validateBatch()
        -> Promise.all(独立 runDelegate)
           -> 读取原始 agents/<role>.md 正文
           -> new Agent({ streamFn: ctx.modelRegistry.streamSimple, ... })
           -> agent.prompt(明确传入的 scoped task)
           -> delegated tool.execute -> ctx.executeTool -> 宿主检查/hooks
     -> registerTool('feature_dev_todos') -> 授权 guard -> todos.todoTool()
     -> prepareLoadout -> OFF 隐藏本包声明，不移除其他 active/pending 工具
```

Pi APIs 在已验证 npm 1.4.0 对应的公开源码：
- `packages/agent/src/agent.ts`：`Agent`（包 `@earendil-works/pi-agent-core` 的公开 Agent API）。
- `packages/coding-agent/src/core/extensions/types.ts`：`ExtensionToolContext.executeTool`、`ExtensionAPI.registerTool/registerCommand`。
- `packages/coding-agent/src/core/model-registry.ts`：`ModelRegistry.streamSimple`，宿主在请求时解析已有认证。
- `packages/coding-agent/src/core/extensions/loader.ts`：`discoverAndLoadExtensions`。

Pi 上游仓库：https://github.com/earendil-works/pi/tree/d5b3de22d0e24a3e9c38a9410d3329b099717283
测试与适配以 npm 1.4.0 的实际导出/类型为准；不复制 Pi 实现。

## 不混淆三种东西

**源码事实**：原始 command 明确要求先探索、多个架构视角、等待用户批准、三路 review。这些规则存在于公开插件，不等于所有 Claude Code 任务默认必跑。

**兼容实现事实**：此包新增 Pi command、真实 Agent 调度、工具名称映射和批次数量验证。它们不是从 Claude 核心复制来的。

**尚未验证的推断**：先探索与对比方案可能减少错误架构决策；本包尚未进行真实任务 A/B 测试，不能把这个预期写成效果结论。模型本身的代码理解、取舍和置信度校准也无法由提示词包复制。

## 0.3 用户要求的适配，不冒充上游

`extensions/selector.ts`：两个 Pi 包共用 `pi-inspired-selector/v1` 自定义会话 entry，`{version:1, owner:'codex'|'claude'|null, mode:'master'|'manual'|null}`；只读当前 branch，最后条目无效即 fail closed。该 selector 与同名事件仅用于适配器互斥/取消，不是 Anthropic 协议。

`extensions/sources.ts::masterWorkflow`：自然语言开发请求触发与跟进延续是明确分隔的 Pi 指导；原始 workflow 正文仍仅替换 `$ARGUMENTS`。公开插件不是 Claude Code 未公开完整 base prompt。

Pi npm 1.4.0 的 `core/agent-session`：`_applyToolLoadout` 应用 `prepareLoadout`；`_installHiddenDeclarationsProjection` 在请求中隐藏声明，内部工具仍注册；`setActiveToolsByName` 在移除名称时清空 pending tools，因此本包只追加/等名刷新，绝不移除。`ExtensionRunner.emitBeforeAgentStart` 从基础 options 归一化当前运行，追加 owned section，不保存旧宿主 prompt。开关授权是硬机制，工作流路由、审批、阶段连续性仍是模型遵循提示词。

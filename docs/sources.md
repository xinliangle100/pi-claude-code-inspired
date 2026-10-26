# 来源、事实与调用关系

## 唯一行为来源

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
     -> registerCommand('feature-dev')
        -> 检查 --map-sonnet-to-current 和当前模型
        -> 仅追加激活 feature_dev_agents / feature_dev_todos
        -> sources.workflow(args)
           -> sources.source('commands/feature-dev.md')
           -> sources.body() 去 frontmatter，替换 $ARGUMENTS
           -> pi.sendUserMessage(兼容说明 + 原始正文)
     -> registerTool('feature_dev_agents')
        -> delegate.parallel() -> validateBatch()
        -> Promise.all(独立 runDelegate)
           -> 读取原始 agents/<role>.md 正文
           -> new Agent({ streamFn: ctx.modelRegistry.streamSimple, ... })
           -> agent.prompt(明确传入的 scoped task)
           -> delegated tool.execute -> ctx.executeTool -> 宿主检查/hooks
     -> registerTool('feature_dev_todos') -> todos.todoTool()
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

# 验证范围 / 适配清单

验证宿主：Node 24，`@earendil-works/pi-coding-agent` 和 `@earendil-works/pi-agent-core` 1.4.0，TypeScript 5.9.3，typebox 1.3.27。具体依赖树锁定在 package-lock.json。

`npm run check` 包含 TypeScript 与 `tests/*.test.ts`：
- 6 份上游源文件 SHA256 匹配 manifest；四份提示词、两个许可证都包含在内。
- command 正文除 `$ARGUMENTS` 外逐字相同；七阶段、2–3/2–3/3人数、审批文本、≥80保持。
- 真正同时启动各任务；错误数量拒绝。
- read/find/grep/ls 通过宿主 executeTool，传递 signal，宿主拒绝不吞掉。
- 实际 Pi Agent 类的完整 prompt→host stream→结果路径，使用内存假 provider，无真实认证或模型调用。
- 无模型、未信任项目、已取消调用拒绝。
- todo 完整替换的工具结果，没有自创 decision ledger。
- 真实公开 Pi loader 加载 .ts 扩展并验证 registrations、默认不激活、关闭时执行拒绝。
- 当前 branch 的持久 selector、恢复/树导航、无效 selector fail closed、与 Codex 互斥及 OFF 不干扰另一个 owner。
- 重复 on 不重开任务、status 只读、普通命令与旧 flag、跟进/问候路由文本、当前宿主 prompt 保留、opaque override 冲突。
- 实际 Pi Agent 并行运行用假 provider 等待取消，OFF 传播 abort，当前模型/thinking 不变。

没有实际模型执行、provider 网络连接、跨进程恢复、压缩保真、质量收益、完整 UI 手工验收结论。并发调度测试只能证明启动方式，不能证明模型按角色完成任务。审批和80分阈值是提示词，测试文本存在不等于模型遵守。

必要适配均在源码之外：
1. Slash command frontmatter → Pi registerCommand。
2. `$ARGUMENTS` → 用户输入；没有对原始阶段做便利性删改。
3. 原始 sonnet → 用户要求开关/小命令默认使用当前 Pi 模型，不声明等效；旧 flag 仍可用。
4. Agent 调度 → Pi Agent + host stream，fresh context，只接收明确 scoped prompt。
5. TodoWrite → 返回完整 todo list 的工具结果，随宿主 transcript 保存；不是 Claude TodoWrite UI 的完整复刻。
6. Read/Glob/Grep/LS → read/find/grep/ls（参数、搜索行为受 Pi 工具定义约束，不声称完全相同）。未实现的工具明确缺失。
7. 仅宿主 executeTool 可执行代理的文件查询，保留宿主 hook 链；不继承整个父 system prompt，不声称 OS sandbox。
8. 主 agent 提供 review diff 是缺失 shell 能力下的明确接口边界，不是修改上游 reviewer allowlist。

0.3 新增 master 开关、自然语言触发、跟进延续和共享 selector 属于用户要求的 Pi 适配，不是上游来源。0.4 起新会话跟随全局默认（首次安装 OFF），branch 的明确 last-entry 优先于全局。`prepareLoadout` 仅隐藏本包声明；注册/发现能力保留，执行 guard 关闭后拒绝。主 Agent 的行为不会因隐藏声明而忘记历史；关闭不撤销已发生操作。没有宣称对任意第三方扩展加载顺序都能完整保证 prompt 优先级。

工具声明隐藏还通过真实 Pi `AgentSession` 的 `_applyToolLoadout` / `_installHiddenDeclarationsProjection` / `setActiveToolsByName` 做有界集成测试：使用测试注册表 fixture，不启动整个交互会话；确认 on/off/on 声明投影、外部工具不变、尚未注册 MCP 名称未清空。这些私有方法仅用于锁定 npm 1.4.0 行为的测试，生产扩展只用公开 API。

0.4 新增部分同样是本包 Pi UX 适配，不是 Anthropic 官方流程：
- 独立版本化 JSON 全局配置，临时目录测试跨实例读写；没有修改实际用户配置。
- 默认选择带 source 标记，兼容 Codex 0.3 selector v1；显式 on/off 即使状态相同也写入会话覆盖，未知 selector fail closed。
- 会话覆盖/恢复/分支与 inherit，Codex 显式选择不被 default 命令抢占；关闭保留 host 工具。
- aboveEditor widget 的 ON/MANUAL/OFF/BLOCKED 和 cleanup/no-UI 路径；默认主题 warning 为黄色，用户主题可自定义颜色。未声称做过用户真实终端截图验收。
- 真实 Pi TUI CombinedAutocompleteProvider.getSuggestions/applyCompletion 测试一级和二级参数替换，不只测试候选列表。

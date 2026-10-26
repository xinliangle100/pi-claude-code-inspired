# 验证范围 / 适配清单

验证宿主：Node 24，`@earendil-works/pi-coding-agent` 和 `@earendil-works/pi-agent-core` 1.4.0，TypeScript 5.9.3，typebox 1.3.27。具体依赖树锁定在 package-lock.json。

`npm run check` 包含 TypeScript 与 `tests/baseline.test.ts`：
- 6 份上游源文件 SHA256 匹配 manifest；四份提示词、两个许可证都包含在内。
- command 正文除 `$ARGUMENTS` 外逐字相同；七阶段、2–3/2–3/3人数、审批文本、≥80保持。
- 真正同时启动各任务；错误数量拒绝。
- read/find/grep/ls 通过宿主 executeTool，传递 signal，宿主拒绝不吞掉。
- 实际 Pi Agent 类的完整 prompt→host stream→结果路径，使用内存假 provider，无真实认证或模型调用。
- 无模型、未信任项目、已取消调用拒绝。
- todo 完整替换的工具结果，没有自创 decision ledger。
- 真实公开 Pi loader 加载 .ts 扩展并验证 registrations、默认不激活、缺少模型映射时拒绝。

没有实际模型执行、provider 网络连接、跨进程恢复、压缩保真、质量收益、完整 UI 手工验收结论。并发调度测试只能证明启动方式，不能证明模型按角色完成任务。审批和80分阈值是提示词，测试文本存在不等于模型遵守。

必要适配均在源码之外：
1. Slash command frontmatter → Pi registerCommand。
2. `$ARGUMENTS` → 用户输入；没有对原始阶段做便利性删改。
3. 原始 sonnet → 用户显式选择当前 Pi 模型，不声明等效。
4. Agent 调度 → Pi Agent + host stream，fresh context，只接收明确 scoped prompt。
5. TodoWrite → 返回完整 todo list 的工具结果，随宿主 transcript 保存；不是 Claude TodoWrite UI 的完整复刻。
6. Read/Glob/Grep/LS → read/find/grep/ls（参数、搜索行为受 Pi 工具定义约束，不声称完全相同）。未实现的工具明确缺失。
7. 仅宿主 executeTool 可执行代理的文件查询，保留宿主 hook 链；不继承整个父 system prompt，不声称 OS sandbox。
8. 主 agent 提供 review diff 是缺失 shell 能力下的明确接口边界，不是修改上游 reviewer allowlist。

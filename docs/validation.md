# 初版验证记录

日期：2026-10-26。版本：0.1.0。Node.js 24.22.1、Pi 1.4.0、TypeScript 5.9.3、typebox 1.3.27。用户实际安装版本未检查。

## 本包单独执行的检查

- `npm run typecheck`：通过。
- `npm test`：19 项通过，0 失败，包括默认关闭、独立开关、完整状态替换、分支恢复、取消/校验失败不保存、长度限制、常见凭据形状拒绝、提示词保留及手动 JSON 入口。
- 真实 Pi `discoverAndLoadExtensions` 在隔离临时目录加载本包：通过。无用户设置、认证和模型调用。
- 真实 Pi `loadSkillsFromDir`：三个 Claude-inspired Skills，零诊断。三份 Skill 元数据检查也均通过。
- 真实宿主默认工具激活判定：deferred 检查点不会在注册时激活。所有全局活动工具名单 API 在模拟测试里设为抛错，测试通过说明扩展不调用它们。
- `npm pack --dry-run --ignore-scripts`：成功。打包内容不包含 node_modules、SSH 密钥或用户设置。

这里复用了两个 inspired 包之间的原创运行时基础代码和同一测试合同，但对 Claude 包独立运行了测试，未用另一个包的通过结果替代。

## 独立合成任务冒烟

独立 Agent 只获得三个 Claude-inspired Skills、原始导出工具和 CSV 需求；未读取评估标准、另一份实现或先前测试报告。它沿实际 `exportRows → formats registry → formatter` 路径新增 sibling renderer 并注册，服务、plain 与依赖不变。

- 基准测试 2/2 通过。
- Claude-inspired 样本改动后自带测试 7/7 通过。
- Codex-inspired 样本此前自带测试 8/8 通过。两者测试拆分方式不同，不能用条数比较质量。
- 对两个独立生成的样本运行同一套 12 项外部验收：均为 12/12 通过。可用本源码仓库中的 `node tests/accept-fixture.mjs /path/to/fixture/src/export-service.js` 复核。

共同检查覆盖字段转义、LF 组合、空输入、原有 plain 与未知格式行为、输入校验。部分标量/nullish 输入是两个实现共同采用的兼容性推断，不是原需求明确约定；不把这些推断偷偷当作唯一正确设计。

## 这些结果不能说明什么

这只是独立 Agent 在一个简单合成任务上的冒烟，不是用户的真实 Pi/provider 会话测试，不是足够样本量的 A/B，也不能证明谁更好或谁更接近完整 Codex/Claude Code 产品。运行时测试中的压缩历史是模拟形状，不等于模型驱动的真实压缩质量评测。未验证真实项目收益、旧版 Pi、自动测试门禁、无损记忆或权限沙箱。

未自动安装到用户 Pi，未 npm 发布，未据此假定 GitHub 远程创建或推送成功。

下一步按 `evaluation.md` 分别在原始 Pi、Codex-inspired、Claude-inspired 中使用相同任务基线、模型/思考等级、工具与验收标准，多次重复；比较首轮方案被推翻、首次验收、返工、时间与人工负担，而不是看回答长度或测试条数。

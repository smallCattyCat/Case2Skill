# Case2Skill

**把解决过的问题，变成可以检查、试用和持续修订的 Agent Skill。**

[English](README.md) · [命令说明](docs/CLI.md) · [验证依据](docs/EVIDENCE.md) · [参与贡献](CONTRIBUTING.md)

一次问题解决，不应只留下一份总结。Case2Skill 把做法、适用条件、证据出处和后续纠正保存在一起：

```text
解决经历 → 有出处的技能 → 新任务使用 → 反馈 → 修订版本 → 重新检验
```

## 不用模型账号，先看它怎样工作

下载或克隆仓库，在目录中运行。需要 Node.js 24.13 或更新版本：

```sh
npm run demo
```

打开终端打印的 `index.html`。这是**已记录的真实模型修订过程的离线回放**：程序重新执行保存的动作，检查它们与本地模拟器是否一致，并展示技能前后变化。无需 API Key，无需安装依赖，也不会发起新的模型调用。

演示中的模型曾在当前接口明确说明“查询不可用”时仍执行了一次查询。新版本据此改了一步。新旧版复验都保持了正确行为；该例展示可追踪的修订流程，不宣称普遍性能提升。

`npm run controls` 是另一种演示：实际执行固定策略正负控制，不使用模型。`npm test` 运行软件测试。

## 使用你自己的案例

```sh
node src/cli.ts init --out work/my-case
```

编辑生成的 Markdown，描述目标、尝试、纠正、结果与相关接口约定。真实执行日志可声明为 `runtime_log`；不要为了填字段编造日志。然后使用已经登录的兼容 Codex CLI：

```sh
node src/cli.ts doctor
node src/cli.ts learn work/my-case --out work/learn --model-data-approved
node src/cli.ts inspect work/learn/candidate
node src/cli.ts export work/learn/candidate --candidate --out work/exported-skill
```

`--model-data-approved` 表示允许把主动选择的材料发给本机 Codex 所用的模型。真实运行会消耗账号或模型额度。需要指定型号时增加 `--model MODEL_ID`，使用账号实际支持的 ID。

导出目录包含 `SKILL.md`、`lesson.json`、来源片段与内容指纹。导出不等于批准或全局安装；先审读，再放入需要使用它的智能体工作区。

## 新证据出现后修订

复制案例包，保留同一 case ID 和旧引用所需的文件，加入新证据：

```sh
node src/cli.ts refine work/updated-case work/learn/candidate --out work/refined --model-data-approved
node src/cli.ts diff work/learn/candidate work/refined/candidate
```

新版本有独立指纹和父子差异，不继承旧版验证或作者接纳状态。内置第二例展示了一个项目特有边界：**重试保护过期，不必然意味着历史结果不可查询。**资料见 [lookup-retention](examples/lookup-retention/README.md)。

## 当前范围

`learn / compile / inspect / refine / export` 可处理你选择的本地文本案例。任务评价器目前只执行内置报告服务模拟；自动反馈诊断只覆盖已测试的“不可用查询”规则。其他材料使用 `refine`，不要把它理解为任意事故自动学习平台。

程序能检查引用位置和文件一致性，不能凭哈希证明经验语义正确。`observed`、`documented`、`inferred` 分别保留；未知条件可以为空。当前小规模开发试验尚未证明相对于普通 Skill 或强模型的普遍成功率增益。[完整证据说明](docs/EVIDENCE.md)保留了结果与适用范围。

## 开发和发布

```sh
npm ci --ignore-scripts
npm run validate
npm run release:check
```

运行依赖为零；TypeScript 与 Node 类型仅用于开发。仓库带 Windows/Linux/macOS 持续集成，但云端结果要在上传后才能产生；CI 不调用模型。

采用 [MIT](LICENSE) 许可。导入材料保留原权利；公开案例需有再分发权限。请勿上传私人对话、学生记录、合作项目源码或凭据。参阅 [安全说明](SECURITY.md) 和 [贡献指南](CONTRIBUTING.md)。

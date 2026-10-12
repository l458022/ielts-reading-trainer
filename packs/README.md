# packs/ — 公共题库包目录

这里存放社区贡献的题库包（`reading-pack-YYYY-MM-DD.json`）。

## 使用方式

在应用内：右上角「＋ 导入真题」→「导入题库包」→ 选择 JSON 文件即可把整套试卷加入本地题库（离线可用，数据只存在本机浏览器）。

## 贡献方式

见仓库根目录的 [CONTRIBUTING.md](../CONTRIBUTING.md)。要点：

1. 只能贡献**你拥有相应权利**的文章（原创 / 公有领域 / 已获授权）
2. 题目须为自己出题或由本工具自动生成
3. 用途选「贡献到公共题库」并勾选三项声明，填写贡献者与授权方式
4. 通过 Pull Request 提交到本目录

## 命名与校验

- 文件名：`reading-pack-YYYY-MM-DD.json`
- 文件头：`"format": "ielts-reading-pack"`、`"version": 1`
- 维护者合并前会抽查：`keySentence` 是否逐字来自原文、`contribution` 声明是否齐全

> 每个包的授权以包内各篇文章的 `contribution.license` 为准；软件本体见根目录 [LICENSE](../LICENSE)（MIT，仅覆盖代码）。

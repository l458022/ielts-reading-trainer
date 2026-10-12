# 贡献指南

> **中文** | [English](CONTRIBUTING_EN.md)
>
> 📦 想贡献文章/题目？直接看[第二节](#二贡献文章与题目丰富公共题库)。
> 🐛 只想报 Bug 或提建议？用 [Issue 表单](https://github.com/l458022/ielts-reading-trainer/issues/new/choose)即可，不用读全文。

感谢你为「雅思阅读练习室 / IELTS Reading Trainer」贡献内容！本项目有两类贡献：

## 一、贡献代码

1. Fork 本仓库，新建分支 `feat/xxx` 或 `fix/xxx`
2. 提交前确保测试全部通过：
   ```bash
   node test/engine_test.js        # 分析引擎（判分/定位/分析流程）28 项
   node test/generator_test.js     # 自动出题引擎（答案可判定性）47 项
   node test/dict_test.js          # 离线词典与样题覆盖率 18 项
   ```
   浏览器端 E2E（需本机 Chrome，把 `chrome` 换成本机 Chrome 可执行文件路径）：
   ```bash
   chrome --headless --disable-gpu --no-sandbox \
     --virtual-time-budget=5000 --dump-dom "file:///<仓库绝对路径>/test/e2e-auto.html" | grep -o 'E2E \[[^<]*'
   ```
3. 提交信息用中文或英文描述清楚「改了什么、为什么」
4. 提 Pull Request，说明测试结果

## 二、贡献文章与题目（丰富公共题库）

任何人都可以把**自己有权分享的英文文章**变成练习题提交进来，方式：

1. 打开应用 → 右上角「导入文章」
2. 粘贴文章（空行分段），题目来源三选一：
   - **自动生成**：规则引擎离线出题（判断题/填空/标题匹配），即刻可练
   - **手动录入**：逐题录入题干与答案
   - **混合**：自动打底 + 手动补充
3. 用途选择「**贡献到公共题库**」，并**全部勾选三项确认**：
   - 你对文章拥有相应权利（原创 / 公有领域 / 已获授权，**不得从商业站点或出版物扒全文**）
   - 题目是自己出的，或由本工具自动生成（**不得从雅思哥/小站等商业备考站复制题目**）
   - 文章不含个人隐私、保密资料或不当内容
4. 填写贡献者昵称与授权方式（CC BY 4.0 / CC0 / 已获授权转载）
5. 点「导出题库包」得到 `reading-pack-YYYY-MM-DD.json`
6. 通过 PR 提交到仓库 `packs/` 目录，或**直接把 JSON 发给维护者**（微信/邮件/Issue 均可）

维护者核对声明后合并进公共题库。**合并后 CI 会自动重建 `packs/manifest.json` 索引**，
所有人在应用内点「🌐 社区题库」就能看到并一键导入你的包——无需任何服务器部署。

> **不想碰 Git？** 完全没问题。把导出的 `reading-pack-*.json` 发给维护者即可，
> 维护者会用应用内的「⬆ 上架新题库包」直接上架（见 [ADMIN.md](ADMIN.md)）。
> 想先看看效果？打开应用首页 → 「🌐 社区题库」，里面已收录本项目的两套样题包。

### 用开放授权文章扩充题库（推荐，零版权风险）

除了自己的原创文章，也可以从**允许再分享**的公开信源取文章。仓库自带两个脚本：

```bash
# 1) 抽正文（支持 Our World in Data = CC BY 4.0；Europe PMC 的 CC BY 论文）
node scripts/fetch-source.js owid https://ourworldindata.org/biodiversity --words 950 --out article.json
node scripts/fetch-source.js pmc  PMC13576388                              --words 950 --out article.json

# 2) 出题并自校验（不通过就不会产出包）
node scripts/make-pack.js --source article.json --slug biodiversity \
  --title-cn "生物多样性的危机" --tags "自然,环境" --difficulty 难 \
  --out packs/reading-pack-$(date +%F)-biodiversity.json

# 3) 重建索引
node scripts/build-manifest.js
```

可用的信源与授权（脚本会校验授权，不合格直接拒绝）：

| 信源 | 授权 | 说明 |
|------|------|------|
| [Our World in Data](https://ourworldindata.org/) | CC BY 4.0 | 社会 / 环境 / 健康 / 经济，话题贴合雅思学术类 |
| [Europe PMC](https://europepmc.org/) 的开放获取论文 | CC BY 4.0 | 只接受标明 CC BY 的，脚本会核对 license 字段 |
| 美国政府机构出版物（NASA / NOAA / NIH 等） | 公有领域 | 需人工确认页面无第三方版权声明 |

已收录文章的出处与署名见 [packs/SOURCES.md](packs/SOURCES.md)。

> ⚠️ **不接受**：商业出版物全文（含剑桥雅思真题）、商业备考站题目、考生回忆残缺真题、
> 以及 CC BY-NC / CC BY-ND 等限制性授权的内容。

## 不欢迎的内容

- 从商业出版物/备考站点搬运的文章与题目（版权风险）
- 考生回忆版残缺真题（题目不全、答案不可靠）
- 含隐私、保密或不当内容的材料

## 题库包格式（`format: "ielts-reading-pack"`, version 1）

```json
{
  "format": "ielts-reading-pack",
  "version": 1,
  "generator": "IELTS Reading Trainer",
  "createdAt": "2026-10-12T00:00:00.000Z",
  "exams": [
    {
      "id": "unique-id",
      "title": "My Article-Test 1-Passage 1",
      "titleCn": "中文副标题",
      "book": "我的文章", "test": 1, "passage": 1,
      "difficulty": "易|中|难",
      "series": "文章导入 · 自动出题",
      "source": "贡献者 xxx · CC BY 4.0",
      "level": "自定义", "minutes": 20,
      "tags": ["环境"],
      "intro": "简介",
      "contribution": {
        "contributor": "xxx",
        "license": "CC BY 4.0",
        "declaredAt": "2026-10-12T00:00:00.000Z",
        "declaration": "copyright-ok;questions-original-or-tool-generated;no-privacy"
      },
      "sections": [
        {
          "id": "s1",
          "title": "READING PASSAGE 1",
          "paragraphs": [{ "id": "A", "text": "..." }],
          "questionGroups": [
            {
              "id": "g1", "type": "tfng|mcq|gapfill|matching|headings|multi",
              "instruction": "题型说明",
              "options": ["TRUE", "FALSE", "NOT GIVEN"],
              "pool": ["A", "B"], "poolLabels": ["A  Dr X"],
              "headings": ["i  Heading one"],
              "questions": [
                {
                  "no": 1, "stem": "题干", "answer": "TRUE",
                  "answers": ["备选答案1"], "options": ["A;B;C;D"],
                  "keyPara": "B", "keySentence": "原文定位句（必须逐字来自文章）",
                  "keySentenceCn": "关键句翻译", "explain": "解析",
                  "trap": "陷阱说明", "words": ["重点词"]
                }
              ]
            }
          ]
        }
      ],
      "vocabulary": [{ "word": "humble", "pos": "adj.", "meaning": "不起眼的", "sentence": "..." }]
    }
  ]
}
```

> `keySentence` 必须是文章中**逐字存在**的句子（报告页据此高亮定位）。自动出题引擎生成的题目天然满足；手动录入时系统也会尝试自动定位。

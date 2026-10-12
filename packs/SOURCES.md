# 题库来源与授权（packs/ 目录）

> 本目录下每篇文章都来自**允许再分享**的公开信源（CC BY 4.0 或公有领域），
> 不使用任何商业出版物或备考站的内容。署名与授权随包保存，可在应用内查看。
> 重新生成/核对：`node scripts/build-manifest.js`

| 文章 | 题量 | 难度 | 原始出处 | 授权与署名 |
|---|---|---|---|---|
| 人工智能的兴起 | 12 | 难 | [ourworldindata.org](https://ourworldindata.org/artificial-intelligence) | CC BY 4.0<br><sub>Edouard Mathieu、Charlie Giattino、Veronika Samborska、Max Roser — Artificial Intelligence，Our World in Data，CC BY 4.0</sub> |
| 生物多样性的危机 | 15 | 难 | [ourworldindata.org](https://ourworldindata.org/biodiversity) | CC BY 4.0<br><sub>Hannah Ritchie、Fiona Spooner、Max Roser — Biodiversity，Our World in Data，CC BY 4.0</sub> |
| 二氧化碳与温室气体排放 | 15 | 难 | [ourworldindata.org](https://ourworldindata.org/co2-and-greenhouse-gas-emissions) | CC BY 4.0<br><sub>Hannah Ritchie、Pablo Rosado、Max Roser — CO₂ and Greenhouse Gas Emissions，Our World in Data，CC BY 4.0</sub> |
| 食物生产的环境代价 | 15 | 中 | [ourworldindata.org](https://ourworldindata.org/environmental-impacts-of-food) | CC BY 4.0<br><sub>Hannah Ritchie、Pablo Rosado、Max Roser — Environmental Impacts of Food Production，Our World in Data，CC BY 4.0</sub> |
| 全球教育的普及 | 15 | 中 | [ourworldindata.org](https://ourworldindata.org/global-education) | CC BY 4.0<br><sub>Hannah Ritchie、Veronika Samborska、Esteban Ortiz-Ospina、Max Roser — Global Education，Our World in Data，CC BY 4.0</sub> |
| 人类预期寿命的变迁 | 15 | 中 | [ourworldindata.org](https://ourworldindata.org/life-expectancy) | CC BY 4.0<br><sub>Saloni Dattani、Lucas Rodés-Guirao、Hannah Ritchie、Esteban Ortiz-Ospina、Max Roser — Life Expectancy，Our World in Data，CC BY 4.0</sub> |
| 城市绿地与心理健康 | 13 | 难 | [europepmc.org](https://europepmc.org/article/PMC/PMC13576388) | CC BY 4.0<br><sub>Lilli A, Liana A, Tsekeri E, Daras T, Kolokotsa D. — Europe PMC，CC BY 4.0</sub> |
| 授粉的经济价值 | 13 | 中 | 本项目原创 | CC BY 4.0 |
| 可再生能源的转型 | 15 | 中 | [ourworldindata.org](https://ourworldindata.org/renewable-energy) | CC BY 4.0<br><sub>Hannah Ritchie、Max Roser、Pablo Rosado — Renewable Energy，Our World in Data，CC BY 4.0</sub> |
| 睡眠的科学 | 10 | 中 | 本项目原创 | CC BY 4.0 |
| 城市化与城市生活 | 15 | 中 | [ourworldindata.org](https://ourworldindata.org/urbanization) | CC BY 4.0<br><sub>Esteban Ortiz-Ospina、Veronika Samborska、Hannah Ritchie、Max Roser — Urbanization，Our World in Data，CC BY 4.0</sub> |

## 如何新增

```bash
# 1) 从允许再分享的信源抽正文（OWID = CC BY 4.0；PMC = CC BY 论文）
node scripts/fetch-source.js owid <文章URL> --words 950 --out article.json
node scripts/fetch-source.js pmc  <PMCID>    --words 950 --out article.json

# 2) 出题并自校验（不通过不会产出包）
node scripts/make-pack.js --source article.json --slug my-article \
  --title-cn "中文标题" --tags "环境,科技" --difficulty 中 --out packs/reading-pack-YYYY-MM-DD-my-article.json

# 3) 重建索引
node scripts/build-manifest.js
```

> 投稿自己的原创文章时无需脚本：应用内「导入文章 → 用途选贡献 → 导出处题库包」即可（见 [CONTRIBUTING.md](../CONTRIBUTING.md)）。

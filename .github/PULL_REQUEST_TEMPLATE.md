## 改了什么 · What & Why

<!-- 一句话说明这次改了什么、为什么改。大改动请附上背景。 -->

## 改动类型 · Type of change

- [ ] 🐛 Bug 修复
- [ ] ✨ 新功能
- [ ] 📝 文档 / 翻译（中英均已同步）
- [ ] 📦 题库包内容
- [ ] 🔧 工程化 / CI / 依赖

## 测试结果 · Test results（必填 / required）

本地运行后把结果贴过来（CI 也会自动跑一遍，但请先自测）：

- [ ] `node test/engine_test.js` → `___ 通过 / ___ 失败`
- [ ] `node test/generator_test.js` → `___ 通过 / ___ 失败`
- [ ] `node test/dict_test.js` → `___ 通过 / ___ 失败`
- [ ] E2E：`chrome --headless --disable-gpu --no-sandbox --virtual-time-budget=8000 --dump-dom "file://<仓库>/test/e2e-auto.html"` → `___ OK / ___ FAIL`

## 自查 · Self-check

- [ ] 未夹带任何密钥、Token、手机号、个人路径等敏感信息
- [ ] 若涉及题库包：已勾选三项贡献声明（版权 / 原创 / 隐私）
- [ ] 若改变数据结构：`CONTRIBUTING.md` / `CONTRIBUTING_EN.md` 中的题库包格式说明已同步更新
- [ ] 新增/修改的单词已加入 `dict-core.js`，且未造成派生词误还原（如 meeting→meet）

## 关联 Issue · Related issues

<!-- 例如：Fixes #12 / Closes #34 -->

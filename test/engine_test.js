/* 引擎单元测试：判分 / 句子切分 / 定位匹配 / 分析流程 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { window: {}, console };
vm.createContext(sandbox);
["data-exam1.js", "data-exam2.js", "engine.js"].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", f), "utf8"), sandbox);
});
const E = sandbox.window.RLEngine;
const EXAMS = sandbox.window.EXAMS;

let pass = 0, fail = 0;
function T(name, cond) {
  if (cond) { pass++; console.log("  [OK] " + name); }
  else { fail++; console.log("  [FAIL] " + name); }
}

console.log("== 1. 数据完整性：每题 keySentence 必须真实出现在原文中 ==");
EXAMS.forEach(exam => {
  const sec = exam.sections[0];
  const paras = {};
  sec.paragraphs.forEach(p => { paras[p.id] = p.text; });
  let total = 0, found = 0;
  sec.questionGroups.forEach(g => g.questions.forEach(q => {
    total++;
    if (q.keySentence && paras[q.keyPara] && paras[q.keyPara].indexOf(q.keySentence) !== -1) found++;
  }));
  T(exam.title + "：定位句全部命中原文 (" + found + "/" + total + ")", found === total);
});

console.log("== 2. 判分逻辑 ==");
T("TFNG 正确", E.isCorrect({ type: "tfng", answer: "TRUE" }, "true").correct === true);
T("TFNG 错误", E.isCorrect({ type: "tfng", answer: "TRUE" }, "FALSE").correct === false);
T("填空大小写/空格容错", E.isCorrect({ type: "gapfill", answers: ["Seed Coatings"] }, " seed coatings ").correct === true);
T("填空备选答案", E.isCorrect({ type: "gapfill", answers: ["coatings", "seed coatings"] }, "Seed Coatings").correct === true);
T("填空错误", E.isCorrect({ type: "gapfill", answers: ["smell"] }, "odour").correct === false);
T("空作答标记 blank", E.isCorrect({ type: "mcq", answer: "B" }, "").blank === true);
T("选项大小写归一", E.isCorrect({ type: "mcq", answer: "B" }, "b").correct === true);

console.log("== 3. 句子切分 ==");
const sentsA = E.splitSentences(EXAMS[0].sections[0].paragraphs[0].text);
T("A 段切出 4 句", sentsA.length === 4);
T("第二句含 humble bee", sentsA[1].indexOf("humble bee") !== -1);

console.log("== 4. 陷阱检测 ==");
T("绝对化词 only", E.detectTrap("Vertical gardens are only found in offices.").length > 0);
T("比较级 than", E.detectTrap("Mason bees are less effective than honeybees.").some(t => t.indexOf("比较") !== -1));

console.log("== 5. 同义替换识别 ==");
const ph = E.paraphraseHints("The report showed an increase in numbers", "Figures revealed a rise in the population");
T("替换线索非空(increase↔rise)", ph.some(x => x[0] === "increase" && x[1] === "rise"));

console.log("== 6. 导入自动定位（模糊匹配） ==");
const fakeParas = [
  { id: "A", text: "The city introduced new buses last year." },
  { id: "B", text: "Researchers found that honeybee colonies struggle when pesticides are applied to seeds as coatings." }
];
const sug = E.suggestSentence("Pesticides are applied to seeds as what?", fakeParas);
T("定位到 B 段", sug && sug.para === "B");
T("定位句含 coatings", sug && sug.sentence.indexOf("coatings") !== -1);

console.log("== 7. 完整分析流程 ==");
const exam1 = EXAMS[0];
const answers = {};
exam1.sections[0].questionGroups.forEach(g => g.questions.forEach((q, idx) => {
  answers[q.no] = idx === 1 ? "zzz-wrong" : (q.answer || (q.answers && q.answers[0]));
}));
const rep = E.analyzeExam(exam1, answers, 300);
T("总题数=13", rep.total === 13);
T("对=10 错=3", rep.correct === 10 && rep.wrong === 3);
T("错题号=[2,8,12]", JSON.stringify(rep.wrongNos) === JSON.stringify([2, 8, 12]));
T("正确率 77%", rep.accuracy === 77);
T("题型统计含判断/标题/填空", ["判断题", "标题匹配", "填空题"].every(t => rep.perType[t]));

console.log("== 8. 报告字段 ==");
const q11 = rep.results.find(r => r.no === 12);
T("错题带定位句", q11.keySentence.indexOf("profitable flowers") !== -1);
T("错题带翻译", q11.keySentenceCn.length > 5);
T("错题带解析", q11.explain.length > 5);

console.log("== 9. 结构 ==");
T("样题1：13题", E.collectQuestions(EXAMS[0]).length === 13);
T("样题2：10题", E.collectQuestions(EXAMS[1]).length === 10);
T("样题2 覆盖匹配/单选/填空", ["匹配题", "选择题", "填空题"].every(t => E.analyzeExam(EXAMS[1], {}, 0).perType[t]));
T("词汇表非空", EXAMS[0].vocabulary.length >= 10 && EXAMS[1].vocabulary.length >= 6);

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);

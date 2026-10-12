/* 自动出题引擎正确性测试：
 * 1) 对两份样题文章整卷生成 → verifyExam 必须全过
 * 2) TFNG 各答案的题干必须带可判定特征
 * 3) NG 题的替换词必须全文未出现
 * 4) 填空题答案必须是原文原词、题干有挖空
 * 5) 标题题答案罗马数字必须在池中
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const sandbox = { window: {}, console };
vm.createContext(sandbox);
["data-exam1.js", "data-exam2.js", "engine.js", "generator.js"].forEach(f => {
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", f), "utf8"), sandbox);
});
const G = sandbox.window.RLGenerator;
const E = sandbox.window.RLEngine;
const EXAMS = sandbox.window.EXAMS;

let pass = 0, fail = 0;
function T(name, cond, extra) {
  if (cond) { pass++; console.log("  [OK] " + name); }
  else { fail++; console.log("  [FAIL] " + name + (extra ? " | " + extra : "")); }
}

// 用两篇样题原文 + 一段新文章做生成
const articles = EXAMS.map(ex => ({
  name: ex.titleCn,
  paras: ex.sections[0].paragraphs.map(p => ({ id: p.id, text: p.text }))
}));
articles.push({
  name: "自建短文",
  paras: [
    { id: "A", text: "The city council announced a new plan to reduce traffic in the centre. Experts say the scheme will cost around 40 million euros and will take three years to complete. The mayor believes the plan is essential because the current system is outdated and pollution has increased by 12 percent since 2019." },
    { id: "B", text: "Car owners are unhappy with the proposal. Many feel the new rules are unfair, and some have suggested that the council should build more parks instead. A similar scheme in another city was abandoned after protests, but officials here say consultation will continue." },
    { id: "C", text: "Supporters argue that cleaner air is more important than convenience. They point to studies showing that children in the city suffer more from asthma than children in the countryside. The debate is likely to continue for months." }
  ]
});

articles.forEach(art => {
  console.log("== 生成测试：" + art.name + "（" + art.paras.length + " 段）==");
  const exam = G.generateExam(art.paras, { types: ["tfng", "gapfill", "headings"], tfngCount: 6, gapfillCount: 3 });
  T("整卷生成成功", !!exam);
  const v = G.verifyExam(exam, art.paras);
  T("自检通过（定位句命中/答案合法/FALSE有反向标记/填空答案在原文）", v.ok, v.issues.join("；"));

  const groups = exam.sections[0].questionGroups;
  const tfng = groups.filter(g => g.type === "tfng")[0];
  const gap = groups.filter(g => g.type === "gapfill")[0];
  const hd = groups.filter(g => g.type === "headings")[0];

  // TFNG 结构
  T("TFNG 题数为 6", tfng && tfng.questions.length === 6);
  const byAns = {};
  tfng.questions.forEach(q => { byAns[q.answer] = (byAns[q.answer] || 0) + 1; });
  T("三种答案都有分布", ["TRUE", "FALSE", "NOT GIVEN"].every(a => byAns[a] >= 1), JSON.stringify(byAns));
  tfng.questions.forEach(q => {
    const lowFull = art.paras.map(p => p.text).join(" ").toLowerCase();
    if (q.answer === "NOT GIVEN") {
      // 替换词必须不在全文
      const m = q.trap && q.trap.match(/实体偷换（.+? → (.+?)）/);
      const swapped = m ? m[1] : null;
      T("NG 题 Q" + q.no + " 替换词「" + swapped + "」全文未出现", swapped && lowFull.indexOf(swapped.toLowerCase()) === -1);
    }
    if (q.answer === "FALSE") {
      T("FALSE 题 Q" + q.no + " 含反向标记", / not | cannot | may not | less | worse | slower | smaller | lower | weaker /i.test(" " + q.stem + " "));
    }
  });

  // 填空
  T("填空题 3 题且都有挖空", gap && gap.questions.length === 3 && gap.questions.every(q => q.stem.indexOf("____") !== -1));
  T("填空答案均为原文词", gap.questions.every(q => {
    const a = q.answers[0].toLowerCase();
    return art.paras.some(p => p.text.toLowerCase().indexOf(a) !== -1);
  }));

  // 标题
  T("标题题覆盖全部段落", hd && hd.questions.length === art.paras.length);
  T("标题答案均为池内罗马数字", hd && hd.questions.every(q => hd.pool.indexOf(q.answer) !== -1));
  T("标题池含干扰项", hd && hd.headings.length > hd.questions.length);
});

// 单元改写测试
console.log("== 句子改写单元测试 ==");
T("toFalseStem 比较级反向", (function(){
  const r = G.toFalseStem("Honeybees are more efficient than other bees.");
  return r && /less/.test(r.stem) && /比较级反向/.test(r.trap);
})());
T("toFalseStem 系动词否定", (function(){
  const r = G.toFalseStem("The river is polluted.");
  return r && /is not/.test(r.stem);
})());
T("toFalseStem 安全拒绝（无可反向结构）", (function(){
  const r = G.toFalseStem("They built the bridge in 1889.");
  return r === null;
})());
T("toNgStem 实体替换", (function(){
  const full = "The city is old.";
  const r = G.toNgStem("The city is old.", full);
  return r && /village|town/.test(r.stem) && full.toLowerCase().indexOf("village") === -1;
})());
T("toNgStem 无可用实体时返回 null", (function(){
  const r = G.toNgStem("They ran quickly across the field.", "They ran quickly across the field.");
  return r === null;
})());
T("toTrueStem 同义替换生效", (function(){
  const r = G.toTrueStem("The increase in numbers is important.");
  return /rise|grow/.test(r.stem) && r.changed.length > 0;
})());

// 与主引擎一致性：生成的卷可以被主引擎分析
console.log("== 与主引擎集成 ==");
const exam = G.generateExam(articles[0].paras, { types: ["tfng", "gapfill", "headings"] });
const collect = E.collectQuestions(exam);
T("主引擎可收集生成卷题目", collect.length >= 9);
const answers = {};
collect.forEach(it => { answers[it.q.no] = it.q.answer || (it.q.answers && it.q.answers[0]); });
const rep = E.analyzeExam(exam, answers, 120);
T("全对时正确率 100%", rep.correct === rep.total, rep.correct + "/" + rep.total);
const one = rep.results[0];
T("生成题报告带定位/解析/陷阱字段", !!one.keySentence && !!one.explain);

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);

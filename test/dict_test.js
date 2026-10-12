/* 词典测试：解析/词形还原/样题覆盖率 */
const fs = require("fs"), path = require("path"), vm = require("vm");
const sb = { window: {}, console };
vm.createContext(sb);
["data-exam1.js", "data-exam2.js", "engine.js", "generator.js", "dict-core.js"].forEach(f =>
  vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "assets", f), "utf8"), sb));
const D = sb.window.RLDictCore, EX = sb.window.EXAMS;
let pass = 0, fail = 0;
function T(n, c, e) { if (c) { pass++; console.log("  [OK] " + n); } else { fail++; console.log("  [FAIL] " + n + (e ? " | " + e : "")); } }

console.log("== 词典查询 ==");
T("increased→increase", D.lookup("increased") && D.lookup("increased").word === "increase");
T("colonies→colony", D.lookup("colonies") && D.lookup("colonies").word === "colony");
T("pollinating→pollinate", D.lookup("pollinating") && D.lookup("pollinating").word === "pollinate");
T("navigating→navigate", D.lookup("navigating") && D.lookup("navigating").word === "navigate");
T("unknown→null", D.lookup("qqzzxx") === null);
T("空输入安全", D.lookup("") === null && D.lookup(null) === null);
T("economy 命中", !!D.lookup("economy"));
T("meeting→meeting（派生名词优先，不得还原成 meet）", D.lookup("meeting") && D.lookup("meeting").word === "meeting");
T("speaker→speaker", D.lookup("speaker") && D.lookup("speaker").word === "speaker");
T("reader→reader", D.lookup("reader") && D.lookup("reader").word === "reader");
T("understanding→understanding", D.lookup("understanding") && D.lookup("understanding").word === "understanding");
T("says→say", D.lookup("says") && D.lookup("says").word === "say");
T("speaking→speak", D.lookup("speaking") && D.lookup("speaking").word === "speak");
T("likely 不被误还原", D.lookup("likely") && D.lookup("likely").word === "likely");

console.log("== 样题文章实词覆盖率 ==");
function coverage(paras) {
  const text = paras.map(p => p.text).join(" ").toLowerCase();
  const ws = text.replace(/[^a-z\s-]/g, " ").split(/\s+/).filter(w => w.length >= 4);
  const uniq = [...new Set(ws)];
  const hit = uniq.filter(w => D.lookup(w));
  return { total: uniq.length, hit: hit.length, pct: Math.round(hit.length / uniq.length * 100) };
}
EX.forEach(ex => {
  const c = coverage(ex.sections[0].paragraphs);
  T(ex.titleCn + " 核心词典覆盖率 ≥ 45%（" + c.hit + "/" + c.total + " = " + c.pct + "%）", c.pct >= 45);
});
// 加上本卷 vocabulary 后的合并覆盖率（模拟真实使用：卷词表优先）
EX.forEach(ex => {
  const vocabWords = (ex.vocabulary || []).map(v => v.word.toLowerCase());
  const paras = ex.sections[0].paragraphs.map(p => p.text).join(" ").toLowerCase();
  const ws = [...new Set(paras.replace(/[^a-z\s-]/g, " ").split(/\s+/).filter(w => w.length >= 4))];
  const hit = ws.filter(w => D.lookup(w) || vocabWords.some(v => w === v || w.indexOf(v) === 0));
  const pct = Math.round(hit.length / ws.length * 100);
  T(ex.titleCn + " 合并词表覆盖率 ≥ 50%（" + pct + "%）", pct >= 50);
});

console.log("\n结果：" + pass + " 通过 / " + fail + " 失败");
process.exit(fail ? 1 : 0);

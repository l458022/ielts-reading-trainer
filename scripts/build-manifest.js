/* ============================================================
 * 题库索引生成器：扫描 packs/*.json → 生成 packs/manifest.json
 * 用法：node scripts/build-manifest.js   （CI 与本地均可运行）
 * 设计：不依赖任何第三方包；产出稳定（同输入必同输出），便于 CI 判断有无变化
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

const PACKS_DIR = path.join(__dirname, "..", "packs");
const MANIFEST = path.join(PACKS_DIR, "manifest.json");
const REPO = "l458022/ielts-reading-trainer";
const BRANCH = "main";

/** 统计一套试卷的题目数 */
function countQuestions(exam) {
  let n = 0;
  (exam.sections || []).forEach((s) => {
    (s.questionGroups || []).forEach((g) => {
      n += (g.questions || []).length;
    });
  });
  return n;
}

/** 从题库包里提取索引条目（一个包可含多套试卷） */
function describePack(file, raw) {
  let pack;
  try {
    pack = JSON.parse(raw);
  } catch (e) {
    console.warn("[skip] %s 不是合法 JSON：%s", file, e.message);
    return null;
  }
  if (!pack || pack.format !== "ielts-reading-pack" || !Array.isArray(pack.exams) || !pack.exams.length) {
    console.warn("[skip] %s 不是有效的题库包（缺 format/exams）", file);
    return null;
  }
  const exams = pack.exams.filter((e) => e && e.id && e.sections);
  if (!exams.length) return null;

  const questions = exams.reduce((sum, e) => sum + countQuestions(e), 0);
  const tags = [...new Set(exams.flatMap((e) => (e.tags || []).map((t) => String(t))))].slice(0, 6);
  const contributors = [...new Set(exams.map((e) => (e.contribution || {}).contributor).filter(Boolean))];
  const licenses = [...new Set(exams.map((e) => (e.contribution || {}).license).filter(Boolean))];
  const attributions = [...new Set(exams.map((e) => (e.contribution || {}).attribution).filter(Boolean))];
  const sources = [...new Set(exams.map((e) => (e.contribution || {}).sourceUrl).filter(Boolean))];
  const difficulties = [...new Set(exams.map((e) => e.difficulty).filter(Boolean))];
  const minutes = Math.max(...exams.map((e) => Number(e.minutes) || 20));

  return {
    id: path.basename(file, ".json"),
    file: file,
    title: (exams[0].title || "").replace(/-Test \d+-Passage \d+$/, "") || exams[0].title,
    titleCn: exams[0].titleCn || "",
    exams: exams.length,
    questions: questions,
    difficulty: difficulties.length === 1 ? difficulties[0] : difficulties.join("/"),
    minutes: minutes,
    tags: tags,
    contributor: contributors.length ? contributors.join("、") : "anonymous",
    license: licenses.length ? licenses.join(" / ") : "未标注",
    // CC BY 要求署名随作品呈现，所以索引里也带上出处与署名信息
    attribution: attributions.join("；"),
    sourceUrl: sources.length === 1 ? sources[0] : "",
    bytes: Buffer.byteLength(raw, "utf8"),
    updatedAt: pack.createdAt || new Date(0).toISOString()
  };
}

function main() {
  if (!fs.existsSync(PACKS_DIR)) {
    console.error("找不到 packs/ 目录");
    process.exit(1);
  }
  const files = fs.readdirSync(PACKS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "manifest.json")
    .sort();

  const packs = [];
  for (const f of files) {
    const item = describePack(f, fs.readFileSync(path.join(PACKS_DIR, f), "utf8"));
    if (item) {
      packs.push(item);
      console.log("[ok] %s → %d 套 / %d 题", f, item.exams, item.questions);
    }
  }

  // 刻意不写「生成时间」：让输出对同一份 packs/ 完全确定，
  // CI 才能用 git diff 判断是否真有变化（否则每次都会多出一个无意义提交）
  const manifest = {
    format: "ielts-reading-manifest",
    version: 1,
    repo: REPO,
    branch: BRANCH,
    packs: packs
  };
  const text = JSON.stringify(manifest, null, 2) + "\n";
  fs.writeFileSync(MANIFEST, text);
  console.log("manifest 已生成：%d 个题库包，%d 字节", packs.length, text.length);
}

main();

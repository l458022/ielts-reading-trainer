#!/usr/bin/env node
/* ============================================================
 * 把抽取好的文章做成题库包（用项目自带的出题引擎 + 自校验）
 *   node scripts/make-pack.js --source <抽取结果.json> --slug <slug> \
 *     --title-cn "城市化" --tags "社会,城市" --difficulty 中 [--out packs/xxx.json]
 *
 * 流程：generateExam 出题 → verifyExam 自校验（不通过直接失败，不产出包）
 *       → 从离线词典生成重点词汇（只收词典里有释义的词，绝不编造词义）
 *       → 写入 ielts-reading-pack
 * ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const CONTRIBUTOR = "l458022";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function loadEngine() {
  const sb = { window: {}, console: { log() {}, warn() {}, error() {} } };
  vm.createContext(sb);
  ["engine.js", "generator.js", "dict-core.js"].forEach((f) =>
    vm.runInContext(fs.readFileSync(path.join(ROOT, "assets", f), "utf8"), sb)
  );
  return sb.window;
}

/* ---------- 重点词汇：只从离线词典里取，保证释义真实 ---------- */
const VOCAB_STOP = new Set(("people,world,year,years,country,countries,number,numbers,data,figure,figures,study,studies,report,reports,research,global,however,because,which,their,there,these,those,would,could,should,about,other,others,between,during,through,after,before,while,where,when,more,most,much,many,some,such,than,then,also,into,over,under,only,even,still,very,being,been,have,has,had,that,this,with,from,they,them,what,will,well,less,least,large,larger,small,smaller,high,higher,low,lower,used,using,make,makes,made,take,takes,took,give,gives,gave,need,needs,show,shows,shown,like,just,each,most,every,across,around,within,without,among,along,per,may,might,must,can,cannot,not,all,any,both,few,many,own,same,so,too,very,one,two,three,four,five,six,seven,eight,nine,ten,hundred,thousand,million,billion,percent,century,centuries").split(","));

function buildVocabulary(paras, dict, limit) {
  const text = paras.map((p) => p.text).join(" ");
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*/g) || [];
  const freq = {};
  (text.toLowerCase().match(/[a-z][a-z'-]{4,}/g) || []).forEach((raw) => {
    const w = raw.replace(/['-]+$/, "");
    if (w.length < 5 || VOCAB_STOP.has(w)) return;
    freq[w] = (freq[w] || 0) + 1;
  });
  const picks = Object.keys(freq)
    .filter((w) => dict[w] && dict[w].meaning) // 词典没有释义就跳过，不编造
    .sort((a, b) => freq[b] - freq[a] || b.length - a.length)
    .slice(0, limit);
  return picks.map((w) => {
    const re = new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const sent = sentences.find((s) => re.test(s)) || "";
    return { word: w, pos: dict[w].pos, meaning: dict[w].meaning, sentence: sent.trim() };
  });
}

function main() {
  const src = arg("source");
  const slug = arg("slug");
  if (!src || !slug) {
    console.error("用法：node scripts/make-pack.js --source <json> --slug <slug> --title-cn <中文标题> --tags <标签> [--difficulty 中] [--out <文件>]");
    process.exit(1);
  }
  const art = JSON.parse(fs.readFileSync(src, "utf8"));
  const paras = art.paragraphs;
  if (!paras || paras.length < 3) { console.error("文章段落不足（需 ≥3 段）"); process.exit(1); }

  const W = loadEngine();
  const gen = W.RLGenerator.generateExam(paras, { types: ["tfng", "gapfill", "headings"], tfngCount: 6, gapfillCount: 3 });
  if (!gen) { console.error("出题引擎无法处理该文章"); process.exit(1); }

  const titleCn = arg("title-cn", art.title);
  const tags = arg("tags", "公共题库").split(/[,，]/).map((t) => t.trim()).filter(Boolean);
  const difficulty = arg("difficulty", "中");

  const exam = {
    id: "community-" + slug,
    title: art.title,
    titleCn: titleCn,
    book: "公共题库",
    test: 1,
    passage: 1,
    difficulty: difficulty,
    series: "公共题库 · 自动出题",
    source: "贡献者 " + CONTRIBUTOR + " · " + art.license + " · " + art.attribution,
    level: "自定义",
    minutes: 20,
    tags: tags,
    intro: "开放获取文章（" + art.license + "）：" + art.attribution + "　原文：" + art.sourceUrl,
    sections: [{
      id: "s1",
      title: "READING PASSAGE 1",
      paragraphs: paras,
      questionGroups: gen.sections[0].questionGroups
    }],
    vocabulary: buildVocabulary(paras, W.RLDictCore.parse(), 12),
    contribution: {
      contributor: CONTRIBUTOR,
      license: art.license,
      licenseUrl: art.licenseUrl,
      sourceUrl: art.sourceUrl,
      attribution: art.attribution,
      declaredAt: new Date().toISOString(),
      declaration: "copyright-ok;questions-original-or-tool-generated;no-privacy"
    }
  };

  // 自校验：不通过就不产出，避免把有问题的题带进公共题库
  const v = W.RLGenerator.verifyExam(exam, paras);
  if (!v.ok) {
    console.error("自校验未通过（" + v.issues.length + " 处）：\n  " + v.issues.slice(0, 8).join("\n  "));
    process.exit(1);
  }

  const pack = {
    format: "ielts-reading-pack",
    version: 1,
    generator: "IELTS Reading Trainer",
    createdAt: new Date().toISOString(),
    exams: [exam]
  };
  const questions = exam.sections[0].questionGroups.reduce((n, g) => n + g.questions.length, 0);
  const dest = arg("out", "");
  const text = JSON.stringify(pack, null, 2) + "\n";
  if (dest) fs.writeFileSync(dest, text);
  console.log("%s | %s | %d 词 | %d 题 | 词汇 %d | 自校验通过",
    slug, titleCn, paras.reduce((n, p) => n + p.text.split(/\s+/).length, 0), questions, exam.vocabulary.length);
  if (!dest) console.log(text);
}

main();

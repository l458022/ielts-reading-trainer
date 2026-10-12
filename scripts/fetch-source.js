#!/usr/bin/env node
/* ============================================================
 * 信源抓取与正文抽取
 * 用途：从**允许再分享**的公开信源取文章，抽成干净段落，供出题引擎使用。
 *   node scripts/fetch-source.js owid <文章URL>  [--words 900] [--out out.json]
 *   node scripts/fetch-source.js pmc  <PMCID>    [--words 900] [--out out.json]
 *
 * 只支持以下两类授权，其余一律拒绝（避免把版权风险带进题库）：
 *   - OWID（Our World in Data）：CC BY 4.0，署名即可再分发
 *   - Europe PMC 中标明 CC BY 的开放获取论文
 * 抓取结果会带上 sourceUrl 与 license，写进题库包的 contribution 字段，
 * 下游使用者能查到每篇文章的出处与授权。
 * ============================================================ */
"use strict";

const fs = require("fs");

const UA = "ielts-reading-trainer/1.0 (educational; +https://github.com/l458022/ielts-reading-trainer)";

function arg(name, def) {
  const i = process.argv.indexOf("--" + name);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

function decode(s) {
  return String(s)
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&amp;/g, "&");
}

/** HTML 片段 → 纯文本 */
function stripTags(s) {
  return decode(removeTags(String(s))).replace(/\s+/g, " ").trim();
}

/* 标签扫描必须识别引号：信源常把 JSON 数据塞进属性里（值中含 '>'），
 * 用朴素的 /<p[^>]*>/ 会在 '>' 处提前截断，把 JSON 当正文漏出来。 */
function tagEnd(html, from) {
  let quote = null;
  for (let i = from; i < html.length; i++) {
    const ch = html[i];
    if (quote) { if (ch === quote) quote = null; }
    else if (ch === '"' || ch === "'") quote = ch;
    else if (ch === ">") return i;
  }
  return -1;
}

function removeTags(html) {
  let out = "";
  let i = 0;
  while (i < html.length) {
    const lt = html.indexOf("<", i);
    if (lt === -1) { out += html.slice(i); break; }
    out += html.slice(i, lt);
    const gt = tagEnd(html, lt + 1);
    if (gt === -1) break;
    out += " ";
    i = gt + 1;
  }
  return out;
}

/** 取出指定标签元素的内部 HTML（引号感知），用于逐段抽取 */
function extractElements(html, tag) {
  const out = [];
  const open = new RegExp("<" + tag + "(?=[\\s>/])", "gi");
  let m;
  while ((m = open.exec(html))) {
    const start = tagEnd(html, m.index + 1);
    if (start === -1) break;
    const close = html.toLowerCase().indexOf("</" + tag + ">", start);
    if (close === -1) break;
    out.push(html.slice(start + 1, close));
    open.lastIndex = close;
  }
  return out;
}

/** 去掉 script / style / 注释，避免 JSON 数据与样式文本混进正文 */
function preClean(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
}

/** 去掉行内引用标记：[1]、(1)、Author et al., 2020 之类 */
function cleanProse(s) {
  return s
    .replace(/\[\d+(?:[,\-–]\s*\d+)*\]/g, "")
    .replace(/\(\s*\d+\s*\)/g, "")
    // 信源里列表项/引用编号常直接贴在句首（"15 Because he lacked..."）：
    // 仅当数字后紧跟大写字母时删除，避免误伤 "1 in 5 adults..." 这类正文数字
    .replace(/^\s*\d{1,3}\s+(?=[A-Z])/, "")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** 导航、署名、图表说明等非正文段落 */
const NOISE = [
  /^Back to top/i,
  /Cite this work|Reuse this work/i,
  /^(Subscribe|Donate|Browse by topic|Data|Latest|Resources|About)\b/i,
  /^Our World in Data/i,
  /^All charts|^Download|^Interactive|^Explore\b/i,
  /^This (chart|map|table) (shows|presents)/i,
  /^(Read more|See also|Related)\b/i,
  /^(Figure|Table|Box)\s*\d/i,
  /^©|^This is an open access article/i,
  /^https?:\/\//i,
  // 嵌入数据的 JSON 片段（属性泄漏或脚本残留）
  /"spanType"|"\w+"\s*:\s*[\["{]|\{\s*"/
];

function isNoise(p) {
  return NOISE.some((re) => re.test(p));
}

/** 段落过长（>maxWords）时按句边界切分，避免单段塞进十几个句子 */
function splitLong(text, maxWords = 110) {
  const words = text.split(/\s+/);
  if (words.length <= maxWords) return [text];
  const sentences = text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [text];
  const out = [];
  let buf = "";
  for (const s of sentences) {
    if (buf && (buf + " " + s).split(/\s+/).length > maxWords) {
      out.push(buf.trim());
      buf = s;
    } else {
      buf = buf ? buf + " " + s : s;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** 按累计词数截取到接近上限（保留段落完整性） */
function takeWords(paras, limit) {
  const out = [];
  let n = 0;
  for (const p of paras) {
    const w = p.split(/\s+/).length;
    if (out.length && n + w > limit * 1.12) break;
    out.push(p);
    n += w;
  }
  return out;
}

const IDS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/** 雅思阅读文章是 5–8 个「段」，每段 100–200 词。
 *  信源的段落往往又多又碎（OWID 常见 20+ 短段），所以这里做**合并**而不是切分：
 *  贪心累积到 target 词就落一段，最多 maxParas 段。
 *  段落数受限于 8 还有一个硬原因：标题题的罗马数字只到 viii。 */
function buildParagraphs(texts, { target = 150, maxParas = 7, limit = 950 } = {}) {
  const flat = [];
  texts.forEach((t) => {
    const w = t.split(/\s+/).length;
    // 单段过长（>210 词）时按句边界切开，避免出现 300 词的巨型段落
    (w > 210 ? splitLong(t, 170) : [t]).forEach((c) => flat.push(c));
  });
  const out = [];
  let buf = [];
  let n = 0;
  let total = 0;
  for (const c of flat) {
    if (out.length >= maxParas) break;
    const cw = c.split(/\s+/).length;
    buf.push(c);
    n += cw;
    if (n >= target) {
      out.push(buf.join(" "));
      total += n;
      buf = [];
      n = 0;
      if (total >= limit) break;
    }
  }
  if (buf.length && out.length < maxParas) out.push(buf.join(" "));
  return out.map((text, i) => ({
    id: i < 26 ? IDS[i] : IDS[Math.floor(i / 26) - 1] + IDS[i % 26],
    text
  }));
}

/* ---------------- OWID（CC BY 4.0） ---------------- */
async function fromOwid(url) {
  const res = await fetch(url, { headers: { "user-agent": UA } });
  if (!res.ok) throw new Error("OWID 请求失败：HTTP " + res.status);
  const html = await res.text();
  const art = html.match(/<article[\s\S]*?<\/article>/i);
  if (!art) throw new Error("OWID 页面结构变化：找不到 <article>");
  const inner = preClean(art[0]);

  const title = stripTags((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").split("|")[0].trim();
  const paras = extractElements(inner, "p")
    .map((chunk) => cleanProse(stripTags(chunk)))
    .filter((p) => p.length > 120 && !isNoise(p));

  // 署名信息：OWID 用 <meta name="citation_author"> 标注作者（CC BY 要求署名）
  const authors = [...html.matchAll(/<meta[^>]*name="citation_author"[^>]*content="([^"]*)"/gi)]
    .map((m) => decode(m[1]).trim())
    .filter(Boolean);
  const year = ((html.match(/<meta[^>]*name="citation_publication_date"[^>]*content="(\d{4})"/i) || [])[1]) || "";
  const who = authors.length ? authors.join("、") : "Our World in Data";
  return {
    source: "owid",
    title,
    sourceUrl: url,
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: who + (year ? "（" + year + "）" : "") + " — " + title + "，Our World in Data，CC BY 4.0",
    paragraphs: paras
  };
}

/* ---------------- Europe PMC（仅 CC BY 论文） ---------------- */
async function fromPmc(pmcid) {
  const id = pmcid.replace(/^PMC/i, "").trim();
  const meta = await (await fetch(
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC" + id + "&format=json&resultType=core",
    { headers: { "user-agent": UA } }
  )).json();
  const rec = meta && meta.resultList && meta.resultList.result && meta.resultList.result[0];
  if (!rec) throw new Error("PMC 查不到该文献：PMC" + id);

  const lic = JSON.stringify(rec.license || rec.licenses || "").toLowerCase();
  if (!/cc[\s-]*by(?![\s-]*nc)/.test(lic) && !/creative commons attribution/.test(lic)) {
    throw new Error("该文献不是 CC BY 授权，拒绝收录（license=" + (rec.license || "未知") + "）");
  }

  const xml = await (await fetch(
    "https://www.ebi.ac.uk/europepmc/webservices/rest/PMC" + id + "/fullTextXML",
    { headers: { "user-agent": UA } }
  )).text();
  if (!/<body[\s>]/i.test(xml)) throw new Error("该文献没有开放全文（可能仅摘要）");

  const body = preClean(xml.match(/<body[\s\S]*?<\/body>/i)[0]);
  const title = stripTags((xml.match(/<article-title[^>]*>([\s\S]*?)<\/article-title>/i) || [])[1] || rec.title || "");
  const paras = extractElements(body, "p")
    .map((chunk) => cleanProse(stripTags(chunk)))
    .filter((p) => p.length > 140 && !isNoise(p));

  return {
    source: "pmc",
    title,
    sourceUrl: "https://europepmc.org/article/PMC/PMC" + id,
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: (rec.authorString || "") + " — " + (rec.journalTitle || "Europe PMC") + "，CC BY 4.0",
    paragraphs: paras
  };
}

async function main() {
  const kind = (process.argv[2] || "").toLowerCase();
  const target = process.argv[3];
  if (!kind || !target) {
    console.error("用法：node scripts/fetch-source.js owid <URL> | pmc <PMCID> [--words 900] [--out file.json]");
    process.exit(1);
  }
  const limit = Number(arg("words", "900"));
  const data = kind === "owid" ? await fromOwid(target) : kind === "pmc" ? await fromPmc(target) : null;
  if (!data) throw new Error("未知信源类型：" + kind + "（只支持 owid / pmc）");

  const chosen = takeWords(data.paragraphs, limit);
  const paras = buildParagraphs(chosen);
  const out = {
    source: data.source,
    title: data.title,
    sourceUrl: data.sourceUrl,
    license: data.license,
    licenseUrl: data.licenseUrl,
    attribution: data.attribution,
    wordCount: paras.reduce((s, p) => s + p.text.split(/\s+/).length, 0),
    paragraphs: paras
  };
  const text = JSON.stringify(out, null, 2) + "\n";
  const dest = arg("out", "");
  if (dest) fs.writeFileSync(dest, text);
  console.log("%s → %d 段 / %d 词 / %s", data.title || "(无标题)", out.paragraphs.length, out.wordCount, data.license);
  if (!dest) console.log(text);
}

main().catch((e) => { console.error("失败：" + e.message); process.exit(1); });

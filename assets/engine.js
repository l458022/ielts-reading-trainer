/* ============================================================
 * 雅思阅读分析引擎（纯本地运行，无网络请求）
 * 功能：句子切分 / 判分 / 原句定位 / 陷阱检测 / 同义替换识别
 *       / 关键词模糊定位（导入试卷时自动补定位）/ Band 估算
 * ============================================================ */
window.RLEngine = (function () {

  /* ---------- 基础工具 ---------- */

  function normalize(s) {
    return String(s == null ? "" : s)
      .trim()
      .toLowerCase()
      .replace(/['']/g, "'")
      .replace(/\s+/g, " ");
  }

  // 把段落按句子切分（保留原文文本，供渲染与高亮）
  function splitSentences(text) {
    var parts = String(text).match(/[^.!?]+[.!?]+["')\]]*\s*/g);
    if (!parts) return [String(text)];
    return parts.map(function (p) { return p.trim(); }).filter(Boolean);
  }

  /* ---------- 判分 ---------- */

  function isCorrect(q, ans) {
    if (ans == null || ans === "") return { correct: false, blank: true };
    var a = normalize(ans);
    switch (q.type || "mcq") {
      case "gapfill": {
        var acc = q.answers || [q.answer];
        return {
          correct: acc.some(function (x) { return normalize(x) === a; }),
          blank: false
        };
      }
      case "multi": {
        var set = String(ans).split(/[,+]\s*/).map(normalize).filter(Boolean).sort();
        var want = (q.answers || []).map(normalize).sort();
        var ok = set.length === want.length && set.every(function (v, i) { return v === want[i]; });
        return { correct: ok, blank: false };
      }
      default:
        return { correct: normalize(q.answer) === a, blank: false };
    }
  }

  /* ---------- 陷阱 / 考点检测 ---------- */

  var ABS_WORDS = /\b(only|all|always|never|must|every|everyone|everything|entirely|completely|impossible|nobody|none|cannot|wholly|totally|absolutely|no one|exclusively)\b/i;
  var HEDGE_WORDS = /\b(some|many|most|often|sometimes|usually|may|might|can|partly|likely|tend to|a number of|several)\b/i;
  var COMPARE = /\b(more|less|better|worse|faster|slower|easier|harder|than|as .+ as)\b/i;
  var CAUSE = /\b(because|cause|lead to|result in|due to|as a result)\b/i;

  // 检测题干中的典型陷阱，返回人类可读提示
  function detectTrap(stem, paraText) {
    var traps = [];
    var s = stem || "";
    if (ABS_WORDS.test(s)) traps.push("题干含绝对化词（" + (s.match(ABS_WORDS) || [""])[0] + "）：原文通常只讲部分情况，命题人常用它把范围偷换。");
    if (HEDGE_WORDS.test(s) && !ABS_WORDS.test(s)) traps.push("题干含限定词（" + (s.match(HEDGE_WORDS) || [""])[0] + "）：注意核对原文的限定范围，some / most / often 常被换成绝对词。");
    if (COMPARE.test(s)) traps.push("题干含比较（" + (s.match(COMPARE) || [""])[0] + "）：重点检查原文的比较方向是否一致。");
    if (CAUSE.test(s)) traps.push("题干含因果：确认原文的因果方向没有被倒置或添加/删除原因。");
    return traps;
  }

  /* ---------- 同义替换提示 ---------- */

  var PARAPHRASE_TABLE = {
    "increase": ["rise", "grow", "expand", "climb", "go up"],
    "decrease": ["fall", "drop", "decline", "reduce", "go down"],
    "important": ["crucial", "significant", "essential", "vital"],
    "difficult": ["challenging", "hard", "tough"],
    "cause": ["lead to", "result in", "bring about"],
    "many": ["numerous", "a large number of", "plenty of", "a great many"],
    "use": ["employ", "utilise", "apply", "make use of"],
    "show": ["demonstrate", "indicate", "reveal", "suggest"],
    "find": ["discover", "detect", "observe"],
    "help": ["assist", "aid", "support"],
    "stop": ["prevent", "halt", "put an end to", "cease"],
    "begin": ["start", "commence", "emerge"],
    "depend on": ["rely on", "be determined by"],
    "applied to": ["used as", "coated with"],
    "improve": ["enhance", "boost", "raise"],
    "brief": ["short", "temporary"],
    "diverse": ["varied", "a wide range of"],
    "fast": ["rapid", "swift", "quick"],
    "often": ["frequently", "in many cases"],
    "about": ["around", "approximately", "roughly"],
    "because": ["since", "as", "the reason is that"],
    "performed better": ["fared better", "scored higher"],
    "poor": ["inadequate", "insufficient", "bad"],
    "question": ["doubt", "query", "cast doubt on"]
  };

  // 在题干与定位句之间识别同义替换线索，返回 [题干词, 原文词] 对
  function paraphraseHints(stem, sentence) {
    var out = [];
    if (!stem || !sentence) return out;
    var st = " " + normalize(stem) + " ";
    var se = " " + normalize(sentence) + " ";
    Object.keys(PARAPHRASE_TABLE).forEach(function (k) {
      var kn = normalize(k);
      if (st.indexOf(" " + kn + " ") === -1 && st.indexOf(kn) === -1) return;
      PARAPHRASE_TABLE[k].forEach(function (alt) {
        if (se.indexOf(" " + normalize(alt) + " ") !== -1 || se.indexOf(normalize(alt)) !== -1) {
          out.push([k, alt]);
        }
      });
    });
    return out;
  }

  /* ---------- 导入：题干预定位（关键词重叠） ---------- */

  var STOPWORDS = ("a,an,the,of,in,on,at,to,for,by,with,from,into,and,or,but,is,are,was,were,be,been,being,it,its,this,that,these,those,there,their,his,her,they,them,he,she,we,our,you,your,i,not,no,do,does,did,will,would,can,could,should,has,have,had,which,who,whom,what,when,where,why,how,than,then,so,such,as,if,because,also,more,most,some,all,any,each,other,another,between,through,during,after,before,over,under,up,down,out,off,about").split(",");

  function keywords(stem) {
    return normalize(stem)
      .replace(/[^a-z0-9\s'-]/g, " ")
      .split(/\s+/)
      .filter(function (w) {
        return w.length > 3 && STOPWORDS.indexOf(w) === -1 &&
          !w.match(/^(choose|statement|agree|following|passage|reading|write|answer)$/);
      });
  }

  // 在半自动导入时，为题干预估一个定位段/句
  function suggestSentence(stem, paragraphs, paraIndex) {
    var stems = keywords(stem);
    if (!stems.length) return null;
    var best = { score: 0, para: null, sentence: "" };
    (paragraphs || []).forEach(function (p) {
      var pi = paraIndex ? paraIndex(p) : p.id;
      splitSentences(p.text).forEach(function (sent) {
        var s = normalize(sent);
        var score = stems.reduce(function (acc, w) {
          return acc + (s.indexOf(w) !== -1 ? 1 : 0);
        }, 0);
        if (score > best.score) best = { score: score, para: pi, sentence: sent };
      });
    });
    return best.score > 0 ? best : null;
  }

  /* ---------- 完整交卷分析 ---------- */

  function collectQuestions(exam) {
    var list = [];
    (exam.sections || []).forEach(function (sec) {
      (sec.questionGroups || []).forEach(function (g) {
        (g.questions || []).forEach(function (q) {
          list.push({ q: q, group: g, section: sec });
        });
      });
    });
    return list;
  }

  function questionTypeName(type) {
    var map = {
      mcq: "选择题", tfng: "判断题", ynng: "判断题(Y/N/NG)", gapfill: "填空题",
      matching: "匹配题", headings: "标题匹配", multi: "多选多"
    };
    return map[type] || type;
  }

  // answers: { 题号: 用户答案 }
  function analyzeExam(exam, answers, seconds) {
    var items = collectQuestions(exam);
    var perType = {};
    var results = items.map(function (it) {
      var q = it.q;
      q.type = it.group.type;
      var ans = answers[q.no];
      var chk = isCorrect(q, ans);
      var typeName = questionTypeName(it.group.type);
      if (!perType[typeName]) perType[typeName] = { total: 0, correct: 0 };
      perType[typeName].total++;
      if (chk.correct) perType[typeName].correct++;
      return {
        no: q.no, type: it.group.type, typeName: typeName,
        groupId: it.group.id,
        stem: q.stem, options: q.options || null,
        yourAnswer: (ans == null || ans === "") ? "（未作答）" : ans,
        correct: chk.correct, blank: chk.blank,
        rightAnswer: (function () {
          if (it.group.type === "gapfill" || q.answers) return (q.answers || [q.answer]).join(" / ");
          return q.answer;
        })(),
        keyPara: q.keyPara, keySentence: q.keySentence, keySentenceCn: q.keySentenceCn,
        explain: q.explain, trap: q.trap, words: q.words || [],
        paraphrase: q.paraphrase || paraphraseHints(q.stem, q.keySentence),
        autoTrap: (q.trap ? [] : detectTrap(q.stem, q.keySentence))
      };
    });
    var correct = results.filter(function (r) { return r.correct; }).length;
    return {
      examId: exam.id, examTitle: exam.title, examTitleCn: exam.titleCn,
      total: results.length, correct: correct, wrong: results.length - correct,
      accuracy: results.length ? Math.round(correct / results.length * 100) : 0,
      seconds: seconds || 0, band: estimateBand(correct, results.length),
      perType: perType, results: results, wrongNos: results.filter(function (r) { return !r.correct; }).map(function (r) { return r.no; })
    };
  }

  // 参考分数段估算（近似）
  function estimateBand(correct, total) {
    if (!total) return 0;
    var r = correct / total;
    var bands = [0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0];
    var idx = Math.round(r * 13) + 1;
    return bands[Math.min(idx, bands.length - 1)].toFixed(1);
  }

  return {
    normalize: normalize, splitSentences: splitSentences,
    isCorrect: isCorrect, detectTrap: detectTrap,
    paraphraseHints: paraphraseHints, suggestSentence: suggestSentence,
    analyzeExam: analyzeExam, estimateBand: estimateBand,
    collectQuestions: collectQuestions, questionTypeName: questionTypeName
  };
})();

/* ============================================================
 * 自动出题引擎（纯本地规则，无网络请求）
 * 输入：任意英文文章（段落数组）
 * 输出：与主系统完全兼容的题型组（每题带定位句/陷阱标注/自检）
 * 策略：
 *  - 判断题：TRUE=定位句同义改写 / FALSE=词法可判定的反向改写 / NG=实体词替换
 *  - 填空题：定位句挖关键词（名词/数字）
 *  - 标题匹配：段落关键词组标题 + 干扰项
 *  - 单选题：定位句陈述 + 跨段实体替换干扰项
 * 安全性：所有生成题都经过「可判定性」规则约束——FALSE 必含否定/反向，
 *          NG 替换词全文不得出现，保证答案有据。
 * ============================================================ */
window.RLGenerator = (function () {

  /* ---------- 词表 ---------- */
  var STOP = ("a,an,the,of,in,on,at,to,for,by,with,from,into,and,or,but,is,are,was,were,be,been,being,it,its,this,that,these,those,there,their,his,her,they,them,he,she,we,our,you,your,not,no,do,does,did,will,would,can,could,should,has,have,had,which,who,what,when,where,why,how,than,then,so,such,as,if,because,also,more,most,some,all,any,each,other,another,between,through,during,after,before,over,under,up,down,out,off,about,many,much,very,just,only,even,still,already,yet,new,first,last").split(",");

  // 同类别实体替换对（NG 题用：A→B，B 必须不在原文）
  var REPLACE_PAIRS = [
    ["bee", "wasp"], ["bees", "wasps"], ["river", "lake"], ["city", "village"],
    ["school", "hospital"], ["car", "bicycle"], ["computer", "telephone"],
    ["doctor", "teacher"], ["student", "engineer"], ["child", "adult"],
    ["plant", "fungus"], ["bird", "insect"], ["fish", "mammal"], ["forest", "desert"],
    ["mountain", "valley"], ["ocean", "glacier"], ["rain", "snow"], ["summer", "winter"],
    ["morning", "evening"], ["coffee", "tea"], ["sugar", "salt"], ["book", "magazine"],
    ["teacher", "lawyer"], ["hospital", "factory"], ["bridge", "tunnel"],
    ["energy", "fuel"], ["plastic", "metal"], ["glass", "wood"], ["paper", "fabric"],
    ["engine", "motor"], ["star", "planet"], ["moon", "sun"], ["king", "minister"],
    ["artist", "scientist"], ["film", "novel"], ["painting", "photograph"],
    ["museum", "library"], ["garden", "park"], ["fruit", "vegetable"],
    ["meat", "grain"], ["milk", "juice"], ["bread", "cheese"], ["farmers", "traders"],
    ["city", "town"], ["office", "laboratory"], ["rooftops", "basements"],
    ["brain", "heart"], ["body", "mind"], ["tests", "surveys"], ["students", "employees"],
    ["volunteers", "employees"], ["roads", "railways"], ["blood", "bone"], ["soil", "rock"],
    ["crops", "timber"], ["gas", "coal"], ["animals", "plants"], ["surgeons", "nurses"],
    ["methods", "tools"], ["results", "conclusions"], ["patients", "customers"],
    ["heat", "light"], ["cost", "time"], ["safety", "speed"], ["experiments", "surveys"],
    ["food", "medicine"], ["movements", "patterns"], ["colonies", "families"],
    ["flowers", "leaves"], ["greenhouse", "warehouse"], ["bacteria", "viruses"],
    ["transport", "communication"], ["children", "parents"], ["water", "air"],
    ["clay", "sand"], ["glass", "stone"], ["wood", "stone"], ["paintings", "sculptures"]
  ];

  var SYN = {
    increase: ["rise", "grow"], decrease: ["fall", "decline"], important: ["crucial", "essential"],
    difficult: ["challenging"], show: ["reveal"], find: ["discover"], help: ["support"],
    stop: ["prevent"], begin: ["start"], use: ["employ"], many: ["numerous"],
    fast: ["rapid"], often: ["frequently"], about: ["around"], improve: ["enhance"],
    big: ["large"], small: ["tiny"], common: ["widespread"], rare: ["uncommon"],
    old: ["ancient"], new: ["recent"], good: ["positive"], bad: ["negative"],
    because: ["since"], but: ["however"], also: ["in addition"]
  };

  /* ---------- 基础工具 ---------- */
  function splitSentences(text) {
    var parts = String(text).match(/[^.!?]+[.!?]+["')\]]*\s*/g);
    return parts ? parts.map(function (p) { return p.trim(); }).filter(Boolean) : [String(text)];
  }
  function words(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter(Boolean);
  }
  function isStop(w) { return STOP.indexOf(w) !== -1; }
  function esc(s) { return String(s); }

  // 句子信息量打分：数字、专有名词、比较、因果、长度
  function scoreSentence(s) {
    var sc = 0;
    if (/\d/.test(s)) sc += 3;
    if (/[A-Z][a-z]{3,}/.test(s)) sc += 2;                    // 专有/大写词
    if (/\b(more|less|better|worse|faster|slower|than|as .+ as)\b/i.test(s)) sc += 2;
    if (/\b(because|since|due to|lead to|result|cause)\b/i.test(s)) sc += 2;
    if (/\b(is|are|was|were|can|may|will|has|have)\b/i.test(s)) sc += 1;
    var wc = words(s).length;
    if (wc >= 14 && wc <= 40) sc += 2; else if (wc < 8) sc -= 2;
    return sc;
  }

  // 从全文选 n 个高质量句子，尽量分布在不同段落
  function pickSentences(paragraphs, n) {
    var all = [];
    paragraphs.forEach(function (p) {
      splitSentences(p.text).forEach(function (s) {
        all.push({ sent: s, para: p.id, score: scoreSentence(s) });
      });
    });
    all.sort(function (a, b) { return b.score - a.score; });
    var picked = [], usedPara = {};
    all.forEach(function (item) {
      if (picked.length >= n) return;
      // 同段最多取 2 句，保证覆盖面
      if ((usedPara[item.para] || 0) >= 2) return;
      usedPara[item.para] = (usedPara[item.para] || 0) + 1;
      picked.push(item);
    });
    // 不足则放宽段落限制补齐
    if (picked.length < n) {
      all.forEach(function (item) {
        if (picked.length < n && picked.indexOf(item) === -1) picked.push(item);
      });
    }
    return picked;
  }

  /* ---------- 句子改写 ---------- */

  // TRUE：同义替换改写（若无可换词则原句）
  function toTrueStem(sentence) {
    var out = sentence, changed = [];
    Object.keys(SYN).forEach(function (k) {
      var re = new RegExp("\\b" + k + "\\b", "i");
      if (re.test(out) && changed.length < 2) {
        var alt = SYN[k][0];
        out = out.replace(re, function (m) { return m[0] === m[0].toUpperCase() ? alt.charAt(0).toUpperCase() + alt.slice(1) : alt; });
        changed.push(k + " -> " + alt);
      }
    });
    return { stem: out, changed: changed };
  }

  // FALSE：词法可判定的反向改写。返回 null 表示该句安全不可反向（跳过）
  function toFalseStem(sentence) {
    var s = " " + sentence + " ";
    var trap = "";
    var m;
    // 1) 比较级反向
    if ((m = s.match(/\b(more|better|faster|greater|higher|stronger)\b/i))) {
      var inv = { more: "less", better: "worse", faster: "slower", greater: "smaller", higher: "lower", stronger: "weaker" }[m[1].toLowerCase()];
      s = s.replace(new RegExp("\\b" + m[1] + "\\b", "i"), inv);
      trap = "比较级反向（" + m[1].toLowerCase() + " → " + inv + "），原文方向被对调";
    } else if ((m = s.match(/\b(less|worse|slower|smaller|lower|weaker)\b/i))) {
      var inv2 = { less: "more", worse: "better", slower: "faster", smaller: "larger", lower: "higher", weaker: "stronger" }[m[1].toLowerCase()];
      s = s.replace(new RegExp("\\b" + m[1] + "\\b", "i"), inv2);
      trap = "比较级反向（" + m[1].toLowerCase() + " → " + inv2 + "），原文方向被对调";
    }
    // 2) 情态动词否定
    else if ((m = s.match(/\b(can|may|will|should|could)\b\s+(\w+)/i))) {
      s = s.replace(new RegExp("\\b" + m[1] + "\\b\\s+" + m[2] + "\\b", "i"),
        (m[1].toLowerCase() === "may" ? "may not" : m[1].toLowerCase() + " not") + " " + m[2]);
      trap = "情态动词被否定（" + m[1].toLowerCase() + " → not），与原文矛盾";
    }
    // 3) 系动词否定
    else if ((m = s.match(/\b(is|are|was|were)\b\s+([a-z]+)/i)) && !/\b(is|are|was|were)\s+not\b/i.test(s)) {
      s = s.replace(new RegExp("\\b" + m[1] + "\\b\\s+" + m[2] + "\\b", "i"), m[1] + " not " + m[2]);
      trap = "系动词被否定（" + m[1].toLowerCase() + " not），与原文矛盾";
    }
    if (!trap) return null;
    return { stem: s.trim(), trap: trap };
  }

  // NG：实体词替换。替换词必须全文未出现。
  function toNgStem(sentence, fullText) {
    var low = fullText.toLowerCase();
    for (var i = 0; i < REPLACE_PAIRS.length; i++) {
      var a = REPLACE_PAIRS[i][0], b = REPLACE_PAIRS[i][1];
      var re = new RegExp("\\b" + a + "\\b", "i");
      if (re.test(sentence) && low.indexOf(" " + b) === -1 && low.indexOf(b + " ") === -1) {
        var out = sentence.replace(re, function (m) { return m[0] === m[0].toUpperCase() ? b.charAt(0).toUpperCase() + b.slice(1) : b; });
        return { stem: out, swapped: a + " → " + b, trap: "实体偷换（" + a + " → " + b + "）：原文说的是「" + a + "」，题干偷换成「" + b + "」，属文中未提及" };
      }
    }
    return null;
  }

  /* ---------- 题干生成 ---------- */
  function q(no, stem, answer, para, key, extra) {
    var q = {
      no: no, stem: stem, answer: answer,
      keyPara: para, keySentence: key,
      explain: extra.explain || "", generated: true
    };
    if (extra.answers) q.answers = extra.answers;
    if (extra.trap) q.trap = extra.trap;
    if (extra.options) q.options = extra.options;
    if (extra.note) q.note = extra.note;
    if (extra.keySentenceCn) q.keySentenceCn = extra.keySentenceCn;
    return q;
  }

  /* ---------- 判断题生成 ---------- */
  function genTrueFalse(paragraphs, count) {
    var picked = pickSentences(paragraphs, Math.max(count + 3, count));
    var fullText = paragraphs.map(function (p) { return p.text; }).join(" ");
    var questions = [], no = 1;
    var used = { TRUE: 0, FALSE: 0, "NOT GIVEN": 0 };

    // 计算每句可支持的答案类型
    var caps = picked.map(function (item) {
      return {
        item: item,
        can: {
          "TRUE": true,
          "FALSE": !!toFalseStem(item.sent),
          "NOT GIVEN": !!toNgStem(item.sent, fullText)
        }
      };
    });

    // 目标配比：尽量三种都有；优先分配给当前最少的类型
    function pickKind(cap) {
      var avail = Object.keys(cap.can).filter(function (k) { return cap.can[k]; });
      avail.sort(function (a, b) { return used[a] - used[b]; });
      return avail[0] || "TRUE";
    }

    caps.forEach(function (cap) {
      if (questions.length >= count) return;
      var kind = pickKind(cap);
      var sent = cap.item.sent, para = cap.item.para;
      var made = null;
      if (kind === "TRUE") {
        var t = toTrueStem(sent);
        made = q(no, t.stem, "TRUE", para, sent, {
          explain: "本题为机器生成：题干是原文定位句的同义复现"
            + (t.changed.length ? "（" + t.changed.map(function (c) { return c.replace(" -> ", " \u2194 "); }).join("；") + "）" : "，内容一致")
            + "。做题时先抓题干关键词回原文，再核对限定词与比较方向。"
        });
      } else if (kind === "FALSE") {
        var f = toFalseStem(sent);
        made = q(no, f.stem, "FALSE", para, sent, {
          trap: f.trap,
          explain: "本题为机器生成：原文为\u300c" + sent + "\u300d，题干通过改写使陈述与原文矛盾。做题时盯紧比较方向、肯定/否定和程度词。"
        });
      } else {
        var g = toNgStem(sent, fullText);
        made = q(no, g.stem, "NOT GIVEN", para, sent, {
          trap: g.trap,
          explain: "本题为机器生成：原文说的是\u300c" + sent + "\u300d，题干把实体偷换成了别的东西，原文从未提及该组合——这是 NG 题的典型构造。"
        });
      }
      if (made) { used[kind]++; questions.push(made); no++; }
    });

    // 补足：若不足 count，用剩余句子兜底为 TRUE
    caps.forEach(function (cap) {
      if (questions.length >= count) return;
      if (questions.some(function (qq) { return qq.keySentence === cap.item.sent; })) return;
      questions.push(q(no, cap.item.sent, "TRUE", cap.item.para, cap.item.sent, {
        explain: "本题为机器生成：题干与原文定位句一致，TRUE。注意：同义替换后仍要保持含义。"
      }));
      used.TRUE++; no++;
    });

    return {
      id: "g-tfng", type: "tfng", options: ["TRUE", "FALSE", "NOT GIVEN"],
      instruction: "Do the following statements agree with the information in the passage? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.",
      generated: true,
      questions: questions
    };
  }

  /* ---------- 填空生成（句中挖词） ---------- */
  function genGapfill(paragraphs, count) {
    var picked = pickSentences(paragraphs, count);
    var questions = [], no = 1;
    picked.forEach(function (item) {
      var ws = words(item.sent).filter(function (w) {
        return w.length >= 4 && !isStop(w) && !/^\d+$/.test(w);
      });
      if (!ws.length) return;
      // 取出现频次最低的词（信息量更大）
      var all = paragraphs.map(function (p) { return p.text.toLowerCase(); }).join(" ");
      var pick = ws[0], minFreq = Infinity;
      ws.forEach(function (w) {
        var freq = all.split(w).length - 1;
        if (freq < minFreq) { minFreq = freq; pick = w; }
      });
      var re = new RegExp("\\b(" + pick + ")\\b", "i");
      var blanked = item.sent.replace(re, "____________");
      if (blanked === item.sent) return;
      questions.push(q(no, blanked, pick, item.para, item.sent, {
        answers: [pick],
        explain: "本题为机器生成：从原文定位句中挖掉关键词「" + pick + "」。答案必须是原文原词，注意词性与单复数。"
      }));
      no++;
    });
    return {
      id: "g-gapfill", type: "gapfill", generated: true,
      instruction: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      questions: questions
    };
  }

  /* ---------- 标题匹配生成 ---------- */
  function genHeadings(paragraphs) {
    var all = paragraphs.map(function (p) { return p.text.toLowerCase(); }).join(" ");
    function topWords(text) {
      var freq = {};
      words(text).forEach(function (w) {
        if (w.length >= 5 && !isStop(w)) freq[w] = (freq[w] || 0) + 1;
      });
      return Object.keys(freq).sort(function (a, b) { return freq[b] - freq[a]; }).slice(0, 2);
    }
    var templates = [
      "The role of %s", "%s in the modern world", "How %s works", "A growing problem: %s",
      "The importance of %s", "%s and its effects", "The rise of %s", "%s: a case study",
      "Understanding %s", "The future of %s"
    ];
    var titles = [];
    paragraphs.forEach(function (p, i) {
      var tw = topWords(p.text);
      var main = tw[0] || p.id.toLowerCase();
      titles.push({ para: p.id, text: templates[i % templates.length].replace("%s", main) });
    });
    // 干扰项：打乱标题词 + 通用话题词
    var distractors = [
      "An unexpected solution", "The limits of measurement", "Lessons from history",
      "A warning about technology", "Why the numbers matter", "The cost of change",
      "A personal account", "Comparing two approaches"
    ];
    var pool = titles.map(function (t) { return { label: t.text, isAnswer: true }; });
    var needDistract = 7 - pool.length;
    for (var i = 0; i < needDistract && i < distractors.length; i++) {
      pool.push({ label: distractors[i], isAnswer: false });
    }
    // 编号 i..vii（答案用罗马数字）
    var roman = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii"];
    pool.forEach(function (p, i) { p.roman = roman[i]; });
    var questions = titles.map(function (t, i) {
      var matched = pool.filter(function (p) { return p.isAnswer && p.label === t.text; })[0];
      var topicSent = splitSentences(paragraphs[i].text)[0] || t.text;
      return q(i + 1, "Paragraph " + t.para, matched.roman, t.para, topicSent, {
        note: "标题由机器按段落关键词生成，答案为该段最匹配的标题；做题时先扫每段主题句。",
        explain: "本题为机器生成：段落核心词为「" + t.text.replace(/^.*?of |^A growing problem: |^How | and its effects| in the modern world|: a case study$/, "") + "」。做标题题务必看段落首句+尾句，警惕「只在段中一笔带过」的干扰项。"
      });
    });
    return {
      id: "g-headings", type: "headings", generated: true,
      pool: pool.map(function (p) { return p.roman; }),
      headings: pool.map(function (p) { return p.roman + "  " + p.label; }),
      note: "本题组的标题由机器从段落关键词生成，其中若干为干扰项。",
      instruction: "The passage has " + paragraphs.length + " paragraphs. Choose the correct heading for each paragraph from the list below.",
      questions: questions
    };
  }

  /* ---------- 单选题生成 ---------- */
  function genMcq(paragraphs, count) {
    var picked = pickSentences(paragraphs, count + 1);
    var fullText = paragraphs.map(function (p) { return p.text; }).join(" ");
    var questions = [], no = 1;
    for (var i = 0; i < picked.length && questions.length < count; i++) {
      var item = picked[i];
      // 从句子抽一个可替换实体作为差异点
      var swap = null;
      for (var j = 0; j < REPLACE_PAIRS.length; j++) {
        var a = REPLACE_PAIRS[j][0], b = REPLACE_PAIRS[j][1];
        var re = new RegExp("\\b" + a + "\\b", "i");
        var low = fullText.toLowerCase();
        if (re.test(item.sent) && low.indexOf(b) === -1) { swap = { a: a, b: b, re: re }; break; }
      }
      if (!swap) continue;
      var wrongVariants = [swap.b, "none of the above options", "the information is not stated"];
      // 正确选项 = 原句忠实截断（取 60 词以内作选项不自然 → 用「原文细节」式短选项）
      var entity = item.sent.match(swap.re)[0];
      var correctOpt = "原文表述为 " + entity;
      var options = [correctOpt, wrongVariants[0], wrongVariants[1], wrongVariants[2]];
      // 打乱选项顺序，记录正确答案字母
      var letters = ["A", "B", "C", "D"];
      var shuffled = options.slice();
      for (var k = shuffled.length - 1; k > 0; k--) {
        var r = Math.floor(Math.random() * (k + 1));
        var tmp = shuffled[k]; shuffled[k] = shuffled[r]; shuffled[r] = tmp;
      }
      var ansLetter = letters[shuffled.indexOf(correctOpt)];
      questions.push(q(no, "According to the passage, which statement is correct?", ansLetter, item.para, item.sent, {
        options: shuffled,
        trap: "干扰项使用实体偷换（" + swap.a + " → " + swap.b + "）：这是最常见的选择题陷阱。",
        explain: "本题为机器生成：正确选项对应原文定位句中的「" + entity + "」；其余选项要么把实体偷换成文中未出现的「" + swap.b + "」，要么是无中生有。做题时拿每个选项回原文核对实体与程度。"
      }));
      no++;
    }
    return {
      id: "g-mcq", type: "mcq", generated: true,
      instruction: "Choose the correct letter, A, B, C or D.",
      questions: questions
    };
  }

  /* ---------- 主入口：整卷生成 ---------- */
  // opts: { types: ["tfng","gapfill","headings","mcq"], tfngCount, gapfillCount, mcqCount }
  function generateExam(paragraphs, opts) {
    opts = opts || {};
    var types = opts.types || ["tfng", "gapfill", "headings"];
    var groups = [];
    if (types.indexOf("tfng") !== -1) groups.push(genTrueFalse(paragraphs, opts.tfngCount || 6));
    if (types.indexOf("gapfill") !== -1) groups.push(genGapfill(paragraphs, opts.gapfillCount || 3));
    if (types.indexOf("headings") !== -1 && paragraphs.length >= 2) groups.push(genHeadings(paragraphs));
    if (types.indexOf("mcq") !== -1) groups.push(genMcq(paragraphs, opts.mcqCount || 3));
    if (!groups.length) return null;
    // 重排题号（跨题型连续）
    var no = 1;
    groups.forEach(function (g) {
      (g.questions || []).forEach(function (qq) { qq.no = no++; });
    });
    return { sections: [{ id: "s1", title: "READING PASSAGE 1", paragraphs: paragraphs, questionGroups: groups }] };
  }

  /* ---------- 自检：供测试与保存前校验 ---------- */
  function verifyExam(exam, paragraphs) {
    var issues = [];
    var fullText = paragraphs.map(function (p) { return p.text; }).join(" ");
    var lowFull = fullText.toLowerCase();
    (exam.sections || []).forEach(function (sec) {
      (sec.questionGroups || []).forEach(function (g) {
        (g.questions || []).forEach(function (qq) {
          var tag = "Q" + qq.no + "(" + g.type + ")";
          if (!qq.keySentence || fullText.indexOf(qq.keySentence) === -1) {
            issues.push(tag + " 定位句未命中原文");
          }
          if (!qq.answer && !(qq.answers && qq.answers.length)) issues.push(tag + " 无答案");
          if (g.type === "tfng") {
            if (["TRUE", "FALSE", "NOT GIVEN"].indexOf(qq.answer) === -1) issues.push(tag + " TFNG 答案非法");
            if (qq.answer === "FALSE" && !/ not | cannot | may not | less | worse | slower | smaller | lower | weaker /i.test(" " + qq.stem + " ")) {
              issues.push(tag + " FALSE 题未检出反向标记");
            }
            if (qq.answer === "NOT GIVEN" && !qq.trap) issues.push(tag + " NG 题缺少陷阱说明");
          }
          if (g.type === "gapfill") {
            var ans = (qq.answers || [qq.answer])[0];
            if (lowFull.indexOf(String(ans).toLowerCase()) === -1) issues.push(tag + " 填空答案不在原文");
            if (qq.stem.indexOf("____") === -1) issues.push(tag + " 填空题干无空");
          }
        });
      });
    });
    return { ok: issues.length === 0, issues: issues };
  }

  return {
    generateExam: generateExam, verifyExam: verifyExam,
    splitSentences: splitSentences, toFalseStem: toFalseStem, toNgStem: toNgStem,
    toTrueStem: toTrueStem, pickSentences: pickSentences
  };
})();

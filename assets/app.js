/* ============================================================
 * 雅思阅读练习平台 · 主交互
 * 视图：home(题库) / exam(答题) / report(分析报告) / history(记录)
 * ============================================================ */
(function () {
  "use strict";

  var LS = {
    custom: "rl_custom_exams",
    history: "rl_history",
    wrong: "rl_wrongbook",
    vocab: "rl_vocabbook"
  };

  function readLS(key, def) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e) { return def; }
  }
  function writeLS(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  function el(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function fmtTime(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return h ? h + ":" + p(m) + ":" + p(s) : p(m) + ":" + p(s);
  }
  function toast(msg) {
    var t = el("toast");
    t.textContent = msg;
    t.className = "toast show";
    clearTimeout(t._timer);
    t._timer = setTimeout(function () { t.className = "toast"; }, 2200);
  }

  /* ---------- 全局状态 ---------- */
  var state = {
    view: "home",
    exam: null,            // 当前试卷
    answers: {},           // { 题号: 答案 }
    mode: "practice",      // practice 练习 | exam 考试
    seconds: 0,
    timer: null,
    startAt: 0,
    hints: {},             // { 题号: true } 已看提示
    wrongFilter: null,
    report: null,          // 上次分析结果
    importRows: [],        // 导入表单行
    homeTab: "book",        // 题库页 tab: book|scene|type
    homeBook: null,        // 当前选中的书卷
    homeTypeFilter: null,  // 题型筛选
    communityManifest: null // 社区题库索引缓存
  };

  function allExams() {
    return (window.EXAMS || []).concat(readLS(LS.custom, []));
  }
  function getExam(id) {
    var list = allExams();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function bestScore(examId) {
    var h = readLS(LS.history, []);
    var best = null;
    h.forEach(function (r) {
      if (r.examId === examId && (best === null || r.correct / r.total > best.correct / best.total)) best = r;
    });
    return best;
  }

  /* ---------- 路由 ---------- */
  function show(view) {
    state.view = view;
    ["home", "exam", "report", "history"].forEach(function (v) {
      el("view-" + v).className = "view" + (v === view ? " active" : "");
    });
    var navMap = { home: "nav-home", exam: "", report: "", history: "nav-history" };
    ["nav-home", "nav-history"].forEach(function (n) {
      el(n).className = navMap[view] === n ? "active" : "";
    });
    el("examTopbar").style.display = view === "exam" || view === "report" ? "" : "none";
    window.scrollTo(0, 0);
  }

  /* ---------- 首页：题库列表（按套卷/场景/题型） ---------- */
  function examStats(examId) {
    var h = readLS(LS.history, []).filter(function (r) { return r.examId === examId; });
    return {
      times: h.length,
      last: h.length ? h[0] : null,   // history 是倒序存放，第一条即最近
      best: bestScore(examId)
    };
  }
  function difficultyBadge(d) {
    var cls = d === "易" ? "diff-e" : d === "中" ? "diff-m" : "diff-h";
    return '<span class="diff-badge ' + cls + '">' + esc(d || "中") + "</span>";
  }
  function bookShort(ex) { return ex.book || "样题"; }

  // 是否非内置试卷（可删除）：按 id 判断，兼容导入、题库包、社区下载三种来源
  function isCustomExam(ex) {
    return !(window.EXAMS || []).some(function (e) { return e.id === ex.id; });
  }

  function examRow(ex) {
    var st = examStats(ex.id);
    var custom = isCustomExam(ex);
    return '<div class="exam-row" data-id="' + esc(ex.id) + '">' +
      '<div class="cell-diff">' + difficultyBadge(ex.difficulty) + "</div>" +
      '<div class="cell-title"><b>' + esc(ex.title) + "</b>" +
      '<div class="row-sub">' + esc(ex.titleCn || "") + (ex.minutes ? " · 建议" + ex.minutes + "分钟 · " + window.RLEngine.collectQuestions(ex).length + "题" : "") + "</div></div>" +
      '<div class="cell-num">' + st.times + "</div>" +
      '<div class="cell-score">' + (st.last ? '<span class="pill ' + (st.last.correct / st.last.total >= 0.6 ? "ok" : "bad") + '">' + st.last.correct + "/" + st.last.total + "</span>" : '<span style="color:#9ca3af">-</span>') + "</div>" +
      '<div class="cell-op">' +
      (st.times ? '<button class="link-btn" data-act="redo">重新练习</button>' : '<button class="link-btn" data-act="start">开始练习</button>') +
      (custom ? '<button class="link-btn danger" data-act="del">删除</button>' : "") +
      "</div></div>";
  }

  function renderHome() {
    var exams = allExams();
    var tab = state.homeTab || "book";
    var bookList = [];
    var bookMap = {};
    exams.forEach(function (ex) {
      var b = bookShort(ex);
      if (!bookMap[b]) { bookMap[b] = []; bookList.push(b); }
      bookMap[b].push(ex);
    });
    bookList.sort(function (a, b) {
      var na = parseInt(String(a).replace(/\D/g, ""), 10), nb = parseInt(String(b).replace(/\D/g, ""), 10);
      if (!isNaN(na) && !isNaN(nb)) return nb - na;
      return a < b ? -1 : 1;
    });

    var html = '<div class="home-tabs">' +
      [["book", "按套题练"], ["scene", "按场景练"], ["type", "按题型练"]].map(function (t) {
        return '<button data-htab2="' + t[0] + '" class="' + (tab === t[0] ? "active" : "") + '">' + t[1] + "</button>";
      }).join("") + "</div>";

    if (tab === "book") {
      html += '<div class="book-bar">' + bookList.map(function (b) {
        return '<button class="book-btn' + (state.homeBook === b ? " active" : "") + '" data-book="' + esc(b) + '">' + esc(b) + "</button>";
      }).join("") + "</div>";
      var cur = state.homeBook && bookMap[state.homeBook] ? state.homeBook : bookList[0];
      var list = bookMap[cur] || [];
      html += '<div class="exam-table"><div class="exam-row head"><div class="cell-diff">难度系数</div><div class="cell-title">标题</div><div class="cell-num">累计作答次数</div><div class="cell-score">上次成绩</div><div class="cell-op">操作</div></div>' +
        list.map(examRow).join("") + "</div>";
      if (!list.length) html += '<div class="empty">该书卷下暂无试卷，点右上角「导入真题」添加。</div>';
    } else if (tab === "scene") {
      var tagMap = {};
      exams.forEach(function (ex) {
        (ex.tags || ["其他"]).forEach(function (t) {
          if (!tagMap[t]) tagMap[t] = [];
          tagMap[t].push(ex);
        });
      });
      html += '<div class="sec-title">按话题/场景 <span class="count">' + Object.keys(tagMap).length + " 个场景</span></div>";
      Object.keys(tagMap).forEach(function (t) {
        html += '<div class="scene-block"><div class="scene-name">' + esc(t) + "</div>" +
          '<div class="scene-cards">' + tagMap[t].map(function (ex) {
            var st = examStats(ex.id);
            return '<div class="exam-card mini" data-id="' + esc(ex.id) + '"><h4>' + esc(ex.title) + "</h4>" +
              '<div class="meta">' + difficultyBadge(ex.difficulty) + "<span>" + window.RLEngine.collectQuestions(ex).length + "题</span></div>" +
              (st.last ? '<div class="best">上次 ' + st.last.correct + "/" + st.last.total + "</div>" : "") + "</div>";
          }).join("") + "</div></div>";
      });
    } else {
      var typeMap = {};
      exams.forEach(function (ex) {
        (ex.sections || []).forEach(function (sec) {
          (sec.questionGroups || []).forEach(function (g) {
            var tn = window.RLEngine.questionTypeName(g.type);
            if (!typeMap[tn]) typeMap[tn] = { count: 0, exams: [] };
            typeMap[tn].count += (g.questions || []).length;
            if (typeMap[tn].exams.indexOf(ex.id) === -1) typeMap[tn].exams.push(ex.id);
          });
        });
      });
      html += '<div class="sec-title">按题型 <span class="count">点击题型查看包含它的试卷</span></div>';
      html += '<div class="type-filter">' + Object.keys(typeMap).map(function (t) {
        return '<button class="type-btn" data-type="' + esc(t) + '"><b>' + typeMap[t].count + "</b>题<br>" + esc(t) + "</button>";
      }).join("") + "</div>";
      var ft = state.homeTypeFilter;
      if (ft && typeMap[ft]) {
        html += '<div class="sec-title">「' + esc(ft) + "」涉及的试卷</div>";
        html += '<div class="exam-table">' + typeMap[ft].exams.map(function (id) {
          var ex = getExam(id);
          return ex ? examRow(ex) : "";
        }).join("") + "</div>";
      }
    }
    el("examGrid").innerHTML = html;
    el("examCount").textContent = "共 " + exams.length + " 套 · " + bookList.length + " 个书卷";

    Array.prototype.forEach.call(el("examGrid").querySelectorAll("[data-book]"), function (btn) {
      btn.addEventListener("click", function () {
        state.homeBook = btn.getAttribute("data-book");
        renderHome();
      });
    });
    Array.prototype.forEach.call(el("examGrid").querySelectorAll("[data-htab2]"), function (btn) {
      btn.addEventListener("click", function () {
        state.homeTab = btn.getAttribute("data-htab2");
        state.homeTypeFilter = null;
        renderHome();
      });
    });
    Array.prototype.forEach.call(el("examGrid").querySelectorAll("[data-type]"), function (btn) {
      btn.addEventListener("click", function () {
        state.homeTypeFilter = btn.getAttribute("data-type");
        renderHome();
      });
    });
    Array.prototype.forEach.call(el("examGrid").querySelectorAll(".exam-row[data-id], .exam-card.mini[data-id]"), function (row) {
      row.addEventListener("click", function (e) {
        var del = e.target.getAttribute && e.target.getAttribute("data-act") === "del";
        if (del) {
          e.stopPropagation();
          if (confirm("确定删除这份导入的试卷？")) {
            var list = readLS(LS.custom, []).filter(function (x) { return x.id !== row.getAttribute("data-id"); });
            writeLS(LS.custom, list);
            renderHome();
            toast("已删除");
          }
          return;
        }
        startExam(row.getAttribute("data-id"));
      });
    });
  }

  /* ---------- 开始答题 ---------- */
  function startExam(id, mode) {
    var ex = getExam(id);
    if (!ex) return;
    state.exam = ex;
    state.answers = {};
    state.hints = {};
    state.mode = mode || "practice";
    state.seconds = 0;
    state.startAt = Date.now();
    clearInterval(state.timer);
    state.timer = setInterval(function () {
      state.seconds = Math.floor((Date.now() - state.startAt) / 1000);
      var t = el("timer");
      if (t) {
        t.textContent = fmtTime(state.seconds);
        if (state.mode === "exam" && ex.minutes) {
          var left = ex.minutes * 60 - state.seconds;
          t.textContent = "剩余 " + fmtTime(Math.max(left, 0));
          t.className = "timer" + (left < 120 ? " urgent" : "");
          if (left <= 0) {
            clearInterval(state.timer);
            toast("考试时间到，自动交卷");
            submitExam();
          }
        }
      }
    }, 1000);
    show("exam");
    renderExam();
  }

  /* ---------- 渲染答题页 ---------- */
  function renderExam() {
    var ex = state.exam;
    var sec = ex.sections[0];

    el("examTitle").textContent = ex.title + (ex.titleCn ? " · " + ex.titleCn : "");

    // 文章面板（答题页为纯文本，不提供查词/重点词，交卷后才解锁）
    var passage = "";
    sec.paragraphs.forEach(function (p) {
      passage += '<p class="para" id="para-' + esc(p.id) + '">' +
        '<span class="para-label">' + esc(p.id) + "</span>" +
        renderSentences(p) + "</p>";
    });
    el("passageBody").innerHTML = passage;

    // 题目面板
    var qs = "";
    (sec.questionGroups || []).forEach(function (g) {
      qs += renderGroup(g, sec);
    });
    el("questionBody").innerHTML = qs +
      '<div class="q-actions">' +
      '<button class="btn warn" id="btnSubmit">交卷并分析</button>' +
      '<button class="btn ghost" id="btnClear">清空答案</button>' +
      '<button class="btn ghost" id="btnQuit">退出</button>' +
      "</div>";

    bindQuestionEvents();
    updateProgress();
    el("timer").className = "timer";
    if (state.mode === "exam" && ex.minutes) {
      el("timer").textContent = "剩余 " + fmtTime(ex.minutes * 60);
    } else {
      el("timer").textContent = fmtTime(state.seconds);
    }
  }

  /* 文章正文渲染
   * interactive=false（默认）：答题页使用，纯文本，无任何可点击元素
   * interactive=true：报告页使用，逐词包裹（点词查释义），本卷重点词高亮
   * 说明：查词与重点词汇功能只允许在交卷后的报告页出现 */
  function renderSentences(p, interactive) {
    var vocabMap = {};
    ((state.exam && state.exam.vocabulary) || []).forEach(function (v) {
      vocabMap[v.word.toLowerCase()] = v;
    });
    var sents = window.RLEngine.splitSentences(p.text);
    return sents.map(function (s, i) {
      var text;
      if (interactive) {
        // 先按词切分再分别转义，避免 esc 后的实体（&amp; 等）被误当单词包裹
        text = s.split(/([A-Za-z][A-Za-z'-]*)/).map(function (part) {
          if (!/^[A-Za-z][A-Za-z'-]*$/.test(part)) return esc(part);
          var lw = part.toLowerCase();
          var isVocab = !!vocabMap[lw];
          return '<span class="w' + (isVocab ? " vocab-word" : "") + '" data-w="' + esc(lw) + '">' + esc(part) + "</span>";
        }).join("");
      } else {
        text = esc(s);
      }
      return '<span class="sentence" data-s="' + esc(p.id) + "-" + i + '">' + text + "</span> ";
    }).join("");
  }

  /* ---------- 题目组渲染 ---------- */
  function renderGroup(g, sec) {
    var html = '<div class="qgroup" id="group-' + esc(g.id) + '">' +
      '<div class="instruction">' + esc(g.instruction) + "</div>" +
      (g.note ? '<div class="note">提示：' + esc(g.note) + "</div>" : "");

    if (g.type === "headings" && g.headings) {
      html += '<div class="heading-pool">' + g.headings.map(function (h) {
        return "<div>" + esc(h) + "</div>";
      }).join("") + "</div>";
    }
    if (g.type === "matching" && g.poolLabels) {
      html += '<div class="matching-pool">' + g.poolLabels.map(function (l) {
        return "<div>" + esc(l) + "</div>";
      }).join("") + "</div>";
    }

    g.questions.forEach(function (q) {
      html += renderQuestion(q, g);
    });
    return html + "</div>";
  }

  function renderQuestion(q, g) {
    var key = "q" + q.no;
    var val = state.answers[q.no];
    var html = '<div class="q-item" id="' + key + '">' +
      '<div class="stem"><span class="no">' + q.no + '.</span>' + esc(q.stem) +
      (g.type === "headings" ? "" : "") +
      (state.mode === "practice" ? '<button class="hint-btn" data-hint="' + q.no + '">看提示</button>' : "") +
      "</div>";

    if (g.type === "tfng" || g.type === "ynng") {
      var opts = g.options || (g.type === "ynng" ? ["YES", "NO", "NOT GIVEN"] : ["TRUE", "FALSE", "NOT GIVEN"]);
      html += '<div class="opts">' + opts.map(function (o) {
        return '<button class="opt' + (val === o ? " sel" : "") + '" data-q="' + q.no + '" data-v="' + esc(o) + '">' + esc(o) + "</button>";
      }).join("") + "</div>";
    } else if (g.type === "mcq") {
      (q.options || []).forEach(function (o, i) {
        var letter = String.fromCharCode(65 + i);
        html += '<div class="opts" style="margin-bottom:6px"><button class="opt' +
          (val === letter ? " sel" : "") + '" data-q="' + q.no + '" data-v="' + letter + '">' +
          "<b>" + letter + ".</b> " + esc(o) + "</button></div>";
      });
    } else if (g.type === "gapfill") {
      html += '<input class="gapfill-input" type="text" data-q="' + q.no + '" placeholder="输入答案（可用小写）" value="' + esc(val || "") + '">';
    } else if (g.type === "matching") {
      html += '<select class="matching-select" data-q="' + q.no + '"><option value="">— 选择 —</option>' +
        (g.poolLabels || g.pool || []).map(function (o) {
          var v = o.trim().split(/\s+/)[0];
          return '<option value="' + esc(v) + '"' + (val === v ? " selected" : "") + ">" + esc(o) + "</option>";
        }).join("") + "</select>";
    } else if (g.type === "headings") {
      var paraId = q.stem.replace(/^Paragraph\s*/i, "");
      html += '<select class="heading-select" data-q="' + q.no + '"><option value="">— 选择罗马数字 —</option>' +
        (g.headings || []).map(function (h) {
          var v = h.trim().split(/\s+/)[0];
          return '<option value="' + esc(v) + '"' + (val === v ? " selected" : "") + ">" + esc(h) + "</option>";
        }).join("") + "</select>";
    }
    html += '<div class="hint-box" id="hint-' + q.no + '" style="display:none"></div>';
    html += "</div>";
    return html;
  }

  function bindQuestionEvents() {
    var body = el("questionBody");
    Array.prototype.forEach.call(body.querySelectorAll(".opt"), function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.getAttribute("data-q");
        state.answers[q] = btn.getAttribute("data-v");
        Array.prototype.forEach.call(body.querySelectorAll('[data-q="' + q + '"]'), function (b2) {
          b2.className = "opt" + (b2 === btn ? " sel" : "");
        });
        updateProgress();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".gapfill-input"), function (inp) {
      inp.addEventListener("input", function () {
        state.answers[inp.getAttribute("data-q")] = inp.value;
        updateProgress();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll("select"), function (sel) {
      sel.addEventListener("change", function () {
        state.answers[sel.getAttribute("data-q")] = sel.value;
        updateProgress();
      });
    });
    Array.prototype.forEach.call(body.querySelectorAll(".hint-btn"), function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.getAttribute("data-hint");
        var box = el("hint-" + q);
        if (box.style.display === "none") {
          if (!state.hints[q]) {
            state.hints[q] = true;
          }
          var found = findQuestion(q);
          var tips = window.RLEngine.detectTrap(found.q.stem, found.q.keySentence);
          box.innerHTML = "<b>定位建议：</b>" +
            (found.q.keyPara ? "重点读 " + found.q.keyPara + " 段。" : "先从题干专有名词/数字入手回文定位。") +
            (tips.length ? "<br><b>注意：</b>" + esc(tips[0]) : "") +
            (found.q.keySentence ? "<br><b>关键句：</b>" + esc(maskSentence(found.q.keySentence)) : "");
          box.style.display = "block";
        } else {
          box.style.display = "none";
        }
      });
    });
    el("btnSubmit").addEventListener("click", submitExam);
    el("btnClear").addEventListener("click", function () {
      if (!confirm("确定清空所有答案？")) return;
      state.answers = {};
      renderExam();
    });
    el("btnQuit").addEventListener("click", function () {
      if (confirm("退出将丢失本次作答，确定？")) {
        clearInterval(state.timer);
        renderHome();
        show("home");
      }
    });
  }

  // 提示态：把关键句挖掉关键词，避免直接给答案
  function maskSentence(s) {
    return s.split(/\s+/).map(function (w, i) {
      if (i % 3 === 1 && w.length > 4) return w[0] + "____";
      return w;
    }).join(" ");
  }

  function findQuestion(no) {
    var qs = window.RLEngine.collectQuestions(state.exam);
    for (var i = 0; i < qs.length; i++) if (String(qs[i].q.no) === String(no)) return qs[i];
    return null;
  }

  function updateProgress() {
    var total = window.RLEngine.collectQuestions(state.exam).length;
    var done = Object.keys(state.answers).filter(function (k) {
      var v = state.answers[k];
      return v != null && String(v).trim() !== "";
    }).length;
    el("progress").textContent = "已答 " + done + "/" + total;
  }

  /* ---------- 交卷与分析 ---------- */
  function submitExam() {
    clearInterval(state.timer);
    var report = window.RLEngine.analyzeExam(state.exam, state.answers, state.seconds);
    state.report = report;
    // 历史记录
    var history = readLS(LS.history, []);
    history.unshift({
      examId: report.examId, examTitle: report.examTitle, examTitleCn: report.examTitleCn,
      date: Date.now(), correct: report.correct, total: report.total,
      band: report.band, seconds: report.seconds, wrongNos: report.wrongNos
    });
    writeLS(LS.history, history.slice(0, 60));
    // 错题本
    var wrong = readLS(LS.wrong, []);
    report.results.forEach(function (r) {
      if (r.correct) return;
      wrong = wrong.filter(function (w) { return !(w.examId === report.examId && w.no === r.no); });
      wrong.unshift({
        examId: report.examId, examTitle: report.examTitle, no: r.no, typeName: r.typeName,
        stem: r.stem, yourAnswer: r.yourAnswer, rightAnswer: r.rightAnswer,
        keyPara: r.keyPara, keySentence: r.keySentence, keySentenceCn: r.keySentenceCn,
        explain: r.explain, date: Date.now()
      });
    });
    writeLS(LS.wrong, wrong.slice(0, 120));
    renderReport();
    show("report");
  }

  function renderReport() {
    var r = state.report;
    var ex = state.exam;
    var pct = r.accuracy;
    var C = 2 * Math.PI * 52;
    var dash = Math.max((pct / 100) * C, 0.001);
    var color = pct >= 80 ? "#16a34a" : pct >= 60 ? "#d97706" : "#dc2626";

    el("scoreRing").innerHTML =
      '<svg width="120" height="120"><circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" stroke-width="11"/>' +
      '<circle cx="60" cy="60" r="52" fill="none" stroke="' + color + '" stroke-width="11" stroke-linecap="round" stroke-dasharray="' + dash + " " + C + '"/></svg>' +
      '<div class="num">' + r.correct + "/" + r.total + "<br><small>正确率 " + pct + "%</small></div>";
    el("reportMeta").innerHTML =
      "<h2>" + esc(r.examTitleCn || "") + " · 分析报告</h2>" +
      '<div style="font-size:13px;color:#6b7280">' + esc(ex.source || "") + " · " + esc(state.mode === "exam" ? "考试模式" : "练习模式") + "</div>" +
      '<div class="stat-row">' +
      '<div class="stat"><b style="color:' + color + '">' + r.band + "</b><span>估算 Band</span></div>" +
      '<div class="stat"><b>' + r.correct + "</b><span>答对</span></div>" +
      '<div class="stat"><b>' + r.wrong + "</b><span>答错</span></div>" +
      '<div class="stat"><b>' + fmtTime(r.seconds) + "</b><span>用时</span></div>" +
      "</div>" +
      '<div class="type-chips">' + Object.keys(r.perType).map(function (t) {
        var s = r.perType[t];
        var ratio = s.correct / s.total;
        var cls = ratio >= 0.8 ? "full" : ratio >= 0.5 ? "half" : "low";
        return '<div class="type-chip ' + cls + '"><b>' + s.correct + "/" + s.total + "</b>" + esc(t) + "</div>";
      }).join("") + "</div>";

    el("reportActions").innerHTML =
      '<button class="btn" id="btnCopyReport">复制报告（发给 AI 深度分析）</button>' +
      '<button class="btn ghost" id="btnRedo">再做一次</button>' +
      '<button class="btn ghost" id="btnBackHome">返回题库</button>';

    // 文章面板（用于定位联动）
    var sec = ex.sections[0];
    var passage = "";
    sec.paragraphs.forEach(function (p) {
      passage += '<p class="para" id="rpara-' + esc(p.id) + '">' +
        '<span class="para-label">' + esc(p.id) + "</span>" +
        renderSentences(p, true) + "</p>";
    });
    if ((ex.vocabulary || []).length) {
      passage += '<div class="qgroup"><div class="panel-title">全文重点词汇 <span class="tag">Vocabulary</span></div>' +
        '<table class="vocab-table"><tr><th>词汇</th><th>释义</th><th>真题例句</th><th></th></tr>' +
        ex.vocabulary.map(function (v) {
          return "<tr><td>" + esc(v.word) + "</td><td>" + esc(v.meaning) + "</td>" +
            '<td class="sent">' + esc(v.sentence) + (v.sentenceCn ? "<br>" + esc(v.sentenceCn) : "") + "</td>" +
            '<td><button class="add-word" data-vw="' + esc(v.word) + "|" + esc(v.meaning) + '">＋生词本</button></td></tr>';
        }).join("") + "</table></div>";
    }
    el("reportPassage").innerHTML =
      '<div class="dict-hint">💡 交卷后已解锁：点击正文<b>任意单词</b>可查释义；蓝色虚线下划线词为本卷重点词。</div>' + passage;

    // 逐题解析卡
    var cards = "";
    r.results.forEach(function (res) {
      cards += '<div class="ans-card ' + (res.correct ? "ok" : "bad") + '" id="ans-' + res.no + '">' +
        '<div class="ans-card-head">' +
        '<span class="no">' + (res.correct ? "✓" : "✗") + " Q" + res.no + "</span>" +
        '<span class="type-tag">' + esc(res.typeName) + "</span>" +
        (res.correct ? "" : '<span class="right">你的答案 <span class="wrong-val">' + esc(res.yourAnswer) + "</span> → 正确 <span class=\"right-val\">" + esc(res.rightAnswer) + "</span></span>") +
        "</div>" +
        '<div class="ans-card-body">' +
        '<div class="kv"><b>题目</b>' + esc(res.stem) + "</div>" +
        (res.options ? '<div class="kv" style="color:#6b7280;font-size:13px"><b>选项</b>' + res.options.map(function (o, i) {
          return String.fromCharCode(65 + i) + ")" + esc(o);
        }).join("  ") + "</div>" : "") +
        (res.keySentence ?
          '<div class="quote-box"><div class="loc">原文定位 · ' + esc(res.keyPara || "?") + " 段</div>" +
          '<span id="q-' + res.no + '">' + esc(res.keySentence) + '</span>' +
          (res.keySentenceCn ? '<div class="trans">译文：' + esc(res.keySentenceCn) + "</div>" : "") +
          '<div style="margin-top:6px"><button class="hint-btn" data-locate="' + res.no + '" style="margin-left:0">在左侧文章中高亮原句</button></div></div>'
          : "") +
        '<div class="tips">' +
        (res.explain ? '<div class="tip explain">' + esc(res.explain) + "</div>" : "") +
        (res.paraphrase && res.paraphrase.length ? '<div class="tip para">同义替换线索：' +
          res.paraphrase.map(function (p) { return "题干「" + esc(p[0]) + "」↔ 原文「" + esc(p[1]) + "」"; }).join("；") + "</div>" : "") +
        (res.trap ? '<div class="tip trap">' + esc(res.trap) + "</div>" : "") +
        (res.autoTrap || []).map(function (t) { return '<div class="tip trap">' + esc(t) + "</div>"; }).join("") +
        "</div>" +
        (res.words && res.words.length ? '<div class="word-chips">' + res.words.map(function (w) {
          return '<span class="word-chip">' + esc(w) + "</span>";
        }).join("") + "</div>" : "") +
        "</div></div>";
    });
    el("reportAnswers").innerHTML = cards;

    // 事件
    el("btnRedo").addEventListener("click", function () { startExam(state.exam.id, state.mode); });
    el("btnBackHome").addEventListener("click", function () {
      renderHome();
      show("home");
    });
    el("btnCopyReport").addEventListener("click", copyReport);
    Array.prototype.forEach.call(el("reportAnswers").querySelectorAll("[data-locate]"), function (btn) {
      btn.addEventListener("click", function () {
        var no = btn.getAttribute("data-locate");
        locateSentence(no);
      });
    });
    Array.prototype.forEach.call(el("reportPassage").querySelectorAll(".add-word"), function (btn) {
      btn.addEventListener("click", function () {
        var parts = btn.getAttribute("data-vw").split("|");
        addVocab(parts[0], parts[1], state.exam.title);
      });
    });
  }

  // 在文章面板高亮某题定位句并滚动
  function locateSentence(no) {
    var found = null;
    state.report.results.forEach(function (r) { if (String(r.no) === String(no)) found = r; });
    if (!found || !found.keySentence) return;
    var sents = document.querySelectorAll("#reportPassage .sentence");
    var target = null;
    var key = found.keySentence.toLowerCase().replace(/\s+/g, " ").trim();
    Array.prototype.forEach.call(sents, function (sp) {
      sp.className = "sentence";
      var txt = sp.textContent.toLowerCase().replace(/\s+/g, " ").trim();
      if (!target && txt.length > 20 && (txt.indexOf(key) !== -1 || key.indexOf(txt) !== -1)) target = sp;
    });
    if (target) {
      target.className = "sentence hl-active";
      if (state.view === "exam" || window.innerWidth > 960) {
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        toast("已定位到原文第 " + found.keyPara + " 段");
      }
    }
  }

  function copyReport() {
    var r = state.report;
    var lines = [];
    lines.push("【雅思阅读练习报告】");
    lines.push("试卷：" + r.examTitle + "（" + (r.examTitleCn || "") + "）");
    lines.push("成绩：" + r.correct + "/" + r.total + " · 正确率 " + r.accuracy + "% · Band≈" + r.band + " · 用时 " + fmtTime(r.seconds));
    lines.push("");
    lines.push("—— 错题与原文定位 ——");
    r.results.forEach(function (res) {
      lines.push("Q" + res.no + "【" + res.typeName + "】" + (res.correct ? " 对" : " 错"));
      lines.push("  题干：" + res.stem);
      lines.push("  我的答案：" + res.yourAnswer + " | 正确答案：" + res.rightAnswer);
      if (res.keySentence) {
        lines.push("  定位（" + (res.keyPara || "?") + "段）：" + res.keySentence);
        if (res.keySentenceCn) lines.push("  译文：" + res.keySentenceCn);
      }
      if (res.explain) lines.push("  解析：" + res.explain);
      if (res.paraphrase && res.paraphrase.length) {
        lines.push("  同义替换：" + res.paraphrase.map(function (p) { return p[0] + " ↔ " + p[1]; }).join("；"));
      }
      lines.push("");
    });
    lines.push("请帮我逐题分析错因，并给出针对性的提升建议。");
    var text = lines.join("\n");
    function done() { toast("报告已复制，可直接粘贴发给 AI 分析"); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
      fallbackCopy(text); done();
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast("已复制"); }, function () { fallbackCopy(text); toast("已复制"); });
    } else { fallbackCopy(text); toast("已复制"); }
  }

  /* ---------- 生词本 ---------- */
  function addVocab(word, meaning, from) {
    var book = readLS(LS.vocab, []);
    if (book.some(function (v) { return v.word === word; })) { toast("生词本里已有该词"); return; }
    book.unshift({ word: word, meaning: meaning, from: from || "", date: Date.now() });
    writeLS(LS.vocab, book);
    toast("已加入生词本：" + word);
  }

  /* ---------- 记录页（历史/错题本/生词本） ---------- */
  var historyTab = "history";
  function renderHistory() {
    var html = '<div class="mobile-tabs" style="display:flex">' +
      ["history", "wrong", "vocab"].map(function (t) {
        var names = { history: "练习记录", wrong: "错题本", vocab: "生词本" };
        return '<button data-htab="' + t + '" class="' + (historyTab === t ? "active" : "") + '">' + names[t] + "</button>";
      }).join("") + "</div>";

    if (historyTab === "history") {
      var list = readLS(LS.history, []);
      if (!list.length) {
        html += '<div class="empty">还没有练习记录，去题库做一套题吧。</div>';
      } else {
        html += '<table class="history-table"><tr><th>时间</th><th>试卷</th><th>成绩</th><th>Band</th><th>用时</th><th>错题号</th></tr>' +
          list.map(function (r) {
            var d = new Date(r.date);
            return "<tr><td>" + (d.getMonth() + 1) + "/" + d.getDate() + " " + d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes() + "</td>" +
              "<td>" + esc(r.examTitle) + "<br><span style='color:#9ca3af;font-size:12px'>" + esc(r.examTitleCn || "") + "</span></td>" +
              '<td><span class="pill ' + (r.correct / r.total >= 0.6 ? "ok" : "bad") + '">' + r.correct + "/" + r.total + "</span></td>" +
              "<td>" + r.band + "</td><td>" + fmtTime(r.seconds) + "</td>" +
              "<td>" + (r.wrongNos.length ? r.wrongNos.join(", ") : "—") + "</td></tr>";
          }).join("") + "</table>";
      }
    } else if (historyTab === "wrong") {
      var wrong = readLS(LS.wrong, []);
      if (!wrong.length) {
        html += '<div class="empty">错题本是空的，保持这个状态 🙂</div>';
      } else {
        html += '<div class="sec-title">错题本 <span class="count">' + wrong.length + " 题（再对了会自动提示移除）</span></div>";
        wrong.forEach(function (w) {
          html += '<div class="ans-card bad" style="border-left-color:#dc2626">' +
            '<div class="ans-card-head"><span class="no">Q' + w.no + '</span><span class="type-tag">' + esc(w.typeName) + '</span>' +
            '<span class="right">' + esc(w.examTitle) + "</span></div>" +
            '<div class="ans-card-body">' +
            '<div class="kv"><b>题目</b>' + esc(w.stem) + "</div>" +
            '<div class="kv"><b>你错选</b><span class="wrong-val">' + esc(w.yourAnswer) + '</span> <b>正确</b><span class="right-val">' + esc(w.rightAnswer) + "</span></div>" +
            (w.keySentence ? '<div class="quote-box"><div class="loc">原文定位 · ' + esc(w.keyPara || "?") + ' 段</div>' + esc(w.keySentence) +
              (w.keySentenceCn ? '<div class="trans">译文：' + esc(w.keySentenceCn) + "</div>" : "") + "</div>" : "") +
            (w.explain ? '<div class="tips"><div class="tip explain">' + esc(w.explain) + "</div></div>" : "") +
            '<div style="margin-top:10px"><button class="hint-btn" data-wredeme="' + esc(w.examId) + '" style="margin-left:0">重做这套题</button></div>' +
            "</div></div>";
        });
      }
    } else {
      var book = readLS(LS.vocab, []);
      html += '<div class="sec-title">生词本 <span class="count">' + book.length + " 词</span></div>";
      if (!book.length) {
        html += '<div class="empty">生词本是空的。在文章或词表里点「＋生词本」即可收录。</div>';
      } else {
        html += '<table class="history-table"><tr><th>词汇</th><th>释义</th><th>来源</th><th></th></tr>' +
          book.map(function (v, i) {
            return "<tr><td>" + esc(v.word) + "</td><td>" + esc(v.meaning) + "</td><td>" + esc(v.from || "") + "</td>" +
              '<td><button class="add-word" data-vdel="' + i + '">移除</button></td></tr>';
          }).join("") + "</table>";
      }
    }
    el("view-history").innerHTML = html;
    Array.prototype.forEach.call(el("view-history").querySelectorAll("[data-htab]"), function (btn) {
      btn.addEventListener("click", function () { historyTab = btn.getAttribute("data-htab"); renderHistory(); });
    });
    Array.prototype.forEach.call(el("view-history").querySelectorAll("[data-wredeme]"), function (btn) {
      btn.addEventListener("click", function () { startExam(btn.getAttribute("data-wredeme"), "practice"); });
    });
    Array.prototype.forEach.call(el("view-history").querySelectorAll("[data-vdel]"), function (btn) {
      btn.addEventListener("click", function () {
        var book = readLS(LS.vocab, []);
        book.splice(Number(btn.getAttribute("data-vdel")), 1);
        writeLS(LS.vocab, book);
        renderHistory();
      });
    });
  }

  /* ---------- 导入文章（自动出题 / 手动出题 / 混合） ---------- */
  function openImport() {
    state.importRows = [{ no: 1, type: "tfng", stem: "", options: "", answer: "" }];
    renderImportRows();
    bindImportForm();
    el("verifyBox").style.display = "none";
    el("importMask").className = "modal-mask show";
  }
  function getRadio(group, def) {
    var r = document.querySelector('input[name="' + group + '"]:checked');
    return r ? r.value : def;
  }
  function bindImportForm() {
    Array.prototype.forEach.call(document.querySelectorAll('input[name="srcMode"]'), function (r) {
      r.addEventListener("change", function () {
        var v = getRadio("srcMode", "auto");
        el("autoOpts").style.display = (v === "auto" || v === "mix") ? "" : "none";
        el("manualRows").style.display = (v === "manual" || v === "mix") ? "" : "none";
      });
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="useMode"]'), function (r) {
      r.addEventListener("change", function () {
        el("contributeBox").style.display = getRadio("useMode", "self") === "contribute" ? "" : "none";
      });
    });
  }

  function renderImportRows() {
    el("importRows").innerHTML =
      '<div class="qrow-head"><span>题号</span><span>题干</span><span>题型</span><span class="col-opt">选项(分号隔开)</span><span></span></div>' +
      state.importRows.map(function (r, i) {
        var types = [["tfng", "判断"], ["mcq", "单选"], ["gapfill", "填空"], ["matching", "匹配"], ["headings", "标题"], ["multi", "多选"]];
        return '<div class="qrow"><input value="' + r.no + '" data-i="' + i + '" data-f="no">' +
          '<input placeholder="题干原文" data-i="' + i + '" data-f="stem" value="' + esc(r.stem) + '">' +
          '<select data-i="' + i + '" data-f="type">' + types.map(function (t) {
            return '<option value="' + t[0] + '"' + (r.type === t[0] ? " selected" : "") + ">" + t[1] + "</option>";
          }).join("") + "</select>" +
          '<input class="col-opt" placeholder="A;B;C;D" data-i="' + i + '" data-f="options" value="' + esc(r.options) + '">' +
          '<input placeholder="答案" data-i="' + i + '" data-f="answer" value="' + esc(r.answer) + '">' +
          '<span class="mini-btn" data-rowdel="' + i + '">&times;</span></div>';
      }).join("");
    Array.prototype.forEach.call(el("importRows").querySelectorAll("[data-f]"), function (inp) {
      inp.addEventListener("input", function () {
        var i = Number(inp.getAttribute("data-i"));
        state.importRows[i][inp.getAttribute("data-f")] = inp.value;
      });
    });
    Array.prototype.forEach.call(el("importRows").querySelectorAll("[data-rowdel]"), function (btn) {
      btn.addEventListener("click", function () {
        state.importRows.splice(Number(btn.getAttribute("data-rowdel")), 1);
        renderImportRows();
      });
    });
  }

  function buildParagraphs(raw) {
    var blocks = raw.split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    return blocks.map(function (b, i) { return { id: String.fromCharCode(65 + i), text: b }; });
  }

  function manualGroups(paragraphs) {
    var groups = [], cur = null;
    state.importRows.forEach(function (r) {
      if (!r.stem || !r.answer) return;
      if (!cur || cur.type !== r.type) {
        cur = { id: "g-m" + (groups.length + 1), type: r.type, instruction: defaultInstruction(r.type), questions: [] };
        groups.push(cur);
      }
      var q = { no: 1, stem: r.stem, answer: r.answer.trim() };
      if (r.type === "mcq") q.options = (r.options || "").split(/[;；]/).map(function (x) { return x.trim(); }).filter(Boolean);
      if (r.type === "gapfill") q.answers = [r.answer.trim()];
      if (r.type === "multi") q.answers = (r.answer || "").split(/[,+;；\s]+/).filter(Boolean);
      var sug = window.RLEngine.suggestSentence(r.stem, paragraphs);
      if (sug) { q.keyPara = sug.para; q.keySentence = sug.sentence; }
      cur.questions.push(q);
    });
    groups.forEach(function (g) {
      g.questions.forEach(function (qq, i) { qq.no = i + 1; });
    });
    return groups;
  }

  function autoGroups(paragraphs) {
    var types = [];
    if (el("autoTfng").checked) types.push("tfng");
    if (el("autoGap").checked) types.push("gapfill");
    if (el("autoHeading").checked && paragraphs.length >= 2) types.push("headings");
    if (!types.length) { toast("请至少勾选一种自动题型"); return null; }
    var gen = window.RLGenerator.generateExam(paragraphs, { types: types, tfngCount: 6, gapfillCount: 3 });
    if (!gen) { toast("文章太短，无法生成题目"); return null; }
    return gen.sections[0].questionGroups;
  }

  function previewAuto() {
    var raw = el("impPassage").value.trim();
    if (!raw) { toast("请先粘贴文章内容"); return; }
    var paragraphs = buildParagraphs(raw);
    var auto = autoGroups(paragraphs);
    if (!auto) return;
    var html = '<div class="preview-box"><b>生成预览（' + auto.reduce(function (n, g) { return n + g.questions.length; }, 0) + ' 题）</b>';
    auto.forEach(function (g) {
      html += '<div class="preview-group">【' + window.RLEngine.questionTypeName(g.type) + " · " + g.questions.length + " 题】</div>";
      g.questions.slice(0, 2).forEach(function (qq) {
        html += '<div class="preview-q">Q' + qq.no + " " + esc(qq.stem).slice(0, 110) + (qq.stem.length > 110 ? "…" : "") +
          ' <span class="preview-ans">答案：' + esc((qq.answers && qq.answers[0]) || qq.answer) + "</span></div>";
      });
    });
    html += "</div>";
    el("verifyBox").style.display = "";
    el("verifyBox").innerHTML = html;
  }

  function doImport() {
    var raw = el("impPassage").value.trim();
    if (!raw) { toast("请先粘贴文章内容"); return; }
    var paragraphs = buildParagraphs(raw);
    if (paragraphs.length > 26) { toast("段落过多（>26），请按空行分为 A-Z 段"); return; }

    var srcMode = getRadio("srcMode", "auto");
    var useMode = getRadio("useMode", "self");
    var contribution = null;
    if (useMode === "contribute") {
      if (!el("declCopyright").checked || !el("declOriginal").checked || !el("declPrivacy").checked) {
        toast("贡献前请勾选全部三项确认");
        return;
      }
      contribution = {
        contributor: el("impContributor").value.trim() || "anonymous",
        license: el("impLicense").value,
        declaredAt: new Date().toISOString(),
        declaration: "copyright-ok;questions-original-or-tool-generated;no-privacy"
      };
    }

    var groups = [];
    if (srcMode === "auto" || srcMode === "mix") {
      var auto = autoGroups(paragraphs);
      if (!auto) return;
      groups = groups.concat(auto);
    }
    if (srcMode === "manual" || srcMode === "mix") {
      var man = manualGroups(paragraphs);
      if (srcMode === "manual" && !man.length) { toast("请至少录入一道有效题目（题干+答案）"); return; }
      groups = groups.concat(man);
    }
    if (!groups.length) { toast("没有生成任何题目，请检查文章与输入"); return; }

    var no = 1;
    groups.forEach(function (g) { (g.questions || []).forEach(function (qq) { qq.no = no++; }); });

    var book = el("impBook").value.trim() || "我的文章";
    var tNo = Number(el("impTest").value) || 1;
    var pNo = Number(el("impPassageNo").value) || 1;
    var title = el("impTitle").value.trim() || (book + "-Test " + tNo + "-Passage " + pNo);
    var generated = srcMode !== "manual";
    var exam = {
      id: "custom-" + Date.now(),
      title: title,
      titleCn: el("impTitleCn").value.trim() || (generated ? "自动出题" : "手动录入"),
      book: book, test: tNo, passage: pNo,
      difficulty: el("impDifficulty").value,
      series: generated ? "文章导入 · 自动出题" : "导入真题",
      source: contribution ? ("贡献者 " + contribution.contributor + " · " + contribution.license) : "本机导入（仅供个人练习）",
      level: "自定义", minutes: Number(el("impMinutes").value) || 20,
      tags: [el("impTag").value.trim() || "导入"].filter(Boolean),
      intro: generated ? "由「导入文章」自动生成的练习题" : "手动录入题目的练习",
      sections: [{ id: "s1", title: "READING PASSAGE 1", paragraphs: paragraphs, questionGroups: groups }],
      vocabulary: []
    };
    if (contribution) exam.contribution = contribution;

    if (generated) {
      var v = window.RLGenerator.verifyExam(exam, paragraphs);
      if (!v.ok && el("verifyBox")) {
        el("verifyBox").style.display = "";
        el("verifyBox").innerHTML = '<div class="hint-text" style="color:#b45309">自检发现 ' + v.issues.length + " 处待修正（仍可保存）：" + esc(v.issues.slice(0, 5).join("；")) + "</div>";
      }
    }

    var list = readLS(LS.custom, []);
    list.push(exam);
    writeLS(LS.custom, list);
    el("importMask").className = "modal-mask";
    renderHome();
    toast(contribution ? "已保存并标记为贡献作品（可导出题库包提交）" : "导入成功，开始练习");
    startExam(exam.id, "practice");
  }

  /* ---------- 题库包：导出 / 导入 ---------- */
  function exportPack() {
    var exams = readLS(LS.custom, []);
    var contributed = exams.filter(function (e) { return e.contribution; });
    if (!contributed.length) { toast("没有标记为「贡献」的试卷。导入时把用途选为「贡献到公共题库」即可"); return; }
    var pack = {
      format: "ielts-reading-pack",
      version: 1,
      generator: "IELTS Reading Trainer",
      createdAt: new Date().toISOString(),
      exams: contributed
    };
    var blob = new Blob([JSON.stringify(pack, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "reading-pack-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast("题库包已导出（" + contributed.length + " 套），可提交给项目仓库");
  }

  /* ---------- 社区题库（GitHub 仓库即共享数据库） ----------
   * 设计原则：本应用默认完全离线，只有用户主动打开「社区题库」时才联网，
   * 且只拉取索引与用户点选的那一个包，不全量下载。
   * 数据源为本项目 GitHub 仓库的 packs/ 目录；贡献走 PR（贡献声明见
   * CONTRIBUTING.md），因此不需要自建服务器。 */
  var COMMUNITY = {
    repo: "l458022/ielts-reading-trainer",
    branch: "main",
    manifestPath: "packs/manifest.json"
  };

  function communityManifestUrls() {
    var raw = "https://raw.githubusercontent.com/" + COMMUNITY.repo + "/" + COMMUNITY.branch + "/";
    var cdn = "https://cdn.jsdelivr.net/gh/" + COMMUNITY.repo + "@" + COMMUNITY.branch + "/";
    return [raw + COMMUNITY.manifestPath, cdn + COMMUNITY.manifestPath];
  }
  function communityPackUrls(file) {
    var raw = "https://raw.githubusercontent.com/" + COMMUNITY.repo + "/" + COMMUNITY.branch + "/packs/";
    var cdn = "https://cdn.jsdelivr.net/gh/" + COMMUNITY.repo + "@" + COMMUNITY.branch + "/packs/";
    var f = encodeURIComponent(file);
    return [raw + f, cdn + f];
  }

  function fetchJson(url, cb, errCb) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try { cb(JSON.parse(xhr.responseText)); }
        catch (e) { errCb("返回内容不是合法 JSON"); }
      } else { errCb("HTTP " + xhr.status); }
    };
    xhr.onerror = function () { errCb("网络不可达"); };
    xhr.ontimeout = function () { errCb("请求超时"); };
    xhr.send();
  }
  // 多源依次重试：raw 优先，CDN 兜底（国内访问 CDN 更快）
  function fetchJsonWithFallback(urls, cb, errCb) {
    var i = 0;
    (function attempt() {
      if (i >= urls.length) { errCb("所有源均不可用（可稍后重试或检查网络）"); return; }
      var url = urls[i++];
      fetchJson(url, cb, function (err) {
        console.warn("[community] 源失败：" + url + " → " + err);
        attempt();
      });
    })();
  }

  function openCommunity() {
    el("importMask").className = "modal-mask";
    el("communityMask").className = "modal-mask show";
    loadCommunityPacks();
  }

  function loadCommunityPacks() {
    var box = el("cmtyList"), status = el("cmtyStatus");
    if (!box || !status) return;
    status.textContent = "正在获取题库索引…";
    box.innerHTML = '<div class="cmty-loading">⏳ 正在连接社区题库索引…</div>';
    fetchManifest(function (manifest) {
      state.communityManifest = manifest;
      renderCommunityList(manifest, box);
      var packs = (manifest && manifest.packs) || [];
      if (!packs.length) { status.textContent = "题库索引为空"; return; }
      var newest = packs.reduce(function (a, b) {
        return String(a.updatedAt || "") > String(b.updatedAt || "") ? a : b;
      }, packs[0]);
      var when = newest.updatedAt ? new Date(newest.updatedAt).toLocaleDateString("zh-CN") : "未知";
      status.textContent = "共 " + packs.length + " 个题库包 · 最近更新 " + when;
    }, function (err) {
      box.innerHTML = "";
      status.textContent = "获取失败：" + err;
    });
  }

  /* 管理模式下改用 GitHub API 直读，绕过 raw 的 CDN 缓存（改动立即可见） */
  function fetchManifest(cb, errCb) {
    if (!isAdmin()) { fetchJsonWithFallback(communityManifestUrls(), cb, errCb); return; }
    ghApi("GET", PACKS_API + "manifest.json", null, function (info) {
      try { cb(JSON.parse(b64ToUtf8(info.content || ""))); }
      catch (e) { errCb("索引解析失败"); }
    }, function () { fetchJsonWithFallback(communityManifestUrls(), cb, errCb); });
  }

  function renderCommunityList(manifest, box) {
    if (!box) return;
    var packs = (manifest && manifest.packs) || [];
    var admin = isAdmin();
    if (!packs.length) {
      box.innerHTML = '<div class="cmty-empty">题库还没有内容。成为第一个贡献者：导入文章 → 用途选「贡献到公共题库」→ 导出发 PR。</div>';
      return;
    }
    box.innerHTML = packs.map(function (p, i) {
      var kb = p.bytes ? (p.bytes / 1024).toFixed(1) + " KB" : "";
      var meta = [];
      meta.push((p.questions || 0) + " 题");
      if (p.difficulty) meta.push("难度 " + p.difficulty);
      if (p.minutes) meta.push("约 " + p.minutes + " 分钟");
      if (p.tags && p.tags.length) meta.push(p.tags.map(function (t) { return esc(t); }).join(" / "));
      if (kb) meta.push(kb);
      return '<div class="cmty-row">' +
        '<div class="cmty-info">' +
        '<div class="cmty-title">' + esc(p.titleCn || p.title || p.id) +
        (p.title && p.titleCn ? ' <span class="cmty-en">' + esc(p.title) + "</span>" : "") + "</div>" +
        '<div class="cmty-meta">' + meta.map(function (m) { return "<span>" + m + "</span>"; }).join("") + "</div>" +
        '<div class="cmty-src">贡献者 ' + esc(p.contributor || "anonymous") + " · 授权 " + esc(p.license || "未标注") + "</div>" +
        "</div>" +
        '<div class="cmty-acts">' +
        '<button class="btn" data-cmty="' + i + '">下载并导入</button>' +
        (admin ? '<button class="btn ghost" data-cmty-edit="' + i + '">编辑</button>' +
          '<button class="btn ghost danger" data-cmty-del="' + i + '">删除</button>' : "") +
        "</div>" +
        "</div>";
    }).join("");
    Array.prototype.forEach.call(box.querySelectorAll("[data-cmty]"), function (btn) {
      btn.addEventListener("click", function () {
        downloadCommunityPack(packs[Number(btn.getAttribute("data-cmty"))], btn);
      });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-cmty-edit]"), function (btn) {
      btn.addEventListener("click", function () { editCommunityPack(packs[Number(btn.getAttribute("data-cmty-edit"))]); });
    });
    Array.prototype.forEach.call(box.querySelectorAll("[data-cmty-del]"), function (btn) {
      btn.addEventListener("click", function () { deleteCommunityPack(packs[Number(btn.getAttribute("data-cmty-del"))], btn); });
    });
  }

  function downloadCommunityPack(item, btn) {
    if (!item || !item.file) return;
    var label = "下载并导入";
    if (btn) { btn.disabled = true; btn.textContent = "下载中…"; }
    fetchJsonWithFallback(communityPackUrls(item.file), function (pack) {
      var added;
      try { added = importPackObject(pack); }
      catch (e) {
        toast("题库包无效：" + e.message);
        if (btn) { btn.disabled = false; btn.textContent = label; }
        return;
      }
      el("communityMask").className = "modal-mask";
      renderHome();
      toast("已导入「" + (item.titleCn || item.title || "") + "」：" + added + " 套试卷");
    }, function (err) {
      toast("下载失败：" + err);
      if (btn) { btn.disabled = false; btn.textContent = label; }
    });
  }

  /* ---------- 社区题库 · 管理员（令牌只存本机浏览器，绝不写进代码） ----------
   * 安全模型：前端无法保存「真密码」——代码公开，任何写死的口令都等于没有。
   * 因此权限来自 GitHub 本身：仓库所有者提供一个**细粒度 PAT**
   * （仅授权本仓库，Contents: Read and write），应用用它调用 GitHub API 提交改动。
   * 令牌只存在管理员自己的浏览器 localStorage：不进代码、不上传、每次操作
   * 都会在仓库留下带时间与内容的提交记录（可审计、可回滚）。
   * 注意：这仍是「单一管理员」模型，不适合多人协作分权——那需要真正的后端。 */
  var LS_GH_TOKEN = "rl_gh_token";
  var PACKS_API = "/repos/" + COMMUNITY.repo + "/contents/packs/";

  function ghToken() {
    try { return localStorage.getItem(LS_GH_TOKEN) || ""; } catch (e) { return ""; }
  }
  function setGhToken(t) {
    try { t ? localStorage.setItem(LS_GH_TOKEN, t) : localStorage.removeItem(LS_GH_TOKEN); } catch (e) {}
  }
  function isAdmin() { return !!ghToken(); }

  // GitHub contents API 用 base64 传内容，必须按 UTF-8 正确处理中文
  function b64ToUtf8(b64) {
    var bin = atob(String(b64).replace(/\s/g, ""));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  function utf8ToB64(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function ghApi(method, path, body, cb, errCb) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, "https://api.github.com" + path, true);
    xhr.setRequestHeader("Authorization", "Bearer " + ghToken());
    xhr.setRequestHeader("Accept", "application/vnd.github+json");
    xhr.setRequestHeader("X-GitHub-Api-Version", "2022-11-28");
    if (body) xhr.setRequestHeader("Content-Type", "application/json");
    xhr.timeout = 25000;
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        var data = {};
        try { data = xhr.responseText ? JSON.parse(xhr.responseText) : {}; } catch (e) {}
        cb(data);
      } else {
        var msg = "HTTP " + xhr.status;
        try { var j = JSON.parse(xhr.responseText); if (j && j.message) msg += "：" + j.message; } catch (e) {}
        if (xhr.status === 401) msg += "（令牌无效或已过期）";
        else if (xhr.status === 403) msg += "（令牌权限不足，需要 Contents: Read and write）";
        else if (xhr.status === 404) msg += "（文件不存在，或令牌未授权该仓库）";
        errCb(msg);
      }
    };
    xhr.onerror = function () { errCb("网络不可达"); };
    xhr.ontimeout = function () { errCb("请求超时"); };
    xhr.send(body ? JSON.stringify(body) : null);
  }

  function refreshAdminUI() {
    var on = isAdmin();
    var st = el("cmtyTokenState");
    if (st) st.textContent = on ? "✅ 管理权限已启用（令牌仅存本机）" : "未设置令牌：只能浏览与下载";
    var clr = el("cmtyTokenClear");
    if (clr) clr.style.display = on ? "" : "none";
    var hint = el("cmtyAdminHint");
    if (hint) hint.style.display = on ? "" : "none";
  }

  function toggleAdminBox() {
    var box = el("cmtyAdminBox");
    if (!box) return;
    box.style.display = box.style.display === "none" ? "block" : "none";
    refreshAdminUI();
  }

  function saveAdminToken() {
    var t = (el("cmtyToken").value || "").trim();
    if (!t) { toast("请先粘贴 GitHub 令牌"); return; }
    if (!/^(github_pat_|gh[pousr]_)/.test(t)) { toast("令牌格式不对：应以 github_pat_ 或 ghp_ 开头"); return; }
    setGhToken(t);
    el("cmtyToken").value = "";
    refreshAdminUI();
    toast("已开启管理模式（令牌只保存在本机浏览器）");
    loadCommunityPacks();
  }

  function clearAdminToken() {
    if (!confirm("清除本机保存的 GitHub 令牌？\n\n清除后将无法在应用内删改社区题库（仓库本身不受影响）。")) return;
    setGhToken("");
    refreshAdminUI();
    renderCommunityList(state.communityManifest || { packs: [] }, el("cmtyList"));
    toast("令牌已清除，已退出管理模式");
  }

  function deleteCommunityPack(item, btn) {
    if (!item || !item.file) return;
    if (!isAdmin()) { toast("需要先设置管理令牌"); return; }
    if (!confirm("确定从社区题库删除「" + (item.titleCn || item.title || item.file) + "」？\n\n会向 GitHub 提交一次删除（历史仍可恢复），索引将由 CI 自动重建。")) return;
    var label = "删除";
    if (btn) { btn.disabled = true; btn.textContent = "删除中…"; }
    ghApi("GET", PACKS_API + encodeURIComponent(item.file), null, function (info) {
      ghApi("DELETE", PACKS_API + encodeURIComponent(item.file), {
        message: "chore(packs): 管理员删除题库包 " + item.file,
        sha: info.sha,
        branch: COMMUNITY.branch
      }, function () {
        toast("已删除「" + (item.titleCn || item.title || item.file) + "」，索引稍后自动更新");
        setTimeout(loadCommunityPacks, 1500);
      }, function (err) {
        toast("删除失败：" + err);
        if (btn) { btn.disabled = false; btn.textContent = label; }
      });
    }, function (err) {
      toast("读取文件信息失败：" + err);
      if (btn) { btn.disabled = false; btn.textContent = label; }
    });
  }

  var editingPack = { file: null, sha: null };

  function editCommunityPack(item) {
    if (!item || !item.file) return;
    if (!isAdmin()) { toast("需要先设置管理令牌"); return; }
    ghApi("GET", PACKS_API + encodeURIComponent(item.file), null, function (info) {
      editingPack.file = item.file;
      editingPack.sha = info.sha;
      el("packEditPath").textContent = "packs/" + item.file + " · " + (item.titleCn || item.title || "");
      el("packEditText").value = b64ToUtf8(info.content || "");
      el("packEditMsg").textContent = "";
      el("packEditMask").className = "modal-mask show";
    }, function (err) { toast("读取题库包失败：" + err); });
  }

  // 保存前做两层校验：JSON 语法 + 结构 + keySentence 是否真在原文里（定位功能的前提）
  function validatePack(pack) {
    if (!pack || pack.format !== "ielts-reading-pack" || !Array.isArray(pack.exams) || !pack.exams.length) {
      return { ok: false, msg: "结构不合法：需要 format=\"ielts-reading-pack\" 且 exams 为非空数组" };
    }
    var missing = [];
    pack.exams.forEach(function (ex) {
      var full = (ex.sections || []).map(function (s) {
        return (s.paragraphs || []).map(function (p) { return p.text || ""; }).join(" ");
      }).join(" ");
      (ex.sections || []).forEach(function (s) {
        (s.questionGroups || []).forEach(function (g) {
          (g.questions || []).forEach(function (q) {
            if (q.keySentence && full.indexOf(q.keySentence) === -1) missing.push("Q" + q.no);
          });
        });
      });
    });
    return { ok: true, missing: missing };
  }

  function savePackEdit() {
    var text = el("packEditText").value;
    var pack;
    try { pack = JSON.parse(text); }
    catch (e) { el("packEditMsg").textContent = "❌ JSON 语法错误：" + e.message; return; }
    var v = validatePack(pack);
    if (!v.ok) { el("packEditMsg").textContent = "❌ " + v.msg; return; }
    if (v.missing.length && !confirm("有 " + v.missing.length + " 道题的 keySentence 无法在原文逐字找到（" + v.missing.slice(0, 6).join("、") + "），报告页将无法定位原句。仍要保存？")) return;
    el("packEditMsg").textContent = "⏳ 正在提交到 GitHub…";
    ghApi("PUT", PACKS_API + encodeURIComponent(editingPack.file), {
      message: "content(packs): 管理员更新题库包 " + editingPack.file,
      content: utf8ToB64(JSON.stringify(pack, null, 2) + "\n"),
      sha: editingPack.sha,
      branch: COMMUNITY.branch
    }, function () {
      el("packEditMask").className = "modal-mask";
      toast("已提交更新，正在刷新索引…");
      setTimeout(loadCommunityPacks, 2000);
    }, function (err) {
      el("packEditMsg").textContent = "❌ 提交失败：" + err;
    });
  }

  /* ---------- 上架新题库包（管理员） ----------
   * 两种入口：① 粘贴别人发来的题库包 JSON ② 选一份本机标记为「贡献」的试卷
   * 都是 PUT 到 packs/ 下新文件，文件名带日期与标题 slug；重名自动加后缀 */
  function slugify(s) {
    var t = String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    return t || "pack";
  }

  function uploadMsg(text) {
    var m = el("cmtyUploadMsg");
    if (m) m.textContent = text;
  }

  function toggleUploadBox() {
    var box = el("cmtyUploadBox");
    if (!box) return;
    if (!isAdmin()) { toast("需要先设置管理令牌"); return; }
    var show = box.style.display === "none";
    box.style.display = show ? "block" : "none";
    if (show) renderLocalContributionList();
  }

  function renderLocalContributionList() {
    var wrap = el("cmtyLocalList");
    if (!wrap) return;
    var list = readLS(LS.custom, []).filter(function (e) { return e && e.contribution; });
    if (!list.length) {
      wrap.innerHTML = '<div class="cmty-empty" style="padding:10px">本机还没有标记为「贡献」的试卷。导入文章时把用途选为「贡献到公共题库」即可。</div>';
      return;
    }
    wrap.innerHTML = list.map(function (e, i) {
      var n = window.RLEngine.collectQuestions(e).length;
      return '<div class="cmty-row" style="padding:8px 12px">' +
        '<div class="cmty-info"><div class="cmty-title">' + esc(e.titleCn || e.title) +
        ' <span class="cmty-en">' + esc(e.title) + "</span></div>" +
        '<div class="cmty-src">' + n + " 题 · 贡献者 " + esc((e.contribution || {}).contributor || "anonymous") +
        " · 授权 " + esc((e.contribution || {}).license || "未标注") + "</div></div>" +
        '<button class="btn" data-cmty-up="' + i + '">上架这个</button>' +
        "</div>";
    }).join("");
    Array.prototype.forEach.call(wrap.querySelectorAll("[data-cmty-up]"), function (btn) {
      btn.addEventListener("click", function () {
        var ex = list[Number(btn.getAttribute("data-cmty-up"))];
        uploadPackObject({
          format: "ielts-reading-pack", version: 1,
          generator: "IELTS Reading Trainer", createdAt: new Date().toISOString(),
          exams: [JSON.parse(JSON.stringify(ex))]
        }, btn);
      });
    });
  }

  function uploadPackFromText() {
    var text = (el("cmtyUploadText").value || "").trim();
    if (!text) { uploadMsg("❌ 请先粘贴题库包 JSON，或从下方选一份本机试卷"); return; }
    var pack;
    try { pack = JSON.parse(text); }
    catch (e) { uploadMsg("❌ JSON 语法错误：" + e.message); return; }
    uploadPackObject(pack, null);
  }

  function uploadPackObject(pack, btn) {
    if (!isAdmin()) { toast("需要先设置管理令牌"); return; }
    var v = validatePack(pack);
    if (!v.ok) { uploadMsg("❌ " + v.msg); return; }
    if (v.missing.length && !confirm("有 " + v.missing.length + " 道题的 keySentence 无法在原文逐字找到（" + v.missing.slice(0, 6).join("、") + "），报告页将无法定位原句。仍要上架？")) return;
    var ex = pack.exams[0] || {};
    var today = new Date().toISOString().slice(0, 10);
    var file = "reading-pack-" + today + "-" + slugify(ex.title || ex.titleCn) + ".json";
    var label = btn ? btn.textContent : "";
    if (btn) { btn.disabled = true; btn.textContent = "上架中…"; }
    uploadMsg("⏳ 正在检查文件名…");
    var restore = function () { if (btn) { btn.disabled = false; btn.textContent = label; } };

    function doPut(name) {
      uploadMsg("⏳ 正在提交到 GitHub…");
      ghApi("PUT", PACKS_API + encodeURIComponent(name), {
        message: "content(packs): 上架题库包 " + name,
        content: utf8ToB64(JSON.stringify(pack, null, 2) + "\n"),
        branch: COMMUNITY.branch
      }, function () {
        uploadMsg("✅ 已上架：" + name + "（索引约 1 分钟后自动更新）");
        el("cmtyUploadText").value = "";
        toast("已上架「" + (ex.titleCn || ex.title || name) + "」");
        restore();
        setTimeout(loadCommunityPacks, 3000);
      }, function (err) {
        uploadMsg("❌ 上架失败：" + err);
        restore();
      });
    }
    // 重名则加后缀，避免覆盖已有包
    ghApi("GET", PACKS_API + encodeURIComponent(file), null,
      function () { doPut(file.replace(/\.json$/, "-" + Date.now().toString().slice(-6) + ".json")); },
      function () { doPut(file); });
  }

  function importPackObject(pack) {
    if (!pack || pack.format !== "ielts-reading-pack" || !Array.isArray(pack.exams)) {
      throw new Error("不是有效的题库包");
    }
    var list = readLS(LS.custom, []);
    var added = 0;
    pack.exams.forEach(function (e) {
      if (!e || !e.sections || !e.id) return;
      var copy = JSON.parse(JSON.stringify(e));
      copy.id = "pack-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
      list.push(copy);
      added++;
    });
    writeLS(LS.custom, list);
    return added;
  }

  function importPack(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var added = importPackObject(JSON.parse(reader.result));
        el("importMask").className = "modal-mask";
        renderHome();
        toast("已导入题库包：" + added + " 套试卷");
      } catch (err) {
        toast("题库包解析失败：" + err.message);
      }
    };
    reader.readAsText(file);
  }

  function defaultInstruction(type) {
    return {
      tfng: "Do the following statements agree with the information in the passage? Write TRUE / FALSE / NOT GIVEN.",
      ynng: "Do the following statements agree with the views of the writer? Write YES / NO / NOT GIVEN.",
      mcq: "Choose the correct letter, A, B, C or D.",
      gapfill: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      matching: "Match each statement with the correct person.",
      headings: "Choose the correct heading for each paragraph from the list below.",
      multi: "Choose TWO letters, A-F."
    }[type] || "Answer the questions below.";
  }

  /* ---------- 点词查释义气泡（仅报告页生效） ---------- */
  function bindVocabTips(root) {
    var tip = el("vocabTip");
    (root || document).addEventListener("click", function (e) {
      var t = e.target;
      var wEl = t && t.getAttribute && t.getAttribute("data-w") ? t : (t.closest ? t.closest("[data-w]") : null);
      if (!wEl || state.view !== "report") { tip.style.display = "none"; return; }
      e.stopPropagation();
      var w = wEl.getAttribute("data-w") || "";
      var v = ((state.exam && state.exam.vocabulary) || []).filter(function (x) {
        return x.word.toLowerCase() === w.toLowerCase();
      })[0];
      var d = window.RLDictCore ? window.RLDictCore.lookup(w) : null;
      var html = "";
      if (v) {
        html = '<div class="tip-src src-vocab">本卷重点词</div><b>' + esc(v.word) + "</b> " + esc(v.pos || "") +
          "<br>" + esc(v.meaning) +
          (v.sentenceCn ? '<br><span class="tip-sub">' + esc(v.sentenceCn) + "</span>" : "");
      } else if (d) {
        html = '<div class="tip-src src-dict">核心词典</div><b>' + esc(d.word) + "</b> " + esc(d.pos) +
          "<br>" + esc(d.meaning) +
          (d.note ? '<br><span class="tip-sub">' + esc(d.note) + "</span>" : "");
      } else {
        html = '<div class="tip-src src-none">未收录</div><b>' + esc(w) + '</b><br><span class="tip-sub">离线词典中暂无该词，可联网查询或手动加入生词本</span>';
      }
      html += '<div class="tip-acts">' +
        '<span class="tip-act" id="tipAdd">＋生词本</span>' +
        '<span class="tip-act" id="tipCopy">复制</span>' +
        '<span class="tip-act" id="tipWeb">联网查词</span>' +
        "</div>";
      tip.innerHTML = html;
      tip.style.display = "block";
      var r = wEl.getBoundingClientRect();
      tip.style.left = Math.min(r.left, window.innerWidth - 300) + "px";
      tip.style.top = Math.min(r.bottom + 8, window.innerHeight - 170) + "px";
      document.getElementById("tipAdd").onclick = function () {
        var meaning = v ? v.meaning : (d ? d.meaning : "");
        addVocab(w, meaning || "（待补充）", state.exam ? state.exam.title : "");
        toast("已加入生词本");
        tip.style.display = "none";
      };
      document.getElementById("tipCopy").onclick = function () {
        copyText(w + (v || d ? "  " + ((v && v.meaning) || (d && d.meaning)) : ""));
        tip.style.display = "none";
      };
      document.getElementById("tipWeb").onclick = function () {
        window.open("https://www.youdao.com/result?word=" + encodeURIComponent(w) + "&lang=en", "_blank");
      };
    });
    // 点击空白处收起气泡
    document.addEventListener("click", function (e) {
      if (!e.target.closest || !e.target.closest("#vocabTip")) {
        var wEl = e.target && e.target.closest && e.target.closest("[data-w]");
        if (!wEl) tip.style.display = "none";
      }
    });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") tip.style.display = "none"; });
  }

  /* ---------- 答题页移动端 Tab ---------- */
  function bindMobileTabs() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-mtab]"), function (btn) {
      btn.addEventListener("click", function () {
        var target = btn.getAttribute("data-mtab");
        Array.prototype.forEach.call(document.querySelectorAll("[data-mtab]"), function (b) {
          b.className = b === btn ? "active" : "";
        });
        el("passagePanel").className = "panel" + (target === "passage" ? "" : " mobile-hide");
        el("questionPanel").className = "panel" + (target === "question" ? "" : " mobile-hide");
      });
    });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    el("nav-home").addEventListener("click", function () { renderHome(); show("home"); });
    el("nav-history").addEventListener("click", function () { renderHistory(); show("history"); });
    el("nav-import").addEventListener("click", openImport);
    el("nav-examMode").addEventListener("click", function () {
      if (state.view === "report") { startExam(state.exam.id, "exam"); }
      else toast("请先从题库选择一套试卷");
    });
    el("nav-practiceMode").addEventListener("click", function () {
      if (state.view === "report") { startExam(state.exam.id, "practice"); }
      else toast("请先从题库选择一套试卷");
    });
    el("impCancel").addEventListener("click", function () { el("importMask").className = "modal-mask"; });
    el("impSubmit").addEventListener("click", doImport);
    el("impPreview").addEventListener("click", previewAuto);
    el("impExportPack").addEventListener("click", exportPack);
    el("impImportPack").addEventListener("click", function () { el("packFile").click(); });
    el("packFile").addEventListener("change", function () {
      if (this.files && this.files[0]) importPack(this.files[0]);
      this.value = "";
    });
    el("impAddRow").addEventListener("click", function () {
      state.importRows.push({ no: state.importRows.length + 1, type: "tfng", stem: "", options: "", answer: "" });
      renderImportRows();
    });
    el("importMask").addEventListener("click", function (e) {
      if (e.target === this) this.className = "modal-mask";
    });
    // 社区题库
    el("btnCommunity").addEventListener("click", openCommunity);
    el("impCommunity").addEventListener("click", openCommunity);
    el("cmtyRefresh").addEventListener("click", loadCommunityPacks);
    el("cmtyClose").addEventListener("click", function () { el("communityMask").className = "modal-mask"; });
    el("communityMask").addEventListener("click", function (e) {
      if (e.target === this) this.className = "modal-mask";
    });
    // 社区题库·管理（令牌仅存本机）
    el("cmtyAdminToggle").addEventListener("click", toggleAdminBox);
    el("cmtyTokenSave").addEventListener("click", saveAdminToken);
    el("cmtyTokenClear").addEventListener("click", clearAdminToken);
    el("cmtyUploadToggle").addEventListener("click", toggleUploadBox);
    el("cmtyUploadPaste").addEventListener("click", uploadPackFromText);
    el("packEditSave").addEventListener("click", savePackEdit);
    el("packEditCancel").addEventListener("click", function () { el("packEditMask").className = "modal-mask"; });
    el("packEditMask").addEventListener("click", function (e) {
      if (e.target === this) this.className = "modal-mask";
    });
    refreshAdminUI();
    bindVocabTips();
    bindMobileTabs();
    renderHome();
    show("home");
  }

  // 暴露给调试/测试
  window.RLApp = {
    state: state, startExam: startExam, submitExam: submitExam, renderExam: renderExam,
    renderHome: renderHome, renderReport: renderReport, renderHistory: renderHistory,
    doImport: doImport, openImport: openImport, show: show,
    openCommunity: openCommunity, loadCommunityPacks: loadCommunityPacks,
    renderCommunityList: renderCommunityList, importPackObject: importPackObject,
    communityManifestUrls: communityManifestUrls, communityPackUrls: communityPackUrls,
    isAdmin: isAdmin, ghToken: ghToken, setGhToken: setGhToken, ghApi: ghApi,
    saveAdminToken: saveAdminToken, clearAdminToken: clearAdminToken,
    deleteCommunityPack: deleteCommunityPack, editCommunityPack: editCommunityPack,
    savePackEdit: savePackEdit, validatePack: validatePack, refreshAdminUI: refreshAdminUI,
    uploadPackFromText: uploadPackFromText, uploadPackObject: uploadPackObject,
    toggleUploadBox: toggleUploadBox, renderLocalContributionList: renderLocalContributionList,
    slugify: slugify,
    utf8ToB64: utf8ToB64, b64ToUtf8: b64ToUtf8, PACKS_API: PACKS_API
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

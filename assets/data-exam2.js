/* ============================================================
 * 预置样题 2：The Science of Sleep（睡眠的科学）
 * 题型：人物观点匹配 + 单选 + 句子填空 + 多选多
 * 原创样题，按剑桥雅思真题风格编写，含逐题解析与定位
 * ============================================================ */
window.EXAMS = window.EXAMS || [];

window.EXAMS.push({
  id: "exam-sleep",
  title: "样题-Test 1-Passage 2",
  titleCn: "睡眠的科学",
  book: "样题",
  test: 1,
  passage: 2,
  difficulty: "中",
  series: "预置样题",
  source: "原创样题 · 剑桥雅思题型风格",
  level: "学术类 · 中等",
  minutes: 20,
  tags: ["健康", "科学研究"],
  intro: "睡眠研究的新发现：记忆巩固、大脑清理与白天小睡，以及研究者对睡眠的重新认识。",

  sections: [{
    id: "s1",
    title: "READING PASSAGE 1",
    paragraphs: [
      { id: "A", text: "For most of the twentieth century, sleep was treated by science as little more than an absence of waking. Psychologists who studied it recorded brain activity and eye movements, and from these observations came the classification of sleep into stages, including the rapid eye movement (REM) stage associated with dreaming. What sleep was actually for, however, remained a mystery, and one popular textbook of the 1960s suggested that its function was simply to keep animals still and out of trouble while night fell." },
      { id: "B", text: "That view has since been overturned. Dr Elena Marsh, who leads the sleep laboratory at the University of Edinburgh, argues that sleep is one of the most active periods of brain function. Her team recorded the brain activity of volunteers as they learned a sequence of finger movements, and found that during deep sleep the same sequence of neurons replayed, as if the brain were rehearsing. We used to think memory was written during the day and simply stored overnight, Marsh says. What we now believe is that the brain is deciding what is worth keeping. In her experiments, students who slept between a lesson and a test performed better on material that was likely to be useful in the future, but showed no advantage on material they were told they would not need." },
      { id: "C", text: "Another line of work has turned to the question of what sleep does for the brain as an organ. Professor Daniel Okafor's group at Case Western Reserve University has tracked the movement of fluorescent dye through the brains of sleeping mice, and their findings, published in 2013, showed that the spaces between brain cells widen during sleep, allowing fluid to wash through the tissue and clear away waste products that accumulate during waking hours. Okafor describes this as a kind of night shift cleaning service. He suspects that some of the confusion experienced after a poor night's sleep may reflect a failure of this process, though he stresses that evidence in humans remains indirect." },
      { id: "D", text: "Nor is all of the benefit necessarily tied to the night. Dr Priya Raman of the University of California has examined the effects of a 60-minute nap on motor skills, and found that an afternoon nap of around 90 minutes protected performance from the usual decline that builds across the day. The effect, she notes, depends on how long you nap: a ten-minute doze improved alertness briefly, whereas longer naps of 30 to 60 minutes could leave people groggier than before, a state her papers call sleep inertia. Her work with surgeons suggests that even experienced practitioners could benefit, since their performance in simulated operations fell measurably when they worked through an afternoon without rest." },
      { id: "E", text: "There are, unsurprisingly, commercial applications. Caffeine is the most widely consumed stimulant in the world, and yet Raman is keen to point out that it does not replace sleep: it blocks the receptors that signal tiredness, but the need for rest remains and returns with force once the caffeine wears off. Light, too, plays a role that companies are only beginning to exploit. Exposure to bright light in the morning shifts the body clock earlier, while evening light pushes it later, and Okafor notes that night-shift workers exposed to bright light at 3 a.m. found their body clocks adjusting within days, a result that has implications for hospital wards and factory floors alike." },
      { id: "F", text: "Not everyone is convinced that every finding translates into advice. Some researchers question whether the benefits observed in carefully controlled laboratory conditions survive contact with real life, and interviews with long sleepers and short sleepers alike suggest that individual requirements vary widely. What is clear, says Marsh, is that sleep has stopped being the blank space in the day. The next decade of research, she predicts, will treat it less as an interruption of waking life and more as the foundation of it." }
    ],

    questionGroups: [
      {
        id: "g1", type: "matching",
        instruction: "Look at the following findings (Questions 1-4) and the list of researchers below. Match each finding with the correct researcher, A, B or C.",
        pool: ["A", "B", "C"],
        poolLabels: [
          "A  Dr Elena Marsh",
          "B  Professor Daniel Okafor",
          "C  Dr Priya Raman"
        ],
        questions: [
          { no: 1, stem: "discovering that the brain replays daytime activity during sleep", answer: "A", keyPara: "B", keySentence: "Her team recorded the brain activity of volunteers as they learned a sequence of finger movements, and found that during deep sleep the same sequence of neurons replayed, as if the brain were rehearsing.", keySentenceCn: "在深度睡眠期间，同一组神经元会重放白天的活动，仿佛大脑在排练。", explain: "题干 discovers + replays daytime activity = 原文 the same sequence of neurons replayed。注意是「夜间重放」，不是「白天播放」。人物题的定位技巧：先找人名，再读该人说的话。", words: ["replay 重放"] },
          { no: 2, stem: "finding that the length of a nap affects how it helps you", answer: "C", keyPara: "D", keySentence: "The effect, she notes, depends on how long you nap: a ten-minute doze improved alertness briefly, whereas longer naps of 30 to 60 minutes could leave people groggier than before, a state her papers call sleep inertia.", keySentenceCn: "她指出，这种效果取决于你小睡了多久。", explain: "题干 the length of a nap = how long you nap，人物是 Raman（D 段）。she 指代 D 段的 Dr Priya Raman。注意 D 段里 Okafor 没有被提及，别被段落里其他人名干扰。", words: ["nap 小睡"] },
          { no: 3, stem: "suggesting that waste removal may explain poor concentration", answer: "B", keyPara: "C", keySentence: "He suspects that some of the confusion experienced after a poor night's sleep may reflect a failure of this process, though he stresses that evidence in humans remains indirect.", keySentenceCn: "他怀疑，睡眠不佳后出现的某些思维混乱，可能反映了这一清理过程的失效。", explain: "题干 poor concentration ≈ 原文 confusion（思维混乱），waste removal = 大脑夜间清理废物的过程，研究者是 Okafor（C 段）。", paraphrase: [["poor concentration", "confusion"]], words: ["fluorescent dye 荧光染料"] },
          { no: 4, stem: "observing that students favour information they expect to use", answer: "A", keyPara: "B", keySentence: "In her experiments, students who slept between a lesson and a test performed better on material that was likely to be useful in the future, but showed no advantage on material they were told they would not need.", keySentenceCn: "在课程和考试之间睡过觉的学生，在将来可能用得上的材料上表现更好，但在被告知不需要的材料上没有优势。", explain: "题干 favour information they expect to use = performed better on material likely to be useful。仍是 Marsh 的 B 段。这是同义改写的典型：favour → performed better，expect to use → likely to be useful。", paraphrase: [["favour", "performed better"], ["expect to use", "likely to be useful"]], words: [] }
        ]
      },
      {
        id: "g2", type: "mcq",
        instruction: "Choose the correct letter, A, B, C or D.",
        questions: [
          { no: 5, stem: "In the twentieth century, researchers believed that sleep", options: ["caused the brain to store new memories", "kept animals safe while they were inactive", "cleaned waste from the brain", "shifted the body clock"], answer: "B", keyPara: "A", keySentence: "What sleep was actually for, however, remained a mystery, and one popular textbook of the 1960s suggested that its function was simply to keep animals still and out of trouble while night fell.", keySentenceCn: "20 世纪 60 年代一本流行教科书提出，睡眠的功能仅仅是让动物在夜间保持不动、远离麻烦。", explain: "定位 A 段末句：keep animals still and out of trouble ≈ 选项 B kept animals safe while they were inactive。staying 不动 = inactive，out of trouble = safe。", paraphrase: [["still", "inactive"], ["out of trouble", "safe"]], words: ["overturn 推翻"] },
          { no: 6, stem: "What point does Okafor make about his cleaning process?", options: ["It has been fully demonstrated in human subjects.", "It applies only to mice.", "The evidence from people is not yet direct.", "It explains all cases of tiredness."], answer: "C", keyPara: "C", keySentence: "He suspects that some of the confusion experienced after a poor night's sleep may reflect a failure of this process, though he stresses that evidence in humans remains indirect.", keySentenceCn: "他强调，来自人类的证据仍然是间接的。", explain: "干扰项设计：A「已在人类身上充分证明」与原文矛盾；B「只适用于小鼠」过度推断（实验用小鼠但没说只适用于小鼠）；C 与原文 evidence remains indirect 直接对应，正确；D 的 all 是绝对化词，原文是 some of the confusion。", trap: "绝对化词 all", words: [] },
          { no: 7, stem: "According to Raman, caffeine", options: ["removes the need for sleep", "works equally well at any dose", "affects the body clock directly", "hides tiredness rather than curing it"], answer: "D", keyPara: "E", keySentence: "Caffeine is the most widely consumed stimulant in the world, and yet Raman is keen to point out that it does not replace sleep: it blocks the receptors that signal tiredness, but the need for rest remains and returns with force once the caffeine wears off.", keySentenceCn: "它（咖啡因）阻断发出疲劳信号的受体，但对休息的需求依然存在。", explain: "题干 According to Raman 定位 E 段。blocks the receptors that signal tiredness = hides tiredness，but the need remains = 未消除对睡眠的需求，对应 D。A 与原文矛盾。", paraphrase: [["blocks the receptors that signal tiredness", "hides tiredness"]], words: ["stimulant 兴奋剂"] }
        ]
      },
      {
        id: "g3", type: "gapfill",
        instruction: "Complete the sentences below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
        questions: [
          { no: 8, stem: "Raman's study found that a nap lasting about ______ minutes helped maintain performance through the afternoon.", answers: ["90"], keyPara: "D", keySentence: "Dr Priya Raman of the University of California has examined the effects of a 60-minute nap on motor skills, and found that an afternoon nap of around 90 minutes protected performance from the usual decline that builds across the day.", keySentenceCn: "下午小睡约 90 分钟，可以避免表现随着白天推移而正常下降。", explain: "around 90 minutes 直接抄数字。填空题中数字、年份通常就是答案，且必须写阿拉伯数字。", words: ["decline 下降"] },
          { no: 9, stem: "A short nap of about ten minutes improves ______.", answers: ["alertness"], keyPara: "D", keySentence: "The effect, she notes, depends on how long you nap: a ten-minute doze improved alertness briefly, whereas longer naps of 30 to 60 minutes could leave people groggier than before, a state her papers call sleep inertia.", keySentenceCn: "十分钟的小睡能短暂提升警觉性。", explain: "doze = a short nap，improved alertness = improves alertness。答案一词 alertness。", paraphrase: [["doze", "nap"]], words: ["doze 打盹", "inertia 惰性"] },
          { no: 10, stem: "Practising surgeons in simulations performed worse when they worked ______.", options: null, answers: ["through the afternoon", "an afternoon"], keyPara: "D", keySentence: "Her work with surgeons suggests that even experienced practitioners could benefit, since their performance in simulated operations fell measurably when they worked through an afternoon without rest.", keySentenceCn: "他们在没有休息的情况下连续工作一个下午后，模拟手术中的表现明显下降。", explain: "worked through an afternoon without rest = worked through the afternoon。注意题干去掉了 without rest，答案可接受 through the afternoon 或 an afternoon。", paraphrase: [["fell measurably", "performed worse"]], words: ["simulated 模拟的"] }
        ]
      }
    ]
  }],

  vocabulary: [
    { word: "rehearse", pos: "v.", meaning: "排练，演练", sentence: "As if the brain were rehearsing.", sentenceCn: "仿佛大脑在排练。" },
    { word: "accumulate", pos: "v.", meaning: "积累", sentence: "Waste products that accumulate during waking hours.", sentenceCn: "清醒时积累的代谢废物。" },
    { word: "block", pos: "v.", meaning: "阻塞，阻断", sentence: "It blocks the receptors that signal tiredness.", sentenceCn: "它阻断发出疲劳信号的受体。" },
    { word: "doze", pos: "n./v.", meaning: "打盹", sentence: "A ten-minute doze improved alertness briefly.", sentenceCn: "十分钟的打盹短暂提高了警觉性。" },
    { word: "sleep inertia", pos: "phr.", meaning: "睡眠惯性（醒后昏沉）", sentence: "A state her papers call sleep inertia.", sentenceCn: "她的论文把这种状态称为睡眠惯性。" },
    { word: "stimulant", pos: "n.", meaning: "兴奋剂", sentence: "Caffeine is the most widely consumed stimulant in the world.", sentenceCn: "咖啡因是世界上消费最广泛的兴奋剂。" }
  ]
});

# IELTS Reading Trainer · 雅思阅读练习室

> [中文说明](README.md) | **English**
>
> 🚀 **[Live demo (no install)](https://l458022.github.io/ielts-reading-trainer/)** ·
> 🤝 [Contributing](CONTRIBUTING_EN.md) · 🐛 [Open an issue](https://github.com/l458022/ielts-reading-trainer/issues/new/choose) ·
> 📜 [Code of Conduct](CODE_OF_CONDUCT.md) · 🔒 [Security Policy](SECURITY.md)

A **pure frontend, fully offline** IELTS reading practice platform. Practice Cambridge-style
passages, get an automatic per-question analysis after submitting — sentence locating,
error explanations, key-sentence translation, and vocabulary — all with **zero network
requests** and no server.

## Features

| Module | Details |
|--------|---------|
| Question bank (IELTS-Brother style) | **By book** (C21/C20… × Test × Passage list with difficulty rating, attempt count, last score), **by scene** (topic groups), **by question type** (type statistics → filter papers) |
| Two modes | **Practice** (untimed, per-question locating hint) / **Exam** (countdown, auto-submit at time) |
| Six question types | True/False/Not Given · Multiple choice · Gap fill · Matching · Paragraph headings · Multi-select |
| Post-submit analysis | Accuracy + estimated Band + per-type scores; per-question cards with **original-sentence locating (click to highlight in the passage)**, bilingual key sentence, paraphrase clues, trap types (absolute wording / reversed comparison / NG phrasing), question keywords |
| Click-to-look-up | **Unlocked after submitting**: click **any word** in the passage to see its meaning (part of speech + Chinese definition + stemming note); one-click add to word book / copy / online lookup (Youdao) |
| Vocabulary | Full-passage vocabulary table with example sentences and translations; volume keywords underlined in the article; word book stored in localStorage |
| Import any article | Paste an English article (blank-line separated) → **auto-generated questions** (rule engine, self-verified: every answer must be derivable from the text) / manual entry / mixed |
| Contribution declaration | Declare "personal use only" or "contribute to the shared bank"; contributing requires three declarations (rights / originality / privacy) plus contributor name and license |
| Question packs | One-click export/import of `ielts-reading-pack` JSON packs for sharing |
| Community bank | 「🌐 Community bank」 on the home page lists packs straight from this repo's `packs/` directory and imports them in one click (**no server needed**: raw source with a jsDelivr CDN fallback). The app stays offline unless you open it |
| Bank management | Repository maintainers paste their own **fine-grained GitHub token** into the app to edit or delete shared articles and questions directly — every action leaves an auditable, revertible commit. There is **no "admin password"**: the frontend is public, so a hard-coded secret is no secret at all; authority can only come from GitHub itself. See [ADMIN.md](ADMIN.md) |
| Deep analysis | "Copy report" copies score + wrong answers + located sentences, ready to paste into any AI for further analysis |

> Design principle: **no look-up or vocabulary hints during the exam** — that would leak
> answers. All vocabulary features unlock only after submission.

## Screenshots

| Home (by book / scene / type) | Exam page (plain text, no hints) |
|---|---|
| ![Home](test/shot-home.png) | ![Exam](test/shot-exam.png) |

| Report (per-question analysis + locating) | Click-to-look-up (unlocked after submit) |
|---|---|
| ![Report](test/shot-report.png) | ![Look-up](test/shot-dict.png) |

| Community bank (GitHub repo as database, no server) | Live demo (GitHub Pages) |
|---|---|
| ![Community bank](test/shot-community.png) | ![Live demo](test/shot-live.png) |

## Usage

Just open `index.html` in a browser — no build, no server, no network. All data stays in
your local browser (localStorage).

- Double-click `index.html`, or drag it into Chrome / Edge
- To use it on your phone over LAN: `python -m http.server 8080`, then visit `http://<your-ip>:8080`

## How the shared bank works (no server required)

```
Contributor                      Maintainer / CI                  Everyone else
Import article → "contribute"    review declarations → merge PR   open 「🌐 Community bank」
→ export pack → open a PR   →    CI scans packs/ → manifest   →   → see new packs → one-click import
```

- The data source is simply this repo's `packs/` directory, read directly by the browser
  (both GitHub raw and jsDelivr send `Access-Control-Allow-Origin: *`), so **no server is needed**
- `packs/manifest.json` is rebuilt automatically by CI (`.github/workflows/manifest.yml`)
  whenever `packs/` changes — no manual maintenance
- Every pack carries `contribution.contributor` and `contribution.license`, so downstream
  users can see where each article came from and under what license
- Privacy and offline-first: the app makes zero network requests by default; it only goes
  online when you open the community bank or click download, and your study records always
  stay in your own browser

## Importing Cambridge IELTS material (personal study)

Top-right "＋ Import" → paste the article (blank lines separate paragraphs) → enter each
question. The system auto-generates paragraph labels (A/B/C…), locates key sentences from
question keywords, detects trap wording, and builds the analysis skeleton.

> Note: Cambridge IELTS passages are commercial publications. This repository ships **no
> copyrighted article text** — only an import channel. Please use your own purchased books /
> licensed content for personal study.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Two ways to help:

- **Code**: tests must pass before a PR
- **Articles & questions**: contribute articles you hold the rights to, via in-app import →
  "contribute to the shared bank" → export a pack → PR to `packs/`

## Directory

```
├── index.html            Page shell (import modal: book / Test / Passage / difficulty / source / declaration)
├── README.md             Chinese readme / README_EN.md English readme
├── CONTRIBUTING.md       Contributing guide (ZH) / CONTRIBUTING_EN.md (EN)
├── ADMIN.md              Admin manual (token setup, in-app pack editing, security notes)
├── CODE_OF_CONDUCT.md    Contributor Covenant code of conduct (Chinese)
├── SECURITY.md           Security policy (private vulnerability reporting)
├── LICENSE               MIT (code only; contributed articles keep their own license)
├── assets/
│   ├── style.css         Styles (light study UI, responsive)
│   ├── data-exam1.js     Sample exam 1: The Economics of Pollination (13 questions)
│   ├── data-exam2.js     Sample exam 2: The Science of Sleep (10 questions)
│   ├── engine.js         Analysis engine: grading / sentence split / traps / paraphrase / locating / Band
│   ├── generator.js      Auto question generation: TFNG / gap fill / headings / MCQ + self-verification
│   ├── dict-core.js      Offline core dictionary (~1,000 words, stemming-aware, look-up fallback)
│   └── app.js            UI: answering / countdown / submit / report / look-up / import / word book
├── packs/                Shared question packs contributed by the community
│   └── manifest.json     Auto-generated index (do not edit by hand)
├── scripts/
│   └── build-manifest.js Scans packs/ and writes manifest.json (CI + local)
├── .github/
│   ├── workflows/        CI: unit + E2E; rebuilds the index when packs/ changes
│   ├── ISSUE_TEMPLATE/   Issue forms: bug / feature request / question-pack contribution
│   └── PULL_REQUEST_TEMPLATE.md
└── test/
    ├── engine_test.js    Engine unit tests
    ├── generator_test.js Generator unit tests
    ├── dict_test.js      Dictionary + coverage tests
    ├── e2e-auto.html     Browser E2E (auto answer → submit → look-up → import → declaration)
    └── shot-*.png        UI screenshots (including the live demo site)
```

## Tests

```bash
node test/engine_test.js     # 28 assertions: data integrity / grading / sentence split / traps / locating
node test/generator_test.js  # 47 assertions: question generation / answer derivability / trap reversal
node test/dict_test.js       # 18 assertions: stemming / derivative priority / coverage (≥45%)
```

E2E (needs a local Chrome; replace `chrome` with your Chrome binary):

```bash
chrome --headless --disable-gpu --no-sandbox \
  --virtual-time-budget=8000 --dump-dom "file://<repo>/test/e2e-auto.html" | grep -o 'E2E \[[^<]*'
```

Current status: 93 unit assertions + 29 E2E assertions, all passing. CI runs them on every
push and pull request (see `.github/workflows/tests.yml`).

## License

Code: [MIT](LICENSE). Articles contributed to the shared bank keep their own declared
license (see `contribution.license` in each pack); contributors must confirm they hold the
rights to anything they contribute.

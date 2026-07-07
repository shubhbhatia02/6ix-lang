/*
 * 6ix Lang playground — editor, syntax highlighting, output console.
 * Author: @shubhbhatia02
 */
(function () {
  'use strict';

  // ---------------------------------------------------------------------
  // Syntax highlighting
  // ---------------------------------------------------------------------

  const HL_RE = new RegExp(
    [
      '(\\bchattin\\b[^\\n]*)', // 1: comment
      '("(?:\\\\.|[^"\\\\\\n])*"?|\'(?:\\\\.|[^\'\\\\\\n])*\'?)', // 2: string
      '(\\b(?:big man ting|run it back|say less|big up|two-twos|wagwan|ting|is|ahlie|nahfam|from|to|by|dash|dip|gwan|and|or|not)\\b)', // 3: keyword
      '(\\b(?:styll|cap|ghost)\\b)', // 4: atom
      '(\\b(?:pree|bare|num|text|chuck|roll|highkey|lowkey|sumn|pattern|flip|loud|hush|chop|link|round|abs)\\b(?=\\s*\\())', // 5: builtin
      '(\\b\\d+(?:\\.\\d+)?\\b)', // 6: number
    ].join('|'),
    'g'
  );

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlightSix(code) {
    let html = '';
    let last = 0;
    HL_RE.lastIndex = 0;
    let m;
    while ((m = HL_RE.exec(code)) !== null) {
      html += esc(code.slice(last, m.index));
      const cls = m[1] ? 'tok-com'
        : m[2] ? 'tok-str'
        : m[3] ? 'tok-kw'
        : m[4] ? 'tok-atom'
        : m[5] ? 'tok-fn'
        : 'tok-num';
      html += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
      last = m.index + m[0].length;
    }
    html += esc(code.slice(last));
    return html;
  }

  // ---------------------------------------------------------------------
  // Example programs
  // ---------------------------------------------------------------------

  const EXAMPLES = {
    hello: {
      title: 'wagwan world',
      code: `wagwan

  chattin — your first 6ix Lang script
  big up "wagwan, world!"

  ting city is "Toronto"
  big up "reporting live from " + city + ", styll"

say less
`,
    },
    tings: {
      title: 'tings & maths',
      code: `wagwan

  chattin tings are variables, styll
  ting bag is 100
  ting price is 35

  big up "bag: " + bag
  big up "after the mandem eat: " + (bag - price * 2)

  ting cold is -10
  ahlie (cold < 0) {
    big up "it's bare cold out, fam"
  } nahfam {
    big up "patio season, styll"
  }

say less
`,
    },
    drizzybuzz: {
      title: 'drizzybuzz',
      code: `wagwan

  chattin FizzBuzz, 6ix style
  two-twos i from 1 to 20 {
    ahlie (i % 15 == 0) {
      big up "drizzybuzz"
    } nahfam ahlie (i % 3 == 0) {
      big up "drizzy"
    } nahfam ahlie (i % 5 == 0) {
      big up "buzz"
    } nahfam {
      big up i
    }
  }

say less
`,
    },
    loops: {
      title: 'run it back (loops)',
      code: `wagwan

  chattin 'run it back' loops until the condition caps
  ting countdown is 5
  run it back (countdown > 0) {
    big up countdown + "..."
    countdown is countdown - 1
  }
  big up "TAKEOFF"

  chattin 'two-twos' counts for you — 'by' sets the step
  two-twos beat from 0 to 16 by 4 {
    big up "drop on beat " + beat
  }

  chattin dip = break out, gwan = skip ahead
  two-twos n from 1 to 10 {
    ahlie (n == 3) { gwan }
    ahlie (n == 6) { dip }
    big up n
  }

say less
`,
    },
    functions: {
      title: 'big man tings (functions)',
      code: `wagwan

  big man ting spud(name) {
    dash "wagwan " + name + ", big up yourself"
  }

  big up spud("Drake")
  big up spud("the mandem")

  chattin recursion works too, styll
  big man ting factorial(n) {
    ahlie (n <= 1) { dash 1 }
    dash n * factorial(n - 1)
  }

  big up "6! is " + factorial(6)

say less
`,
    },
    mandem: {
      title: 'the mandem (lists)',
      code: `wagwan

  ting mandem is ["Drake", "Kawhi", "Vladdy", "Auston"]
  big up "squad is " + bare(mandem) + " deep"

  chuck(mandem, "DeMar")
  big up "DeMar reached — now it's " + bare(mandem) + " deep"

  two-twos i from 0 to bare(mandem) - 1 {
    big up "big up " + mandem[i]
  }

  chattin lists print nice too
  big up mandem

say less
`,
    },
    toolbox: {
      title: 'the toolbox (built-ins)',
      code: `wagwan

  chattin mans comes with tools — the built-in big man tings
  ting scores is [88, 64, 95, 71]

  big up "sumn (total): " + sumn(scores)
  big up "highkey (max): " + highkey(95, 71)
  big up "lowkey (min): " + lowkey(95, 71)
  big up "pattern (sort): " + pattern(scores)
  big up "flip (reverse): " + flip(scores)
  big up "bare (count): " + scores + " is " + bare(scores) + " deep"

  ting bars is "wagwan from the 6ix"
  big up loud(bars)
  big up "chop it: " + chop(bars, " ")
  big up link(["dot", "scarborough", "etobicoke"], " x ")

  big up "roll the dice: " + roll(6)
  big up "round 4.16: " + round(4.16)
  big up "abs of -43: " + abs(-43)

say less
`,
    },
  };

  // ---------------------------------------------------------------------
  // DOM wiring
  // ---------------------------------------------------------------------

  const editor = document.getElementById('editor');
  const highlightCode = document.getElementById('highlight-code');
  const highlightPre = document.getElementById('highlight');
  const gutter = document.getElementById('gutter');
  const output = document.getElementById('output');
  const runBtn = document.getElementById('run');
  const shareBtn = document.getElementById('share');
  const clearBtn = document.getElementById('clear');
  const exampleSel = document.getElementById('examples');

  const MAX_OUTPUT_LINES = 5000;
  let outputLines = 0;

  function refresh() {
    highlightCode.innerHTML = highlightSix(editor.value) + '\n';
    const lines = editor.value.split('\n').length;
    let nums = '';
    for (let i = 1; i <= lines; i++) nums += i + '\n';
    gutter.textContent = nums;
    syncScroll();
  }

  function syncScroll() {
    highlightPre.scrollTop = editor.scrollTop;
    highlightPre.scrollLeft = editor.scrollLeft;
    gutter.scrollTop = editor.scrollTop;
  }

  function appendLine(text, cls) {
    const div = document.createElement('div');
    div.className = 'line ' + cls;
    div.textContent = text;
    output.appendChild(div);
    output.scrollTop = output.scrollHeight;
  }

  function clearOutput() {
    output.innerHTML = '';
    outputLines = 0;
  }

  function run() {
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: 'run-script', title: 'Ran a script', event: true });
    }
    clearOutput();
    try {
      SixLang.run(editor.value, {
        print: function (s) {
          if (++outputLines > MAX_OUTPUT_LINES) {
            throw new SixLang.SixError(
              `Output's getting bare long — mans stopped printing after ${MAX_OUTPUT_LINES} lines.`
            );
          }
          appendLine(s, 'out');
        },
        input: function (msg) {
          return window.prompt(msg || 'pree: mans needs some input from you');
        },
      });
      appendLine('✓ done, say less.', 'sys');
    } catch (e) {
      if (e instanceof SixLang.SixError) {
        appendLine('✗ ' + e.message, 'err');
      } else {
        appendLine('✗ Something went proper sideways: ' + e.message, 'err');
      }
    }
  }

  // ---------------------------------------------------------------------
  // Share via URL hash
  // ---------------------------------------------------------------------

  function encodeCode(code) {
    const bytes = new TextEncoder().encode(code);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function decodeCode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function toast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('show'); }, 10);
    setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.remove(); }, 300);
    }, 2200);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* best effort */ }
    ta.remove();
    return Promise.resolve();
  }

  function share() {
    location.hash = 'code=' + encodeCode(editor.value);
    copyText(location.href).then(function () {
      toast('Link copied — send it to the mandem 🔗');
    });
  }

  // ---------------------------------------------------------------------
  // Events
  // ---------------------------------------------------------------------

  editor.addEventListener('input', refresh);
  editor.addEventListener('scroll', syncScroll);

  editor.addEventListener('keydown', function (e) {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (!document.execCommand || !document.execCommand('insertText', false, '  ')) {
        const s = editor.selectionStart;
        editor.setRangeText('  ', s, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      run();
    }
  });

  runBtn.addEventListener('click', run);
  shareBtn.addEventListener('click', share);
  clearBtn.addEventListener('click', function () {
    clearOutput();
    appendLine('Console cleared. Press ▶ Run it (or Ctrl+Enter) when you\'re ready.', 'sys');
  });

  // Examples dropdown
  Object.keys(EXAMPLES).forEach(function (key) {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = EXAMPLES[key].title;
    exampleSel.appendChild(opt);
  });

  exampleSel.addEventListener('change', function () {
    const ex = EXAMPLES[exampleSel.value];
    if (!ex) return;
    editor.value = ex.code;
    history.replaceState(null, '', location.pathname + location.search);
    refresh();
    clearOutput();
    appendLine('Loaded "' + ex.title + '" — press ▶ Run it (or Ctrl+Enter).', 'sys');
  });

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  // Highlight the static cheat-sheet snippets
  document.querySelectorAll('code.six').forEach(function (el) {
    el.innerHTML = highlightSix(el.textContent);
  });

  const hashMatch = location.hash.match(/code=([A-Za-z0-9\-_]+)/);
  let loadedFromHash = false;
  if (hashMatch) {
    try {
      editor.value = decodeCode(hashMatch[1]);
      loadedFromHash = true;
    } catch (e) { /* bad hash — fall through to default */ }
  }
  if (!loadedFromHash) {
    editor.value = EXAMPLES.hello.code;
    exampleSel.value = 'hello';
  }

  refresh();
  appendLine('6ix Lang v' + SixLang.version + ' — press ▶ Run it (or Ctrl+Enter) and see wagwan.', 'sys');
})();

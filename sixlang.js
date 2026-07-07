/*
 * 6ix Lang — a toy programming language from the 6ix, styll.
 *
 * Author: @shubhbhatia02
 *
 * Pipeline: lexer -> recursive-descent parser -> tree-walking interpreter.
 * Zero dependencies. Works in the browser (window.SixLang) and Node (module.exports).
 *
 * A script opens with `wagwan` and closes with `say less`.
 */
(function (root) {
  'use strict';

  class SixError extends Error {}

  // Control-flow signals (thrown and caught internally, never leak to users)
  class BreakSig { constructor(line) { this.line = line; } }
  class ContinueSig { constructor(line) { this.line = line; } }
  class ReturnSig { constructor(value, line) { this.value = value; this.line = line; } }

  // ---------------------------------------------------------------------
  // Lexer
  // ---------------------------------------------------------------------

  const SINGLE_KEYWORDS = {
    wagwan: 'WAGWAN',     // program start
    ting: 'TING',         // variable declaration
    is: 'IS',             // assignment
    ahlie: 'AHLIE',       // if
    nahfam: 'NAHFAM',     // else
    'two-twos': 'TWOTWOS',// for loop
    from: 'FROM',
    to: 'TO',
    by: 'BY',
    dash: 'DASH',         // return
    dip: 'DIP',           // break
    gwan: 'GWAN',         // continue
    styll: 'TRUE',
    cap: 'FALSE',
    ghost: 'NULL',
    and: 'AND',
    or: 'OR',
    not: 'NOT',
  };

  const MULTI_KEYWORDS = [
    { words: ['big', 'man', 'ting'], type: 'BIGMANTING', text: 'big man ting' }, // function
    { words: ['run', 'it', 'back'], type: 'RUNITBACK', text: 'run it back' },    // while
    { words: ['big', 'up'], type: 'BIGUP', text: 'big up' },                     // print
    { words: ['say', 'less'], type: 'SAYLESS', text: 'say less' },               // program end
  ];

  function isWordStart(c) { return /[A-Za-z_]/.test(c); }
  function isWordChar(c) { return /[A-Za-z0-9_]/.test(c); }

  function lex(src) {
    const raw = [];
    let i = 0;
    let line = 1;
    const n = src.length;

    while (i < n) {
      const c = src[i];

      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r') { i++; continue; }

      // Strings: "double" or 'single' quoted, no newlines inside
      if (c === '"' || c === "'") {
        const quote = c;
        const startLine = line;
        i++;
        let s = '';
        let closed = false;
        while (i < n) {
          const ch = src[i];
          if (ch === '\\') {
            const nx = src[i + 1];
            if (nx === 'n') s += '\n';
            else if (nx === 't') s += '\t';
            else if (nx === '\\') s += '\\';
            else if (nx === undefined) s += '\\';
            else s += nx;
            i += 2;
            continue;
          }
          if (ch === '\n') break;
          if (ch === quote) { closed = true; i++; break; }
          s += ch;
          i++;
        }
        if (!closed) {
          throw new SixError(`Line ${startLine}: you opened a string but never closed it. Finish what you start, fam.`);
        }
        raw.push({ type: 'STRING', value: s, line: startLine });
        continue;
      }

      // Numbers: 416 or 6.6
      if (c >= '0' && c <= '9') {
        let j = i;
        while (j < n && src[j] >= '0' && src[j] <= '9') j++;
        if (src[j] === '.' && src[j + 1] >= '0' && src[j + 1] <= '9') {
          j++;
          while (j < n && src[j] >= '0' && src[j] <= '9') j++;
        }
        raw.push({ type: 'NUMBER', value: parseFloat(src.slice(i, j)), line });
        i = j;
        continue;
      }

      // Words (identifiers / keywords)
      if (isWordStart(c)) {
        let j = i;
        while (j < n && isWordChar(src[j])) j++;
        let word = src.slice(i, j);

        // Special case: `two-twos` is one keyword despite the hyphen
        if (word === 'two' && src.slice(j, j + 5) === '-twos' && !isWordChar(src[j + 5] || '')) {
          word = 'two-twos';
          j += 5;
        }

        // Comments: `chattin` silences the rest of the line
        if (word === 'chattin') {
          while (j < n && src[j] !== '\n') j++;
          i = j;
          continue;
        }

        raw.push({ type: 'WORD', value: word, line });
        i = j;
        continue;
      }

      // Two-character operators
      const two = src.slice(i, i + 2);
      if (two === '==' || two === '!=' || two === '<=' || two === '>=') {
        raw.push({ type: two, line });
        i += 2;
        continue;
      }
      if (two === '&&') { raw.push({ type: 'WORD', value: 'and', line }); i += 2; continue; }
      if (two === '||') { raw.push({ type: 'WORD', value: 'or', line }); i += 2; continue; }

      // Single-character operators & punctuation
      if ('+-*/%(){}[],<>'.includes(c)) {
        raw.push({ type: c, line });
        i++;
        continue;
      }
      if (c === '!') { raw.push({ type: 'WORD', value: 'not', line }); i++; continue; }

      throw new SixError(`Line ${line}: mans can't read this: '${c}'. That character's not a ting in the 6ix.`);
    }

    // Second pass: merge multi-word keywords, classify words
    const tokens = [];
    let k = 0;
    outer:
    while (k < raw.length) {
      const t = raw[k];
      if (t.type === 'WORD') {
        for (const mk of MULTI_KEYWORDS) {
          if (mk.words[0] === t.value) {
            let ok = true;
            for (let w = 1; w < mk.words.length; w++) {
              const nx = raw[k + w];
              if (!nx || nx.type !== 'WORD' || nx.value !== mk.words[w]) { ok = false; break; }
            }
            if (ok) {
              tokens.push({ type: mk.type, value: mk.text, line: t.line });
              k += mk.words.length;
              continue outer;
            }
          }
        }
        const kw = SINGLE_KEYWORDS[t.value];
        tokens.push({ type: kw || 'IDENT', value: t.value, line: t.line });
        k++;
        continue;
      }
      tokens.push(t);
      k++;
    }
    tokens.push({ type: 'EOF', line });
    return tokens;
  }

  // ---------------------------------------------------------------------
  // Parser
  // ---------------------------------------------------------------------

  function friendly(t) {
    if (t.type === 'EOF') return 'the end of the script';
    if (t.type === 'NUMBER') return `the number ${t.value}`;
    if (t.type === 'STRING') return `the text "${t.value}"`;
    if (t.value !== undefined) return `'${t.value}'`;
    return `'${t.type}'`;
  }

  const EXPR_STARTERS = ['NUMBER', 'STRING', 'IDENT', 'TRUE', 'FALSE', 'NULL', 'NOT', '(', '[', '-'];

  function parse(tokens) {
    let pos = 0;

    const peek = (o = 0) => tokens[Math.min(pos + o, tokens.length - 1)];
    const check = (type) => peek().type === type;
    const atEnd = () => check('EOF');
    const advance = () => tokens[pos++];
    function match(type) { if (check(type)) { pos++; return true; } return false; }
    function expect(type, msg) {
      if (check(type)) return advance();
      throw new SixError(`Line ${peek().line}: ${msg}`);
    }

    function parseProgram() {
      if (!match('WAGWAN')) {
        throw new SixError(`Line ${peek().line}: you can't just start chattin — every 6ix script opens with 'wagwan', ahlie?`);
      }
      const body = [];
      while (!check('SAYLESS') && !atEnd()) body.push(statement());
      if (!match('SAYLESS')) {
        throw new SixError(`Line ${peek().line}: you never closed out — end the script with 'say less', fam.`);
      }
      if (!atEnd()) {
        throw new SixError(`Line ${peek().line}: after 'say less' the convo is DONE, but there's extra stuff here mans wasn't expecting.`);
      }
      return { type: 'Program', body };
    }

    function statement() {
      const t = peek();
      switch (t.type) {
        case 'TING': return varDecl();
        case 'BIGUP': {
          advance();
          const value = expression();
          return { type: 'Print', value, line: t.line };
        }
        case 'AHLIE': return ifStatement();
        case 'RUNITBACK': {
          advance();
          expect('(', `'run it back' checks a condition in brackets: run it back (x > 0) { ... }`);
          const cond = expression();
          expect(')', `close the brackets on that 'run it back' condition, fam.`);
          const body = block();
          return { type: 'While', cond, body, line: t.line };
        }
        case 'TWOTWOS': return forStatement();
        case 'BIGMANTING': return funcDecl();
        case 'DASH': {
          advance();
          let value = null;
          if (peek().line === t.line && EXPR_STARTERS.includes(peek().type)) value = expression();
          return { type: 'Return', value, line: t.line };
        }
        case 'DIP': advance(); return { type: 'Break', line: t.line };
        case 'GWAN': advance(); return { type: 'Continue', line: t.line };
        case 'NAHFAM':
          throw new SixError(`Line ${t.line}: there's a 'nahfam' here with no 'ahlie' before it. Can't have an else with no if, fam.`);
        case 'WAGWAN':
          throw new SixError(`Line ${t.line}: one 'wagwan' per script, fam — you already said it at the top.`);
        default: {
          const expr = expression();
          if (match('IS')) {
            if (expr.type !== 'Var' && expr.type !== 'Index') {
              throw new SixError(`Line ${t.line}: you can only assign to a ting or a spot in a list.`);
            }
            const value = expression();
            return { type: 'Assign', target: expr, value, line: t.line };
          }
          if (expr.type !== 'Call') {
            throw new SixError(`Line ${t.line}: this line isn't doing anything, fam. 'big up' it to print it, or assign it to a ting.`);
          }
          return { type: 'ExprStmt', expr, line: t.line };
        }
      }
    }

    function varDecl() {
      const t = advance(); // TING
      const name = expect('IDENT', `'ting' needs a name, like: ting price is 5`);
      expect('IS', `declare it like this: ting ${name.value} is <value>`);
      const value = expression();
      return { type: 'VarDecl', name: name.value, value, line: t.line };
    }

    function ifStatement() {
      const t = advance(); // AHLIE
      expect('(', `'ahlie' checks a condition in brackets: ahlie (x > 5) { ... }`);
      const cond = expression();
      expect(')', `close the brackets on that 'ahlie' condition.`);
      const then = block();
      let elseBody = null;
      if (match('NAHFAM')) {
        if (check('AHLIE')) elseBody = [ifStatement()];
        else elseBody = block();
      }
      return { type: 'If', cond, then, else: elseBody, line: t.line };
    }

    function forStatement() {
      const t = advance(); // TWOTWOS
      const name = expect('IDENT', `'two-twos' needs a counter, like: two-twos i from 1 to 10 { ... }`);
      expect('FROM', `where's the counter starting? two-twos ${name.value} from 1 to 10 { ... }`);
      const start = expression();
      expect('TO', `where's the counter heading? two-twos ${name.value} from 1 to 10 { ... }`);
      const end = expression();
      let step = null;
      if (match('BY')) step = expression();
      const body = block();
      return { type: 'For', name: name.value, start, end, step, body, line: t.line };
    }

    function funcDecl() {
      const t = advance(); // BIGMANTING
      const name = expect('IDENT', `'big man ting' needs a name: big man ting greet(name) { ... }`);
      expect('(', `'big man ting ${name.value}' needs brackets for its parameters (even if there's none).`);
      const params = [];
      if (!check(')')) {
        do {
          params.push(expect('IDENT', `parameter names only in there, fam.`).value);
        } while (match(','));
      }
      expect(')', `close the brackets on those parameters.`);
      const body = block();
      return { type: 'Func', name: name.value, params, body, line: t.line };
    }

    function block() {
      expect('{', `mans was expecting a '{' to open a block here.`);
      const stmts = [];
      // Stop at SAYLESS too: hitting it inside a block means a '}' went missing.
      while (!check('}') && !check('SAYLESS') && !atEnd()) stmts.push(statement());
      expect('}', `you opened a block but never closed it — missing a '}'.`);
      return stmts;
    }

    // --- Expressions (precedence climbing) ---

    function expression() { return orExpr(); }

    function orExpr() {
      let left = andExpr();
      while (check('OR')) {
        const line = advance().line;
        const right = andExpr();
        left = { type: 'Logical', op: 'or', left, right, line };
      }
      return left;
    }

    function andExpr() {
      let left = equality();
      while (check('AND')) {
        const line = advance().line;
        const right = equality();
        left = { type: 'Logical', op: 'and', left, right, line };
      }
      return left;
    }

    function equality() {
      let left = comparison();
      while (check('==') || check('!=')) {
        const op = advance();
        const right = comparison();
        left = { type: 'Binary', op: op.type, left, right, line: op.line };
      }
      return left;
    }

    function comparison() {
      let left = additive();
      while (check('<') || check('>') || check('<=') || check('>=')) {
        const op = advance();
        const right = additive();
        left = { type: 'Binary', op: op.type, left, right, line: op.line };
      }
      return left;
    }

    function additive() {
      let left = multiplicative();
      while (check('+') || check('-')) {
        const op = advance();
        const right = multiplicative();
        left = { type: 'Binary', op: op.type, left, right, line: op.line };
      }
      return left;
    }

    function multiplicative() {
      let left = unary();
      while (check('*') || check('/') || check('%')) {
        const op = advance();
        const right = unary();
        left = { type: 'Binary', op: op.type, left, right, line: op.line };
      }
      return left;
    }

    function unary() {
      if (check('NOT')) {
        const t = advance();
        return { type: 'Unary', op: 'not', operand: unary(), line: t.line };
      }
      if (check('-')) {
        const t = advance();
        return { type: 'Unary', op: '-', operand: unary(), line: t.line };
      }
      return postfix();
    }

    function postfix() {
      let expr = primary();
      for (;;) {
        if (check('(')) {
          const line = advance().line;
          const args = [];
          if (!check(')')) {
            do { args.push(expression()); } while (match(','));
          }
          expect(')', `close the brackets on that call.`);
          expr = { type: 'Call', callee: expr, args, line };
        } else if (check('[')) {
          const line = advance().line;
          const index = expression();
          expect(']', `close the square bracket on that index.`);
          expr = { type: 'Index', object: expr, index, line };
        } else {
          break;
        }
      }
      return expr;
    }

    function primary() {
      const t = peek();
      switch (t.type) {
        case 'NUMBER': advance(); return { type: 'Num', value: t.value, line: t.line };
        case 'STRING': advance(); return { type: 'Str', value: t.value, line: t.line };
        case 'TRUE': advance(); return { type: 'Bool', value: true, line: t.line };
        case 'FALSE': advance(); return { type: 'Bool', value: false, line: t.line };
        case 'NULL': advance(); return { type: 'Null', line: t.line };
        case 'IDENT': advance(); return { type: 'Var', name: t.value, line: t.line };
        case '(': {
          advance();
          const expr = expression();
          expect(')', `close them brackets, fam.`);
          return expr;
        }
        case '[': {
          advance();
          const items = [];
          if (!check(']')) {
            do { items.push(expression()); } while (match(','));
          }
          expect(']', `close the square bracket on that list.`);
          return { type: 'List', items, line: t.line };
        }
        default:
          throw new SixError(`Line ${t.line}: mans wasn't expecting ${friendly(t)} right there.`);
      }
    }

    return parseProgram();
  }

  // ---------------------------------------------------------------------
  // Runtime values & helpers
  // ---------------------------------------------------------------------

  class SixFunction {
    constructor(decl, closure) { this.decl = decl; this.closure = closure; }
  }

  class Environment {
    constructor(parent) { this.vars = null; this.parent = parent || null; }
    declare(name, value) {
      if (!this.vars) this.vars = new Map();
      this.vars.set(name, value);
    }
    lookupEnv(name) {
      let e = this;
      while (e) {
        if (e.vars && e.vars.has(name)) return e;
        e = e.parent;
      }
      return null;
    }
  }

  function truthy(v) {
    return !(v === false || v === null || v === undefined || v === 0 || v === '');
  }

  function typeName(v) {
    if (v === null || v === undefined) return 'ghost';
    if (typeof v === 'boolean') return v ? 'styll' : 'cap';
    if (typeof v === 'number') return 'a number';
    if (typeof v === 'string') return 'text';
    if (Array.isArray(v)) return 'a list';
    if (v instanceof SixFunction || typeof v === 'function') return 'a big man ting';
    return 'a mystery ting';
  }

  function formatNum(v) {
    if (Number.isInteger(v)) return String(v);
    return String(Number(v.toPrecision(12)));
  }

  function display(v) {
    if (v === null || v === undefined) return 'ghost';
    if (v === true) return 'styll';
    if (v === false) return 'cap';
    if (typeof v === 'number') return formatNum(v);
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return '[' + v.map(displayInner).join(', ') + ']';
    if (v instanceof SixFunction) return `<big man ting ${v.decl.name}>`;
    if (typeof v === 'function') return '<builtin ting>';
    return String(v);
  }

  function displayInner(v) {
    return typeof v === 'string' ? `"${v}"` : display(v);
  }

  function sixEquals(a, b) {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!sixEquals(a[i], b[i])) return false;
      }
      return true;
    }
    return a === b;
  }

  // ---------------------------------------------------------------------
  // Interpreter
  // ---------------------------------------------------------------------

  const MAX_OPS = 2500000;
  const MAX_DEPTH = 500;

  class Interpreter {
    constructor(hooks) {
      this.print = hooks.print;
      this.input = hooks.input;
      this.ops = 0;
      this.depth = 0;
      this.globals = new Environment(null);
      installBuiltins(this);
    }

    tick(line) {
      if (++this.ops > MAX_OPS) {
        throw new SixError(`Yo, this script's been runnin' WAY too long — mans had to dip around line ${line}. Check for a loop that runs back forever.`);
      }
    }

    run(program) {
      for (const stmt of program.body) this.exec(stmt, this.globals);
    }

    execBlock(stmts, env) {
      for (const stmt of stmts) this.exec(stmt, env);
    }

    exec(stmt, env) {
      this.tick(stmt.line);
      switch (stmt.type) {
        case 'VarDecl':
          env.declare(stmt.name, this.eval(stmt.value, env));
          return;

        case 'Assign': {
          const value = this.eval(stmt.value, env);
          const target = stmt.target;
          if (target.type === 'Var') {
            const owner = env.lookupEnv(target.name);
            if (!owner) {
              throw new SixError(`Line ${stmt.line}: '${target.name}' isn't a ting yet — declare it first, like: ting ${target.name} is ...`);
            }
            owner.vars.set(target.name, value);
          } else {
            const obj = this.eval(target.object, env);
            const idx = this.eval(target.index, env);
            if (!Array.isArray(obj)) {
              throw new SixError(`Line ${stmt.line}: you can only stick tings into a list with [ ], and that's ${typeName(obj)}.`);
            }
            if (typeof idx !== 'number' || !Number.isInteger(idx) || idx < 0 || idx >= obj.length) {
              throw new SixError(`Line ${stmt.line}: ${display(idx)} isn't a spot in that list — it's ${obj.length} deep, counting from 0.`);
            }
            obj[idx] = value;
          }
          return;
        }

        case 'Print':
          this.print(display(this.eval(stmt.value, env)));
          return;

        case 'If':
          if (truthy(this.eval(stmt.cond, env))) {
            this.execBlock(stmt.then, new Environment(env));
          } else if (stmt.else) {
            this.execBlock(stmt.else, new Environment(env));
          }
          return;

        case 'While': {
          while (truthy(this.eval(stmt.cond, env))) {
            this.tick(stmt.line);
            try {
              this.execBlock(stmt.body, new Environment(env));
            } catch (sig) {
              if (sig instanceof BreakSig) break;
              if (sig instanceof ContinueSig) continue;
              throw sig;
            }
          }
          return;
        }

        case 'For': {
          const start = this.eval(stmt.start, env);
          const end = this.eval(stmt.end, env);
          if (typeof start !== 'number' || typeof end !== 'number') {
            throw new SixError(`Line ${stmt.line}: 'two-twos' counts numbers, fam — 'from' and 'to' both need to be numbers.`);
          }
          let step;
          if (stmt.step) {
            step = this.eval(stmt.step, env);
            if (typeof step !== 'number') {
              throw new SixError(`Line ${stmt.line}: the 'by' step needs to be a number.`);
            }
            if (step === 0) {
              throw new SixError(`Line ${stmt.line}: a step of 0 gets you nowhere, fam.`);
            }
            // The range sets the direction; 'by' sets the size of the step.
            step = Math.abs(step) * (start <= end ? 1 : -1);
          } else {
            step = start <= end ? 1 : -1;
          }
          const loopEnv = new Environment(env);
          loopEnv.declare(stmt.name, start);
          let i = start;
          for (;;) {
            if (!(step > 0 ? i <= end : i >= end)) break;
            this.tick(stmt.line);
            loopEnv.vars.set(stmt.name, i);
            let broke = false;
            try {
              this.execBlock(stmt.body, new Environment(loopEnv));
            } catch (sig) {
              if (sig instanceof BreakSig) broke = true;
              else if (!(sig instanceof ContinueSig)) throw sig;
            }
            if (broke) break;
            const cur = loopEnv.vars.get(stmt.name);
            if (typeof cur !== 'number') {
              throw new SixError(`Line ${stmt.line}: the counter '${stmt.name}' stopped being a number mid-loop. Don't do mans like that.`);
            }
            i = cur + step;
          }
          return;
        }

        case 'Func':
          env.declare(stmt.name, new SixFunction(stmt, env));
          return;

        case 'Return':
          throw new ReturnSig(stmt.value ? this.eval(stmt.value, env) : null, stmt.line);

        case 'Break':
          throw new BreakSig(stmt.line);

        case 'Continue':
          throw new ContinueSig(stmt.line);

        case 'ExprStmt':
          this.eval(stmt.expr, env);
          return;
      }
    }

    eval(node, env) {
      switch (node.type) {
        case 'Num': return node.value;
        case 'Str': return node.value;
        case 'Bool': return node.value;
        case 'Null': return null;

        case 'Var': {
          const owner = env.lookupEnv(node.name);
          if (!owner) {
            throw new SixError(`Line ${node.line}: mans never heard of '${node.name}'. Declare it first, like: ting ${node.name} is ...`);
          }
          return owner.vars.get(node.name);
        }

        case 'List': {
          const out = [];
          for (const item of node.items) out.push(this.eval(item, env));
          return out;
        }

        case 'Logical': {
          const left = this.eval(node.left, env);
          if (node.op === 'or') return truthy(left) ? left : this.eval(node.right, env);
          return truthy(left) ? this.eval(node.right, env) : left;
        }

        case 'Unary': {
          const v = this.eval(node.operand, env);
          if (node.op === 'not') return !truthy(v);
          if (typeof v !== 'number') {
            throw new SixError(`Line ${node.line}: you can't put a minus on ${typeName(v)}, that's a waste ting.`);
          }
          return -v;
        }

        case 'Binary': return this.binary(node, env);

        case 'Index': {
          const obj = this.eval(node.object, env);
          const idx = this.eval(node.index, env);
          if (Array.isArray(obj) || typeof obj === 'string') {
            if (typeof idx !== 'number' || !Number.isInteger(idx)) {
              throw new SixError(`Line ${node.line}: list spots are whole numbers, fam — ${display(idx)} won't cut it.`);
            }
            if (idx < 0 || idx >= obj.length) {
              throw new SixError(`Line ${node.line}: spot ${idx} doesn't exist — that's only ${obj.length} deep (counting from 0).`);
            }
            return obj[idx];
          }
          throw new SixError(`Line ${node.line}: you can only index into a list or some text, not ${typeName(obj)}.`);
        }

        case 'Call': {
          const callee = this.eval(node.callee, env);
          const args = [];
          for (const a of node.args) args.push(this.eval(a, env));
          if (typeof callee === 'function') return callee(args, node.line, this);
          if (callee instanceof SixFunction) return this.callFunction(callee, args, node.line);
          const nameFor = node.callee.type === 'Var' ? `'${node.callee.name}'` : 'that';
          throw new SixError(`Line ${node.line}: ${nameFor} isn't a big man ting — you can't call it.`);
        }
      }
    }

    callFunction(fn, args, line) {
      const params = fn.decl.params;
      if (args.length !== params.length) {
        throw new SixError(`Line ${line}: '${fn.decl.name}' takes ${params.length} ting${params.length === 1 ? '' : 's'}, but you dashed it ${args.length}.`);
      }
      if (this.depth >= MAX_DEPTH) {
        throw new SixError(`Line ${line}: mans is in too deep — '${fn.decl.name}' keeps calling itself with no way out. Check your recursion, fam.`);
      }
      this.depth++;
      const env = new Environment(fn.closure);
      for (let i = 0; i < params.length; i++) env.declare(params[i], args[i]);
      try {
        this.execBlock(fn.decl.body, env);
        return null;
      } catch (sig) {
        if (sig instanceof ReturnSig) return sig.value;
        if (sig instanceof BreakSig) {
          throw new SixError(`Line ${sig.line}: 'dip' only works inside a loop, fam.`);
        }
        if (sig instanceof ContinueSig) {
          throw new SixError(`Line ${sig.line}: 'gwan' only works inside a loop, fam.`);
        }
        throw sig;
      } finally {
        this.depth--;
      }
    }

    binary(node, env) {
      const { op, line } = node;
      const a = this.eval(node.left, env);
      const b = this.eval(node.right, env);
      switch (op) {
        case '+':
          if (typeof a === 'string' || typeof b === 'string') return display(a) + display(b);
          if (typeof a === 'number' && typeof b === 'number') return a + b;
          if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
          throw new SixError(`Line ${line}: you can't add ${typeName(a)} to ${typeName(b)}, that's a waste ting.`);
        case '-':
        case '*':
        case '/':
        case '%': {
          if (typeof a !== 'number' || typeof b !== 'number') {
            throw new SixError(`Line ${line}: you can't '${op}' ${typeName(a)} with ${typeName(b)}, that's a waste ting.`);
          }
          if ((op === '/' || op === '%') && b === 0) {
            throw new SixError(`Line ${line}: dividing by zero? That's a waste ting, fam.`);
          }
          if (op === '-') return a - b;
          if (op === '*') return a * b;
          if (op === '/') return a / b;
          return a % b;
        }
        case '==': return sixEquals(a, b);
        case '!=': return !sixEquals(a, b);
        case '<':
        case '>':
        case '<=':
        case '>=': {
          const bothNums = typeof a === 'number' && typeof b === 'number';
          const bothText = typeof a === 'string' && typeof b === 'string';
          if (!bothNums && !bothText) {
            throw new SixError(`Line ${line}: you can't compare ${typeName(a)} with ${typeName(b)} like that.`);
          }
          if (op === '<') return a < b;
          if (op === '>') return a > b;
          if (op === '<=') return a <= b;
          return a >= b;
        }
      }
    }
  }

  // ---------------------------------------------------------------------
  // Built-ins
  // ---------------------------------------------------------------------

  function installBuiltins(interp) {
    const g = interp.globals;

    function def(name, arity, fn) {
      g.declare(name, function (args, line, it) {
        if (arity !== null && args.length !== arity) {
          throw new SixError(`Line ${line}: '${name}' wants ${arity} ting${arity === 1 ? '' : 's'}, but you gave it ${args.length}.`);
        }
        return fn(args, line, it);
      });
    }

    // pree("question?") — ask the user for input, get text back (or ghost)
    def('pree', null, (args, line, it) => {
      if (args.length > 1) {
        throw new SixError(`Line ${line}: 'pree' takes one question at most, fam.`);
      }
      const msg = args.length ? display(args[0]) : '';
      const res = it.input(msg);
      return res === null || res === undefined ? null : String(res);
    });

    // bare(x) — how deep is a list or some text
    def('bare', 1, ([v], line) => {
      if (typeof v === 'string' || Array.isArray(v)) return v.length;
      throw new SixError(`Line ${line}: 'bare' counts lists and text, and ${typeName(v)} ain't either.`);
    });

    // num(x) — turn it into a number
    def('num', 1, ([v], line) => {
      if (typeof v === 'number') return v;
      if (v === true) return 1;
      if (v === false) return 0;
      if (typeof v === 'string' && v.trim() !== '' && !isNaN(Number(v))) return Number(v);
      throw new SixError(`Line ${line}: mans can't turn ${displayInner(v)} into a number.`);
    });

    // text(x) — turn it into text
    def('text', 1, ([v]) => display(v));

    // chuck(list, item) — chuck an item onto the end of a list
    def('chuck', 2, ([list, item], line) => {
      if (!Array.isArray(list)) {
        throw new SixError(`Line ${line}: 'chuck' adds tings to a list, and ${typeName(list)} ain't one.`);
      }
      list.push(item);
      return list;
    });

    // roll(n) — random whole number from 1 to n
    def('roll', 1, ([n], line) => {
      if (typeof n !== 'number' || !Number.isInteger(n) || n < 1) {
        throw new SixError(`Line ${line}: 'roll' needs a whole number of at least 1.`);
      }
      return Math.floor(Math.random() * n) + 1;
    });

    // highkey(a, b) — whichever is bigger
    def('highkey', 2, ([a, b], line) => {
      if (typeof a === 'number' && typeof b === 'number') return Math.max(a, b);
      if (typeof a === 'string' && typeof b === 'string') return a > b ? a : b;
      throw new SixError(`Line ${line}: 'highkey' compares two numbers or two pieces of text, not ${typeName(a)} with ${typeName(b)}.`);
    });

    // lowkey(a, b) — whichever is smaller
    def('lowkey', 2, ([a, b], line) => {
      if (typeof a === 'number' && typeof b === 'number') return Math.min(a, b);
      if (typeof a === 'string' && typeof b === 'string') return a < b ? a : b;
      throw new SixError(`Line ${line}: 'lowkey' compares two numbers or two pieces of text, not ${typeName(a)} with ${typeName(b)}.`);
    });

    // sumn(list) — add up a list of numbers
    def('sumn', 1, ([list], line) => {
      if (!Array.isArray(list)) {
        throw new SixError(`Line ${line}: 'sumn' adds up a list, and ${typeName(list)} ain't one.`);
      }
      let total = 0;
      for (const v of list) {
        if (typeof v !== 'number') {
          throw new SixError(`Line ${line}: there's ${typeName(v)} in that list — 'sumn' only adds numbers.`);
        }
        total += v;
      }
      return total;
    });

    // pattern(list) — sort it out (returns a new sorted list)
    def('pattern', 1, ([list], line) => {
      if (!Array.isArray(list)) {
        throw new SixError(`Line ${line}: 'pattern' sorts a list, and ${typeName(list)} ain't one.`);
      }
      const allNums = list.every((v) => typeof v === 'number');
      const allText = list.every((v) => typeof v === 'string');
      if (!allNums && !allText) {
        throw new SixError(`Line ${line}: 'pattern' needs a list that's all numbers or all text — can't sort a mixed bag.`);
      }
      const copy = list.slice();
      copy.sort(allNums ? (a, b) => a - b : undefined);
      return copy;
    });

    // flip(x) — reverse a list or some text (returns a new one)
    def('flip', 1, ([v], line) => {
      if (Array.isArray(v)) return v.slice().reverse();
      if (typeof v === 'string') return Array.from(v).reverse().join('');
      throw new SixError(`Line ${line}: 'flip' reverses a list or text, not ${typeName(v)}.`);
    });

    // loud(text) — SHOUT IT
    def('loud', 1, ([v], line) => {
      if (typeof v !== 'string') throw new SixError(`Line ${line}: 'loud' shouts text, and ${typeName(v)} ain't text.`);
      return v.toUpperCase();
    });

    // hush(text) — keep it quiet
    def('hush', 1, ([v], line) => {
      if (typeof v !== 'string') throw new SixError(`Line ${line}: 'hush' quiets text, and ${typeName(v)} ain't text.`);
      return v.toLowerCase();
    });

    // chop(text, separator) — chop text into a list
    def('chop', 2, ([s, sep], line) => {
      if (typeof s !== 'string' || typeof sep !== 'string') {
        throw new SixError(`Line ${line}: 'chop' wants text and a separator, both text.`);
      }
      return sep === '' ? Array.from(s) : s.split(sep);
    });

    // link(list, separator) — link a list up into one piece of text
    def('link', 2, ([list, sep], line) => {
      if (!Array.isArray(list) || typeof sep !== 'string') {
        throw new SixError(`Line ${line}: 'link' wants a list and a separator (text).`);
      }
      return list.map(display).join(sep);
    });

    // round(x) / abs(x) — everyday maths
    def('round', 1, ([v], line) => {
      if (typeof v !== 'number') throw new SixError(`Line ${line}: 'round' works on numbers, not ${typeName(v)}.`);
      return Math.round(v);
    });

    def('abs', 1, ([v], line) => {
      if (typeof v !== 'number') throw new SixError(`Line ${line}: 'abs' works on numbers, not ${typeName(v)}.`);
      return Math.abs(v);
    });
  }

  // ---------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------

  /**
   * Run a 6ix Lang script.
   * hooks.print(text)  — called once per `big up` line
   * hooks.input(msg)   — called by pree(); return a string (or null)
   * Throws SixError with a slang-flavoured message on any problem.
   */
  function run(source, hooks) {
    hooks = hooks || {};
    const print = hooks.print || function () {};
    const input = hooks.input || function () { return null; };
    const tokens = lex(String(source == null ? '' : source));
    const program = parse(tokens);
    const interp = new Interpreter({ print, input });
    try {
      interp.run(program);
    } catch (sig) {
      if (sig instanceof ReturnSig) {
        throw new SixError(`Line ${sig.line}: you can't 'dash' from out here — that only works inside a big man ting.`);
      }
      if (sig instanceof BreakSig) {
        throw new SixError(`Line ${sig.line}: 'dip' only works inside a loop, fam.`);
      }
      if (sig instanceof ContinueSig) {
        throw new SixError(`Line ${sig.line}: 'gwan' only works inside a loop, fam.`);
      }
      throw sig;
    }
  }

  const SixLang = { run, SixError, version: '1.0.0' };

  if (typeof module !== 'undefined' && module.exports) module.exports = SixLang;
  else root.SixLang = SixLang;
})(typeof window !== 'undefined' ? window : globalThis);

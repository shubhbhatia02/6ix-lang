# 6ix Lang 🇨🇦

> A toy programming language in Toronto slang. Open with `wagwan`, close with `say less`.

By [@shubhbhatia02](https://github.com/shubhbhatia02)

**[▶ Try it in the playground](https://shubhbhatia02.github.io/6ix-lang/)**

```
wagwan

  chattin your first 6ix Lang script
  big up "wagwan, world!"

  ting city is "Toronto"
  big up "reporting live from " + city + ", styll"

say less
```

6ix Lang is a real (toy) language: a lexer, a recursive-descent parser, and a
tree-walking interpreter, written in one dependency-free JavaScript file
([`sixlang.js`](sixlang.js)) that runs entirely in your browser. The error
messages talk back in slang, and infinite loops get cut off before they freeze
your tab.

## The language

Every script opens with `wagwan` and closes with `say less`. In between:

| Concept | 6ix Lang | Example |
|---|---|---|
| Print | `big up` | `big up "safe"` |
| Variable | `ting … is` | `ting area is 416` |
| Reassign | `is` | `area is area + 231` |
| If / else | `ahlie` / `nahfam` | `ahlie (x > 5) { … } nahfam { … }` |
| While loop | `run it back` | `run it back (n > 0) { … }` |
| For loop | `two-twos … from … to … (by …)` | `two-twos i from 1 to 10 { … }` |
| Function | `big man ting` | `big man ting greet(name) { … }` |
| Return | `dash` | `dash "wagwan " + name` |
| Break / continue | `dip` / `gwan` | inside any loop |
| true / false | `styll` / `cap` | `ting realTalk is styll` |
| null | `ghost` | `ting plans is ghost` |
| Comment | `chattin` | `chattin this line is ignored` |
| Input | `pree` | `ting name is pree("who dis?")` |
| Logic | `and` / `or` / `not` | `ahlie (a and not b) { … }` |
| Lists | `[ … ]` | `ting squad is ["dot", "sauga"]` |

Operators are the usual suspects: `+ - * / %` and `== != < > <= >=`.
Strings use `"double"` or `'single'` quotes. List indexing starts at 0:
`squad[0]`, and you can assign into a spot: `squad[1] is "vaughan"`.

### Built-in functions (the toolbox)

| Function | What it does |
|---|---|
| `pree(question)` | Ask the user for input (returns text, or `ghost` if cancelled) |
| `bare(x)` | Length of a list or text |
| `chuck(list, item)` | Add an item to the end of a list |
| `sumn(list)` | Add up a list of numbers |
| `highkey(a, b)` / `lowkey(a, b)` | Max / min of two values |
| `pattern(list)` | Sort a list (returns a new one) |
| `flip(x)` | Reverse a list or text |
| `loud(text)` / `hush(text)` | UPPERCASE / lowercase |
| `chop(text, sep)` | Split text into a list |
| `link(list, sep)` | Join a list into text |
| `num(x)` / `text(x)` | Convert to number / text |
| `roll(n)` | Random whole number from 1 to n |
| `round(x)` / `abs(x)` | Everyday maths |

### A bigger taste

```
wagwan

  big man ting factorial(n) {
    ahlie (n <= 1) { dash 1 }
    dash n * factorial(n - 1)
  }

  two-twos i from 1 to 6 {
    big up i + "! is " + factorial(i)
  }

  ting mandem is ["Drake", "Kawhi", "Vladdy"]
  chuck(mandem, "DeMar")
  run it back (bare(mandem) > 0) {
    big up "big up " + mandem[bare(mandem) - 1]
    mandem is flip(mandem)
    chattin (nobody said the algorithm had to be good)
    dip
  }

say less
```

More runnable programs live in [`examples/`](examples/) and in the
playground's examples dropdown.

## Run it locally

No build step, no dependencies. Clone and open `index.html` in a browser —
that's it.

You can also run scripts from Node:

```js
const SixLang = require('./sixlang.js');
SixLang.run('wagwan\n big up "safe" \nsay less', {
  print: (line) => console.log(line),
});
```

## Host it on GitHub Pages

1. Create a new repository on GitHub called `6ix-lang`.
2. From this folder:
   ```sh
   git init
   git add .
   git commit -m "wagwan"
   git branch -M main
   git remote add origin https://github.com/shubhbhatia02/6ix-lang.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save**.
4. In two-twos your playground is live at `https://shubhbhatia02.github.io/6ix-lang/`.

## How it works

`sixlang.js` is the whole language:

1. **Lexer** — turns source text into tokens, merging multi-word keywords
   like `big man ting` and `run it back` into single tokens.
2. **Parser** — recursive descent, builds an AST, throws slang-flavoured
   syntax errors with line numbers.
3. **Interpreter** — walks the AST with proper lexical scoping, closures,
   and recursion. An operation budget stops runaway loops, and a depth cap
   stops runaway recursion.

Want your own city's version? Fork it and edit the `SINGLE_KEYWORDS` /
`MULTI_KEYWORDS` tables at the top of `sixlang.js` — the grammar doesn't
care what the words are.

## License

MIT © [@shubhbhatia02](https://github.com/shubhbhatia02) — say less.

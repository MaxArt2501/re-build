RE-Build reference
==================

# The `RegExpBuilder` class

The object obtained from building a regular expressions are instances of the class `RegExpBuilder`. The instances are augmented with members and methods to build the regex further, but they're basically immutable objects as every call to extend the builder returns a *new* `RegExpBuilder` instance.

## Properties

All the following properties are read-only.

Type    | Name         | Description
-------:|--------------|-------------
string  | `regex`      | The regular expression defined by the builder. It's compiled the first time the property is requested, then cached
string  | `source`     | The source of the underlying regular expression. Used to compile it
string  | `flags`      | A string comprising the regex' flags. It may include one or more of the letters `"g"`, `"m"`, `"i"` or `"y"`
boolean | `global`     | The regex' `global` flag
boolean | `ignoreCase` | The regex' `ignoreCase` flag
boolean | `multiline`  | The regex' `multiline` flag
boolean | `sticky`     | The regex' `sticky` flag

## Methods

Returns  | Name             | Description
--------:|------------------|-------------------------
`RegExp` | `toRegExp()`     | Basically, returns the `regex` property
`RegExp` | `valueOf()`      | See above
string   | `toString()`     | Returns a string representation
boolean  | `test(string)`   | Uses the underlying regex to test a string. Short for `.regex.test(...)`
array    | `exec(string)`   | Executes the underlying regex on a string. Short for `.regex.test(...)`
string   | `replace(string, string/function)` | Uses the underlying regex to perform a regex-based replacement. Short for `string.replace(regex, ...)`
array    | `split(string)`  | Uses the underlying regex to perform a regex-based string split. Short for `string.split(regex)`
number   | `search(string)` | Uses the underlying regex to perform a string search. Short for `string.search(regex)`

# Building a regex

Regex building begins from the he `RE` object returned by the module. You can obtain a *builder* (instances of `RegExpBuilder`) evry time you use "words" like `digit`, `then` and such. Some of these words act like functions (like `atLeast` and `unicode`), some like properties (like `digit` and `theEnd`), some work as both.

In this last case, if the word is not used as a function, additional words are expected to obtain a builder:

```js
var foo = RE.matching.digit.then.alphaNumeric;
```

Many words that can (or must) be used as functions accept a variable number of arguments, that can be either strings, or regular expressions, or builders, which are all appended to the source. Strings are backslash-escaped, while in the other cases the `source` property is then added *unescaped*:

```js
var amount = RE.oneOrMore.digit.then(".").then.digit.then.digit,
    currency = /[$€£]/;

var builder = RE.matching.theStart
                .then("Total: ", amount, currency)
                .then.theEnd;
```

Other words that work as functions only usually accept other types of arguments.

## Flags

The flags of a builder (and its underlying regular expression) can be set using words starting from the `RE` object. After one of these words, another flag word or `matching` must follow, with the exception of `withFlags` that must be followed by `matching` only.

* **`globally`**

  Set the `global` flag on.

* **`anyCase`**

  Set the `ignoreCase` flag on.

* **`fullText`**

  Set the `multiline` flag on.

* **`stickily`**

  Set the `sticky` flag on.

* **`withFlags(flags)`**

  Set multiple flags. `flags` is expected to be a string containing letters in the set `"g"`, `"m"`, `"i"` and `"y"`.

## Conjunctions

Conjunctions append additional blocks to the current source. They can follow any open or set block.

* **`then`**

  Appends a block to the current source.
  
* **`or`**

  Adds an alternative block (prefixed by the pipe `|` character in regular expressions).

## Open and set blocks

These words can be used in both "open" sequences or inside character sets. They can be used after conjunction words, or a quantifier, or the `matching` word, or the `RE` object itself, or the `and` word joining blocks in character sets.

* **`digit` / `not.digit`**

  A digit character (`\d`) or its negation (`\D`).

* **`alphaNumeric` / `not.alphaNumeric`**

  An alphanumeric character plus the undescore (`\w`) or its negation (`\W`).

* **`whiteSpace` / `not.whisteSpace`**

  A whitespace (`\s`) or its negation (`\W`).

* **`cReturn`** `\r`
* **`newLine`** `\n`
* **`tab`** `\t`
* **`vTab`** `\v`
* **`formFeed`** `\f`
* **`null`** `\0`
* **`ascii(code)`**

  An ASCII escape sequence (`\xhh`). `code` must be an integer between 0 and 255. It it then converted as two hexadecimal digits in the sequence.

* **`unicode(code)`**

  An Unicode escape sequence (`\uhhhh`). `code` must be an integer between 0 and 65535 (`0xffff`). It it then converted as four hexadecimal digits in the sequence.

* **`control(letter)`**

  A control sequence (`\cx`). `letter` must be a string of a single letter. It it then converted to uppercase in the sequence.

## Open-only blocks

These words can be used in open block sequences only (which means, not inside character sets. They can be used after conjunction words, or a quantifier, or the `matching` word, or the `RE` object itself.

* **`anyChar`**

  The universal character (`.`).

* **`theStart` / `theEnd`**

  The string-start and string-end boundaries (`^` and `$`, respectively).
  
* **`wordBoundary` / `not.wordBoundary`**

  A word boundary (`\b`) or its negation (`\B`).

* **`oneOf` / `not.oneOf`**

  Appends a character set (`[...]` or `[^...]`, respectively). See the paragraph about [character sets](#character-sets).

* **`group(...)`**

  Non-capturing group - `(?:...)`. Used as functions only. Arguments can be strings, regexes or builders.

* **`capture(...)`**

  Capturing group - `(...)`. Used as functions only. Arguments can be strings, regexes or builders.

* **`reference(number)`**

  Group backreference (`\number`). `number` should be a positive integer.
  
## Character sets

Character sets are introduced by the `oneOf` word, and may include one or more blocks separated by the `and` word (e.g.: `RE.oneOf.digit.and("abcdef")`).

These words can be used in character sets only:

* **`range(start, end)`**

  Adds a character interval into the character set (`[...start-end...]`). `start` and `end` are supposed to be strings of single characters defining the boundaries of the character range; or they can be builders that define one single character, or character class usable in character ranges (which include: `ascii`, `unicode`, `control`, `newLine`, `cReturn`, `tab`, `vTab`, `formFeed`, `null`).

* **`backspace`**

  The backspace character, `\b` (U+0008). Not to be confused with the word boundary, which can be used as an "open" block only.

## Quantifiers

Quantifiers can follow conjunction words, or the `matching` word, or the `RE` object itself, and can precede any "open" block, with the exception of `wordBoundary`, `not.wordBoundary`, `theStart` and `theEnd`.

They can be prefixed by `lazily` to define a lazy quantifier, instead of a greedy one.

Quantifiers can be used as functions, and accept strings, regexes or builders as arguments. A convenient group wrap will be used if necessary:

```js
var foo = RE.oneOrMore("a"),   // /a+/
    bar = RE.oneOrMore("abc"); // /(?:abc)+/
```

* **`anyAmountOf`** `*`
* **`oneOrMore`** `+`
* **`noneOrOne`** `?`
* **`atLeast(n)`**

  `n` must be a non-negative integer. If `n` is 0, a `*` is produced; if `n` is 1, then `+` is produced; else, the quantifier is `{n,}`.

* **`atMost(n)`**

  `n` must be a non-negative integer. If `n` is 1, then `?` is produced; else, the quantifier is `{,n}`.

* **`exactly(n)`**

  `n` must be a non-negative integer. If `n` is 1, then no quantifier is defined; else, the quantifier is `{n}`.

* **`between(n, m)`**

  `n` and `m` must be non-negative integers. If the the values are adequate, the produced quantifier can be one of the above; otherwise, the quantifier is `{n,m}`.


## Look-aheads

* **`followedBy(...)` / `not.followedBy(...)`**

  Appends a look-ahead (`(?=...)` or `(?!...)`, respectively). Used as functions only. Arguments can be strings, regexes or builders.
  
  Can follow any open block, or the `matching` word, or the `RE` object itself, or the `or` conjunction.
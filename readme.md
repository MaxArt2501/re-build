RE-Build
========

Build regular expressions with natural language.

## Introduction

Have you ever dealt with complex regular expressions like the following one?

```js
var ipMatch = /(?:(?:1\d\d|2[0-4]\d|25[0-5]|[1-9]\d|\d)\.){3}(?:1\d\d|2[0-4]\d|25[0-5]|[1-9]\d|\d)\b/;
```

Using a meaningful variable name can help, writing comments helps even more, but what's always hard to understand is what the regular expression actually *does*: They're left as some sort of magic trick that it's never updated because their syntax is so obscure that even the authors themselves hardly fell like facing them again. Debugging a regular expression often means rewriting it from scratch.

RE-Build's aim is to change that, converting the process of creating a regular expression to combining nice natural language expressions. The above regex would be composed as

```js
var ipNumber = RE.group(
        RE  ("1").then.digit.then.digit
        .or ("2").then.oneOf.range("0", "4").then.digit
        .or ("25").then.oneOf.range("0", "5")
        .or .oneOf.range("1", "9").then.digit
        .or .digit
    ),

    ipMatch = RE.matching.exactly(3).group( ipNumber.then(".") )
                .then(ipNumber).then.wordBoundary.regex;
```

This approach is definitely more verbose, but also much clearer and less error prone.

Another module for the same purpose is [VerbalExpressions](https://github.com/VerbalExpressions/JSVerbalExpressions), but it doesn't allow to build just *any* regular expression. RE-Build aims to fill that gap too.

## Installation

Via `npm`:

```bash
npm install re-build
```

Via `bower`:

```bash
bower install re-build
```

The package can be loaded as a CommonJS module (node.js, io.js), as an AMD module (RequireJS, ...) or as a standalone script:

```html
<script src="re-build.min.js"></script>
```

## Usage

For a detailed documentation, check the [reference sheet](doc/reference.md). Keep in mind that RE-Build is a tool to help building, understanding and debugging regular expressions, and does *not* prevent one to create incorrect results.

### Basics

The *core* point is the `RE` object (or whatever variable name you assigned to it), together with the `matching` method:

```js
var RE = require("re-build");
var builder = RE.matching("xyz");
```

The output is *not*, however, a regular expression, but a a regular expression *builder* that can be extended, or used as an extension for other builders. To get the corrisponding regular expression, use the `regex` property or the `toRegExp()/valueOf()` methods.

```js
var start = RE.matching.theStart.then(builder).toRegExp(); // /^xyz/

var foo = RE.matching(builder).then.oneOrMore.digit.regex; // /xyz\d+/
```

As you can see, you can put additional matching blocks using the `then` word, which is also a function that can take arguments as blocks to add too. The arguments can be strings (which are backslash-escaped), regular expressions or RE-Build'ers, whose `source` property is added to the builder *unescaped*.

The `or` word has a similar meaning, but adds an alternative block to the source:

```js
var hex = RE.matching.digit
            .or.oneOf.range("A", "F")
            .regex;  // /\d|[A-F]/
```

### Regex builders are immutable

Regular expression builders are immutable objects, meaning that when extending a builder we get a new builder instance:

```js
var bld1 = RE.matching.digit;
var bld2 = bld1.or.oneOf.range("A", "F");
bld1 === bld2; // => false
```

### Special classes, aliases and escaping

RE-Build uses specific names to address common regex character classes:

Name           | Result       | Notes
---------------|--------------|--------------
`digit`        | `\d`         | from `0` to `9`
`alphaNumeric` | `\w`         | digits, uppercase and lowercase letters and the underscore
`whiteSpace`   | `\s`         | white space characters
`wordBoundary` | `\b`         |
`anyChar`      | `.`          | universal matcher
`theStart`     | `^`          |
`theEnd`       | `$`          |
`cReturn`      | `\r`         | carriage return
`newLine`      | `\n`         |
`tab`          | `\t`         |
`vTab`         | `\v`         | vertical tab
`formFeed`     | `\f`         |
`null`         | `\0`         |
`slash`        | `\/`         |
`backslash`    | `\\`         |
`backspace`    | `\b`         | can be used in character sets `[...]' *only*

The first four names can be negated prefixing them with `not` to get the complementary meaning:

* `not.digit` for `\D`;
* `not.alphaNumeric` for `\W`;
* `not.whiteSpace` for `\S`;
* `not.wordBoundary` for `\B`.

Single characters can be defined by escape sequences:

Function       | Result   | Meaning
---------------|----------|-----------
`ascii(n)`     | `\xhh`   | ASCII character corrisponding to `n`
`codePoint(n)` | `\uhhhh` / `\u{hhhhhh}` | Unicode character  corrisponding to `n`
`control(a)`   | `\ca`    | Control sequence corrisponding to the letter `a`

With the exception of `wordBoundary`, `theStart` and `theEnd`, all of the previous words can be used inside character sets (see after).

### Flags

You can set the flags of the regex prefixing `matching` with one or more of the flagging options:

* `globally` for a global regex;
* `anyCase` for a case-insensitive regex;
* `fullText` for a "multiline" regex (i.e., the dot '`.`' matches new line characters too);
* `withUnicode` for a regex with extended Unicode support;
* `stickily` for a "sticky" regex.

Alternatively, you can set the flags with the `withFlags` method of the `RE` object.

```js
// The following regexes are equivalent: /[a-f]/gi
var foo = RE.globally.anyCase.matching.oneOf.range("a", "f").regex;
var bar = RE.withFlags("gi").matching.oneOf.range("a", "f").regex;
```

You can't change a regex builder's flags, but you can create a copy of a builder with different flags:

```js
var foo = RE.matching.oneOrMore.alphaNumeric;  // /\w+/
var bar = RE.globally.matching(foo);           // /\w+/g
```

If you don't need flags set, as a shortened version you can remove the `matching` word:

```js
// These are equivalent:
RE.matching("abc").then.digit;
RE("abc").then.digit;
```

This becomes useful when defining the content of groups, character sets or look-aheads.

### Grouping

Use the `group` word to define a non-capturing group, and `capture` for a capturing group:

```js
var amount = RE.matching("$").then.capture(
    RE.oneOrMore.digit
      .then.noneOrOne.group(".", RE.oneOrMore.digit)
).regex;
// /\$(\d+(?:\.\d+)?)/
```

The `group` and `capture` words are function, and the resulting groups will embrace everything passed as arguments. Just like `then` and `or`, arguments can be strings, regular expression or other RE-Build'ers.

Backrefences for capturing groups are obtained using the `reference` function, passing the reference number:

```js
var quote = RE.matching.capture( RE.oneOf("'\"") )
              .then.anyAmountOf.alphaNumeric
              .then.reference(1);
// /(['"])\w*\1/
```

### Character sets

Character sets (`[...]`) are introduced by the word `oneOf`. Several characters can be included separated by the word `and`. Additionally, one can include a character interval, using the function `range` and giving the initial and final character of the interval.

Exclusive character sets can be obtained prefixing `oneOf` by the word `not`.

```js
var hexColor = RE.matching("#").then.exactly(6)
                 .oneOf.digit.and.range("a", "f").and.range("A", "F");
// /#[\da-fA-F]{6}/

var hours = RE.oneOf("01").then.digit.or("2").then.oneOf.range("0", "3");
// /[01]\d|2[0-3]/

var quote = RE.matching('"').then.oneOrMore.not.oneOf('"').then('"');
// /"[^"]+"/
```

### Quantifiers

Quantifiers can be defined prefixing the quantified block by one of these constructs:

Construct       | Result
----------------|---------
`anyAmountOf`   | `*`
`oneOrMore`     | `+`
`noneOrOne`     | `?`
`atLeast(n)`    | `{n,}`
`atMost(n)`     | `{,n}`
`exactly(n)`    | `{n}`
`between(n, m)` | `{n,m}`

Quantification is smart enough to translate constructs in their most compact form (e.g., `.atLeast(1)` becomes `+`, `.between(0, 1)` becomes `?` and so on).

Lazy quantifiers can be obtained prefixing the word `lazily` prior to the quantifier.

```js
var number = RE.oneOrMore.digit; //  /\d+/

var hexnumber = RE.exactly(2).oneOf.digit.and.range("a", "f");
// /[\da-f]{2}/

var macAddress = RE.anyCase.matching(hexnumber).then.exactly(5).group(
                    RE("-").then(hexnumber)
                 );
// /[\da-f]{2}(?:-[\da-f]{2}){5}/i

var quoteAlt = RE.matching.capture(RE.oneOf("'\""))
                 .then.lazily.anyAmountOf.anyChar
                 .then.reference(1);
// /(['"]).*?\1/
```

### Look-aheads

Look-aheads are introduced by the function `followedBy` (eventually prefixed by `not` for negative look-aheads).

```js
var euro = RE.matching.oneOrMore.digit.followedBy("€");
// /\d+(?=€)/

var foo = RE("a").or.not.followedBy("b").then("c");
// /a|(?!b)c/
```

## Compatibilty

* Internet Explorer 9+
* Firefox 4+
* Safari 5+
* Chrome
* Opera 11.60+
* node.js

Basically, every Javascript environment that supports [`Object.defineProperties`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperties) should be fine.

## Tests

The unit tests are built on top of [mocha](http://mochajs.org/). Once the package is installed, run `npm install` from the package's root directory in order to locally install mocha, then `npm run test` to execute the tests. Open [index.html](test/index.html) with a browser to perform the tests on the client side.

If mocha is installed globally, served side tests can be run with just the command `mocha` from the package's root directory.

## To do

* More natural language alternatives
* Plurals, articles
* CLI tool to translate regexes to and from RE-Build's syntax
* More examples

## License

MIT @ Massimo Artizzu 2015-2016. See [LICENSE](LICENSE).

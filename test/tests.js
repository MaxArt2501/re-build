(function(root, tests) {
    if (typeof define === "function" && define.amd)
        define(["re-build"], tests);
    else if (typeof exports === "object")
        tests(require("../re-build.js"));
    else tests(root.RE);
})(this, function(RE) {
"use strict";

function assert(value, expected) {
    if (value !== expected)
        throw new Error("Expected " + expected + ", computed " + value);
}

function assertBuilder(builder, expsource, expflags) {
    assertSource(builder, expsource);
    assertFlags(builder, expflags);
}

function assertSource(builder, expected) {
    var source = builder.regex.source;
    if (source !== expected)
        throw new Error("Expected source /" + expected + "/, computed /" + source + "/");
}

function assertFlags(builder, expected) {
    var restring = builder.regex.toString(),
        flags = restring.substring(restring.lastIndexOf("/") + 1);
    if (flags !== expected)
        throw new Error("Expected flags \"" + expected + "\", computed \"" + flags + "\"");
}

describe("RE-Build'ers", function() {
    it("Character sequences", function() {
        assertSource(RE.matching("abc"),              "abc");
        assertSource(RE.matching("a", /b/, RE("c")),  "abc");
        assertSource(RE.matching("a[b]"),             "a\\[b\\]");
        assertSource(RE.matching("f(x) = {4.5}^\\3"), "f\\(x\\) = \\{4\\.5\\}\\^\\\\3");
    });

    it("Flags", function() {
        assertFlags(RE.matching("abc"),             "");
        assertFlags(RE.globally.matching("abc"),    "g");
        assertFlags(RE.anyCase.matching("abc"),     "i");
        assertFlags(RE.fullText.matching("abc"),    "m");
        assertFlags(RE.withUnicode.matching("abc"), "u");
        assertFlags(RE.stickily.matching("abc"),    "y");
        assertFlags(RE.globally.anyCase.fullText.matching("abc"), "gim");
        assertFlags(RE.withFlags("img").matching("abc"),          "gim");

        // Cloning a builder with different flags
        var builder = RE.matching.oneOrMore.digit,
            other = RE.globally.matching(builder);
        assertBuilder(other, builder.source, "g");
    });

    it("Character classes and aliases", function() {
        assertSource(RE.matching.digit,        "\\d");
        assertSource(RE.matching.alphaNumeric, "\\w");
        assertSource(RE.matching.whiteSpace,   "\\s");
        assertSource(RE.matching.wordBoundary, "\\b");
        assertSource(RE.matching.cReturn,      "\\r");
        assertSource(RE.matching.newLine,      "\\n");
        assertSource(RE.matching.tab,          "\\t");
        assertSource(RE.matching.vTab,         "\\v");
        assertSource(RE.matching.formFeed,     "\\f");
        assertSource(RE.matching.slash,        "\\/");
        assertSource(RE.matching.backslash,    "\\\\");
        assertSource(RE.matching.anyChar,      ".");
    });

    it("Negated character classes", function() {
        assertSource(RE.matching.not.digit,        "\\D");
        assertSource(RE.matching.not.alphaNumeric, "\\W");
        assertSource(RE.matching.not.whiteSpace,   "\\S");
        assertSource(RE.matching.not.wordBoundary, "\\B");
    });

    it("Character escaping", function() {
        assertSource(RE.matching.control("M"),       "\\cM");
        assertSource(RE.matching.ascii(160),         "\\xa0");
        assertSource(RE.matching.ascii("ABC"),       "\\x41\\x42\\x43");
        assertSource(RE.matching.codePoint(0x2661),  "\\u2661");
        assertSource(RE.matching.codePoint("♡"),     "\\u2661");
        assertSource(RE.matching.codePoint(0x1f370), "\\ud83c\\udf70");
        assertSource(RE.matching.codePoint("I♡🍰"),  "\\u0049\\u2661\\ud83c\\udf70");
        assertSource(RE.withUnicode.matching.codePoint(0x1f370), "\\u{1f370}");
        assertSource(RE.withUnicode.matching.codePoint("I♡🍰"),  "\\u0049\\u2661\\u{1f370}");

        try {
            RE.matching.ascii("♡");
            throw new Error("Expected RangeError");
        } catch (e) {
            assert(e.name, "RangeError");
        }
        try {
            RE.matching.codePoint(0x200000);
            throw new Error("Expected RangeError");
        } catch (e) {
            assert(e.name, "RangeError");
        }
    });

    it("Concatenation of sequences and blocks", function() {
        assertSource(RE.matching("abc").then("de"),           "abcde");
        assertSource(RE.matching("abc").then.digit,           "abc\\d");
        assertSource(RE.matching("abc").then.not.digit,       "abc\\D");
        assertSource(RE.matching.digit.then.digit,            "\\d\\d");
        assertSource(RE.matching("ab").then("cd").then("ef"), "abcdef");
    });

    it("Character sets", function() {
        assertSource(RE.matching.oneOf("abc"),                           "[abc]");
        assertSource(RE.matching.oneOf("a-z"),                           "[a\\-z]");
        assertSource(RE.matching.oneOf("^[]"),                           "[\\^\\[\\]]");
        assertSource(RE.matching.oneOf("abc").and("de"),                 "[abcde]");
        assertSource(RE.matching.oneOf.digit.and.whiteSpace,             "[\\d\\s]");
        assertSource(RE.matching.oneOf.digit,                            "[\\d]");
        assertSource(RE.matching.oneOf.ascii(240).and.codePoint(0xca0),  "[\\xf0\\u0ca0]");
        assertSource(RE.matching.oneOf.backspace.and.newLine.and("abc"), "[\\b\\nabc]");
        assertSource(RE.matching.not.oneOf("abc"),                       "[^abc]");
        assertSource(RE.matching.not.oneOf.not.digit,                    "[^\\D]");
        assertSource(RE.matching.oneOf("abc").then.digit,                "[abc]\\d");
        assertSource(RE.matching.oneOf.not.digit.then.digit,             "[\\D]\\d");
    });

    it("Character set ranges", function() {
        assertSource(RE.matching.oneOf.range("a", "z"),                     "[a-z]");
        assertSource(RE.matching.oneOf.range("a", "z").and.range("0", "9"), "[a-z0-9]");
        assertSource(RE.matching.oneOf.range(RE.ascii(128), RE.ascii(255)), "[\\x80-\\xff]");
        assertSource(RE.matching.oneOf.range("z", RE.codePoint(0x2001)),    "[z-\\u2001]");
        assertSource(RE.matching.oneOf.range(RE.null, RE.control("M")),     "[\\0-\\cM]");
        assertSource(RE.matching.oneOf.range(RE.tab, RE.cReturn),           "[\\t-\\r]");
        assertSource(RE.matching.oneOf.range(RE.newLine, RE.vTab),          "[\\n-\\v]");
        assertSource(RE.matching.oneOf.range(RE.slash, RE.backslash),       "[\\/-\\\\]");
    });

    it("String boundaries", function() {
        assertSource(RE.matching.theStart.then.digit, "^\\d");
        assertSource(RE.matching("abc").then.theEnd,  "abc$");
    });

    it("Capturing and non-capturing groups", function() {
        assertSource(RE.matching.group("abc"),               "(?:abc)");
        assertSource(RE.matching.group(RE.digit),            "(?:\\d)");
        assertSource(RE.matching.group("a", /b/, RE("c")),   "(?:abc)");
        assertSource(RE.matching.capture("abc"),             "(abc)");
        assertSource(RE.matching.capture(RE.digit),          "(\\d)");
        assertSource(RE.matching.capture("a", /b/, RE("c")), "(abc)");
    });

    it("Backreferences", function() {
        assertSource(RE.matching.capture(RE.oneOrMore.digit).then(" - ").then.reference(1).then(" = 0"), "(\\d+) - \\1 = 0");
        assertSource(RE.matching.capture(RE.oneOf("'\"")).then.oneOrMore.alphaNumeric.then.reference(1), "(['\"])\\w+\\1");
    });

    it("Greedy quantifiers", function() {
        assertSource(RE.matching.noneOrOne("a"),     "a?");
        assertSource(RE.matching.anyAmountOf("a"),   "a*");
        assertSource(RE.matching.oneOrMore("a"),     "a+");
        assertSource(RE.matching.atLeast(0)("a"),    "a*");
        assertSource(RE.matching.atLeast(1)("a"),    "a+");
        assertSource(RE.matching.atLeast(2)("a"),    "a{2,}");
        assertSource(RE.matching.atMost(1)("a"),     "a?");
        assertSource(RE.matching.atMost(2)("a"),     "a{,2}");
        assertSource(RE.matching.exactly(4)("a"),    "a{4}");
        assertSource(RE.matching.between(2, 4)("a"), "a{2,4}");

        assertSource(RE.matching.oneOrMore("abc"),                          "(?:abc)+");
        assertSource(RE.matching.oneOrMore.digit,                           "\\d+");
        assertSource(RE.matching.oneOrMore.oneOf("abc"),                    "[abc]+");
        assertSource(RE.matching.oneOrMore.oneOf.range("a", "z"),           "[a-z]+");
        assertSource(RE.matching.oneOrMore.oneOf.range("a", "z").and.digit, "[a-z\\d]+");
        assertSource(RE.matching.oneOrMore.group("abc"),                    "(?:abc)+");
        assertSource(RE.matching.oneOrMore.capture("abc"),                  "(abc)+");
        assertSource(RE.matching.oneOrMore.capture("a)(b"),                 "(a\\)\\(b)+");
        assertSource(RE.matching.oneOrMore(/(ab)(cd)/),                     "(?:(ab)(cd))+");
        assertSource(RE.matching.oneOrMore(/(ab(cd))/),                     "(ab(cd))+");
    });

    it("Lazy quantifiers", function() {
        assertSource(RE.matching.lazily.noneOrOne("a"),     "a??");
        assertSource(RE.matching.lazily.anyAmountOf("a"),   "a*?");
        assertSource(RE.matching.lazily.oneOrMore("a"),     "a+?");
        assertSource(RE.matching.lazily.atLeast(0)("a"),    "a*?");
        assertSource(RE.matching.lazily.atLeast(1)("a"),    "a+?");
        assertSource(RE.matching.lazily.atLeast(2)("a"),    "a{2,}?");
        assertSource(RE.matching.lazily.atMost(1)("a"),     "a??");
        assertSource(RE.matching.lazily.atMost(2)("a"),     "a{,2}?");
        assertSource(RE.matching.lazily.exactly(4)("a"),    "a{4}?");
        assertSource(RE.matching.lazily.between(2, 4)("a"), "a{2,4}?");

        assertSource(RE.matching.lazily.oneOrMore("abc"),                          "(?:abc)+?");
        assertSource(RE.matching.lazily.oneOrMore.digit,                           "\\d+?");
        assertSource(RE.matching.lazily.oneOrMore.oneOf("abc"),                    "[abc]+?");
        assertSource(RE.matching.lazily.oneOrMore.oneOf.range("a", "z"),           "[a-z]+?");
        assertSource(RE.matching.lazily.oneOrMore.oneOf.range("a", "z").and.digit, "[a-z\\d]+?");
        assertSource(RE.matching.lazily.oneOrMore.group("abc"),                    "(?:abc)+?");
        assertSource(RE.matching.lazily.oneOrMore.capture("abc"),                  "(abc)+?");
        assertSource(RE.matching.lazily.oneOrMore.capture("a)(b"),                 "(a\\)\\(b)+?");
        assertSource(RE.matching.lazily.oneOrMore(/(ab)(cd)/),                     "(?:(ab)(cd))+?");
        assertSource(RE.matching.lazily.oneOrMore(/(ab(cd))/),                     "(ab(cd))+?");
    });

    it("Look-aheads", function() {
        assertSource(RE.matching.followedBy("abc"),                             "(?=abc)");
        assertSource(RE.matching.not.followedBy("abc"),                         "(?!abc)");
        assertSource(RE.matching("0").or.not.followedBy("b").then.alphaNumeric, "0|(?!b)\\w");
        assertSource(RE.matching.oneOrMore.alphaNumeric.followedBy(","),        "\\w+(?=,)");
    });

    it("Complex examples", function() {
        // Matching time, format hh:mm:ss
        assertSource(
            RE.matching.theStart.then.group(
                RE.oneOf("01").then.digit
                    .or("2").then.oneOf.range("0", "3")
            ).then.exactly(2).group(
                RE(":").then.oneOf.range("0", "5").then.digit
            ).then.theEnd,
            "^(?:[01]\\d|2[0-3])(?::[0-5]\\d){2}$"
        );

        // Matching HTML/XML attributes (sort of)
        assertBuilder(
            RE.globally.anyCase.matching.whiteSpace
                .then.oneOf.range("a", "z").then.anyAmountOf.alphaNumeric
                .then.anyAmountOf.whiteSpace.then("=").then.anyAmountOf.whiteSpace
                .then.capture(RE.oneOf("'\""))
                .then.lazily.anyAmountOf.anyChar.then.reference(1),
            "\\s[a-z]\\w*\\s*=\\s*(['\"]).*?\\1", "gi"
        );

        // Matching CSS colors
        var spaces = RE.anyAmountOf(" "),
            comma = RE(spaces).then(",").then(spaces),
            upTo255 = RE.group(RE("25").then.oneOf.range("0", "5")
                    .or("2").then.oneOf.range("0", "4").then.digit
                    .or("1").then.digit.then.digit
                    .or.oneOf.range("1", "9").then.noneOrOne.digit
                    .or("0")),
            upTo360 = RE.group(RE("360")
                    .or("3").then.oneOf.range("0", "5").then.digit
                    .or.oneOf("12").then.digit.then.digit
                    .or.oneOf.range("1", "9").then.noneOrOne.digit
                    .or("0")),
            percentage = RE.group(RE("100")
                    .or.oneOf.range("1", "9").then.noneOrOne.digit
                    .or("0")).then("%"),
            opacity = RE.group(RE.noneOrOne("0").then(".").then.oneOrMore.digit
                    .or.oneOf("01"));
        assertBuilder(
            RE.anyCase.matching // #xxxxxx or #xxx
                    .not.wordBoundary.then("#")
                    .then.between(1, 2).group(
                        RE.exactly(3)(RE.oneOf.digit.and.range("a", "f"))
                    ).then.wordBoundary
                .or // rgb(x, y, z)
                    .wordBoundary.then("rgb(").then(spaces).then.exactly(2).group(
                        RE(upTo255).then(comma)
                    ).then(upTo255).then(spaces).then(")")
                .or // rgba(x, y, z, k)
                    .wordBoundary.then("rgba(").then(spaces).then.exactly(3).group(
                        RE(upTo255).then(comma)
                    ).then(opacity).then(spaces).then(")")
                .or // hsl(x, y, z)
                    .wordBoundary.then("hsl(").then(spaces).then(upTo360).then(comma)
                    .then(percentage).then(comma).then(percentage)
                    .then(spaces).then(")")
                .or // hsla(x, y, z, k)
                    .wordBoundary.then("hsla(").then(spaces).then(upTo360).then(comma)
                    .then(percentage).then(comma).then(percentage).then(comma)
                    .then(opacity).then(spaces).then(")"),
            "\\B#(?:[\\da-f]{3}){1,2}\\b|\\brgb\\( *(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d?|0) *, *){2}(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d?|0) *\\)|\\brgba\\( *(?:(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d?|0) *, *){3}(?:0?\\.\\d+|[01]) *\\)|\\bhsl\\( *(?:360|3[0-5]\\d|[12]\\d\\d|[1-9]\\d?|0) *, *(?:100|[1-9]\\d?|0)% *, *(?:100|[1-9]\\d?|0)% *\\)|\\bhsla\\( *(?:360|3[0-5]\\d|[12]\\d\\d|[1-9]\\d?|0) *, *(?:100|[1-9]\\d?|0)% *, *(?:100|[1-9]\\d?|0)% *, *(?:0?\\.\\d+|[01]) *\\)", "i"
        );
    });
});

describe("Builder prototype", function() {
    it("test", function() {
        var builder = RE.matching.oneOrMore.digit;
        assert(builder.test("We're living in " + new Date().getFullYear()), true);
        assert(builder.test("Hello, world!"), false);
    });

    it("exec", function() {
        var builder = RE.matching.oneOrMore.digit,
            result = builder.exec("The answer is 42.");
        assert(result instanceof Array, true);
        assert(result[0].length, 2);
        assert(result.index, 14);
    });

    it("replace", function() {
        var reverseDate = RE.matching.capture(RE.exactly(4).digit).then("-")
                            .then.capture(RE.exactly(2).digit).then("-")
                            .then.capture(RE.exactly(2).digit);
        assert(reverseDate.replace("2015-04-20", "$3/$2/$1"), "20/04/2015");

        var capital = RE.globally.matching.wordBoundary.then.oneOrMore.alphaNumeric;
        assert(capital.replace("hello, world!", function(m) {
            return m.charAt(0).toUpperCase() + m.substring(1);
        }), "Hello, World!");
    });

    it("split", function() {
        var space = RE.oneOrMore.whiteSpace;
        assert(space.split("Lorem ipsum dolor sit amet").length, 5);
        assert(space.split("RE-Build").length, 1);
    });

    it("search", function() {
        var builder = RE.matching.oneOrMore.digit;
        assert(builder.search("The answer is 42."), 14);
        assert(builder.search("Hello, world!"), -1);
    });
});

});

/*

/\B#[\da-f]{3}(?:[\da-f]{3})?\b|\brgb\( *(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?|0) *, *){2}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?|0) *\)|\brgba\( *(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]\d?|0) *, *){3}(?:0?\.\d+|1) *\)|\bhsl\( *(?:35\d|3[0-4]\d|[12]\d\d|[1-9]\d?|0) *, *(?:[1-9]\d?|100|0)% *, *(?:[1-9]\d?|100|0)% *\)|\bhsla\( *(?:35\d|3[0-4]\d|[12]\d\d|[1-9]\d?|0) *, *(?:[1-9]\d?|100|0)% *, *(?:[1-9]\d?|100|0)% *, *(?:0?\.\d+|1) *\)/

*/

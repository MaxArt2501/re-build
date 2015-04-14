/*!
 * RE-Build - v0.0.1
 * by Massimo Artizzu (MaxArt2501)
 * 
 * https://github.com/MaxArt2501/re-build
 * 
 * Licensed under the MIT License
 * See LICENSE for details
 */

(function (root, factory) {
    if (typeof define === "function" && define.amd) {
        // AMD. Register as an anonymous module.
        define([], factory);
    } else if (typeof exports === "object") {
        // Node. Does not work with strict CommonJS, but
        // only CommonJS-like environments that support module.exports,
        // like Node.
        module.exports = factory();
    } else {
        // Browser globals (root is window)
        root.RE = factory();
    }
})(this, function() {
    "use strict";

    var flags = [ "global", "ignoreCase", "multiline", "sticky" ],
        settingList = flags.concat([ "min", "max", "lazy", "negate" ]);

    var /** @const */ NOQUANTIFY = 1,
        /** @const */ NOSETS = 2;

    var names = {
        digit: ["\\d", "\\D"],
        alphaNumeric: [ "\\w", "\\W"],
        whiteSpace: ["\\s", "\\S"],
        wordBoundary: ["\\b", "\\B", NOQUANTIFY + NOSETS],
        anyChar: [".", "", NOSETS],

        tab: ["\\t"],
        vTab: ["\\v"],
        cReturn: ["\\r"],
        newLine: ["\\n"],
        formFeed: ["\\f"],
        null: ["\\0"],

        theStart: ["^", "", NOQUANTIFY + NOSETS],
        theEnd: ["$", "", NOQUANTIFY + NOSETS],

        ascii: [function(code) {
            if (typeof code === "string" && code.length === 1)
                code = code.charCodeAt(0);
            if (typeof code !== "number" || code !== code | 0 || code < 0 || code > 255)
                throw new RangeError("Invalid character code");

            return "\\x" + ("0" + code.toString(16)).slice(-2);
        }],
        unicode: [function(code) {
            if (typeof code === "string" && code.length === 1)
                code = code.charCodeAt(0);
            else if (typeof code !== "number" || code !== code | 0 || code < 0 || code > 0xffff)
                throw new RangeError("Invalid character code");

            return "\\u" + ("000" + code.toString(16)).slice(-4);
        }],
        control: [function(letter) {
            if (!/^[a-zA-Z]$/.test(letter))
                throw new RangeError("Invalid control code");

            return "\\c" + letter.toUpperCase();
        }],

        group: [function() {
            var source = parseArgs(arguments);
            if (source.slice(0, 3) !== "(?:")
                source = "(?:" + source + ")";

            return source;
        }, 0, NOSETS],
        capture: [function() {
            var source = parseArgs(arguments);
            if (source.slice(0, 3) === "(?:")
                source = "(" + source.slice(3);
            else if (source.charAt(0) !== "(")
                source = "(" + source + ")";

            return source;
        }, 0, NOSETS],
        reference: [function(number) {
            if (typeof number !== "number" || number !== number | 0 || number < 0)
                throw new RangeError("Invalid back reference number");

            return "\\" + number;
        }, 0, NOSETS]
    };

    var flagger = {
        withFlags: function() {
            return function(flags) {
                var consts = {};
                if (typeof flags === "string")
                    consts = {
                        global: ~flags.indexOf("g"),
                        ignoreCase: ~flags.indexOf("i"),
                        multiline: ~flags.indexOf("m"),
                        sticky: ~flags.indexOf("y")
                    }
                else if (typeof flags === "object")
                    flags.forEach(function(f) { consts[f] = this[f]; }, flags);

                return buildBuilder(setConsts({}, consts), [ matcher ]);
            };
        }
    };
    flags.forEach(function(flag) {
        flagger[this[flag]] = function() {
            var consts = {};
            flags.forEach(function(f) { consts[f] = f === flag || this[f]; }, this);

            return buildBuilder(setConsts({}, consts), [ flagger, matcher ]);
        };
    }, {
        global: "globally",
        ignoreCase: "anyCase",
        multiline: "fullText",
        sticky: "stickily"
    });

    var matcher = {
        matching: function() {
            return buildBuilder(initFunc(function() {
                return buildBuilder(new RegExpBuilder(getFlags(this), parseArgs(arguments)), [ thenable ]);
            }, getFlags(this)), [ openable, lookAheads, negator([ negable, lookAheads ]) ]);
        }
    };

    var quantifiers = {
        between: function() {
            return function(min, max) {
                if (min != null && (isNaN(min) || Math.floor(min) !== +min || +min < 0)
                        || max != null && (isNaN(max) || Math.floor(max) !== +max || +max < 0))
                    throw new RangeError("Positive integer expected");

                if (min == null && max == null)
                    throw new RangeError("Range expected");

                var that = this,
                    source = this.source,
                    settings = extend(getSettings(this), { min: min, max: max });

                return buildBuilder(initFunc(function() {
                    return buildBuilder(new RegExpBuilder(getFlags(that),
                            source + wrapSource(parseArgs(arguments), settings)), [ thenable ]);
                }, settings, source), [ openable, negator([ negable ]) ]);
            };
        },
        exactly: function() {
            return function(quantity) {
                return this.between(quantity, quantity);
            };
        },
        atLeast: function() {
            return function(quantity) {
                return this.between(quantity, this.max);
            };
        },
        atMost: function() {
            return function(quantity) {
                return this.between(this.min, quantity);
            };
        },
        anyAmountOf: function() {
            return this.between(0, Infinity);
        },
        noneOrOne: function() {
            return this.between(0, 1);
        },
        oneOrMore: function() {
            return this.between(1, Infinity);
        }
    };

    var lazinator = {
        lazily: function() {
            return buildBuilder(new RegExpBuilder(extend(getSettings(this), { lazy: true }), this.source), [ quantifiers ]);
        }
    };

    var thenable = {
        then: function() {
            var settings = getFlags(this),
                source = this.source;

            return buildBuilder(initFunc(function() {
                return buildBuilder(new RegExpBuilder(settings,
                        source + parseArgs(arguments)), [ thenable ]);
            }, settings, source), [ openable, negator([ negable ]) ]);
        },
        or: function() {
            var settings = getFlags(this),
                source = this.source + "|";

            return buildBuilder(initFunc(function() {
                return buildBuilder(new RegExpBuilder(settings,
                        source + parseArgs(arguments)), [ thenable ]);
            }, settings, source), [ openable, lookAheads, negator([ negable, lookAheads ]) ]);
        }
    };

    var openable = {}, negable = {},
        settable = {}, setnegable = {};

    Object.keys(names).forEach(function(name) {
        var def = names[name];

        if (typeof def[0] === "string") {
            openable[name] = function() {
                var source = this.source + wrapSource(this.negate && def[1] || def[0], this);
                return buildBuilder(new RegExpBuilder(getFlags(this), source), [ thenable ]);
            };
            if (def[1]) negable[name] = openable[name];
        } else
            openable[name] = function() {
                return function() {
                    var source = this.source + wrapSource(def[0].apply(this, arguments), this);
                    return buildBuilder(new RegExpBuilder(getFlags(this), source), [ thenable ]);
                }
            };
        
        if (!(def[2] && NOSETS)) {
            if (typeof def[0] === "string") {
                settable[name] = function() {
                    var source = this.source,
                        lastBracket = source.lastIndexOf("]");
                    return buildBuilder(new RegExpBuilder(getFlags(this), source.slice(0, lastBracket)
                            + (this.negate && def[1] || def[0]) + source.slice(lastBracket)), [ thenable, andCharSet ]);
                };
                if (def[1]) setnegable[name] = settable[name];
            } else
                settable[name] = function() {
                    return function() {
                        var source = this.source,
                            lastBracket = source.lastIndexOf("]");
                        return buildBuilder(new RegExpBuilder(getFlags(this), source.slice(0, lastBracket)
                                + def[0].apply(this, arguments) + source.slice(lastBracket)), [ thenable, andCharSet ]);
                    };
                };
        }
    });
    openable.oneOf = negable.oneOf = function() {
        var that = this, source = this.source;

        return buildBuilder(initFunc(function() {
            return buildBuilder(new RegExpBuilder(getFlags(that), source
                    + wrapSource((that.negate ? "[^" : "[") + parseSets(arguments) + "]", that)), [ andCharSet, thenable ]);
        }, getSettings(this), source + wrapSource(this.negate ? "[^]" : "[]", this)), [ settable ]);
    };
    extend(openable, quantifiers, lazinator);

    settable.backspace = function() {
        var source = this.source,
            lastBracket = source.lastIndexOf("]");
        return buildBuilder(new RegExpBuilder(getFlags(this), source.slice(0, lastBracket)
                + "\\b" + source.slice(lastBracket)), [ thenable, andCharSet ]);
    };
    settable.range = function() {
        return function(start, end) {
            if (typeof start !== "string" || typeof end !== "string"
                    || start.length !== 1 || end.length !== 1)
                throw new RangeError("Incorrect character range");

            var source = this.source,
                lastBracket = source.lastIndexOf("]");
            return buildBuilder(new RegExpBuilder(getFlags(this), source.slice(0, lastBracket)
                    + start + "-" + end + source.slice(lastBracket)),
                    [ thenable, andCharSet ]);
        };
    };
    extend(settable, negator([ setnegable ]));

    var andCharSet = {
        and: function() {
            var flags = getFlags(this), source = this.source;

            return buildBuilder(initFunc(function() {
                var lastBracket = source.lastIndexOf("]");
                return buildBuilder(new RegExpBuilder(flags, source.slice(0, lastBracket)
                        + parseSets(arguments) + source.slice(lastBracket)), [ andCharSet, thenable ]);
            }, flags, source), [ settable ]);
        }
    };

    var lookAheads = {
        followedBy: function() {
            return function() {
                var source = wrapSource(parseArgs(arguments), this),
                    seq = this.negate ? "(?!" : "(?=";
                if (source.slice(0, 3) !== seq)
                    source = seq + source + ")";

                return buildBuilder(new RegExpBuilder(getFlags(this), (this.source || "") + source), [ thenable ]);
            };
        }
    };
    extend(thenable, lookAheads);

    function negator(bundles) {
        return { not: function() {
            return buildBuilder(new RegExpBuilder(extend(getSettings(this), { negate: true }), this.source), bundles);
        } };
    }

    /**
     * Merges the given objects into the destination
     * @function
     * @param {Object} dest
     * @param {...Object} sources
     * @returns {Object}           Equals dest
     */
    function extend(dest) {
        for (var i = 1, source, prop; i < arguments.length;) {
            source = arguments[i++];
            if (source)
                for (var prop in source)
                    dest[prop] = source[prop];
        }

        return dest;
    }

    /**
     * Adds the eventual quantifier to a chunk of regex source, conveniently
     * wrapping it in a non-capturing group if it contains more than a block.
     * @param {string} source
     * @param {Object} settings  Quantifying settings (min, max and lazy).
     * @returns {string}         Quantified source
     */
    function wrapSource(source, settings) {
        if (typeof settings.min === "number" || typeof settings.max === "number") {
            var quantifier,
                min = typeof settings.min === "number" ? settings.min : 0,
                max = typeof settings.max === "number" ? settings.max : Infinity;

            if (min === max)
                quantifier = min === 1 ? "" : "{" + min + "}";
            else if (min === 0)
                quantifier = max === 1 ? "?"
                        : max === Infinity ? "*"
                        : "{," + max + "}";
            else if (min === 1)
                quantifier = max === Infinity ? "+" : "{1," + max + "}";
            else quantifier = "{" + min + "," + (max === Infinity ? "" : max) + "}";
 
            if (quantifier) {
                if ((source.length > 2 || source.length === 2 && source[0] !== "\\") && hasManyBlocks(source))
                    source = "(?:" + source + ")";
                source += quantifier + (settings.lazy ? "?" : "");
            }
        }

        return source;
    }

    var setConsts = Object.defineProperties ? function(dest, consts) {
        var prop, map = {};
        for (prop in consts)
            map[prop] = { value: consts[prop], writable: false, configurable: false, enumerable: false };

        return Object.defineProperties(dest, map);
    } : extend;

    function initFunc(fnc, consts, source) {
        consts.source = source || "";
        return setConsts(fnc, consts);
    }

    /**
    */
    function reparser(blocks) {
        var source = "", i = 0, block;
        while (i < blocks.length) {
            block = blocks[i++];
            if (typeof block === "string")
                source += block.replace(this, "\\$&");
            else if (block instanceof RegExp || block instanceof RegExpBuilder)
                source += block.source;
        }
        return source;
    }
    var parseArgs = reparser.bind(/[\^\$\/\.\*\+\?\|\(\)\[\]\{\}\\]/g),
        parseSets = reparser.bind(/[\^\/\[\]\\-]/g);

    function hasManyBlocks(source) {
        var len = source.length;
        if (len < 2 || len === 2 && (source[0] === "\\" || source === "[]" || source === "()")) return false;

        if (source[0] === "[" && source[len - 1] === "]")
            return source.search(/[^\\]\]/) < len - 2;

        if (source[0] === "(" && source[len - 1] === ")") {
            var re = /[\(\)]/g, count = 1, match;
            re.lastIndex = 1;
            while (match = re.exec(source)) {
                if (source[match.index - 1] === "\\") continue;
                if (match[0] === ")") {
                    if (!--count)
                        return match.index < len - 1;
                } else count++;
            }
        }

        return true;
    }

    function getSettings(object, props) {
        if (!props) props = settingList;
        for (var i = 0, sets = {}; i < props.length; i++)
            sets[props[i]] = object[props[i]];

        return sets;
    }
    function getFlags(object) { return getSettings(object, flags); }

    function buildBuilder(dest, bundles) {
        var i = 0, bundle, prop;
        while (i < bundles.length) {
            bundle = bundles[i++];
            for (prop in bundle) {
                if (typeof bundle[prop] === "function")
                    Object.defineProperty(dest, prop, { get: bundle[prop] });
                else dest[prop] = bundle[prop];
            }
        }

        return dest;
    }

    function RegExpBuilder(settings, source) {
        if (typeof source !== "string") source = "";

        var regex,
            flags = (settings.global ? "g" : "") + (settings.ignoreCase ? "i" : "")
                    + (settings.multiline ? "m" : "") + (settings.sticky ? "y" : "");

        setConsts(this, {
            global: settings.global,
            ignoreCase: settings.ignoreCase,
            multiline: settings.multiline,
            sticky: settings.sticky,
            negate: settings.negate,
            lazy: settings.lazy,
            min: settings.min,
            max: settings.max,
            source: source,
            flags: flags
        });

        Object.defineProperty(this, "regex", {
            get: function() {
                return regex || (regex = new RegExp(source, flags));
            },
            enumerable: true, configurable: false
        });
    };
    RegExpBuilder.prototype.valueOf = RegExpBuilder.prototype.toRegExp = function() { return this.regex; };
    RegExpBuilder.prototype.toString = function() { return "/" + this.source + "/" + this.flags; };

    function RE() {
        return buildBuilder(new RegExpBuilder(getFlags(RE), parseArgs(arguments)), [ thenable ]);
    }

    buildBuilder(initFunc(RE,
        { global: false, ignoreCase: false, multiline: false, sticky: false }),
        [ openable, flagger, matcher ]);

    return RE;
});
"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.styledTag = exports.getAtomicProperties = exports.generateRule = exports.generateRuleTemplate = exports.generateClass = exports.css = exports.CLASS_PREFIX = void 0;
const inline_style_expand_shorthand_1 = require("inline-style-expand-shorthand");
const css_tree_1 = require("css-tree");
const LRU = require("lru-cache");
const purview_1 = require("./purview");
const pseudo_classes_1 = require("./pseudo_classes");
const CHAR_CODE_LOWER_A = "a".charCodeAt(0);
const CHAR_CODE_UPPER_A = "A".charCodeAt(0);
const CHAR_CODE_UPPER_Z = "Z".charCodeAt(0);
const NUM_LETTERS = 26;
// Per https://acss.io/frequently-asked-questions.html#:~:text=declarations:
// - The largest sites seem to have fewer than 20,000 declarations.
// - There are approximately 40 bytes per declaration (property) if you
//   aggregate across the listed sites.
//
// We use a limit of 25,000 here to account for most sites. This will take
// approximately 25,000 * 40 = ~1 MB (not including the boolean value or any
// other internals of the LRU cache), which is very little.
const VALID_CSS_PROPERTIES_CACHE = new LRU(25000);
exports.CLASS_PREFIX = "p-";
function css(...allCSSProperties) {
    // tslint:disable-next-line no-object-literal-type-assertion
    const result = {};
    for (const cssProperties of allCSSProperties) {
        Object.keys(cssProperties).forEach(rawKey => {
            var _a;
            const key = rawKey;
            const value = cssProperties[key];
            if (value === null || value === undefined || value === false) {
                return;
            }
            // We expect only one layer of pseudo classes, but this will technically
            // expand many layers recursively. We rely on the type system to prevent
            // nested layers of pseudo properties from being passed in.
            if (pseudo_classes_1.isPseudoClass(key)) {
                result[key] = (_a = result[key]) !== null && _a !== void 0 ? _a : {};
                Object.assign(result[key], css(value));
                return;
            }
            const expanded = inline_style_expand_shorthand_1.expandProperty(key, String(value));
            if (expanded) {
                Object.assign(result, expanded);
            }
            else {
                ;
                result[key] = value;
            }
        });
    }
    return result;
}
exports.css = css;
function generateClass(index) {
    const classChars = [];
    do {
        const offset = index % NUM_LETTERS;
        classChars.push(String.fromCharCode(CHAR_CODE_LOWER_A + offset));
        index = Math.floor(index / NUM_LETTERS);
    } while (index > 0);
    return exports.CLASS_PREFIX + classChars.reverse().join("");
}
exports.generateClass = generateClass;
function generateRuleTemplate(ap) {
    const { key, value, pseudoClass } = ap;
    let propertyName = "";
    for (let i = 0; i < key.length; i++) {
        const code = key.charCodeAt(i);
        if (code >= CHAR_CODE_UPPER_A && code <= CHAR_CODE_UPPER_Z) {
            propertyName += "-" + key[i].toLowerCase();
        }
        else {
            propertyName += key[i];
        }
    }
    // Calling lexer.matchProperty() below can be expensive, taking over 5ms in
    // certain instances. We use a cache to reduce the time for subsequent calls
    // of the same property.
    const propertyText = `${propertyName}: ${value}`;
    if (VALID_CSS_PROPERTIES_CACHE.get(propertyText)) {
        return addPseudoClass(propertyText, pseudoClass);
    }
    const match = css_tree_1.lexer.matchProperty(propertyName, String(value));
    if (match.error) {
        throw match.error;
    }
    VALID_CSS_PROPERTIES_CACHE.set(propertyText, true);
    return addPseudoClass(propertyText, pseudoClass);
}
exports.generateRuleTemplate = generateRuleTemplate;
function addPseudoClass(propertyText, pseudoClass) {
    if (pseudoClass) {
        if (!pseudo_classes_1.isPseudoClass(pseudoClass)) {
            throw new Error(`Invalid pseudo class: ${pseudoClass}`);
        }
        return `${pseudoClass} { ${propertyText} }`;
    }
    return ` { ${propertyText} }`;
}
function generateRule(className, ruleTemplate) {
    return `.${className}${ruleTemplate}`;
}
exports.generateRule = generateRule;
function getAtomicProperties(cssAttr) {
    let atomicProperties = [];
    Object.keys(cssAttr).forEach(rawKey => {
        const key = rawKey;
        // We expect only one layer of pseudo classes, but this will technically
        // expand many layers recursively. We rely on the type system to prevent
        // nested layers of pseudo properties from being passed in.
        if (pseudo_classes_1.isPseudoClass(key)) {
            const value = cssAttr[key];
            if (value) {
                const subProperties = getAtomicProperties(value);
                subProperties.forEach(ap => (ap.pseudoClass = key));
                atomicProperties = atomicProperties.concat(subProperties);
            }
        }
        else {
            atomicProperties.push({ key, value: cssAttr[key] });
        }
    });
    return atomicProperties;
}
exports.getAtomicProperties = getAtomicProperties;
function styledTag(
// Even though this is a string, it must be uppercase for JSX.
Tag, ...baseCSSProperties) {
    var _a;
    let baseCSS;
    return _a = class extends purview_1.default.Component {
            render() {
                // Lazily compute the CSS.
                if (!baseCSS) {
                    baseCSS = css(...baseCSSProperties);
                }
                const _a = this.props, { css: cssProperties, children } = _a, otherProps = __rest(_a, ["css", "children"]);
                const finalCSS = cssProperties ? css(baseCSS, cssProperties) : baseCSS;
                return (
                // TS seems to have trouble type-checking otherProps here.
                purview_1.default.createElem(Tag, Object.assign({ css: finalCSS }, otherProps), children));
            }
        },
        _a._stateless = true,
        _a;
}
exports.styledTag = styledTag;
//# sourceMappingURL=css.js.map
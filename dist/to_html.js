"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toHTML = void 0;
const VOID_TAGS = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
]);
function toHTML(pNode) {
    const sel = pNode.sel;
    if (!validateDangerousTag(sel)) {
        return "";
    }
    let tag = "<" + sel;
    const attrs = pNode.data.attrs;
    if (attrs) {
        Object.keys(attrs).forEach(key => {
            if (isAttributeNameSafe(key)) {
                tag += " " + key + '="' + escapeTextForBrowser(attrs[key]) + '"';
            }
        });
    }
    tag += ">";
    if (VOID_TAGS.has(sel) && pNode.children.length === 0) {
        return tag;
    }
    pNode.children.forEach(child => {
        if ("text" in child) {
            if (sel === "script" || sel === "style") {
                tag += escapeTextInRawElement(child.text);
            }
            else {
                tag += escapeTextForBrowser(child.text);
            }
        }
        else {
            tag += toHTML(child);
        }
    });
    tag += "</" + sel + ">";
    return tag;
}
exports.toHTML = toHTML;
function escapeTextInRawElement(str) {
    // https://mathiasbynens.be/notes/etago
    return str
        .replace(/<\/(script|style)/gi, "<\\/$1")
        .replace(/<!--/g, "\\x3C!--");
}
// ------------------------
// From https://github.com/facebook/react/blob/c4d8ef643002a2b181029ffed22abd451fb326df/packages/react-dom/src/server/ReactPartialRenderer.js
const VALID_TAG_REGEX = /^[a-zA-Z][a-zA-Z:_\.\-\d]*$/; // Simplified subset
const validatedTagCache = {};
function validateDangerousTag(tag) {
    if (!validatedTagCache.hasOwnProperty(tag)) {
        validatedTagCache[tag] = VALID_TAG_REGEX.test(tag);
    }
    return validatedTagCache[tag];
}
// ------------------------
// From: https://github.com/facebook/react/blob/c4d8ef643002a2b181029ffed22abd451fb326df/packages/react-dom/src/shared/DOMProperty.js
const ATTRIBUTE_NAME_START_CHAR = ":A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
const ATTRIBUTE_NAME_CHAR = ATTRIBUTE_NAME_START_CHAR + "\\-.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
const VALID_ATTRIBUTE_NAME_REGEX = new RegExp("^[" + ATTRIBUTE_NAME_START_CHAR + "][" + ATTRIBUTE_NAME_CHAR + "]*$");
const illegalAttributeNameCache = {};
const validatedAttributeNameCache = {};
function isAttributeNameSafe(attributeName) {
    if (validatedAttributeNameCache.hasOwnProperty(attributeName)) {
        return true;
    }
    if (illegalAttributeNameCache.hasOwnProperty(attributeName)) {
        return false;
    }
    if (VALID_ATTRIBUTE_NAME_REGEX.test(attributeName)) {
        validatedAttributeNameCache[attributeName] = true;
        return true;
    }
    illegalAttributeNameCache[attributeName] = true;
    return false;
}
// ------------------------
// From: https://github.com/facebook/react/blob/c4d8ef643002a2b181029ffed22abd451fb326df/packages/react-dom/src/server/escapeTextForBrowser.js
const matchHtmlRegExp = /["'&<>]/;
/**
 * Escapes special characters and HTML entities in a given html string.
 *
 * @param  {origStr} string HTML string to escape for later insertion
 * @return {string}
 * @public
 */
function escapeHtml(origStr) {
    const str = "" + origStr;
    const match = matchHtmlRegExp.exec(str);
    if (!match) {
        return str;
    }
    let escape;
    let html = "";
    let index;
    let lastIndex = 0;
    for (index = match.index; index < str.length; index++) {
        switch (str.charCodeAt(index)) {
            case 34: // "
                escape = "&quot;";
                break;
            case 38: // &
                escape = "&amp;";
                break;
            case 39: // '
                escape = "&#x27;"; // modified from escape-html; used to be '&#39'
                break;
            case 60: // <
                escape = "&lt;";
                break;
            case 62: // >
                escape = "&gt;";
                break;
            default:
                continue;
        }
        if (lastIndex !== index) {
            html += str.substring(lastIndex, index);
        }
        lastIndex = index + 1;
        html += escape;
    }
    return lastIndex !== index ? html + str.substring(lastIndex, index) : html;
}
// end code copied and modified from escape-html
/**
 * Escapes text to prevent scripting attacks.
 *
 * @param {*} text Text value to escape.
 * @return {string} An escaped string.
 */
function escapeTextForBrowser(text) {
    if (typeof text === "boolean" || typeof text === "number") {
        // this shortcircuit helps perf for types that we know will never have
        // special characters, especially given that this function is used often
        // for numeric dom ids.
        return "" + text;
    }
    return escapeHtml(text);
}
//# sourceMappingURL=to_html.js.map
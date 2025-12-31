"use strict";
const electron = require("electron");
const path = require("path");
const child_process = require("child_process");
const fs = require("fs");
const os = require("os");
const node_crypto = require("node:crypto");
const events = require("events");
function _interopNamespaceDefault(e) {
  const n = Object.create(null, { [Symbol.toStringTag]: { value: "Module" } });
  if (e) {
    for (const k in e) {
      if (k !== "default") {
        const d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: () => e[k]
        });
      }
    }
  }
  n.default = e;
  return Object.freeze(n);
}
const path__namespace = /* @__PURE__ */ _interopNamespaceDefault(path);
const fs__namespace = /* @__PURE__ */ _interopNamespaceDefault(fs);
const os__namespace = /* @__PURE__ */ _interopNamespaceDefault(os);
function getLineColFromPtr(string, ptr) {
  let lines = string.slice(0, ptr).split(/\r\n|\n|\r/g);
  return [lines.length, lines.pop().length + 1];
}
function makeCodeBlock(string, line, column) {
  let lines = string.split(/\r\n|\n|\r/g);
  let codeblock = "";
  let numberLen = (Math.log10(line + 1) | 0) + 1;
  for (let i = line - 1; i <= line + 1; i++) {
    let l = lines[i - 1];
    if (!l)
      continue;
    codeblock += i.toString().padEnd(numberLen, " ");
    codeblock += ":  ";
    codeblock += l;
    codeblock += "\n";
    if (i === line) {
      codeblock += " ".repeat(numberLen + column + 2);
      codeblock += "^\n";
    }
  }
  return codeblock;
}
class TomlError extends Error {
  line;
  column;
  codeblock;
  constructor(message, options) {
    const [line, column] = getLineColFromPtr(options.toml, options.ptr);
    const codeblock = makeCodeBlock(options.toml, line, column);
    super(`Invalid TOML document: ${message}

${codeblock}`, options);
    this.line = line;
    this.column = column;
    this.codeblock = codeblock;
  }
}
function isEscaped(str, ptr) {
  let i = 0;
  while (str[ptr - ++i] === "\\")
    ;
  return --i && i % 2;
}
function indexOfNewline(str, start = 0, end = str.length) {
  let idx = str.indexOf("\n", start);
  if (str[idx - 1] === "\r")
    idx--;
  return idx <= end ? idx : -1;
}
function skipComment(str, ptr) {
  for (let i = ptr; i < str.length; i++) {
    let c = str[i];
    if (c === "\n")
      return i;
    if (c === "\r" && str[i + 1] === "\n")
      return i + 1;
    if (c < " " && c !== "	" || c === "") {
      throw new TomlError("control characters are not allowed in comments", {
        toml: str,
        ptr
      });
    }
  }
  return str.length;
}
function skipVoid(str, ptr, banNewLines, banComments) {
  let c;
  while ((c = str[ptr]) === " " || c === "	" || !banNewLines && (c === "\n" || c === "\r" && str[ptr + 1] === "\n"))
    ptr++;
  return banComments || c !== "#" ? ptr : skipVoid(str, skipComment(str, ptr), banNewLines);
}
function skipUntil(str, ptr, sep, end, banNewLines = false) {
  if (!end) {
    ptr = indexOfNewline(str, ptr);
    return ptr < 0 ? str.length : ptr;
  }
  for (let i = ptr; i < str.length; i++) {
    let c = str[i];
    if (c === "#") {
      i = indexOfNewline(str, i);
    } else if (c === sep) {
      return i + 1;
    } else if (c === end || banNewLines && (c === "\n" || c === "\r" && str[i + 1] === "\n")) {
      return i;
    }
  }
  throw new TomlError("cannot find end of structure", {
    toml: str,
    ptr
  });
}
function getStringEnd(str, seek) {
  let first = str[seek];
  let target = first === str[seek + 1] && str[seek + 1] === str[seek + 2] ? str.slice(seek, seek + 3) : first;
  seek += target.length - 1;
  do
    seek = str.indexOf(target, ++seek);
  while (seek > -1 && first !== "'" && isEscaped(str, seek));
  if (seek > -1) {
    seek += target.length;
    if (target.length > 1) {
      if (str[seek] === first)
        seek++;
      if (str[seek] === first)
        seek++;
    }
  }
  return seek;
}
let DATE_TIME_RE = /^(\d{4}-\d{2}-\d{2})?[T ]?(?:(\d{2}):\d{2}(?::\d{2}(?:\.\d+)?)?)?(Z|[-+]\d{2}:\d{2})?$/i;
class TomlDate extends Date {
  #hasDate = false;
  #hasTime = false;
  #offset = null;
  constructor(date) {
    let hasDate = true;
    let hasTime = true;
    let offset = "Z";
    if (typeof date === "string") {
      let match = date.match(DATE_TIME_RE);
      if (match) {
        if (!match[1]) {
          hasDate = false;
          date = `0000-01-01T${date}`;
        }
        hasTime = !!match[2];
        hasTime && date[10] === " " && (date = date.replace(" ", "T"));
        if (match[2] && +match[2] > 23) {
          date = "";
        } else {
          offset = match[3] || null;
          date = date.toUpperCase();
          if (!offset && hasTime)
            date += "Z";
        }
      } else {
        date = "";
      }
    }
    super(date);
    if (!isNaN(this.getTime())) {
      this.#hasDate = hasDate;
      this.#hasTime = hasTime;
      this.#offset = offset;
    }
  }
  isDateTime() {
    return this.#hasDate && this.#hasTime;
  }
  isLocal() {
    return !this.#hasDate || !this.#hasTime || !this.#offset;
  }
  isDate() {
    return this.#hasDate && !this.#hasTime;
  }
  isTime() {
    return this.#hasTime && !this.#hasDate;
  }
  isValid() {
    return this.#hasDate || this.#hasTime;
  }
  toISOString() {
    let iso = super.toISOString();
    if (this.isDate())
      return iso.slice(0, 10);
    if (this.isTime())
      return iso.slice(11, 23);
    if (this.#offset === null)
      return iso.slice(0, -1);
    if (this.#offset === "Z")
      return iso;
    let offset = +this.#offset.slice(1, 3) * 60 + +this.#offset.slice(4, 6);
    offset = this.#offset[0] === "-" ? offset : -offset;
    let offsetDate = new Date(this.getTime() - offset * 6e4);
    return offsetDate.toISOString().slice(0, -1) + this.#offset;
  }
  static wrapAsOffsetDateTime(jsDate, offset = "Z") {
    let date = new TomlDate(jsDate);
    date.#offset = offset;
    return date;
  }
  static wrapAsLocalDateTime(jsDate) {
    let date = new TomlDate(jsDate);
    date.#offset = null;
    return date;
  }
  static wrapAsLocalDate(jsDate) {
    let date = new TomlDate(jsDate);
    date.#hasTime = false;
    date.#offset = null;
    return date;
  }
  static wrapAsLocalTime(jsDate) {
    let date = new TomlDate(jsDate);
    date.#hasDate = false;
    date.#offset = null;
    return date;
  }
}
let INT_REGEX = /^((0x[0-9a-fA-F](_?[0-9a-fA-F])*)|(([+-]|0[ob])?\d(_?\d)*))$/;
let FLOAT_REGEX = /^[+-]?\d(_?\d)*(\.\d(_?\d)*)?([eE][+-]?\d(_?\d)*)?$/;
let LEADING_ZERO = /^[+-]?0[0-9_]/;
let ESCAPE_REGEX = /^[0-9a-f]{2,8}$/i;
let ESC_MAP = {
  b: "\b",
  t: "	",
  n: "\n",
  f: "\f",
  r: "\r",
  e: "\x1B",
  '"': '"',
  "\\": "\\"
};
function parseString(str, ptr = 0, endPtr = str.length) {
  let isLiteral = str[ptr] === "'";
  let isMultiline = str[ptr++] === str[ptr] && str[ptr] === str[ptr + 1];
  if (isMultiline) {
    endPtr -= 2;
    if (str[ptr += 2] === "\r")
      ptr++;
    if (str[ptr] === "\n")
      ptr++;
  }
  let tmp = 0;
  let isEscape;
  let parsed = "";
  let sliceStart = ptr;
  while (ptr < endPtr - 1) {
    let c = str[ptr++];
    if (c === "\n" || c === "\r" && str[ptr] === "\n") {
      if (!isMultiline) {
        throw new TomlError("newlines are not allowed in strings", {
          toml: str,
          ptr: ptr - 1
        });
      }
    } else if (c < " " && c !== "	" || c === "") {
      throw new TomlError("control characters are not allowed in strings", {
        toml: str,
        ptr: ptr - 1
      });
    }
    if (isEscape) {
      isEscape = false;
      if (c === "x" || c === "u" || c === "U") {
        let code = str.slice(ptr, ptr += c === "x" ? 2 : c === "u" ? 4 : 8);
        if (!ESCAPE_REGEX.test(code)) {
          throw new TomlError("invalid unicode escape", {
            toml: str,
            ptr: tmp
          });
        }
        try {
          parsed += String.fromCodePoint(parseInt(code, 16));
        } catch {
          throw new TomlError("invalid unicode escape", {
            toml: str,
            ptr: tmp
          });
        }
      } else if (isMultiline && (c === "\n" || c === " " || c === "	" || c === "\r")) {
        ptr = skipVoid(str, ptr - 1, true);
        if (str[ptr] !== "\n" && str[ptr] !== "\r") {
          throw new TomlError("invalid escape: only line-ending whitespace may be escaped", {
            toml: str,
            ptr: tmp
          });
        }
        ptr = skipVoid(str, ptr);
      } else if (c in ESC_MAP) {
        parsed += ESC_MAP[c];
      } else {
        throw new TomlError("unrecognized escape sequence", {
          toml: str,
          ptr: tmp
        });
      }
      sliceStart = ptr;
    } else if (!isLiteral && c === "\\") {
      tmp = ptr - 1;
      isEscape = true;
      parsed += str.slice(sliceStart, tmp);
    }
  }
  return parsed + str.slice(sliceStart, endPtr - 1);
}
function parseValue(value, toml, ptr, integersAsBigInt) {
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (value === "-inf")
    return -Infinity;
  if (value === "inf" || value === "+inf")
    return Infinity;
  if (value === "nan" || value === "+nan" || value === "-nan")
    return NaN;
  if (value === "-0")
    return integersAsBigInt ? 0n : 0;
  let isInt = INT_REGEX.test(value);
  if (isInt || FLOAT_REGEX.test(value)) {
    if (LEADING_ZERO.test(value)) {
      throw new TomlError("leading zeroes are not allowed", {
        toml,
        ptr
      });
    }
    value = value.replace(/_/g, "");
    let numeric = +value;
    if (isNaN(numeric)) {
      throw new TomlError("invalid number", {
        toml,
        ptr
      });
    }
    if (isInt) {
      if ((isInt = !Number.isSafeInteger(numeric)) && !integersAsBigInt) {
        throw new TomlError("integer value cannot be represented losslessly", {
          toml,
          ptr
        });
      }
      if (isInt || integersAsBigInt === true)
        numeric = BigInt(value);
    }
    return numeric;
  }
  const date = new TomlDate(value);
  if (!date.isValid()) {
    throw new TomlError("invalid value", {
      toml,
      ptr
    });
  }
  return date;
}
function sliceAndTrimEndOf(str, startPtr, endPtr) {
  let value = str.slice(startPtr, endPtr);
  let commentIdx = value.indexOf("#");
  if (commentIdx > -1) {
    skipComment(str, commentIdx);
    value = value.slice(0, commentIdx);
  }
  return [value.trimEnd(), commentIdx];
}
function extractValue(str, ptr, end, depth, integersAsBigInt) {
  if (depth === 0) {
    throw new TomlError("document contains excessively nested structures. aborting.", {
      toml: str,
      ptr
    });
  }
  let c = str[ptr];
  if (c === "[" || c === "{") {
    let [value, endPtr2] = c === "[" ? parseArray(str, ptr, depth, integersAsBigInt) : parseInlineTable(str, ptr, depth, integersAsBigInt);
    if (end) {
      endPtr2 = skipVoid(str, endPtr2);
      if (str[endPtr2] === ",")
        endPtr2++;
      else if (str[endPtr2] !== end) {
        throw new TomlError("expected comma or end of structure", {
          toml: str,
          ptr: endPtr2
        });
      }
    }
    return [value, endPtr2];
  }
  let endPtr;
  if (c === '"' || c === "'") {
    endPtr = getStringEnd(str, ptr);
    let parsed = parseString(str, ptr, endPtr);
    if (end) {
      endPtr = skipVoid(str, endPtr);
      if (str[endPtr] && str[endPtr] !== "," && str[endPtr] !== end && str[endPtr] !== "\n" && str[endPtr] !== "\r") {
        throw new TomlError("unexpected character encountered", {
          toml: str,
          ptr: endPtr
        });
      }
      endPtr += +(str[endPtr] === ",");
    }
    return [parsed, endPtr];
  }
  endPtr = skipUntil(str, ptr, ",", end);
  let slice = sliceAndTrimEndOf(str, ptr, endPtr - +(str[endPtr - 1] === ","));
  if (!slice[0]) {
    throw new TomlError("incomplete key-value declaration: no value specified", {
      toml: str,
      ptr
    });
  }
  if (end && slice[1] > -1) {
    endPtr = skipVoid(str, ptr + slice[1]);
    endPtr += +(str[endPtr] === ",");
  }
  return [
    parseValue(slice[0], str, ptr, integersAsBigInt),
    endPtr
  ];
}
let KEY_PART_RE = /^[a-zA-Z0-9-_]+[ \t]*$/;
function parseKey(str, ptr, end = "=") {
  let dot = ptr - 1;
  let parsed = [];
  let endPtr = str.indexOf(end, ptr);
  if (endPtr < 0) {
    throw new TomlError("incomplete key-value: cannot find end of key", {
      toml: str,
      ptr
    });
  }
  do {
    let c = str[ptr = ++dot];
    if (c !== " " && c !== "	") {
      if (c === '"' || c === "'") {
        if (c === str[ptr + 1] && c === str[ptr + 2]) {
          throw new TomlError("multiline strings are not allowed in keys", {
            toml: str,
            ptr
          });
        }
        let eos = getStringEnd(str, ptr);
        if (eos < 0) {
          throw new TomlError("unfinished string encountered", {
            toml: str,
            ptr
          });
        }
        dot = str.indexOf(".", eos);
        let strEnd = str.slice(eos, dot < 0 || dot > endPtr ? endPtr : dot);
        let newLine = indexOfNewline(strEnd);
        if (newLine > -1) {
          throw new TomlError("newlines are not allowed in keys", {
            toml: str,
            ptr: ptr + dot + newLine
          });
        }
        if (strEnd.trimStart()) {
          throw new TomlError("found extra tokens after the string part", {
            toml: str,
            ptr: eos
          });
        }
        if (endPtr < eos) {
          endPtr = str.indexOf(end, eos);
          if (endPtr < 0) {
            throw new TomlError("incomplete key-value: cannot find end of key", {
              toml: str,
              ptr
            });
          }
        }
        parsed.push(parseString(str, ptr, eos));
      } else {
        dot = str.indexOf(".", ptr);
        let part = str.slice(ptr, dot < 0 || dot > endPtr ? endPtr : dot);
        if (!KEY_PART_RE.test(part)) {
          throw new TomlError("only letter, numbers, dashes and underscores are allowed in keys", {
            toml: str,
            ptr
          });
        }
        parsed.push(part.trimEnd());
      }
    }
  } while (dot + 1 && dot < endPtr);
  return [parsed, skipVoid(str, endPtr + 1, true, true)];
}
function parseInlineTable(str, ptr, depth, integersAsBigInt) {
  let res = {};
  let seen = /* @__PURE__ */ new Set();
  let c;
  ptr++;
  while ((c = str[ptr++]) !== "}" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1
      });
    } else if (c === "#")
      ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "	" && c !== "\n" && c !== "\r") {
      let k;
      let t = res;
      let hasOwn = false;
      let [key, keyEndPtr] = parseKey(str, ptr - 1);
      for (let i = 0; i < key.length; i++) {
        if (i)
          t = hasOwn ? t[k] : t[k] = {};
        k = key[i];
        if ((hasOwn = Object.hasOwn(t, k)) && (typeof t[k] !== "object" || seen.has(t[k]))) {
          throw new TomlError("trying to redefine an already defined value", {
            toml: str,
            ptr
          });
        }
        if (!hasOwn && k === "__proto__") {
          Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        }
      }
      if (hasOwn) {
        throw new TomlError("trying to redefine an already defined value", {
          toml: str,
          ptr
        });
      }
      let [value, valueEndPtr] = extractValue(str, keyEndPtr, "}", depth - 1, integersAsBigInt);
      seen.add(value);
      t[k] = value;
      ptr = valueEndPtr;
    }
  }
  if (!c) {
    throw new TomlError("unfinished table encountered", {
      toml: str,
      ptr
    });
  }
  return [res, ptr];
}
function parseArray(str, ptr, depth, integersAsBigInt) {
  let res = [];
  let c;
  ptr++;
  while ((c = str[ptr++]) !== "]" && c) {
    if (c === ",") {
      throw new TomlError("expected value, found comma", {
        toml: str,
        ptr: ptr - 1
      });
    } else if (c === "#")
      ptr = skipComment(str, ptr);
    else if (c !== " " && c !== "	" && c !== "\n" && c !== "\r") {
      let e = extractValue(str, ptr - 1, "]", depth - 1, integersAsBigInt);
      res.push(e[0]);
      ptr = e[1];
    }
  }
  if (!c) {
    throw new TomlError("unfinished array encountered", {
      toml: str,
      ptr
    });
  }
  return [res, ptr];
}
function peekTable(key, table, meta, type) {
  let t = table;
  let m = meta;
  let k;
  let hasOwn = false;
  let state;
  for (let i = 0; i < key.length; i++) {
    if (i) {
      t = hasOwn ? t[k] : t[k] = {};
      m = (state = m[k]).c;
      if (type === 0 && (state.t === 1 || state.t === 2)) {
        return null;
      }
      if (state.t === 2) {
        let l = t.length - 1;
        t = t[l];
        m = m[l].c;
      }
    }
    k = key[i];
    if ((hasOwn = Object.hasOwn(t, k)) && m[k]?.t === 0 && m[k]?.d) {
      return null;
    }
    if (!hasOwn) {
      if (k === "__proto__") {
        Object.defineProperty(t, k, { enumerable: true, configurable: true, writable: true });
        Object.defineProperty(m, k, { enumerable: true, configurable: true, writable: true });
      }
      m[k] = {
        t: i < key.length - 1 && type === 2 ? 3 : type,
        d: false,
        i: 0,
        c: {}
      };
    }
  }
  state = m[k];
  if (state.t !== type && !(type === 1 && state.t === 3)) {
    return null;
  }
  if (type === 2) {
    if (!state.d) {
      state.d = true;
      t[k] = [];
    }
    t[k].push(t = {});
    state.c[state.i++] = state = { t: 1, d: false, i: 0, c: {} };
  }
  if (state.d) {
    return null;
  }
  state.d = true;
  if (type === 1) {
    t = hasOwn ? t[k] : t[k] = {};
  } else if (type === 0 && hasOwn) {
    return null;
  }
  return [k, t, state.c];
}
function parse(toml, { maxDepth = 1e3, integersAsBigInt } = {}) {
  let res = {};
  let meta = {};
  let tbl = res;
  let m = meta;
  for (let ptr = skipVoid(toml, 0); ptr < toml.length; ) {
    if (toml[ptr] === "[") {
      let isTableArray = toml[++ptr] === "[";
      let k = parseKey(toml, ptr += +isTableArray, "]");
      if (isTableArray) {
        if (toml[k[1] - 1] !== "]") {
          throw new TomlError("expected end of table declaration", {
            toml,
            ptr: k[1] - 1
          });
        }
        k[1]++;
      }
      let p = peekTable(
        k[0],
        res,
        meta,
        isTableArray ? 2 : 1
        /* Type.EXPLICIT */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr
        });
      }
      m = p[2];
      tbl = p[1];
      ptr = k[1];
    } else {
      let k = parseKey(toml, ptr);
      let p = peekTable(
        k[0],
        tbl,
        m,
        0
        /* Type.DOTTED */
      );
      if (!p) {
        throw new TomlError("trying to redefine an already defined table or value", {
          toml,
          ptr
        });
      }
      let v = extractValue(toml, k[1], void 0, maxDepth, integersAsBigInt);
      p[1][p[0]] = v[0];
      ptr = v[1];
    }
    ptr = skipVoid(toml, ptr, true);
    if (toml[ptr] && toml[ptr] !== "\n" && toml[ptr] !== "\r") {
      throw new TomlError("each key-value declaration must be followed by an end-of-line", {
        toml,
        ptr
      });
    }
    ptr = skipVoid(toml, ptr);
  }
  return res;
}
let BARE_KEY = /^[a-z0-9-_]+$/i;
function extendedTypeOf(obj) {
  let type = typeof obj;
  if (type === "object") {
    if (Array.isArray(obj))
      return "array";
    if (obj instanceof Date)
      return "date";
  }
  return type;
}
function isArrayOfTables(obj) {
  for (let i = 0; i < obj.length; i++) {
    if (extendedTypeOf(obj[i]) !== "object")
      return false;
  }
  return obj.length != 0;
}
function formatString(s) {
  return JSON.stringify(s).replace(/\x7f/g, "\\u007f");
}
function stringifyValue(val, type, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  if (type === "number") {
    if (isNaN(val))
      return "nan";
    if (val === Infinity)
      return "inf";
    if (val === -Infinity)
      return "-inf";
    if (numberAsFloat && Number.isInteger(val))
      return val.toFixed(1);
    return val.toString();
  }
  if (type === "bigint" || type === "boolean") {
    return val.toString();
  }
  if (type === "string") {
    return formatString(val);
  }
  if (type === "date") {
    if (isNaN(val.getTime())) {
      throw new TypeError("cannot serialize invalid date");
    }
    return val.toISOString();
  }
  if (type === "object") {
    return stringifyInlineTable(val, depth, numberAsFloat);
  }
  if (type === "array") {
    return stringifyArray(val, depth, numberAsFloat);
  }
}
function stringifyInlineTable(obj, depth, numberAsFloat) {
  let keys = Object.keys(obj);
  if (keys.length === 0)
    return "{}";
  let res = "{ ";
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (i)
      res += ", ";
    res += BARE_KEY.test(k) ? k : formatString(k);
    res += " = ";
    res += stringifyValue(obj[k], extendedTypeOf(obj[k]), depth - 1, numberAsFloat);
  }
  return res + " }";
}
function stringifyArray(array, depth, numberAsFloat) {
  if (array.length === 0)
    return "[]";
  let res = "[ ";
  for (let i = 0; i < array.length; i++) {
    if (i)
      res += ", ";
    if (array[i] === null || array[i] === void 0) {
      throw new TypeError("arrays cannot contain null or undefined values");
    }
    res += stringifyValue(array[i], extendedTypeOf(array[i]), depth - 1, numberAsFloat);
  }
  return res + " ]";
}
function stringifyArrayTable(array, key, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let res = "";
  for (let i = 0; i < array.length; i++) {
    res += `${res && "\n"}[[${key}]]
`;
    res += stringifyTable(0, array[i], key, depth, numberAsFloat);
  }
  return res;
}
function stringifyTable(tableKey, obj, prefix, depth, numberAsFloat) {
  if (depth === 0) {
    throw new Error("Could not stringify the object: maximum object depth exceeded");
  }
  let preamble = "";
  let tables = "";
  let keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    let k = keys[i];
    if (obj[k] !== null && obj[k] !== void 0) {
      let type = extendedTypeOf(obj[k]);
      if (type === "symbol" || type === "function") {
        throw new TypeError(`cannot serialize values of type '${type}'`);
      }
      let key = BARE_KEY.test(k) ? k : formatString(k);
      if (type === "array" && isArrayOfTables(obj[k])) {
        tables += (tables && "\n") + stringifyArrayTable(obj[k], prefix ? `${prefix}.${key}` : key, depth - 1, numberAsFloat);
      } else if (type === "object") {
        let tblKey = prefix ? `${prefix}.${key}` : key;
        tables += (tables && "\n") + stringifyTable(tblKey, obj[k], tblKey, depth - 1, numberAsFloat);
      } else {
        preamble += key;
        preamble += " = ";
        preamble += stringifyValue(obj[k], type, depth, numberAsFloat);
        preamble += "\n";
      }
    }
  }
  if (tableKey && (preamble || !tables))
    preamble = preamble ? `[${tableKey}]
${preamble}` : `[${tableKey}]`;
  return preamble && tables ? `${preamble}
${tables}` : preamble || tables;
}
function stringify(obj, { maxDepth = 1e3, numbersAsFloat = false } = {}) {
  if (extendedTypeOf(obj) !== "object") {
    throw new TypeError("stringify can only be called with an object");
  }
  let str = stringifyTable(0, obj, "", maxDepth, numbersAsFloat);
  if (str[str.length - 1] !== "\n")
    return str + "\n";
  return str;
}
const byteToHex = [];
for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 256).toString(16).slice(1));
}
function unsafeStringify(arr, offset = 0) {
  return (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
}
const rnds8Pool = new Uint8Array(256);
let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    node_crypto.randomFillSync(rnds8Pool);
    poolPtr = 0;
  }
  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}
const native = { randomUUID: node_crypto.randomUUID };
function _v4(options, buf, offset) {
  options = options || {};
  const rnds = options.random ?? options.rng?.() ?? rng();
  if (rnds.length < 16) {
    throw new Error("Random bytes length must be >= 16");
  }
  rnds[6] = rnds[6] & 15 | 64;
  rnds[8] = rnds[8] & 63 | 128;
  return unsafeStringify(rnds);
}
function v4(options, buf, offset) {
  if (native.randomUUID && true && !options) {
    return native.randomUUID();
  }
  return _v4(options);
}
class ConfigStore {
  configDir;
  configs = /* @__PURE__ */ new Map();
  constructor() {
    this.configDir = path__namespace.join(electron.app.getPath("userData"), "configs");
    this.ensureConfigDir();
    this.loadAllConfigs();
  }
  ensureConfigDir() {
    if (!fs__namespace.existsSync(this.configDir)) {
      fs__namespace.mkdirSync(this.configDir, { recursive: true });
    }
  }
  generateId() {
    return v4();
  }
  loadAllConfigs() {
    const files = fs__namespace.readdirSync(this.configDir).filter((f) => f.endsWith(".toml"));
    for (const file of files) {
      try {
        const filePath = path__namespace.join(this.configDir, file);
        const content = fs__namespace.readFileSync(filePath, "utf-8");
        const parsed = parse(content);
        const id = path__namespace.basename(file, ".toml");
        const { proxies, visitors, ...common } = parsed;
        const config = {
          id,
          name: common.serverAddr || file,
          common,
          proxies: proxies || [],
          visitors: visitors || [],
          path: filePath
        };
        if (common._frpgui_name) {
          config.name = common._frpgui_name;
          delete config.common._frpgui_name;
        }
        if (common._frpgui_manual_start) {
          config.manualStart = common._frpgui_manual_start;
          delete config.common._frpgui_manual_start;
        }
        this.configs.set(id, config);
      } catch (error) {
        console.error(`Failed to load config ${file}:`, error);
      }
    }
  }
  listConfigs() {
    return Array.from(this.configs.values());
  }
  loadConfig(id) {
    return this.configs.get(id) || null;
  }
  saveConfig(config) {
    if (!config.id) {
      config.id = this.generateId();
    }
    const filePath = path__namespace.join(this.configDir, `${config.id}.toml`);
    config.path = filePath;
    const tomlData = {
      ...config.common,
      _frpgui_name: config.name,
      _frpgui_manual_start: config.manualStart || false
    };
    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies;
    }
    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors;
    }
    const content = stringify(tomlData);
    fs__namespace.writeFileSync(filePath, content, "utf-8");
    this.configs.set(config.id, config);
    return config;
  }
  deleteConfig(id) {
    const config = this.configs.get(id);
    if (config && config.path) {
      if (fs__namespace.existsSync(config.path)) {
        fs__namespace.unlinkSync(config.path);
      }
    }
    this.configs.delete(id);
  }
  importConfig(filePath) {
    const content = fs__namespace.readFileSync(filePath, "utf-8");
    const parsed = parse(content);
    const id = this.generateId();
    const { proxies, visitors, ...common } = parsed;
    const config = {
      id,
      name: common._frpgui_name || path__namespace.basename(filePath, path__namespace.extname(filePath)),
      common,
      proxies: proxies || [],
      visitors: visitors || []
    };
    return this.saveConfig(config);
  }
  importConfigFromText(content, name) {
    const parsed = parse(content);
    const id = this.generateId();
    const { proxies, visitors, ...common } = parsed;
    const config = {
      id,
      name: name || common._frpgui_name || common.serverAddr || "Imported Config",
      common,
      proxies: proxies || [],
      visitors: visitors || []
    };
    return this.saveConfig(config);
  }
  exportConfig(id, filePath) {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Config ${id} not found`);
    }
    const tomlData = {
      ...config.common
    };
    delete tomlData._frpgui_name;
    delete tomlData._frpgui_manual_start;
    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies;
    }
    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors;
    }
    const content = stringify(tomlData);
    fs__namespace.writeFileSync(filePath, content, "utf-8");
  }
  getConfigPath(id) {
    const config = this.configs.get(id);
    return config?.path || null;
  }
  generateFrpcConfig(id) {
    const config = this.configs.get(id);
    if (!config) {
      throw new Error(`Config ${id} not found`);
    }
    const tomlData = {
      ...config.common
    };
    delete tomlData._frpgui_name;
    delete tomlData._frpgui_manual_start;
    if (config.proxies && config.proxies.length > 0) {
      tomlData.proxies = config.proxies;
    }
    if (config.visitors && config.visitors.length > 0) {
      tomlData.visitors = config.visitors;
    }
    return stringify(tomlData);
  }
}
class FrpcManager extends events.EventEmitter {
  processes = /* @__PURE__ */ new Map();
  statuses = /* @__PURE__ */ new Map();
  configStore;
  frpcPath;
  constructor(configStore2) {
    super();
    this.configStore = configStore2;
    this.frpcPath = this.findFrpcBinary();
  }
  // Allow setting frpc path from outside
  setFrpcPath(frpcPath) {
    this.frpcPath = frpcPath;
  }
  getFrpcPath() {
    return this.frpcPath;
  }
  emitLog(id, level, message) {
    const entry = {
      id,
      timestamp: /* @__PURE__ */ new Date(),
      level,
      message: message.trim()
    };
    this.emit("log", entry);
  }
  findFrpcBinary() {
    const platform = os__namespace.platform();
    const binaryName = platform === "win32" ? "frpc.exe" : "frpc";
    const searchPaths = [
      // App resources
      path__namespace.join(electron.app.getAppPath(), "resources", binaryName),
      path__namespace.join(electron.app.getAppPath(), "..", "resources", binaryName),
      // User data
      path__namespace.join(electron.app.getPath("userData"), binaryName),
      // System PATH (we'll use 'frpc' directly)
      binaryName
    ];
    for (const searchPath of searchPaths) {
      if (searchPath === binaryName || fs__namespace.existsSync(searchPath)) {
        return searchPath;
      }
    }
    return binaryName;
  }
  async start(id) {
    if (this.processes.has(id)) {
      const status = this.statuses.get(id);
      if (status?.state === 1 || status?.state === 3) {
        return;
      }
    }
    this.statuses.set(id, {
      id,
      state: 3
      /* Starting */
    });
    try {
      const configContent = this.configStore.generateFrpcConfig(id);
      const tempConfigPath = path__namespace.join(electron.app.getPath("temp"), `frpc-${id}.toml`);
      fs__namespace.writeFileSync(tempConfigPath, configContent, "utf-8");
      const proc = child_process.spawn(this.frpcPath, ["-c", tempConfigPath], {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false
      });
      this.processes.set(id, proc);
      proc.stdout?.on("data", (data) => {
        const message = data.toString();
        console.log(`[frpc:${id}] ${message}`);
        this.emitLog(id, "info", message);
      });
      proc.stderr?.on("data", (data) => {
        const message = data.toString();
        console.error(`[frpc:${id}] ${message}`);
        const level = message.includes("[E]") ? "error" : message.includes("[W]") ? "warn" : "info";
        this.emitLog(id, level, message);
      });
      proc.on("exit", (code) => {
        this.processes.delete(id);
        this.statuses.set(id, {
          id,
          state: 2,
          error: code !== 0 ? `Process exited with code ${code}` : void 0
        });
        try {
          fs__namespace.unlinkSync(tempConfigPath);
        } catch {
        }
      });
      proc.on("error", (err) => {
        this.processes.delete(id);
        this.statuses.set(id, {
          id,
          state: 2,
          error: err.message
        });
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (proc.exitCode === null) {
        this.statuses.set(id, {
          id,
          state: 1,
          pid: proc.pid,
          startTime: /* @__PURE__ */ new Date()
        });
      }
    } catch (error) {
      this.statuses.set(id, {
        id,
        state: 2,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      throw error;
    }
  }
  async stop(id) {
    const proc = this.processes.get(id);
    if (!proc) {
      this.statuses.set(id, {
        id,
        state: 2
        /* Stopped */
      });
      return;
    }
    this.statuses.set(id, {
      id,
      state: 4
      /* Stopping */
    });
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        proc.kill("SIGKILL");
      }, 5e3);
      proc.once("exit", () => {
        clearTimeout(timeout);
        this.processes.delete(id);
        this.statuses.set(id, {
          id,
          state: 2
          /* Stopped */
        });
        resolve();
      });
      proc.kill("SIGTERM");
    });
  }
  async restart(id) {
    await this.stop(id);
    await this.start(id);
  }
  async reload(id) {
    const proc = this.processes.get(id);
    if (!proc) {
      await this.start(id);
      return;
    }
    await this.restart(id);
  }
  getStatus(id) {
    return this.statuses.get(id) || {
      id,
      state: 2
      /* Stopped */
    };
  }
  async getProxyStatus(id) {
    const status = this.statuses.get(id);
    if (!status || status.state !== 1) {
      return [];
    }
    return [];
  }
  stopAll() {
    for (const [id, proc] of this.processes) {
      try {
        proc.kill("SIGTERM");
        setTimeout(() => {
          if (!proc.killed) {
            proc.kill("SIGKILL");
          }
        }, 2e3);
      } catch {
      }
      this.statuses.set(id, {
        id,
        state: 2
        /* Stopped */
      });
    }
    this.processes.clear();
  }
  isRunning(id) {
    const status = this.statuses.get(id);
    return status?.state === 1 || status?.state === 3;
  }
}
electron.app.disableHardwareAcceleration();
let mainWindow = null;
let tray = null;
const configStore = new ConfigStore();
const frpcManager = new FrpcManager(configStore);
frpcManager.on("log", (entry) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("frpc:log", entry);
  }
});
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
function createWindow() {
  mainWindow = new electron.BrowserWindow({
    width: 1e3,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    },
    icon: path.join(__dirname, "../public/icon.png"),
    show: false
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.on("close", (event) => {
    if (process.platform === "darwin") {
      event.preventDefault();
      mainWindow?.hide();
    }
  });
}
function createTray() {
  const iconPath = path.join(__dirname, "../public/icon.png");
  const icon = electron.nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new electron.Tray(icon);
  const contextMenu = electron.Menu.buildFromTemplate([
    {
      label: "显示主窗口",
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      }
    },
    { type: "separator" },
    {
      label: "退出",
      click: () => {
        frpcManager.stopAll();
        electron.app.quit();
      }
    }
  ]);
  tray.setToolTip("FRP GUI");
  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}
electron.ipcMain.handle("config:list", async () => {
  return configStore.listConfigs();
});
electron.ipcMain.handle("config:load", async (_event, id) => {
  return configStore.loadConfig(id);
});
electron.ipcMain.handle("config:save", async (_event, config) => {
  return configStore.saveConfig(config);
});
electron.ipcMain.handle("config:delete", async (_event, id) => {
  await frpcManager.stop(id);
  return configStore.deleteConfig(id);
});
electron.ipcMain.handle("config:import", async (_event, filePath) => {
  return configStore.importConfig(filePath);
});
electron.ipcMain.handle("config:import-text", async (_event, content, name) => {
  return configStore.importConfigFromText(content, name);
});
electron.ipcMain.handle("config:export", async (_event, id, filePath) => {
  return configStore.exportConfig(id, filePath);
});
electron.ipcMain.handle("frpc:start", async (_event, id) => {
  return frpcManager.start(id);
});
electron.ipcMain.handle("frpc:stop", async (_event, id) => {
  return frpcManager.stop(id);
});
electron.ipcMain.handle("frpc:restart", async (_event, id) => {
  return frpcManager.restart(id);
});
electron.ipcMain.handle("frpc:reload", async (_event, id) => {
  return frpcManager.reload(id);
});
electron.ipcMain.handle("frpc:status", async (_event, id) => {
  return frpcManager.getStatus(id);
});
electron.ipcMain.handle("frpc:proxy-status", async (_event, id) => {
  return frpcManager.getProxyStatus(id);
});
electron.ipcMain.handle("system:open-file", async (_event, filePath) => {
  return electron.shell.openPath(filePath);
});
electron.ipcMain.handle("system:open-folder", async (_event, folderPath) => {
  return electron.shell.showItemInFolder(folderPath);
});
electron.ipcMain.handle("system:select-file", async (_event, options) => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    ...options,
    properties: ["openFile"]
  });
  return result.canceled ? null : result.filePaths[0];
});
electron.ipcMain.handle("system:select-folder", async (_event, options) => {
  const result = await electron.dialog.showOpenDialog(mainWindow, {
    ...options,
    properties: ["openDirectory"]
  });
  return result.canceled ? null : result.filePaths[0];
});
electron.ipcMain.handle("system:get-app-path", async () => {
  return {
    userData: electron.app.getPath("userData"),
    logs: electron.app.getPath("logs"),
    temp: electron.app.getPath("temp")
  };
});
electron.ipcMain.handle("system:get-platform", async () => {
  return process.platform;
});
electron.ipcMain.handle("frpc:check", async () => {
  return checkFrpcAvailable();
});
electron.ipcMain.handle("frpc:get-path", async () => {
  return getFrpcPath();
});
electron.ipcMain.handle("frpc:set-path", async (_event, frpcPath) => {
  return setFrpcPath(frpcPath);
});
electron.ipcMain.handle("frpc:verify-path", async (_event, frpcPath) => {
  return verifyFrpcPath(frpcPath);
});
function getSettingsPath() {
  return path.join(electron.app.getPath("userData"), "settings.json");
}
function loadSettings() {
  try {
    const settingsPath = getSettingsPath();
    if (fs__namespace.existsSync(settingsPath)) {
      const content = fs__namespace.readFileSync(settingsPath, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return {};
}
function saveSettings(settings) {
  try {
    const settingsPath = getSettingsPath();
    const existing = loadSettings();
    fs__namespace.writeFileSync(settingsPath, JSON.stringify({ ...existing, ...settings }, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to save settings:", error);
  }
}
function getFrpcPath() {
  const settings = loadSettings();
  return settings.frpcPath || null;
}
function setFrpcPath(frpcPath) {
  const result = verifyFrpcPath(frpcPath);
  if (result.valid) {
    saveSettings({ frpcPath });
    frpcManager.setFrpcPath(frpcPath);
    return true;
  }
  return false;
}
function verifyFrpcPath(frpcPath) {
  try {
    if (!fs__namespace.existsSync(frpcPath)) {
      return { valid: false, error: "File not found" };
    }
    const output = child_process.execSync(`"${frpcPath}" -v`, {
      timeout: 5e3,
      encoding: "utf-8",
      windowsHide: true
    });
    const versionMatch = output.match(/frpc version (\d+\.\d+\.\d+)/i) || output.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : output.trim();
    return { valid: true, version };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
function checkFrpcAvailable() {
  const savedPath = getFrpcPath();
  if (savedPath) {
    const result = verifyFrpcPath(savedPath);
    if (result.valid) {
      return { available: true, version: result.version, path: savedPath };
    }
  }
  const platform = os__namespace.platform();
  const binaryName = platform === "win32" ? "frpc.exe" : "frpc";
  const searchPaths = [
    // App resources
    path.join(electron.app.getAppPath(), "resources", binaryName),
    path.join(electron.app.getAppPath(), "..", "resources", binaryName),
    // User data
    path.join(electron.app.getPath("userData"), binaryName)
  ];
  for (const searchPath of searchPaths) {
    if (fs__namespace.existsSync(searchPath)) {
      const result = verifyFrpcPath(searchPath);
      if (result.valid) {
        saveSettings({ frpcPath: searchPath });
        return { available: true, version: result.version, path: searchPath };
      }
    }
  }
  try {
    const output = child_process.execSync(`${binaryName} -v`, {
      timeout: 5e3,
      encoding: "utf-8",
      windowsHide: true
    });
    const versionMatch = output.match(/frpc version (\d+\.\d+\.\d+)/i) || output.match(/(\d+\.\d+\.\d+)/);
    const version = versionMatch ? versionMatch[1] : output.trim();
    return { available: true, version, path: binaryName };
  } catch {
    return { available: false, error: "frpc not found in PATH" };
  }
}
electron.app.whenReady().then(() => {
  const savedPath = getFrpcPath();
  if (savedPath) {
    frpcManager.setFrpcPath(savedPath);
  }
  createWindow();
  createTray();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else {
      mainWindow?.show();
    }
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    frpcManager.stopAll();
    electron.app.quit();
  }
});
electron.app.on("before-quit", () => {
  frpcManager.stopAll();
});

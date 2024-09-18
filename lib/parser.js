/**
 * @typedef {import('./types.js').XastNode} XastNode
 * @typedef {import('./types.js').XastInstruction} XastInstruction
 * @typedef {import('./types.js').XastDoctype} XastDoctype
 * @typedef {import('./types.js').XastComment} XastComment
 * @typedef {import('./types.js').XastRoot} XastRoot
 * @typedef {import('./types.js').XastElement} XastElement
 * @typedef {import('./types.js').XastCdata} XastCdata
 * @typedef {import('./types.js').XastText} XastText
 * @typedef {import('./types.js').XastParent} XastParent
 * @typedef {import('./types.js').XastChild} XastChild
 */

import SAX from 'sax';
import { textElems } from '../plugins/_collections.js';
import { SVGOError } from './svgo/tools.js';

export class SvgoParserError extends Error {
  /**
   * @param message {string}
   * @param line {number}
   * @param column {number}
   * @param source {string}
   * @param file {void | string}
   */
  constructor(message, line, column, source, file) {
    super(message);
    this.name = 'SvgoParserError';
    this.message = `${file || '<input>'}:${line}:${column}: ${message}`;
    this.reason = message;
    this.line = line;
    this.column = column;
    this.source = source;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SvgoParserError);
    }
  }
  toString() {
    const lines = this.source.split(/\r?\n/);
    const startLine = Math.max(this.line - 3, 0);
    const endLine = Math.min(this.line + 2, lines.length);
    const lineNumberWidth = String(endLine).length;
    const startColumn = Math.max(this.column - 54, 0);
    const endColumn = Math.max(this.column + 20, 80);
    const code = lines
      .slice(startLine, endLine)
      .map((line, index) => {
        const lineSlice = line.slice(startColumn, endColumn);
        let ellipsisPrefix = '';
        let ellipsisSuffix = '';
        if (startColumn !== 0) {
          ellipsisPrefix = startColumn > line.length - 1 ? ' ' : '…';
        }
        if (endColumn < line.length - 1) {
          ellipsisSuffix = '…';
        }
        const number = startLine + 1 + index;
        const gutter = ` ${number.toString().padStart(lineNumberWidth)} | `;
        if (number === this.line) {
          const gutterSpacing = gutter.replace(/[^|]/g, ' ');
          const lineSpacing = (
            ellipsisPrefix + line.slice(startColumn, this.column - 1)
          ).replace(/[^\t]/g, ' ');
          const spacing = gutterSpacing + lineSpacing;
          return `>${gutter}${ellipsisPrefix}${lineSlice}${ellipsisSuffix}\n ${spacing}^`;
        }
        return ` ${gutter}${ellipsisPrefix}${lineSlice}${ellipsisSuffix}`;
      })
      .join('\n');
    return `${this.name}: ${this.message}\n\n${code}\n`;
  }
}

const entityDeclaration = /<!ENTITY\s+(\S+)\s+(?:'([^']+)'|"([^"]+)")\s*>/g;

/** @type {import('sax').SAXOptions} */
const config = {
  trim: false,
  normalize: false,
  lowercase: true,
  xmlns: true,
  position: true,
  // @ts-ignore - 2024-09-17 - unparsedEntities is not a valid SAXOption, but one test fails if it is not set
  //  (entities are not converted to characters) .
  unparsedEntities: true,
};

const NS_SVG = 'http://www.w3.org/2000/svg';
const NS_XLINK = 'http://www.w3.org/1999/xlink';

/**
 * Convert SVG (XML) string to SVG-as-JS object.
 *
 * @type {(data: string, from?: string) => XastRoot}
 */
export const parseSvg = (data, from) => {
  const sax = SAX.parser(true, config);
  /**
   * @type {XastRoot}
   */
  const root = { type: 'root', children: [] };
  /**
   * @type {XastParent}
   */
  let current = root;
  /**
   * @type {XastParent[]}
   */
  const stack = [root];
  let foreignLevel = 0;
  let needsXlink = false;

  /**
   * @type {(node: XastChild) => void}
   */
  const pushToContent = (node) => {
    current.children.push(node);
  };

  sax.ondoctype = (doctype) => {
    /**
     * @type {XastDoctype}
     */
    const node = {
      type: 'doctype',
      parentNode: current,
      name: 'svg',
      data: {
        doctype,
      },
    };
    pushToContent(node);
    const subsetStart = doctype.indexOf('[');
    if (subsetStart >= 0) {
      entityDeclaration.lastIndex = subsetStart;
      let entityMatch = entityDeclaration.exec(data);
      while (entityMatch != null) {
        sax.ENTITIES[entityMatch[1]] = entityMatch[2] || entityMatch[3];
        entityMatch = entityDeclaration.exec(data);
      }
    }
  };

  /**
   * @param {{name:string,body:string}} data
   */
  sax.onprocessinginstruction = (data) => {
    /**
     * @type {XastInstruction}
     */
    const node = {
      type: 'instruction',
      parentNode: current,
      name: data.name,
      value: data.body,
    };
    pushToContent(node);
  };

  /**
   * @param {string} comment
   */
  sax.oncomment = (comment) => {
    /**
     * @type {XastComment}
     */
    const node = {
      type: 'comment',
      parentNode: current,
      value: foreignLevel > 0 ? comment : comment.trim(),
    };
    pushToContent(node);
  };

  /**
   * @param {string} cdata
   */
  sax.oncdata = (cdata) => {
    /**
     * @type {XastCdata}
     */
    const node = {
      type: 'cdata',
      parentNode: current,
      value: cdata,
    };
    pushToContent(node);
  };

  /**
   * @param {SAX.QualifiedTag} data
   */
  sax.onopentag = (data) => {
    let name = data.name;
    if (data.ns) {
      const uri = data.ns[data.prefix];
      if (uri === NS_SVG) {
        // Normalize all SVG prefixes to be in the default namespace, otherwise many plugins will fail.
        name = data.local;
      }
    }

    /**
     * @type {XastElement}
     */
    const element = {
      type: 'element',
      parentNode: current,
      name: name,
      attributes: {},
      children: [],
    };
    for (const [name, attr] of Object.entries(data.attributes)) {
      let attName = name;
      switch (attr.prefix) {
        case undefined:
          break;
        case 'xmlns':
          if (attr.value === NS_SVG) {
            if (current === root) {
              // SVG should be default namespace on <svg> element.
              attName = 'xmlns';
            }
          }
          break;
        default:
          if (attr.uri === NS_XLINK) {
            // Force all xlink references to xlink prefix - many plugins depend on this pattern.
            attName = 'xlink:' + attr.local;
            needsXlink = true;
          }
          break;
      }
      if (
        attName === 'xmlns' &&
        attr.value.trim() !== NS_SVG &&
        foreignLevel === 0
      ) {
        // Many plugins assume default namespace is SVG.
        throw new SVGOError(`default namespace "${attr.value}" not supported`);
      }
      element.attributes[attName] = attr.value;
    }
    pushToContent(element);
    current = element;
    stack.push(element);
    if (data.name === 'foreignObject') {
      foreignLevel++;
    }
  };

  /**
   * @param {string} text
   */
  sax.ontext = (text) => {
    if (current.type === 'element') {
      // prevent trimming of meaningful whitespace inside textual tags
      if (foreignLevel > 0 || textElems.has(current.name)) {
        /**
         * @type {XastText}
         */
        const node = {
          type: 'text',
          parentNode: current,
          value: text,
        };
        pushToContent(node);
      } else if (/\S/.test(text)) {
        /**
         * @type {XastText}
         */
        const node = {
          type: 'text',
          parentNode: current,
          value: text.trim(),
        };
        pushToContent(node);
      }
    }
  };

  /**
   * @param {string} tagName
   */
  sax.onclosetag = (tagName) => {
    stack.pop();
    current = stack[stack.length - 1];
    if (tagName === 'foreignObject') {
      foreignLevel--;
    }
  };

  /**
   * @param {Error} e
   */
  sax.onerror = (e) => {
    const reason = e.message.split('\n')[0];
    const error = new SvgoParserError(
      reason,
      sax.line + 1,
      sax.column,
      data,
      from,
    );
    if (e.message.indexOf('Unexpected end') === -1) {
      throw error;
    }
  };

  sax.write(data).close();

  if (needsXlink) {
    // Make sure the xlink namespace is set on the top level <svg>.
    for (const child of root.children) {
      if (child.type === 'element' && child.name === 'svg') {
        child.attributes['xmlns:xlink'] = NS_XLINK;
      }
    }
  }
  return root;
};

import { elemsGroups } from '../plugins/_collections.js';

/**
 * @typedef {{
 *   indent: string,
 *   indentLevel: number,
 *   svgNS:boolean,
 *   textStack: import('./types.js').XastElement[],
 *   textContent: import('./types.js').XastElement|undefined,
 *   newLine: string
 * }} State
 */

/** @type {(char: string) => string} */
const encodeEntity = (char) => {
  return entities[char];
};

/** @type {Record<string, string>} */
const entities = {
  '&': '&amp;',
  "'": '&apos;',
  '"': '&quot;',
  '>': '&gt;',
  '<': '&lt;',
};

/**
 * @param {import('./types.js').XastRoot} data
 * @param {import('./types.js').StringifyOptions} config
 */
export function stringifySvg(data, config = {}) {
  const options = { ...{ indent: 4 }, ...config };
  if (typeof options.indent === 'string') {
    options.indent = parseInt(options.indent);
  }
  /** * @type {State} */
  const state = {
    indent: options.pretty ? ' '.repeat(options.indent) : '',
    indentLevel: 0,
    svgNS: true,
    textStack: [],
    textContent: undefined,
    newLine: options.eol === 'crlf' ? '\r\n' : '\n',
  };
  let svg = stringifyNode(data, options, state);
  if (options.finalNewline && svg.length > 0 && !svg.endsWith('\n')) {
    svg += state.newLine;
  }
  return svg;
}

/**
 * @param {import('./types.js').XastParent} data
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function stringifyNode(data, config, state) {
  let svg = '';
  state.indentLevel += 1;
  for (const item of data.children) {
    if (item.type === 'element') {
      svg += stringifyElement(item, config, state);
    } else if (item.type === 'text') {
      svg += stringifyText(item);
    } else if (item.type === 'doctype') {
      svg +=
        '<!DOCTYPE' + item.data.doctype + '>' + createNewLine(config, state);
    } else if (item.type === 'instruction') {
      svg +=
        '<?' +
        item.name +
        ' ' +
        item.value +
        '?>' +
        createNewLine(config, state);
    } else if (item.type === 'comment') {
      svg +=
        createIndent(config, state) +
        '<!--' +
        item.value +
        '-->' +
        createNewLine(config, state);
    }
  }
  state.indentLevel -= 1;
  return svg;
}

/**
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function createIndent(config, state) {
  let indent = '';
  if (config.pretty && state.textContent === undefined) {
    indent = state.indent.repeat(state.indentLevel - 1);
  }
  return indent;
}

/**
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function createNewLine(config, state) {
  return config.pretty && state.textContent === undefined ? state.newLine : '';
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function stringifyElement(element, config, state) {
  const indentBegin = createIndent(config, state);

  if (
    (state.textContent === undefined &&
      elemsGroups.characterData.has(element.local)) ||
    element.uri !== undefined
  ) {
    state.textStack.push(element);
    state.textContent = element;
  }

  const newLineBegin = createNewLine(config, state);
  const children = stringifyNode(element, config, state);

  const elName =
    element.prefix !== ''
      ? `${element.prefix}:${element.local}`
      : element.local;
  let s = indentBegin + '<' + elName + stringifyAttributes(element);
  if (children === '') {
    // There are no children. Don't self-close tag if not in an SVG namespace and the tag was not originally self-closed.
    if (element.uri !== undefined && element.isSelfClosing === false) {
      s += '></' + elName + '>';
    } else {
      s += '/>';
    }
  } else {
    s +=
      '>' +
      newLineBegin +
      children +
      createIndent(config, state) +
      '</' +
      elName +
      '>';
  }

  if (state.textContent === element) {
    state.textStack.pop();
    const len = state.textStack.length;
    state.textContent = len === 0 ? undefined : state.textStack[len - 1];
  }

  return s + createNewLine(config, state);
}

/**
 * @param {import('./types.js').XastElement} element
 * @returns {string}
 */
function stringifyAttributes(element) {
  let attrs = '';
  if (element.otherAtts) {
    for (const att of element.otherAtts) {
      const name =
        att.prefix === '' || att.prefix === undefined
          ? att.local
          : att.local === ''
            ? att.prefix
            : `${att.prefix}:${att.local}`;
      attrs +=
        ' ' + name + '="' + att.value.replace(/[&"<>]/g, encodeEntity) + '"';
    }
  }
  for (const [name, value] of element.svgAtts.entries()) {
    const encodedValue = value.toString().replace(/[&"<>]/g, encodeEntity);
    attrs += ' ' + name + '="' + encodedValue + '"';
  }
  return attrs;
}

/**
 * @param {import('./types.js').XastText} node
 * @returns {string}
 */
function stringifyText(node) {
  return node.value.replace(/[&<]/g, encodeEntity);
}

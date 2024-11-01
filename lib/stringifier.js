import { elemsGroups } from '../plugins/_collections.js';

/**
 * @typedef {{
 *   indent: string,
 *   indentLevel: number,
 *   foreignLevel: number,
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
    foreignLevel: 0,
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
    } else if (item.type === 'cdata') {
      svg += stringifyCdata(item, config, state);
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
  if (
    config.pretty &&
    state.foreignLevel === 0 &&
    state.textContent === undefined
  ) {
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
  return config.pretty &&
    state.foreignLevel === 0 &&
    state.textContent === undefined
    ? state.newLine
    : '';
}

/**
 * @param {import('./types.js').XastCdata} node
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function stringifyCdata(node, config, state) {
  return createIndent(config, state) + '<![CDATA[' + node.value + ']]>';
}

/**
 * @param {import('./types.js').XastElement} element
 * @param {import('./types.js').StringifyOptions} config
 * @param {State} state
 * @returns {string}
 */
function stringifyElement(element, config, state) {
  const indentBegin = createIndent(config, state);

  if (element.name === 'foreignObject') {
    state.foreignLevel++;
  }

  if (
    (state.textContent === undefined &&
      elemsGroups.characterData.has(element.name)) ||
    element.name.includes(':')
  ) {
    state.textStack.push(element);
    state.textContent = element;
  }

  const newLineBegin = createNewLine(config, state);
  const children = stringifyNode(element, config, state);

  let s = indentBegin + '<' + element.name + stringifyAttributes(element);
  if (children === '') {
    s += '/>';
  } else {
    s +=
      '>' +
      newLineBegin +
      children +
      createIndent(config, state) +
      '</' +
      element.name +
      '>';
  }

  if (element.name === 'foreignObject') {
    state.foreignLevel--;
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
  for (const [name, value] of Object.entries(element.attributes)) {
    if (value !== undefined) {
      const encodedValue = value.toString().replace(/[&"<>]/g, encodeEntity);
      attrs += ' ' + name + '="' + encodedValue + '"';
    } else {
      attrs += ' ' + name;
    }
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

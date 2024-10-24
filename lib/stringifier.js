/**
 * @typedef {import('./types.js').XastParent} XastParent
 * @typedef {import('./types.js').XastRoot} XastRoot
 * @typedef {import('./types.js').XastInstruction} XastInstruction
 * @typedef {import('./types.js').XastDoctype} XastDoctype
 * @typedef {import('./types.js').XastText} XastText
 * @typedef {import('./types.js').XastCdata} XastCdata
 * @typedef {import('./types.js').XastComment} XastComment
 * @typedef {import('./types.js').StringifyOptions} StringifyOptions
 * @typedef {{
 *   indent: string,
 *   textContext: ?import('./types.js').XastElement,
 *   indentLevel: number,
 *   foreignLevel: number,
 *   eolLen: number
 * }} State
 * @typedef {Required<StringifyOptions>} Options
 */

import { elemsGroups } from '../plugins/_collections.js';

/** @type {(char: string) => string} */
const encodeEntity = (char) => {
  return entities[char];
};

/** @type {Options} */
const defaults = {
  doctypeStart: '<!DOCTYPE',
  doctypeEnd: '>',
  procInstStart: '<?',
  procInstEnd: '?>',
  tagOpenStart: '<',
  tagOpenEnd: '>',
  tagCloseStart: '</',
  tagCloseEnd: '>',
  tagShortStart: '<',
  tagShortEnd: '/>',
  attrStart: '="',
  attrEnd: '"',
  commentStart: '<!--',
  commentEnd: '-->',
  cdataStart: '<![CDATA[',
  cdataEnd: ']]>',
  textStart: '',
  textEnd: '',
  indent: 4,
  regEntities: /[&<]/g,
  regValEntities: /[&"<>]/g,
  encodeEntity,
  pretty: false,
  useShortTags: true,
  eol: 'lf',
  finalNewline: false,
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
 * convert XAST to SVG string
 *
 * @type {(data: XastRoot, config?: StringifyOptions) => string}
 */
export const stringifySvg = (data, userOptions = {}) => {
  /**
   * @type {Options}
   */
  const config = { ...defaults, ...userOptions };
  const indent = config.indent;
  let newIndent = '    ';
  if (typeof indent === 'number' && Number.isNaN(indent) === false) {
    newIndent = indent < 0 ? '\t' : ' '.repeat(indent);
  } else if (typeof indent === 'string') {
    newIndent = indent;
  }
  const eol = config.eol === 'crlf' ? '\r\n' : '\n';
  if (config.pretty) {
    config.doctypeEnd += eol;
    config.procInstEnd += eol;
    config.commentEnd += eol;
    config.cdataEnd += eol;
    config.tagShortEnd += eol;
    config.tagOpenEnd += eol;
    config.tagCloseEnd += eol;
    config.textEnd += eol;
  }
  /**
   * @type {State}
   */
  const state = {
    indent: newIndent,
    textContext: null,
    indentLevel: 0,
    foreignLevel: 0,
    eolLen: eol.length,
  };
  let svg = stringifyNode(data, config, state);
  if (config.finalNewline && svg.length > 0 && !svg.endsWith('\n')) {
    svg += eol;
  }
  return svg;
};

/**
 * @type {(node: XastParent, config: Options, state: State) => string}
 */
const stringifyNode = (data, config, state) => {
  let svg = '';
  state.indentLevel += 1;
  for (const item of data.children) {
    if (item.type === 'element') {
      svg += stringifyElement(item, config, state);
    } else if (item.type === 'text') {
      svg += stringifyText(item, config, state);
    } else if (item.type === 'doctype') {
      svg += stringifyDoctype(item, config);
    } else if (item.type === 'instruction') {
      svg += stringifyInstruction(item, config);
    } else if (item.type === 'comment') {
      svg += stringifyComment(item, config, state);
    } else if (item.type === 'cdata') {
      svg += stringifyCdata(item, config, state);
    }
  }
  state.indentLevel -= 1;
  return svg;
};

/**
 * create indent string in accordance with the current node level.
 *
 * @type {(config: Options, state: State) => string}
 */
const createIndent = (config, state) => {
  let indent = '';
  if (config.pretty && state.textContext == null && state.foreignLevel === 0) {
    indent = state.indent.repeat(state.indentLevel - 1);
  }
  return indent;
};

/**
 * Trim newline at end of tag if format is "pretty" and in a foreignObject.
 * @param {string} tagEnd
 * @param {StringifyOptions} config
 * @param {State} state
 */
const formatEndTag = (tagEnd, config, state) => {
  if (config.pretty && state.foreignLevel > 0 && tagEnd.endsWith('\n')) {
    return tagEnd.substring(0, tagEnd.length - state.eolLen);
  }
  return tagEnd;
};

/**
 * @type {(node: XastDoctype, config: Options) => string}
 */
const stringifyDoctype = (node, config) => {
  return config.doctypeStart + node.data.doctype + config.doctypeEnd;
};

/**
 * @type {(node: XastInstruction, config: Options) => string}
 */
const stringifyInstruction = (node, config) => {
  return (
    config.procInstStart + node.name + ' ' + node.value + config.procInstEnd
  );
};

/**
 * @type {(node: XastComment, config: Options,state:State) => string}
 */
const stringifyComment = (node, config, state) => {
  return (
    config.commentStart +
    node.value +
    formatEndTag(config.commentEnd, config, state)
  );
};

/**
 * @type {(node: XastCdata, config: Options, state: State) => string}
 */
const stringifyCdata = (node, config, state) => {
  return (
    createIndent(config, state) +
    config.cdataStart +
    node.value +
    formatEndTag(config.cdataEnd, config, state)
  );
};

/**
 * @type {(node: import('./types.js').XastElement, config: Options, state: State) => string}
 */
const stringifyElement = (node, config, state) => {
  // empty element and short tag
  if (node.children.length === 0) {
    if (config.useShortTags) {
      return (
        createIndent(config, state) +
        config.tagShortStart +
        node.name +
        stringifyAttributes(node, config) +
        formatEndTag(config.tagShortEnd, config, state)
      );
    } else {
      return (
        createIndent(config, state) +
        config.tagShortStart +
        node.name +
        stringifyAttributes(node, config) +
        formatEndTag(config.tagOpenEnd, config, state) +
        config.tagCloseStart +
        node.name +
        formatEndTag(config.tagCloseEnd, config, state)
      );
    }
    // non-empty element
  } else {
    let tagOpenStart = config.tagOpenStart;
    let tagOpenEnd = config.tagOpenEnd;
    let tagCloseStart = config.tagCloseStart;
    let tagCloseEnd = config.tagCloseEnd;
    let openIndent = createIndent(config, state);
    let enableCloseIndent = true;

    if (state.textContext) {
      tagOpenStart = defaults.tagOpenStart;
      tagOpenEnd = defaults.tagOpenEnd;
      tagCloseStart = defaults.tagCloseStart;
      tagCloseEnd = defaults.tagCloseEnd;
      openIndent = '';
    } else if (
      elemsGroups.characterData.has(node.name) ||
      node.name.includes(':')
    ) {
      tagOpenEnd = defaults.tagOpenEnd;
      tagCloseStart = defaults.tagCloseStart;
      enableCloseIndent = false;
      state.textContext = node;
    }

    if (node.name === 'foreignObject') {
      state.foreignLevel++;
    }
    const children = stringifyNode(node, config, state);

    if (state.textContext === node) {
      state.textContext = null;
    }

    const s =
      openIndent +
      tagOpenStart +
      node.name +
      stringifyAttributes(node, config) +
      formatEndTag(tagOpenEnd, config, state) +
      children +
      (enableCloseIndent ? createIndent(config, state) : '') +
      tagCloseStart +
      node.name;
    if (node.name === 'foreignObject') {
      state.foreignLevel--;
    }

    return s + formatEndTag(tagCloseEnd, config, state);
  }
};

/**
 * @type {(node: import('./types.js').XastElement, config: Options) => string}
 */
const stringifyAttributes = (node, config) => {
  let attrs = '';
  for (const [name, value] of Object.entries(node.attributes)) {
    // TODO remove attributes without values support in v3
    if (value !== undefined) {
      const encodedValue = value
        .toString()
        .replace(config.regValEntities, config.encodeEntity);
      attrs += ' ' + name + config.attrStart + encodedValue + config.attrEnd;
    } else {
      attrs += ' ' + name;
    }
  }
  return attrs;
};

/**
 * @type {(node: XastText, config: Options, state: State) => string}
 */
const stringifyText = (node, config, state) => {
  return (
    createIndent(config, state) +
    config.textStart +
    node.value.replace(config.regEntities, config.encodeEntity) +
    (state.textContext ? '' : formatEndTag(config.textEnd, config, state))
  );
};

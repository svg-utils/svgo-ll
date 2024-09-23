/**
 * @typedef {import('./types.js').XastElement} XastElement
 * @typedef {XastElement&{style?:string,declarations?:import('./types.js').CSSDeclarationMap}} XastElementExtended
 * @typedef {import('./types.js').CSSFeatures} CSSFeatures
 * @typedef{{type:'AttributeSelector',name:string,matcher:string|null,value:string|null}} AttributeSelector
 * @typedef{{type:'ClassSelector',name:string}} ClassSelector
 * @typedef{{type:'IdSelector',name:string}} IdSelector
 * @typedef{{type:'PseudoClassSelector',name:string}} PseudoClassSelector
 * @typedef{{type:'PseudoElementSelector',name:string}} PseudoElementSelector
 * @typedef{{type:'TypeSelector',name:string}} TypeSelector
 * @typedef{AttributeSelector|ClassSelector|IdSelector|PseudoClassSelector|PseudoElementSelector|TypeSelector} SimpleSelector
 */

import { _parseStyleDeclarations } from './style-css-tree-tools.js';

const REGEX_FN = /url\([^#]/;

export class CSSRuleSet {
  #atRule;
  /** @type {CSSRule[]} */
  #rules;
  /** @type {Set<CSSFeatures>|undefined} */
  #features;

  /**
   * @param {CSSRule[]} rules
   * @param {string|undefined} atRule
   */
  constructor(rules, atRule) {
    this.#atRule = atRule;
    this.#rules = rules;

    this.#features = this.#initFeatures();
  }

  /**
   * @param {Set<CSSRule>} rules
   */
  deleteRules(rules) {
    this.#rules = this.#rules.filter((rule) => !rules.has(rule));
    this.#features = undefined;
  }

  /**
   * @returns {Set<import('./docdata.js').CSSFeatures>}
   */
  getFeatures() {
    if (!this.#features) {
      this.#features = this.#initFeatures();
    }
    return this.#features;
  }

  getRules() {
    return this.#rules;
  }

  hasAtRules() {
    return this.#atRule !== undefined;
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    for (const rule of this.#rules) {
      if (rule.hasAttributeSelector(attName)) {
        return true;
      }
    }
    return false;
  }

  #initFeatures() {
    const features = new Set();
    if (this.#atRule) {
      features.add('atrules');
    }

    for (const rule of this.#rules) {
      rule.getFeatures().forEach((f) => features.add(f));
    }
    return features;
  }

  getString() {
    return this.#rules.reduce(
      (css, rule) =>
        `${css}${rule.getSelectorString()}{${rule.getDeclarationString()}}`,
      '',
    );
  }
}

export class CSSRule {
  #selector;
  #specificity;
  #declarations;
  #isInMediaQuery;

  /**
   * @param {CSSSelector} selector
   * @param {[number,number,number]} specificity
   * @param {Map<string,{value:string,important?:boolean}>} declarations
   * @param {boolean} isInMediaQuery
   */
  constructor(selector, specificity, declarations, isInMediaQuery) {
    this.#selector = selector;
    this.#specificity = specificity;
    this.#declarations = declarations;
    this.#isInMediaQuery = isInMediaQuery;
  }

  /**
   * @param {Set<string>} classes
   */
  addReferencedClasses(classes) {
    this.#selector.addReferencedClasses(classes);
  }

  getDeclarations() {
    return this.#declarations;
  }

  getDeclarationString() {
    let s = '';
    for (const [p, v] of this.#declarations.entries()) {
      if (s !== '') {
        s += ';';
      }
      if (v.important) {
        s += `${p}:${v.value} !important`;
      } else {
        s += `${p}:${v.value}`;
      }
    }
    return s;
  }

  /**
   * @returns {Set<import('./docdata.js').CSSFeatures>}
   */
  getFeatures() {
    return this.#selector.getFeatures();
  }

  getSelectorString() {
    return this.#selector.getString();
  }

  getSelectorStringWithoutPseudos() {
    return this.#selector.getStringWithoutPseudos();
  }

  getSpecificity() {
    return this.#specificity;
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    return this.#selector.hasAttributeSelector(attName);
  }

  hasPseudos() {
    return this.#selector.hasPseudos();
  }

  isInMediaQuery() {
    return this.#isInMediaQuery;
  }

  /**
   * @param {XastElement} element
   * @return {boolean}
   */
  // eslint-disable-next-line no-unused-vars
  matches(element) {
    throw new Error();
  }
}

export class CSSSelector {
  #selectorSequences;
  #str;
  #strWithoutPseudos;

  /**
   * @param {CSSSelectorSequence[]} selectorSequences
   * @param {string} str
   * @param {string} [strWithoutPseudos]
   */
  constructor(selectorSequences, str, strWithoutPseudos) {
    this.#selectorSequences = selectorSequences;
    this.#str = str;
    this.#strWithoutPseudos =
      strWithoutPseudos === '' ? '*' : strWithoutPseudos;
  }

  /**
   * @param {Set<string>} classes
   */
  addReferencedClasses(classes) {
    for (const seq of this.#selectorSequences) {
      seq.addReferencedClasses(classes);
    }
  }

  /**
   * @returns {Set<CSSFeatures>}
   */
  getFeatures() {
    /** @type {Set<CSSFeatures>} */
    const features = new Set();
    features.add(
      this.#selectorSequences.length === 1 ? 'simple-selectors' : 'combinators',
    );
    for (const complexSelector of this.#selectorSequences) {
      complexSelector.addFeatures(features);
    }
    return features;
  }

  getString() {
    return this.#str;
  }

  getStringWithoutPseudos() {
    return this.#strWithoutPseudos !== undefined
      ? this.#strWithoutPseudos
      : this.#str;
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    return this.#selectorSequences.some((s) => s.hasAttributeSelector(attName));
  }

  hasPseudos() {
    return this.#strWithoutPseudos !== undefined;
  }
}

export class CSSSelectorSequence {
  // #comparator;
  #simpleSelectors;

  /**
   * @param {string|undefined} comparator
   * @param {SimpleSelector[]} simpleSelectors
   */
  constructor(comparator, simpleSelectors) {
    // this.#comparator = comparator;
    this.#simpleSelectors = simpleSelectors;
  }

  /**
   * @param {Set<CSSFeatures>} features
   */
  addFeatures(features) {
    for (const selector of this.#simpleSelectors)
      switch (selector.type) {
        case 'AttributeSelector':
          features.add('attribute-selectors');
          break;
        case 'PseudoElementSelector':
          features.add('pseudos');
          break;
        case 'PseudoClassSelector':
          if (selector.name !== 'hover') {
            features.add('pseudos');
          }
          break;
      }
  }

  /**
   * @param {Set<string>} classes
   */
  addReferencedClasses(classes) {
    for (const selector of this.#simpleSelectors) {
      switch (selector.type) {
        case 'ClassSelector':
          classes.add(selector.name);
      }
    }
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    for (const selector of this.#simpleSelectors) {
      if (selector.type === 'AttributeSelector') {
        return attName === undefined ? true : selector.name === attName;
      }
    }
    return false;
  }
}

export class CSSParseError extends Error {
  /**
   * @param {string} message
   */
  constructor(message) {
    super(message);
  }
}

/**
 * @param {XastElementExtended} element
 * @returns {import('./types.js').CSSDeclarationMap|undefined}
 */
export function getStyleDeclarations(element) {
  const style = element.attributes.style;
  if (style === undefined || style === '') {
    return;
  }
  if (element.style !== style) {
    element.style = style;
    element.declarations = parseStyleDeclarations(style);
  }
  // Copy cached map in case it is changed by caller.
  return new Map(element.declarations);
}

/**
 * @param {string} css
 */
export function _isStyleComplex(css) {
  return REGEX_FN.test(css);
}

/**
 * @param {string|undefined} css
 * @returns {Map<string,import('./types.js').CSSPropertyValue>}
 */
export function parseStyleDeclarations(css) {
  /** @type {Map<string,import('./types.js').CSSPropertyValue>} */
  const declarations = new Map();
  if (css === undefined) {
    return declarations;
  }

  if (_isStyleComplex(css)) {
    // There's a function in the declaration; use the less efficient low-level implementation.
    return _parseStyleDeclarations(css);
  }

  const decList = css.split(';');
  for (const declaration of decList) {
    if (declaration) {
      const pv = declaration.split(':');
      if (pv.length === 2) {
        const dec = pv[1].trim();
        const value = dec.endsWith('!important')
          ? { value: dec.substring(0, dec.length - 10).trim(), important: true }
          : { value: dec, important: false };
        declarations.set(pv[0].trim(), value);
      }
    }
  }
  return declarations;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,{value:string,important?:boolean}>} properties
 */
export function writeStyleAttribute(element, properties) {
  let style = '';
  for (const [p, decValue] of properties.entries()) {
    if (style !== '') {
      style += ';';
    }
    style += `${p}:${decValue.value}`;
    if (decValue.important) {
      style += '!important';
    }
  }
  if (style) {
    element.attributes.style = style;
  } else {
    delete element.attributes.style;
  }
}

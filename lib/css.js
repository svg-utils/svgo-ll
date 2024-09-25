// eslint-disable-next-line no-unused-vars
import { _parseStyleDeclarations } from './style-css-tree-tools.js';
import {
  getReferencedIdInStyleProperty,
  updateReferencedDeclarationIds,
} from './svgo/tools.js';

/**
 * @typedef {import('./types.js').XastElement} XastElement
 * @typedef {import('./types.js').CSSFeatures} CSSFeatures
 * @typedef{{type:'AttributeSelector',name:string,matcher:string|null,value:string|null,flags:string|null}} AttributeSelector
 * @typedef{{type:'ClassSelector',name:string}} ClassSelector
 * @typedef{{type:'IdSelector',name:string}} IdSelector
 * @typedef{{type:'PseudoClassSelector',name:string}} PseudoClassSelector
 * @typedef{{type:'PseudoElementSelector',name:string}} PseudoElementSelector
 * @typedef{{type:'TypeSelector',name:string}} TypeSelector
 * @typedef{AttributeSelector|ClassSelector|IdSelector|PseudoClassSelector|PseudoElementSelector|TypeSelector} SimpleSelector
 */

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
   * @param {import('./types.js').CSSDeclarationMap} declarations
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

  /**
   * @param {Map<string,CSSRule[]>} referencedIds
   */
  addReferencedIds(referencedIds) {
    /**
     * @param {string} id
     * @param {CSSRule} rule
     */
    function addReference(id, rule) {
      let rules = referencedIds.get(id);
      if (!rules) {
        rules = [];
        referencedIds.set(id, rules);
      }
      rules.push(rule);
    }
    const selectorIds = this.#selector.getReferencedIds();
    for (const id of selectorIds) {
      addReference(id, this);
    }
    for (const propValue of this.#declarations.values()) {
      const idInfo = getReferencedIdInStyleProperty(propValue.value);
      if (idInfo) {
        addReference(idInfo.id, this);
      }
    }
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

  /**
   * @param {Map<string,string>} idMap
   */
  updateReferencedIds(idMap) {
    this.#selector.updateReferencedIds(idMap);
    updateReferencedDeclarationIds(this.#declarations, idMap);
  }
}

export class CSSSelector {
  #selectorSequences;
  /** @type {string} */
  #str;
  #strWithoutPseudos;

  /**
   * @param {CSSSelectorSequence[]} selectorSequences
   */
  constructor(selectorSequences) {
    this.#selectorSequences = selectorSequences;
    this.#str = this.#generateSelectorString();
    if (this.#str.includes(':')) {
      this.#strWithoutPseudos = this.#generateSelectorString(false);
      if (this.#strWithoutPseudos === '') {
        this.#strWithoutPseudos = '*';
      }
    }
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
   * @param {boolean} [includePseudos]
   * @returns {string}
   */
  #generateSelectorString(includePseudos = true) {
    return this.#selectorSequences.reduce((s, seq) => {
      return s + seq.getString(includePseudos);
    }, '');
  }

  getReferencedIds() {
    const ids = [];
    for (const seq of this.#selectorSequences) {
      ids.push(...seq.getReferencedIds());
    }
    return ids;
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

  /**
   * @param {Map<string,string>} idMap
   */
  updateReferencedIds(idMap) {
    for (const selectorSequence of this.#selectorSequences) {
      selectorSequence.updateReferencedIds(idMap);
    }
    this.#str = this.#generateSelectorString();
    if (this.hasPseudos()) {
      this.#strWithoutPseudos = this.#generateSelectorString(false);
    }
  }
}

export class CSSSelectorSequence {
  #comparator;
  #simpleSelectors;

  /**
   * @param {string|undefined} comparator
   * @param {SimpleSelector[]} simpleSelectors
   */
  constructor(comparator, simpleSelectors) {
    this.#comparator = comparator;
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
          break;
      }
    }
  }

  getReferencedIds() {
    const ids = [];
    for (const selector of this.#simpleSelectors) {
      switch (selector.type) {
        case 'IdSelector':
          ids.push(selector.name);
          break;
      }
    }
    return ids;
  }

  /**
   * @param {boolean} includePseudos
   */
  getString(includePseudos) {
    let s = this.#comparator === undefined ? '' : this.#comparator;
    for (const selector of this.#simpleSelectors) {
      switch (selector.type) {
        case 'AttributeSelector':
          if (selector.matcher) {
            s += `[${selector.name}${selector.matcher}"${selector.value}"${selector.flags ? selector.flags : ''}]`;
          } else {
            s += `[${selector.name}]`;
          }
          break;
        case 'ClassSelector':
          s += '.' + selector.name;
          break;
        case 'IdSelector':
          s += '#' + selector.name;
          break;
        case 'PseudoClassSelector':
          if (includePseudos) {
            s += ':' + selector.name;
          }
          break;
        case 'PseudoElementSelector':
          if (includePseudos) {
            s += '::' + selector.name;
          }
          break;
        case 'TypeSelector':
          s += selector.name;
          break;
        default:
          // @ts-ignore - in case new types are introduced
          throw new Error(selector.type);
      }
    }
    return s;
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

  /**
   * @param {Map<string,string>} idMap
   */
  updateReferencedIds(idMap) {
    for (const selector of this.#simpleSelectors) {
      switch (selector.type) {
        case 'IdSelector':
          {
            const newId = idMap.get(selector.name);
            if (newId) {
              selector.name = newId;
            }
          }
          break;
      }
    }
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

import {
  getReferencedIdInStyleProperty,
  updateReferencedDeclarationIds,
} from './svgo/tools.js';

/**
 * @typedef{{type:'AttributeSelector',name:string,matcher:string|null,value:string|null,flags:string|null}} AttributeSelector
 * @typedef{{type:'ClassSelector',name:string}} ClassSelector
 * @typedef{{type:'IdSelector',name:string}} IdSelector
 * @typedef{{type:'PseudoClassSelector',name:string}} PseudoClassSelector
 * @typedef{{type:'PseudoElementSelector',name:string}} PseudoElementSelector
 * @typedef{{type:'TypeSelector',name:string}} TypeSelector
 * @typedef{AttributeSelector|ClassSelector|IdSelector|PseudoClassSelector|PseudoElementSelector|TypeSelector} SimpleSelector
 */

export class CSSRuleSet {
  /** @type {string|undefined} */
  #atRule;
  /** @type {CSSRule[]} */
  #rules;
  /** @type {Set<import('./types.js').CSSFeatures>|undefined} */
  #features;
  /** @type {string[]} */
  #fontFaces;

  /**
   * @param {CSSRule[]} rules
   * @param {string|undefined} atRule
   * @param {string[]} fontFaces
   */
  constructor(rules, atRule, fontFaces) {
    this.#atRule = atRule;
    this.#rules = rules;
    this.#fontFaces = fontFaces;

    this.#features = this.#initFeatures();
  }

  /**
   * @param {Set<CSSRule>} rules
   * @returns {void}
   */
  deleteRules(rules) {
    this.#rules = this.#rules.filter((rule) => !rules.has(rule));
    this.#features = undefined;
  }

  /**
   * @returns {Set<import('./types.js').CSSFeatures>}
   */
  getFeatures() {
    if (!this.#features) {
      this.#features = this.#initFeatures();
    }
    return this.#features;
  }

  /**
   * @returns {CSSRule[]}
   */
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

  /**
   * @param {string} id
   * @returns {boolean}
   */
  hasIdSelector(id) {
    for (const rule of this.#rules) {
      if (rule.hasIdSelector(id)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {string} type
   * @returns {boolean}
   */
  hasTypeSelector(type) {
    for (const rule of this.#rules) {
      if (rule.hasTypeSelector(type)) {
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
    const fontFaces = this.#fontFaces.reduce(
      (css, fontFace) => `${css}@font-face${fontFace}`,
      '',
    );
    return this.#rules.reduce(
      (css, rule) =>
        `${css}${rule.getSelectorString()}{${rule.getDeclarationString()}}`,
      fontFaces,
    );
  }
}

export class CSSRule {
  #selector;
  #specificity;
  /** @type {Map<string,import('../lib/types.js').CSSPropertyValue>} */
  #declarations;
  #isInMediaQuery;
  /** @type {(function(import('./types.js').XastElement):boolean)|undefined} */
  #matcher;

  /**
   * @param {CSSSelector} selector
   * @param {[number,number,number]} specificity
   * @param {Map<string,import('../lib/types.js').CSSPropertyValue>} declarations
   * @param {boolean} isInMediaQuery
   */
  constructor(selector, specificity, declarations, isInMediaQuery) {
    this.#selector = selector;
    this.#specificity = specificity;
    this.#declarations = declarations;
    this.#isInMediaQuery = isInMediaQuery;
    this.#matcher = this.#initMatcher();
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
      const idInfo = getReferencedIdInStyleProperty(propValue.value.toString());
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
   * @returns {Set<import('./types.js').CSSFeatures>}
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

  /**
   * @param {string} id
   */
  hasIdSelector(id) {
    return this.#selector.hasIdSelector(id);
  }

  hasPseudos() {
    return this.#selector.hasPseudos();
  }

  /**
   * @param {string} type
   */
  hasTypeSelector(type) {
    return this.#selector.hasTypeSelector(type);
  }

  /**
   * @returns {(function(import('./types.js').XastElement):boolean)|undefined}
   */
  #initMatcher() {
    const sequences = this.#selector.getSequences();
    if (sequences.length > 1) {
      return;
    }
    const simpleSelectors = sequences[0].getSelectors();
    if (simpleSelectors.length > 1) {
      return;
    }
    switch (simpleSelectors[0].type) {
      case 'ClassSelector':
        return (element) =>
          element.attributes.class
            ? element.attributes.class
                .toString()
                .split(/\s/)
                .includes(simpleSelectors[0].name)
            : false;
      case 'IdSelector':
        return (element) => element.attributes.id === simpleSelectors[0].name;
      case 'TypeSelector':
        return (element) => element.name === simpleSelectors[0].name;
    }
  }

  isInMediaQuery() {
    return this.#isInMediaQuery;
  }

  /**
   * @param {import('./types.js').XastElement} element
   * @return {boolean|null}
   */
  _matches(element) {
    if (this.#matcher !== undefined) {
      return this.#matcher(element);
    }
    return null;
  }

  /**
   * @param {import('./types.js').XastElement} element
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
   * @returns {Set<import('./types.js').CSSFeatures>}
   */
  getFeatures() {
    /** @type {Set<import('./types.js').CSSFeatures>} */
    const features = new Set();
    features.add(
      this.#selectorSequences.length === 1 ? 'simple-selectors' : 'combinators',
    );
    for (const complexSelector of this.#selectorSequences) {
      complexSelector.addFeatures(features);
    }
    return features;
  }

  getSequences() {
    return this.#selectorSequences;
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

  /**
   * @param {string} id
   */
  hasIdSelector(id) {
    return this.#selectorSequences.some((s) => s.hasIdSelector(id));
  }

  hasPseudos() {
    return this.#strWithoutPseudos !== undefined;
  }

  /**
   * @param {string} type
   */
  hasTypeSelector(type) {
    return this.#selectorSequences.some((s) => s.hasTypeSelector(type));
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
   * @param {Set<import('./types.js').CSSFeatures>} features
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

  getSelectors() {
    return this.#simpleSelectors;
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
   * @param {string} id
   */
  hasIdSelector(id) {
    for (const selector of this.#simpleSelectors) {
      if (selector.type === 'IdSelector') {
        return selector.name === id;
      }
    }
    return false;
  }

  /**
   * @param {string} type
   */
  hasTypeSelector(type) {
    for (const selector of this.#simpleSelectors) {
      if (selector.type === 'TypeSelector') {
        return selector.name === type;
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

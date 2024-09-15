/**
 * @typedef {import('../lib/types.js').CSSFeatures} CSSFeatures
 * @typedef{{type:'AttributeSelector',name:string,matcher:string|null,value:string|null}} AttributeSelector
 * @typedef{{type:'ClassSelector',name:string}} ClassSelector
 * @typedef{{type:'IdSelector',name:string}} IdSelector
 * @typedef{{type:'PseudoClassSelector',name:string}} PseudoClassSelector
 * @typedef{{type:'PseudoElementSelector',name:string}} PseudoElementSelector
 * @typedef{{type:'TypeSelector',name:string}} TypeSelector
 * @typedef{AttributeSelector|ClassSelector|IdSelector|PseudoClassSelector|PseudoElementSelector|TypeSelector} SimpleSelector
 */

export class CSSRuleSet {
  #atRule;
  #rules;
  /** @type {Set<CSSFeatures>} */
  #features = new Set();

  /**
   * @param {import('./types.js').CSSRule[]} rules
   * @param {string|undefined} atRule
   */
  constructor(rules, atRule) {
    this.#atRule = atRule;
    this.#rules = rules;

    if (atRule) {
      this.#features.add('atrules');
    }

    for (const rule of rules) {
      rule.getFeatures().forEach((f) => this.#features.add(f));
    }
  }

  /**
   * @returns {Set<import('./docdata.js').CSSFeatures>}
   */
  getFeatures() {
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

  /**
   * @returns {Set<import('./docdata.js').CSSFeatures>}
   */
  getFeatures() {
    return this.#selector.getFeatures();
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

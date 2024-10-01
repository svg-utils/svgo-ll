import * as csso from 'csso';
import {
  attrsGroups,
  elemsGroups,
  inheritableAttrs,
} from '../plugins/_collections.js';
import { parseStylesheet } from './style-css-tree.js';
import { findReferences } from './svgo/tools.js';
import { detachNodeFromParent, visit, visitSkip } from './xast.js';
import { CSSParseError } from './css.js';
import { getStyleDeclarations } from './css-tools.js';

/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 * @typedef {import('../lib/types.js').XastParent} XastParent
 * @typedef {import('../lib/types.js').XastRoot} XastRoot
 */

/**
 * @typedef {import('../lib/types.js').CSSFeatures} CSSFeatures
 * @typedef {import('./css.js').CSSRule} CSSRule
 * @typedef {import('./css.js').CSSRuleSet} CSSRuleSet
 * @typedef {import('../lib/types.js').CSSDeclarationMap} CSSDeclarationMap
 */

const VAR_REGEXP = /([^\w]var|^var)\(/;

export class StyleData {
  #styleElements;
  /** @type {CSSRuleSet[]} */
  #ruleSets = [];
  /** @type {CSSRule[]} */
  #sortedRules = [];
  /** @type {Set<string>|undefined} */
  #referencedClasses;

  /**
   * @param {XastElement[]} styleElements
   * @param {CSSRuleSet[]} ruleSets
   */
  constructor(styleElements, ruleSets) {
    this.#styleElements = styleElements;
    this.#initData(ruleSets);
  }

  /**
   * @param {CSSRuleSet[]} ruleSets
   * @returns {CSSRule[]}
   */
  static #collectRules(ruleSets) {
    /**
     * Compares selector specificities.
     * Derived from https://github.com/keeganstreet/specificity/blob/8757133ddd2ed0163f120900047ff0f92760b536/specificity.js#L207
     *
     * @param {[number,number,number]} a
     * @param {[number,number,number]} b
     * @returns {number}
     */
    function compareSpecificity(a, b) {
      for (let i = 0; i < 4; i += 1) {
        if (a[i] < b[i]) {
          return -1;
        } else if (a[i] > b[i]) {
          return 1;
        }
      }

      return 0;
    }

    const rules = [];
    for (const ruleSet of ruleSets) {
      rules.push(...ruleSet.getRules());
    }

    rules.sort((a, b) =>
      compareSpecificity(a.getSpecificity(), b.getSpecificity()),
    );

    return rules;
  }

  /**
   * @param {XastParent} element
   * @param {CSSDeclarationMap} [declarations]
   * @returns {Map<string,string|null>}
   */
  computeOwnStyle(element, declarations) {
    /** @type {Map<string,string|null>} */
    const computedStyles = new Map();

    if (element.type === 'root') {
      return computedStyles;
    }

    // Collect attributes.
    for (const [name, value] of Object.entries(element.attributes)) {
      if (attrsGroups.presentation.has(name)) {
        computedStyles.set(name, value);
      }
    }

    // Override with style element rules.
    const importantProperties = new Set();
    for (const rule of this.#sortedRules) {
      if (rule.matches(element)) {
        const isDynamic = rule.isInMediaQuery() || rule.hasPseudos();
        rule.getDeclarations().forEach((value, name) => {
          if (isDynamic) {
            computedStyles.set(name, null);
          } else {
            const hasVars = VAR_REGEXP.test(value.value);
            if (hasVars) {
              computedStyles.set(name, null);
            } else {
              computedStyles.set(name, value.value);
              if (value.important) {
                importantProperties.add(name);
              }
            }
          }
        });
      }
    }

    // Override with inline styles.
    if (!declarations) {
      declarations = getStyleDeclarations(element);
    }
    if (declarations) {
      declarations.forEach((value, name) => {
        if (value.important || !importantProperties.has(name)) {
          computedStyles.set(name, value.value);
        }
      });
    }

    return computedStyles;
  }

  /**
   * @param {XastElement} element
   * @param {{element:XastParent,styles?:Map<string,string|null>}[]} parents
   * @param {CSSDeclarationMap} [declarations]
   * @returns {Map<string,string|null>}
   */
  computeStyle(element, parents, declarations) {
    /**
     * @param {StyleData} styleData
     * @param {number} index
     */
    function getParentStyles(styleData, index) {
      const parent = parents[index];
      if (!parent.styles) {
        parent.styles = styleData.computeOwnStyle(parent.element);
        if (index > 0) {
          mergeMissingProperties(
            parent.styles,
            getParentStyles(styleData, index - 1),
          );
        }
      }
      return parent.styles;
    }

    /**
     * @param {Map<string,string|null>} currentStyles
     * @param {Map<string,string|null>} parentStyles
     */
    function mergeMissingProperties(currentStyles, parentStyles) {
      parentStyles.forEach((value, name) => {
        if (inheritableAttrs.has(name) && !currentStyles.has(name)) {
          currentStyles.set(name, value);
        }
      });
    }

    const computedStyles = this.computeOwnStyle(element, declarations);

    // Fill in any missing properties from the parent.
    if (parents.length) {
      const parentStyles = getParentStyles(this, parents.length - 1);
      mergeMissingProperties(computedStyles, parentStyles);
    }

    return computedStyles;
  }

  /** @param {Set<CSSRule>}  rules */
  deleteRules(rules) {
    if (rules.size === 0) {
      return;
    }
    for (const ruleSet of this.#ruleSets) {
      ruleSet.deleteRules(rules);
    }
    this.#initData(this.#ruleSets);
  }

  /**
   * @returns {Set<CSSFeatures>}
   */
  getFeatures() {
    return this.#ruleSets.reduce((features, rs) => {
      rs.getFeatures().forEach((f) => features.add(f));
      return features;
    }, new Set());
  }

  getFirstStyleElement() {
    return this.#styleElements[0];
  }

  getIdsReferencedByProperties() {
    /** @type {string[]} */
    const ids = [];
    for (const rule of this.#sortedRules) {
      const properties = rule.getDeclarations();
      properties.forEach((value) =>
        ids.push(...findReferences('style', value.value)),
      );
    }
    return ids;
  }

  /**
   * @param {XastElement} element
   */
  getMatchingRules(element) {
    const rules = [];
    for (const rule of this.#sortedRules) {
      if (rule.matches(element)) {
        rules.push(rule);
      }
    }
    return rules;
  }

  getReferencedClasses() {
    if (!this.#referencedClasses) {
      this.#referencedClasses = new Set();
      for (const rule of this.#sortedRules) {
        rule.addReferencedClasses(this.#referencedClasses);
      }
    }
    return this.#referencedClasses;
  }

  /**
   * @returns {Map<string,CSSRule[]>}
   */
  getReferencedIds() {
    /** @type {Map<string,CSSRule[]>} */
    const referencedIds = new Map();
    for (const rule of this.#sortedRules) {
      rule.addReferencedIds(referencedIds);
    }
    return referencedIds;
  }

  getSortedRules() {
    return this.#sortedRules;
  }

  hasAtRules() {
    return this.#ruleSets.some((rs) => rs.hasAtRules());
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    for (const ruleSet of this.#ruleSets) {
      if (ruleSet.hasAttributeSelector(attName)) {
        return true;
      }
    }
    return false;
  }

  /**
   * @param {string} className
   */
  hasClassReference(className) {
    return this.getReferencedClasses().has(className);
  }

  /**
   * @param {CSSFeatures[]} features
   */
  hasOnlyFeatures(features) {
    for (const feature of this.getFeatures()) {
      if (!features.includes(feature)) {
        return false;
      }
    }
    return true;
  }

  hasStyles() {
    return this.#sortedRules.length > 0;
  }

  /**
   * @param {CSSRuleSet[]} ruleSets
   */
  #initData(ruleSets) {
    this.#ruleSets = ruleSets;
    this.#sortedRules = StyleData.#collectRules(ruleSets);
    this.#referencedClasses = undefined;
  }

  mergeStyles() {
    /**
     * @param {XastElement} element
     */
    function gatherCSS(element) {
      let css = getCSS(element);
      const media = element.attributes['media'];
      if (media) {
        css = `@media ${media}{${css}}`;
      }
      return { css: css, type: 'text' };
    }

    if (this.#styleElements.length === 0) {
      return;
    }

    // Gather text from all style elements.
    let css = '';
    /** @type {'text'|'cdata'} */
    let childType = 'text';
    for (let index = 0; index < this.#styleElements.length; index++) {
      const element = this.#styleElements[index];
      const data = gatherCSS(element);
      css += data.css;
      if (data.type === 'cdata') {
        childType = 'cdata';
      }
    }
    const firstStyle = this.#styleElements[0];
    firstStyle.children = [
      { type: childType, parentNode: firstStyle, value: css },
    ];

    // Remove all but the first element.
    for (let index = 1; index < this.#styleElements.length; index++) {
      const element = this.#styleElements[index];
      detachNodeFromParent(element);
    }

    // If the first element is empty, remove it as well.
    if (css.trim() === '') {
      detachNodeFromParent(firstStyle);
      this.#styleElements = [];
      return;
    }

    // If there's a media attribute on the first element, remove it.
    delete firstStyle.attributes['media'];

    this.#styleElements = [firstStyle];
  }

  /**
   * @param {csso.Usage} cssoUsage
   */
  minifyStyles(cssoUsage) {
    /** @type {CSSRuleSet[]} */
    const ruleSets = [];
    for (const styleElement of this.#styleElements) {
      /** @type {CSSRuleSet[]} */

      if (styleElement.children.length === 0) {
        continue;
      }

      const minified = csso.minify(getCSS(styleElement), {
        usage: cssoUsage,
      }).css;

      if (minified.length === 0) {
        styleElement.children = [];
        continue;
      }

      const type =
        minified.indexOf('<') > 0 || minified.indexOf('&') > 0
          ? 'cdata'
          : 'text';
      styleElement.children = [
        { type: type, parentNode: styleElement, value: minified },
      ];

      ruleSets.push(...getRuleSets(styleElement));
    }
    this.#initData(ruleSets);
  }

  /**
   * @param {Map<string,CSSRule[]>} styleElementIds
   * @param {Map<string,string>} idMap
   */
  updateReferencedIds(styleElementIds, idMap) {
    if (styleElementIds.size === 0) {
      return;
    }
    for (const rules of styleElementIds.values()) {
      for (const rule of rules) {
        rule.updateReferencedIds(idMap);
      }
    }
    this.writeRules();
  }

  writeRules() {
    for (let index = 0; index < this.#styleElements.length; index++) {
      const element = this.#styleElements[index];
      const css = this.#ruleSets[index].getString();
      element.children =
        css === ''
          ? []
          : [
              {
                type: 'text',
                parentNode: element,
                value: css,
              },
            ];
    }
  }
}

class DocData {
  #styleData;
  #hasAnimations;
  #hasScripts;

  /**
   * @param {StyleData|null} styleData
   * @param {boolean} hasAnimations
   * @param {boolean} hasScripts
   */
  constructor(styleData, hasAnimations, hasScripts) {
    this.#styleData = styleData;
    this.#hasAnimations = hasAnimations;
    this.#hasScripts = hasScripts;
  }

  /**
   * @returns {StyleData|null}
   */
  getStyles() {
    return this.#styleData;
  }

  hasAnimations() {
    return this.#hasAnimations;
  }

  hasScripts() {
    return this.#hasScripts;
  }
}

/**
 * @param {XastElement} styleElement
 */
function getCSS(styleElement) {
  let css = '';
  for (const child of styleElement.children) {
    if (child.type === 'text' || child.type === 'cdata') {
      css += child.value;
    }
  }
  return css;
}

/**
 * @param {XastElement} styleElement
 */
function getRuleSets(styleElement) {
  /** @type {CSSRuleSet[]} */
  const ruleSets = [];

  let media;
  for (const [name, value] of Object.entries(styleElement.attributes)) {
    let valid = false;
    switch (name) {
      case 'media':
        media = value;
        valid = true;
        break;
      case 'type':
        valid = value === '' || value === 'text/css';
        break;
      default:
        // All core attributes are allowed on style element.
        valid = attrsGroups.core.has(name);
        break;
    }
    if (!valid) {
      throw new CSSParseError(
        `unknown attribute in style element: ${name}=${value}`,
      );
    }
  }

  ruleSets.push(...parseStylesheet(getCSS(styleElement), media));

  return ruleSets;
}

/**
 * @param {XastRoot} root
 */
export const getDocData = (root) => {
  /** @type {XastElement[]} */
  const styleElements = [];
  /** @type {CSSRuleSet[]} */
  const ruleSets = [];
  /** @type {Map<XastElement, XastParent>} */
  const parents = new Map();
  let styleError = false;
  let hasAnimations = false;
  let hasScripts = false;

  visit(root, {
    element: {
      enter: (node, parentNode) => {
        parents.set(node, parentNode);

        // Check all attributes for scripts.
        if (!hasScripts) {
          for (const attName of Object.keys(node.attributes)) {
            if (attName.startsWith('on')) {
              hasScripts = true;
            }
          }
          if (node.name === 'script') {
            hasScripts = true;
            return visitSkip;
          }
        }

        if (node.name === 'foreignObject') {
          return visitSkip;
        }
        if (elemsGroups.animation.has(node.name)) {
          hasAnimations = true;
          return visitSkip;
        }

        if (node.name !== 'style') {
          return;
        }

        styleElements.push(node);

        try {
          ruleSets.push(...getRuleSets(node));
        } catch (e) {
          if (e instanceof CSSParseError) {
            console.error(e.message);
          } else if (e instanceof Error) {
            console.error(e);
          }
          styleError = true;
        }
      },
    },
  });

  return new DocData(
    styleError ? null : new StyleData(styleElements, ruleSets),
    hasAnimations,
    hasScripts,
  );
};

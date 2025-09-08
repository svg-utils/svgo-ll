import * as csso from 'csso';
import {
  attrsGroups,
  geometryProperties,
  inheritableAttrs,
} from '../plugins/_collections.js';
import { findReferences } from './svgo/tools.js';
import { StyleAttValue } from './styleAttValue.js';
import { CSSParseError } from './css.js';
import { parseStylesheet } from './style-css-tree.js';
import { ChildDeletionQueue } from './svgo/childDeletionQueue.js';

export class StyleData {
  /** @type {{element:import('../lib/types.js').XastElement, ruleSets:import('./types.js').CSSRuleSet[]}[]} */
  #styleElements;
  /** @type {import('./types.js').CSSRule[]} */
  #sortedRules = [];
  /** @type {Set<string>|undefined} */
  #referencedClasses;

  /**
   * @param {import('../lib/types.js').XastElement[]} styleElements
   */
  constructor(styleElements) {
    this.#styleElements = styleElements.map((e) => {
      return {
        element: e,
        ruleSets: getRuleSets(e),
      };
    });
    this.#initData();
  }

  /**
   * @returns {import('./types.js').CSSRule[]}
   */
  #collectRules() {
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

    /** @type {import('./types.js').CSSRule[]} */
    const rules = [];
    for (const element of this.#styleElements) {
      for (const ruleSet of element.ruleSets) {
        rules.push(...ruleSet.getRules());
      }
    }

    rules.sort((a, b) =>
      compareSpecificity(a.getSpecificity(), b.getSpecificity()),
    );

    return rules;
  }

  /**
   * @param {import('../lib/types.js').XastParent} element
   * @param {Map<string,import('../lib/types.js').CSSPropertyValue>} [declarations]
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
        computedStyles.set(name, value.toString());
      } else {
        // See if it is a geometry property which applies to this element.
        const els = geometryProperties[name];
        if (els && els.has(element.name)) {
          computedStyles.set(name, value.toString());
        }
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
            const hasVars = value.value.toString().includes('var(');
            if (hasVars) {
              computedStyles.set(name, null);
            } else if (geometryProperties[name]) {
              // Support for geometry properties is inconsistent. Avoid changing these.
              computedStyles.set(name, null);
            } else {
              computedStyles.set(name, value.value.toString());
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
      const styleAttValue = StyleAttValue.getStyleAttValue(element);
      if (styleAttValue) {
        declarations = new Map(styleAttValue.entries());
      }
    }
    if (declarations) {
      declarations.forEach((value, name) => {
        if (geometryProperties[name]) {
          // Support for geometry properties is inconsistent. Avoid changing these.
          computedStyles.set(name, null);
        } else if (value.important || !importantProperties.has(name)) {
          computedStyles.set(name, value.value.toString());
        }
      });
    }

    return computedStyles;
  }

  /**
   * @param {{element:import('./types.js').XastParent,styles?:Map<string,string|null>}[]} parentList
   * @returns {Map<string,string|null>}
   */
  computeParentStyle(parentList) {
    /**
     * @param {StyleData} styleData
     * @param {number} index
     * @returns {Map<string,string|null>}
     */
    function getParentStyles(styleData, index) {
      const parent = parentList[index];
      if (!parent.styles) {
        parent.styles = styleData.computeOwnStyle(parent.element);
        if (index > 0) {
          StyleData.#mergeMissingProperties(
            parent.styles,
            getParentStyles(styleData, index - 1),
          );
        }
      }
      return parent.styles;
    }

    return getParentStyles(this, parentList.length - 1);
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {{element:import('./types.js').XastParent,styles?:Map<string,string|null>}[]} parentList
   * @param {Map<string,import('../lib/types.js').CSSPropertyValue>} [declarations]
   * @returns {Map<string,string|null>}
   */
  computeStyle(element, parentList, declarations) {
    const computedStyles = this.computeOwnStyle(element, declarations);

    // Fill in any missing properties from the parent.
    if (parentList.length) {
      const parentStyles = this.computeParentStyle(parentList);
      StyleData.#mergeMissingProperties(computedStyles, parentStyles);
    }

    return computedStyles;
  }

  /** @param {Set<import('./types.js').CSSRule>}  rules */
  deleteRules(rules) {
    if (rules.size === 0) {
      return;
    }
    for (const element of this.#styleElements) {
      for (const ruleSet of element.ruleSets) {
        ruleSet.deleteRules(rules);
      }
    }
    this.#initData();
  }

  /**
   * @returns {Set<import('./types.js').CSSFeatures>}
   */
  getFeatures() {
    return this.#styleElements.reduce((features, st) => {
      st.ruleSets.reduce((features, rs) => {
        rs.getFeatures().forEach((f) => features.add(f));
        return features;
      }, features);
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
        ids.push(...findReferences('style', value.value.toString())),
      );
    }
    return ids;
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
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
   * @returns {Map<string,import('./types.js').CSSRule[]>}
   */
  getReferencedIds() {
    /** @type {Map<string,import('./types.js').CSSRule[]>} */
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
    return this.#styleElements.some((st) =>
      st.ruleSets.some((rs) => rs.hasAtRules()),
    );
  }

  /**
   * @param {string} [attName]
   */
  hasAttributeSelector(attName) {
    for (const element of this.#styleElements) {
      for (const ruleSet of element.ruleSets) {
        if (ruleSet.hasAttributeSelector(attName)) {
          return true;
        }
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
   * @param {string} id
   * @returns {boolean}
   */
  hasIdSelector(id) {
    for (const element of this.#styleElements) {
      for (const ruleSet of element.ruleSets) {
        if (ruleSet.hasIdSelector(id)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * @param {import('./types.js').CSSFeatures[]} features
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
   * @param {string} type
   * @returns {boolean}
   */
  hasTypeSelector(type) {
    for (const element of this.#styleElements) {
      for (const ruleSet of element.ruleSets) {
        if (ruleSet.hasTypeSelector(type)) {
          return true;
        }
      }
    }
    return false;
  }

  #initData() {
    this.#sortedRules = this.#collectRules();
    this.#referencedClasses = undefined;
  }

  /**
   * @param {Map<string,import('../lib/types.js').SVGAttValue|null>} currentStyles
   * @param {Map<string,import('../lib/types.js').SVGAttValue|null>} parentStyles
   */
  static #mergeMissingProperties(currentStyles, parentStyles) {
    parentStyles.forEach((value, name) => {
      if (inheritableAttrs.has(name) && !currentStyles.has(name)) {
        currentStyles.set(name, value);
      }
    });
  }

  mergeStyles() {
    /**
     * @param {import('../lib/types.js').XastElement} element
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
      const data = gatherCSS(element.element);
      css += data.css;
      if (data.type === 'cdata') {
        childType = 'cdata';
      }
    }

    const firstStyleData = this.#styleElements[0];
    const element = firstStyleData.element;
    element.children = [{ type: childType, parentNode: element, value: css }];

    const childrenToDelete = new ChildDeletionQueue();

    // Remove all but the first element.
    for (let index = 1; index < this.#styleElements.length; index++) {
      const element = this.#styleElements[index].element;
      childrenToDelete.add(element);
    }

    // If the first element is empty, remove it as well.
    if (css.trim() === '') {
      childrenToDelete.add(element);
      childrenToDelete.delete();
      this.#styleElements = [];
      return;
    }

    // If there's a media attribute on the first element, remove it.
    delete element.attributes['media'];

    this.#styleElements = [firstStyleData];
    childrenToDelete.delete();
  }

  /**
   * @param {csso.Usage} cssoUsage
   */
  minifyStyles(cssoUsage) {
    const childrenToDelete = new ChildDeletionQueue();
    const newStyleElements = [];

    for (const styleElement of this.#styleElements) {
      if (styleElement.element.children.length === 0) {
        childrenToDelete.add(styleElement.element);
        continue;
      }

      const minified = csso.minify(getCSS(styleElement.element), {
        usage: cssoUsage,
      }).css;

      if (minified.length === 0) {
        childrenToDelete.add(styleElement.element);
        continue;
      }

      const type =
        minified.indexOf('<') > 0 || minified.indexOf('&') > 0
          ? 'cdata'
          : 'text';
      styleElement.element.children = [
        { type: type, parentNode: styleElement.element, value: minified },
      ];

      styleElement.ruleSets = getRuleSets(styleElement.element);
      newStyleElements.push(styleElement);
    }

    childrenToDelete.delete();
    this.#styleElements = newStyleElements;
    this.#initData();
  }

  /**
   * @param {Map<string,import('./types.js').CSSRule[]>} styleElementIds
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
      const styleElementData = this.#styleElements[index];
      const element = styleElementData.element;
      const css = styleElementData.ruleSets
        .map((rs) => rs.getString())
        .join('');
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

/**
 * @param {import('../lib/types.js').XastElement} styleElement
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
 * @param {import('../lib/types.js').XastElement} styleElement
 * @returns {import('../lib/types.js').CSSRuleSet[]}
 */
function getRuleSets(styleElement) {
  /** @type {import('./types.js').CSSRuleSet[]} */
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

  ruleSets.push(
    ...parseStylesheet(
      getCSS(styleElement),
      media ? media.toString() : undefined,
    ),
  );

  return ruleSets;
}

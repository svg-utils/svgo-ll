/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 * @typedef {import('../lib/types.js').XastParent} XastParent
 * @typedef {import('../lib/types.js').CSSRule} CSSRule
 */

import { writeStyleAttribute } from '../lib/style.js';

export const name = 'inlineStyles';
export const description =
  'Move properties in <style> elements to style attributes';

/**
 * @type {import('./plugins-types.js').Plugin<'inlineStyles'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<CSSRule,XastElement[]>} */
  const elementsPerRule = new Map();
  /** @type {Map<XastElement,CSSRule[]>} */
  const rulesPerElement = new Map();

  /**
   * @param {CSSRule} rule
   * @param {XastElement} element
   */
  function addElementToRule(rule, element) {
    if (rule.hasPseudos()) {
      // Don't inline anything with a pseudo-class or pseudo-element.
      return;
    }
    const elements = elementsPerRule.get(rule);
    if (elements) {
      elements.push(element);
    } else {
      elementsPerRule.set(rule, [element]);
    }
  }

  /**
   * @param {CSSRule} rule
   * @param {XastElement} element
   */
  function addRuleToElement(rule, element) {
    const rules = rulesPerElement.get(element);
    if (rules) {
      rules.push(rule);
    } else {
      rulesPerElement.set(element, [rule]);
    }
  }

  return {
    element: {
      enter: (element) => {
        const matchingRules = styleData.getMatchingRules(element);
        for (const rule of matchingRules) {
          addElementToRule(rule, element);
          addRuleToElement(rule, element);
        }
      },
    },

    root: {
      exit: () => {
        const rulesToDelete = new Set();

        for (const [rule, elements] of elementsPerRule.entries()) {
          if (elements.length === 1) {
            const element = elements[0];
            // Only move if there's a single matching rule, and the element doesn't have a style currently.
            if (
              !element.attributes.style &&
              // @ts-ignore - there should always be an entry in rulesPerElement
              rulesPerElement.get(element).length === 1
            ) {
              writeStyleAttribute(element, rule.getDeclarations());
              rulesToDelete.add(rule);
            }
          }
        }

        if (rulesToDelete.size > 0) {
          styleData.deleteRules(rulesToDelete);
          styleData.writeRules();
        }
      },
    },
  };
};

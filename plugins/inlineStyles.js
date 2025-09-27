import { ClassValue } from '../lib/attrs/classValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { updateStyleAttribute } from '../lib/svgo/tools.js';

export const name = 'inlineStyles';
export const description =
  'Move properties in <style> elements to style attributes';

/**
 * @type {import('./plugins-types.js').Plugin<'inlineStyles'>}
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<import('../lib/types.js').CSSRule,import('../lib/types.js').XastElement[]>} */
  const elementsPerRule = new Map();
  /** @type {Map<import('../lib/types.js').XastElement,import('../lib/types.js').CSSRule[]>} */
  const rulesPerElement = new Map();

  /**
   * @param {import('../lib/types.js').CSSRule} rule
   * @param {import('../lib/types.js').XastElement} element
   */
  function addElementToRule(rule, element) {
    if (rule.isInMediaQuery() || rule.hasPseudos()) {
      // Don't inline anything in a media query, or with a pseudo-class or pseudo-element.
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
   * @param {import('../lib/types.js').CSSRule} rule
   * @param {import('../lib/types.js').XastElement} element
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

        const classAttsToCheck = new Set();

        for (const [rule, elements] of elementsPerRule.entries()) {
          if (elements.length === 1) {
            const element = elements[0];
            // Only move if there's a single matching rule, and the element doesn't have a style currently.
            if (
              !element.attributes.style &&
              // @ts-ignore - there should always be an entry in rulesPerElement
              rulesPerElement.get(element).length === 1
            ) {
              updateStyleAttribute(
                element,
                new StyleAttValue(rule.getDeclarations()),
              );
              rulesToDelete.add(rule);

              classAttsToCheck.add(element);
            }
          }
        }

        if (rulesToDelete.size > 0) {
          styleData.deleteRules(rulesToDelete);
          styleData.writeRules();

          // If any class attributes are no longer referenced in the styles, delete them.
          for (const element of classAttsToCheck.values()) {
            const cv = ClassValue.getAttValue(element);
            if (
              cv &&
              cv.getClassNames().length === 1 &&
              !styleData.hasClassReference(cv.getClassNames()[0])
            ) {
              delete element.attributes.class;
            }
          }
        }
      },
    },
  };
};

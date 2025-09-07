import { elemsGroups } from '../plugins/_collections.js';
import { CSSParseError } from './css.js';
import { getRuleSets, StyleData } from './styleData.js';
import { visit, visitSkip } from './xast.js';

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
 * @param {import('../lib/types.js').XastRoot} root
 */
export const getDocData = (root) => {
  /** @type {import('../lib/types.js').XastElement[]} */
  const styleElements = [];
  /** @type {import('./types.js').CSSRuleSet[]} */
  const ruleSets = [];
  let styleError = false;
  let hasAnimations = false;
  let hasScripts = false;

  visit(root, {
    element: {
      enter: (element) => {
        // Check all attributes for scripts.
        if (!hasScripts) {
          for (const attName of Object.keys(element.attributes)) {
            if (attName.startsWith('on')) {
              hasScripts = true;
            }
          }
          if (element.name === 'script') {
            hasScripts = true;
            return visitSkip;
          }
        }

        if (element.name === 'foreignObject') {
          return visitSkip;
        }
        if (elemsGroups.animation.has(element.name)) {
          hasAnimations = true;
          return visitSkip;
        }

        if (element.name !== 'style') {
          return;
        }

        styleElements.push(element);

        try {
          ruleSets.push(...getRuleSets(element));
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
    styleError ? null : new StyleData(root, styleElements, ruleSets),
    hasAnimations,
    hasScripts,
  );
};

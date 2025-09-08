import { elemsGroups } from '../plugins/_collections.js';
import { CSSParseError } from './css.js';
import { StyleData } from './styleData.js';
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
 * @returns {DocData}
 */
export const getDocData = (root) => {
  /** @type {import('../lib/types.js').XastElement[]} */
  const styleElements = [];
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
      },
    },
  });

  let styleData = null;
  try {
    styleData = new StyleData(styleElements);
  } catch (e) {
    if (e instanceof CSSParseError) {
      console.error(e.message);
    } else if (e instanceof Error) {
      console.error(e);
    }
  }
  return new DocData(styleData, hasAnimations, hasScripts);
};

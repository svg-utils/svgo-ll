import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import {
  deleteOtherAtt,
  getXmlNSAtt,
  hasAttributes,
} from '../lib/tools-ast.js';

export const name = 'cleanupTextElements';
export const description = 'simplify <text> elements and content';

/** @type {import('./plugins-types.js').Plugin<'cleanupTextElements'>} */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<import('../lib/types.js').XastParent,Set<import('../lib/types.js').XastElement>>} */
  const textElsToHoist = new Map();

  const childrenToDelete = new ChildDeletionQueue();

  return {
    element: {
      exit: (element) => {
        if (element.uri !== undefined || element.local !== 'text') {
          return;
        }

        if (isEmpty(element)) {
          childrenToDelete.add(element);
          return;
        }

        // Remove xml:space= if possible.
        const att = canRemoveXmlSpace(element);
        if (att) {
          deleteOtherAtt(element, att);
        }

        const wsProp = getWhitespaceProperty(element);

        switch (wsProp) {
          case 'default':
            processChildWhiteSpaceDefault(element);
            break;
        }

        // If there is a single child whose content can be hoisted, do so.
        const hoistableChild = getHoistableChild(element);
        if (hoistableChild) {
          element.children = hoistableChild.children;
          for (const child of element.children) {
            child.parentNode = element;
          }
          for (const attributeName of ['x', 'y']) {
            const att = hoistableChild.svgAtts.get(attributeName);
            if (att !== undefined) {
              element.svgAtts.set(attributeName, att);
            }
          }
          // Update style attribute.
          const childStyleAttValues = StyleAttValue.getAttValue(hoistableChild);
          if (childStyleAttValues) {
            const parentStyleAttValues = StyleAttValue.getAttValue(element);
            if (parentStyleAttValues) {
              for (const [k, v] of childStyleAttValues.entries()) {
                parentStyleAttValues.set(k, v);
              }
            } else {
              childStyleAttValues.updateElement(element);
            }
          }
        }

        // If the <text> element has x/y, and so do all children, remove x/y from <text>.
        if (
          element.svgAtts.get('x') !== undefined &&
          element.svgAtts.get('y') !== undefined &&
          childrenAllHaveXY(element)
        ) {
          element.svgAtts.delete('x');
          element.svgAtts.delete('y');
        }

        // If the <text> has no attributes, and all of the children can be hoisted, add this element to the list to be updated
        // at the end.
        if (!hasAttributes(element)) {
          if (
            element.parentNode.type === 'element' &&
            element.parentNode.local !== 'switch'
          ) {
            if (
              element.children.every(
                (child) => isHoistable(child) !== undefined,
              )
            ) {
              let textEls = textElsToHoist.get(element.parentNode);
              if (!textEls) {
                textEls = new Set();
                textElsToHoist.set(element.parentNode, textEls);
              }
              textEls.add(element);
            }
          }
        }
      },
    },
    root: {
      exit: () => {
        for (const [parent, textEls] of textElsToHoist.entries()) {
          /** @type {import('../lib/types.js').XastChild[]} */
          const newChildren = [];
          for (const child of parent.children) {
            if (child.type !== 'element' || !textEls.has(child)) {
              newChildren.push(child);
              continue;
            }
            // Promote all children to <text> elements.
            for (const textChild of child.children) {
              if (textChild.type !== 'element') {
                throw new Error();
              }
              textChild.parentNode = parent;
              textChild.local = 'text';
              newChildren.push(textChild);
            }
          }
          parent.children = newChildren;
        }

        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function isEmpty(element) {
  if (element.local !== 'text' && element.local !== 'tspan') {
    return false;
  }
  for (const child of element.children) {
    if (child.type === 'text') {
      if (!/^\s*$/.test(child.value)) {
        return false;
      }
    } else if (child.type === 'element') {
      if (!isEmpty(child)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').XastAttOther|undefined}
 */
function canRemoveXmlSpace(element) {
  const att = getXmlNSAtt(element, 'space');
  if (att === undefined) {
    return;
  }
  if (att.value !== 'preserve') {
    return att.value === 'default' ? att : undefined;
  }

  if (element.children.length !== 1) {
    // Remove if all children are <tspan>s with absolute positioning.
    for (const child of element.children) {
      if (
        child.type !== 'element' ||
        child.uri !== undefined ||
        child.local !== 'tspan' ||
        !childHasXY(child)
      ) {
        return;
      }
      if (child.children.length !== 1) {
        return;
      }
      const text = child.children[0];
      if (text.type !== 'text' || hasSignificantWhiteSpace(text.value)) {
        return;
      }
    }
    return att;
  }

  // A single child; if it is a text node, see if the whitespace is necessary.
  const child = element.children[0];
  if (child.type !== 'text') {
    return;
  }
  return hasSignificantWhiteSpace(child.value) ? undefined : att;
}

/**
 * @param {import('../lib/types.js').XastChild} child
 * @returns {boolean}
 */
function childHasXY(child) {
  if (child.type !== 'element') {
    return false;
  }
  if (child.local !== 'tspan') {
    return false;
  }
  if (
    child.svgAtts.get('x') === undefined ||
    child.svgAtts.get('y') === undefined
  ) {
    return false;
  }
  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function childrenAllHaveXY(element) {
  for (const child of element.children) {
    if (!childHasXY(child)) {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').XastElement|undefined}
 */
function getHoistableChild(element) {
  if (element.children.length !== 1) {
    return;
  }
  const child = element.children[0];
  return isHoistable(child);
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {"default"|"preserve"}
 */
function getWhitespaceProperty(element) {
  const att = getXmlNSAtt(element, 'space');
  if (att && att.value === 'preserve') {
    return 'preserve';
  }
  return 'default';
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function hasSignificantWhiteSpace(str) {
  return /^\s/.test(str) || /\s$/.test(str) || /\s\s/.test(str);
}

/**
 * @param {import('../lib/types.js').XastChild} child
 * @returns {import('../lib/types.js').XastElement|undefined}
 */
function isHoistable(child) {
  if (child.type !== 'element') {
    return;
  }
  if (child.children.length !== 1) {
    return;
  }
  if (child.children[0].type !== 'text') {
    return;
  }
  for (const attributeName of child.svgAtts.keys()) {
    switch (attributeName) {
      case 'style':
      case 'x':
      case 'y':
        break;
      default:
        return;
    }
  }
  return child;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function processChildWhiteSpaceDefault(element) {
  for (let index = 0; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type === 'text') {
      child.value = child.value.replaceAll(/\s+/g, ' ');
    }
  }
}

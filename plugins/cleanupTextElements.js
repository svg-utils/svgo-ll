import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';

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
        if (canRemoveXmlSpace(element)) {
          delete element.attributes['xml:space'];
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
            if (hoistableChild.attributes[attributeName] !== undefined) {
              element.attributes[attributeName] =
                hoistableChild.attributes[attributeName];
            }
          }
          // Update style attribute.
          const childStyleAttValues =
            StyleAttValue.getStyleAttValue(hoistableChild);
          if (childStyleAttValues) {
            const parentStyleAttValues =
              StyleAttValue.getStyleAttValue(element);
            if (parentStyleAttValues) {
              for (const [k, v] of childStyleAttValues.entries()) {
                parentStyleAttValues.set(k, v);
              }
            } else {
              element.attributes.style = childStyleAttValues;
            }
          }
        }

        // If the <text> element has x/y, and so do all children, remove x/y from <text>.
        if (
          element.attributes.x !== undefined &&
          element.attributes.y !== undefined &&
          childrenAllHaveXY(element)
        ) {
          delete element.attributes.x;
          delete element.attributes.y;
        }

        // If the <text> has no attributes, and all of the children can be hoisted, add this element to the list to be updated
        // at the end.
        if (Object.keys(element.attributes).length === 0) {
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
              textChild.name =
                textChild.prefix === '' ? 'text' : `${textChild.prefix}:text`;
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
 * @returns {boolean}
 */
function canRemoveXmlSpace(element) {
  const value = element.attributes['xml:space'];
  if (value === undefined) {
    return false;
  }
  if (value === 'preserve') {
    if (element.children.length !== 1) {
      return false;
    }
    const child = element.children[0];
    if (child.type !== 'text') {
      return false;
    }
    return (
      !/^\s/.test(child.value) &&
      !/\s$/.test(child.value) &&
      !/\s\s/.test(child.value)
    );
  }
  return value === 'default';
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
  if (child.attributes.x === undefined || child.attributes.y === undefined) {
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
  if (element.attributes['xml:space'] === 'preserve') {
    return 'preserve';
  }
  return 'default';
}

/**
 * @param {string} str
 * @returns {boolean}
 */
export function hasSignificantWhiteSpace(str) {
  let isStart = true;
  let lastIsSpace = false;
  for (const char of str) {
    switch (char) {
      case ' ':
      case '\n':
      case '\t':
        if (!isStart) {
          // Consecutive space within text is significant.
          if (lastIsSpace) {
            return true;
          }
        }
        lastIsSpace = true;
        break;
      default:
        if (isStart) {
          if (lastIsSpace) {
            // There is space at beginning of string.
            return true;
          }
          isStart = false;
        }
        lastIsSpace = false;
        break;
    }
  }
  if (isStart) {
    return false;
  }
  return lastIsSpace;
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
  for (const attributeName of Object.keys(child.attributes)) {
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

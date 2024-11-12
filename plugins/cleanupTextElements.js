import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';

export const name = 'cleanupTextElements';
export const description = 'simplify <text> elements and content';

/**
 * @type {import('./plugins-types.js').Plugin<'cleanupTextElements'>}
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasStyles()
  ) {
    return;
  }

  /** @type {Map<import('./inlineStyles.js').XastParent,Set<import('./collapseGroups.js').XastElement>>} */
  const textElsToHoist = new Map();

  return {
    element: {
      exit: (element) => {
        if (element.name !== 'text') {
          return;
        }

        // Remove xml:space="preserve" if possible.
        if (element.attributes['xml:space'] === 'preserve') {
          if (canRemovePreserve(element)) {
            delete element.attributes['xml:space'];
          }
        }

        // Remove any pure whitespace children.
        const childrenToDelete = new Set();
        for (const child of element.children) {
          switch (child.type) {
            case 'cdata':
            case 'text':
              if (isOnlyWhiteSpace(child.value)) {
                childrenToDelete.add(child);
              }
              break;
          }
        }
        if (childrenToDelete.size > 0) {
          element.children = element.children.filter(
            (c) => !childrenToDelete.has(c),
          );
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
          const childDeclarations = getStyleDeclarations(hoistableChild);
          if (childDeclarations) {
            const parentDeclarations = getStyleDeclarations(element);
            if (parentDeclarations) {
              for (const [k, v] of childDeclarations) {
                parentDeclarations.set(k, v);
              }
              writeStyleAttribute(element, parentDeclarations);
            } else {
              writeStyleAttribute(element, childDeclarations);
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
            element.parentNode.name !== 'switch'
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
              textChild.name = 'text';
              newChildren.push(textChild);
            }
          }
          parent.children = newChildren;
        }
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function canRemovePreserve(element) {
  for (const child of element.children) {
    switch (child.type) {
      case 'cdata':
      case 'text':
        if (hasSignificantWhiteSpace(child.value)) {
          return false;
        }
        break;
      case 'element':
        switch (child.name) {
          case 'tspan':
            if (!canRemovePreserve(child)) {
              return false;
            }
            break;
          default:
            return false;
        }
        break;
    }
  }
  return true;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {boolean}
 */
function childrenAllHaveXY(element) {
  for (const child of element.children) {
    if (child.type !== 'element') {
      return false;
    }
    if (child.name !== 'tspan') {
      return false;
    }
    if (child.attributes.x === undefined || child.attributes.y === undefined) {
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
          // Consective space within text is significant.
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
 * @returns {import('./collapseGroups.js').XastElement|undefined}
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
 * @param {string} str
 * @returns {boolean}
 */
function isOnlyWhiteSpace(str) {
  for (const char of str) {
    switch (char) {
      case ' ':
      case '\n':
      case '\t':
        continue;
      default:
        return false;
    }
  }
  return true;
}

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

        // If there is a single child whose content can be hosted, do so.
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
 * @returns {import('../lib/types.js').XastElement|undefined}
 */
function getHoistableChild(element) {
  if (element.children.length !== 1) {
    return;
  }
  const child = element.children[0];
  if (child.type !== 'element') {
    return;
  }
  if (element.children.length !== 1) {
    return;
  }
  if (child.children[0].type !== 'text') {
    return;
  }
  for (const attributeName of Object.keys(child.attributes)) {
    switch (attributeName) {
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

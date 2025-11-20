import { LengthPercentageAttValue } from '../lib/attrs/lengthPercentageAttValue.js';
import { parsePathCommands, PathParseError } from '../lib/pathutils.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getEllipseProperties } from '../lib/svgo/tools.js';
import { deleteAllAtts } from '../lib/tools-ast.js';
import { elemsGroups } from './_collections.js';

export const name = 'removeHiddenElems';
export const description =
  'removes non-rendered elements that are not referenced';

/**
 * @see https://svgwg.org/svg2-draft/render.html#TermNeverRenderedElement
 * @type {import('./plugins-types.js').Plugin<'removeHiddenElems'>}
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasOnlyFeatures([
      'class-selectors',
      'id-selectors',
      'type-selectors',
      'attribute-selectors',
    ])
  ) {
    return;
  }

  // Record which elements to delete, sorted by parent.
  const childrenToDelete = new ChildDeletionQueue();

  /** @type {import('../lib/types.js').XastElement[]} */
  const nonRenderingStack = [];

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function convertToDefs(element) {
    element.local = 'defs';
    deleteAllAtts(element);
    processDefsChildren(element);
    if (element.children.length === 0) {
      // If there are no children, delete the element; otherwise it may limit opportunities for compression of siblings.
      removeElement(element);
    }
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function removeElement(element) {
    childrenToDelete.add(element);
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   */
  function removeUndisplayedElement(element) {
    if (element.local === 'g') {
      // It may contain referenced elements; treat it as <defs>.
      convertToDefs(element);
    } else {
      removeElement(element);
    }
  }

  /**
   * @param {import('../lib/types.js').XastElement} element
   * @param {Map<string,string|null>} properties
   * @returns {boolean}
   */
  function removeEmptyShapes(element, properties) {
    switch (element.local) {
      case 'circle':
        if (properties.get('r') === '0' && !isAnimated(element)) {
          removeElement(element);
          return true;
        }
        return false;
      case 'ellipse':
        {
          // Ellipse with zero radius -- https://svgwg.org/svg2-draft/geometry.html#RxProperty
          // @ts-ignore
          const props = getEllipseProperties(properties);
          if (props === undefined) {
            return false;
          }
          if (
            element.children.length === 0 &&
            (props.rx === '0' || props.ry === '0')
          ) {
            removeElement(element);
            return true;
          }
        }
        return false;
      case 'path': {
        const d = properties.get('d');
        if (d === null) {
          return false;
        }
        if (!d) {
          removeElement(element);
          return true;
        }
        try {
          const commands = parsePathCommands(d.toString(), 2);
          if (commands.length === 1) {
            if (properties.get('marker-end') !== undefined) {
              return false;
            }
            removeElement(element);
            return true;
          }
        } catch (error) {
          if (error instanceof PathParseError) {
            console.warn(error.message);
            return false;
          }
          throw error;
        }
        return false;
      }
      case 'rect':
        {
          const width = LengthPercentageAttValue.getAttValue(element, 'width');
          const height = LengthPercentageAttValue.getAttValue(
            element,
            'height',
          );
          // https://svgwg.org/svg2-draft/shapes.html#RectElement
          if (
            element.children.length === 0 &&
            (width === undefined ||
              height === undefined ||
              width.toString() === '0' ||
              height.toString() === '0')
          ) {
            removeElement(element);
            return true;
          }
        }
        break;
    }

    return false;
  }

  return {
    element: {
      enter: (element, parentList) => {
        if (element.uri !== undefined) {
          return;
        }

        if (element.local === 'defs') {
          processDefsChildren(element);
          return;
        }

        // Process non-rendering elements.
        if (elemsGroups.nonRendering.has(element.local)) {
          if (element.svgAtts.get('id') === undefined) {
            // If the element doesn't have an id, it can't be referenced; but it may contain referenced elements. Change it to <defs>.
            convertToDefs(element);
          } else {
            nonRenderingStack.push(element);
          }
          return;
        }

        if (element.svgAtts.get('id')) {
          // Never delete elements with an id.
          return;
        }

        const properties = styleData.computeStyle(element, parentList);
        if (!properties) {
          return;
        }

        if (removeEmptyShapes(element, properties)) {
          return;
        }

        // Remove any rendering elements which are not visible.

        const display = properties.get('display');
        if (
          display === 'none' &&
          // markers with display: none still rendered
          element.local !== 'marker'
        ) {
          removeUndisplayedElement(element);
          return;
        }

        if (nonRenderingStack.length === 0) {
          // Don't delete elements with opacity 0 which are in a non-rendering element.
          const opacity = properties.get('opacity');
          if (opacity === '0') {
            removeUndisplayedElement(element);
            return;
          }
        }
      },
      exit: (element) => {
        if (elemsGroups.nonRendering.has(element.local)) {
          nonRenderingStack.pop();
        }
      },
    },
    root: {
      exit: () => {
        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastChild} child
 * @returns {import('../lib/types.js').XastChild[]}
 */
function getChildrenWithIds(child) {
  switch (child.type) {
    case 'comment':
      return [child];
    case 'element':
      if (child.svgAtts.get('id') !== undefined) {
        return [child];
      }
      break;
    default:
      return [];
  }

  // Preserve styles and scripts with no id.
  switch (child.local) {
    case 'script':
    case 'style':
      return [child];
  }

  // It's an element with no id; return its children which have ids.
  const children = [];
  for (const grandchild of child.children) {
    children.push(...getChildrenWithIds(grandchild));
  }
  return children;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function isAnimated(element) {
  // TODO: fix this - it doesn't really tell whether the element is animated, and doesn't handle the case of the animation being somewhere
  // besdides within the element.
  return element.children.length !== 0;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 */
function processDefsChildren(element) {
  /** @type {import('../lib/types.js').XastChild[]} */
  const children = [];

  // Make sure all children of <defs> have an id; otherwise they can't be rendered. If a child doesn't have an id, delete it and move up
  // its children so they are immediate children of the <defs>.
  for (const child of element.children) {
    children.push(...getChildrenWithIds(child));
  }
  children.forEach((c) => (c.parentNode = element));
  element.children = children;
}

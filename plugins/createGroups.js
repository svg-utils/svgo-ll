import { svgSetAttributeValue } from '../lib/svg-parse-att.js';
import { cssGetTransform } from '../lib/css-parse-decl.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { ExactNum } from '../lib/exactnum.js';
import { svgGetTransform, svgToString } from '../lib/svg-parse-att.js';
import { getHrefId } from '../lib/svgo/tools.js';
import { inheritableAttrs } from './_collections.js';

export const name = 'createGroups';
export const description =
  'Create groups if common properties can be moved to group';

const TRANSFORM_PROP_NAMES = ['transform', 'transform-origin'];

/**
 * @type {import('./plugins-types.js').Plugin<'createGroups'>}
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

  /** @type {Set<import('../lib/types.js').XastElement>} */
  const elementsToCheck = new Set();

  /** @type {Set<string>} */
  const usedIds = new Set();

  return {
    element: {
      enter: (element) => {
        switch (element.name) {
          case 'g':
          case 'svg':
            elementsToCheck.add(element);
            break;
          case 'use':
            {
              const id = getHrefId(element);
              if (id) {
                usedIds.add(id);
              }
            }
            break;
        }
      },
    },
    root: {
      exit: () => {
        elementsToCheck.forEach((e) =>
          createGroups(e, usedIds, elementsToCheck),
        );
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Set<string>} usedIds
 * @param {Set<import('./cleanupIds.js').XastElement>} elementsToCheck
 */
function createGroups(element, usedIds, elementsToCheck) {
  if (element.children.length < 2) {
    return;
  }

  /**
   * @param {number} index
   */
  function writeGroup(index) {
    const groupSize = index - sharedPropStart;
    const shouldCreateGroup = sharedProps.size > 0 && groupSize > 1;
    if (newChildren.length === 0 && !shouldCreateGroup) {
      // No groups have been written yet, and there is no reason to write one here.
      return;
    }

    if (!shouldCreateGroup) {
      if (index === element.children.length) {
        // This is the final group; write any ungrouped children.
        newChildren.push(...element.children.slice(ungroupedStart));
      }
      return;
    }

    // Copy any ungrouped children to newChildren.
    newChildren.push(
      ...element.children.slice(ungroupedStart, sharedPropStart),
    );
    const groupChildren = element.children.slice(sharedPropStart, index);
    /** @type {import('../lib/types.js').XastElement} */
    const groupElement = {
      type: 'element',
      parentNode: element,
      name: 'g',
      attributes: {},
      children: groupChildren,
    };

    // Add styles to group.
    const attTransform = transformCSSToAttr(sharedProps.get('transform'));
    if (attTransform) {
      // Add transform as an attribute.
      sharedProps.delete('transform');
    }
    writeStyleAttribute(groupElement, sharedProps);

    // Remove properties from children.
    groupChildren.forEach((c) => {
      c.parentNode = groupElement;
      if (c.type !== 'element') {
        return;
      }
      const decls = getStyleDeclarations(c);

      for (const name of sharedProps.keys()) {
        delete c.attributes[name];
        if (decls) {
          decls.delete(name);
        }
      }
      if (attTransform) {
        delete c.attributes['transform'];
        if (decls) {
          decls.delete('transform');
        }
      }
      if (decls) {
        writeStyleAttribute(c, decls);
      }
    });

    // Add transform attribute.
    if (attTransform) {
      svgSetAttributeValue(groupElement, 'transform', attTransform);
    }
    newChildren.push(groupElement);

    ungroupedStart = index;
  }

  /** @type {import('../lib/types.js').XastChild[]} */
  const newChildren = [];

  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  let sharedProps = new Map();
  /** @type {Set<string>} */
  let transformProps = new Set();
  let sharedPropStart = 0;
  let ungroupedStart = 0;

  let index = 0;
  for (; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element') {
      // Any non-elements can be included in the group.
      continue;
    }

    if (usedIds.has(child.attributes.id)) {
      // If the element is <use>d, we can't move any properties to a group, so it needs to be on its own.
      writeGroup(index);
      sharedProps = new Map();
      transformProps = new Set();
      sharedPropStart = index;
      continue;
    }

    const currentChildProps = getInheritableProperties(child);
    // Record which transform properties are present.
    TRANSFORM_PROP_NAMES.forEach((name) => {
      if (currentChildProps.has(name)) {
        transformProps.add(name);
      }
    });

    if (sharedProps.size === 0) {
      sharedProps = currentChildProps;
      sharedPropStart = index;
      continue;
    }

    /** @type {import('../lib/types.js').CSSDeclarationMap} */
    const newSharedProps = new Map();

    // Copy any common shared properties.
    for (const [k, v] of sharedProps.entries()) {
      const currentProp = currentChildProps.get(k);
      if (currentProp && currentProp.value === v.value) {
        newSharedProps.set(k, v);
      }
    }

    // If both transform properties are present, either move them both or neither.
    if (
      transformProps.size === 2 &&
      !TRANSFORM_PROP_NAMES.every((name) => newSharedProps.has(name))
    ) {
      TRANSFORM_PROP_NAMES.forEach((name) => newSharedProps.delete(name));
    }

    if (newSharedProps.size > 0) {
      // There are still some common properties, try the next child.
      sharedProps = newSharedProps;
      continue;
    }

    // There are no more common properties. Add the previous set of children to a group, and start a new set of common properties.
    // Copy any ungrouped children to newChildren.
    writeGroup(index);
    sharedProps = currentChildProps;
    sharedPropStart = index;
  }

  // Write any remaining children and the last group.
  writeGroup(index);

  // Update the children if any groups were created.
  if (newChildren.length) {
    element.children = newChildren;
    // See if the new groups can be split further.
    for (const child of element.children) {
      if (
        child.type === 'element' &&
        child.name === 'g' &&
        !elementsToCheck.has(child)
      ) {
        createGroups(child, usedIds, elementsToCheck);
      }
    }
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @returns {import('../lib/types.js').CSSDeclarationMap}
 */
function getInheritableProperties(element) {
  /** @type {import('../lib/types.js').CSSDeclarationMap} */
  const props = new Map();

  // Gather all inheritable attributes.
  for (const [k, v] of Object.entries(element.attributes)) {
    const value = getSVGAttributeValue(v);
    if (inheritableAttrs.has(k)) {
      props.set(k, { value: svgToString(value), important: false });
    } else if (k === 'transform') {
      const cssValue = transformAttrToCSS(value);
      if (cssValue) {
        props.set(k, cssValue);
      }
    } else if (TRANSFORM_PROP_NAMES.includes(k)) {
      props.set(k, { value: svgToString(value), important: false });
    }
  }

  // Overwrite with inheritable properties.
  const styleProps = getStyleDeclarations(element);
  if (styleProps) {
    styleProps.forEach((v, k) => {
      if (inheritableAttrs.has(k) || TRANSFORM_PROP_NAMES.includes(k)) {
        if (v === null) {
          props.delete(k);
        } else {
          props.set(k, v);
        }
      }
    });
  }

  return props;
}

/**
 * @param {string|import('../lib/types.js').SVGAttValue} v
 * @returns {import('../lib/types.js').SVGAttValue}
 */
function getSVGAttributeValue(v) {
  if (typeof v === 'string') {
    return { strVal: v };
  }
  return v;
}

/**
 * @param {import('../lib/types.js').SVGAttValue} attValue
 * @returns {import('../lib/types.js').CSSPropertyValue|undefined}
 */
function transformAttrToCSS(attValue) {
  const svgTransforms = svgGetTransform(attValue);
  if (svgTransforms === null) {
    return;
  }
  /** @type {import('../lib/types-css-decl.js').CSSTransformFn[]} */
  const cssTransforms = [];
  for (const t of svgTransforms) {
    switch (t.name) {
      case 'rotate':
        cssTransforms.push({
          name: 'rotate',
          a: { n: t.a.getValue(), unit: 'deg' },
        });
        break;
      default:
        throw new Error();
    }
  }
  // @ts-ignore - remove ignore once string value is optional in CSSPropertyValue
  return {
    parsedValue: { type: 'transform', value: cssTransforms },
    important: false,
  };
}

/**
 * @param {import('../lib/types.js').CSSPropertyValue|undefined} cssValue
 * @returns {import('../lib/types.js').SVGAttValue|undefined}
 */
function transformCSSToAttr(cssValue) {
  if (!cssValue) {
    return;
  }
  const cssTransforms = cssGetTransform(cssValue);
  if (cssTransforms === null) {
    return;
  }
  /** @type {import('../lib/types-svg-attr.js').SVGTransformFn[]} */
  const svgTransforms = [];
  for (const cssTransform of cssTransforms) {
    switch (cssTransform.name) {
      case 'rotate':
        if (cssTransform.a.unit !== 'deg') {
          return;
        }
        svgTransforms.push({
          name: 'rotate',
          a: new ExactNum(cssTransform.a.n),
          tx: ExactNum.zero(),
          ty: ExactNum.zero(),
        });
        break;
      default:
        return;
    }
  }
  return { parsedVal: { type: 'transform', value: svgTransforms } };
}

import {
  inheritableAttrs,
  presentationProperties,
  preserveFillRuleElements,
} from './_collections.js';
import { visitSkip } from '../lib/xast.js';
import { getHrefId } from '../lib/tools-ast.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getPresentationProperties, getProperty } from './_styles.js';
import { SvgAttMap } from '../lib/ast/svgAttMap.js';
import {
  getAllowedAttributes,
  getAllowedChildren,
  getAttributeDefaults,
} from '../lib/utils/tools-collections.js';

export const name = 'removeUnknownsAndDefaults';
export const description =
  'removes unknown elements, removes attributes and properties with default values or unused values';

/**
 * @typedef {Map<string,{element:import('../lib/types.js').XastElement,hasColor:boolean}[]>} UsedElMap
 */

// https://svgwg.org/svg2-draft/painting.html#ColorProperty
const ALLOWED_CURRENTCOLOR_PROPS = [
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
];

const preserveOverflowElements = new Set([
  'foreignObject',
  'image',
  'marker',
  'pattern',
  'svg',
  'symbol',
  'text',
]);

/**
 * Remove unknown elements content and attributes,
 * remove attributes with default values.
 *
 * @type {import('./plugins-types.js').Plugin<'removeUnknownsAndDefaults'>}
 */
export const fn = (info, params) => {
  const {
    unknownAttrs = true,
    defaultMarkupDeclarations = true,
    keepDataAttrs = true,
    keepAriaAttrs = true,
    keepRoleAttr = false,
  } = params;

  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    styleData.hasAttributeSelector()
  ) {
    return;
  }

  /**
   * @type {Map<import('../lib/types.js').XastElement,string[]>}
   * @deprecated - merge with propsToDeleteIfUnused
   */
  const attsToDeleteIfUnused = new Map();
  /** @type {Map<import('../lib/types.js').XastElement,string[]>} */
  const propsToDeleteIfUnused = new Map();
  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const elementsById = new Map();
  /** @type {UsedElMap} */
  const usedElsById = new Map();
  /** @type {import('../lib/types.js').XastElement[]} */
  const fillRulesToCheck = [];

  const elsWithColorAtt = new Set();
  const elsWithCurrentColor = new Set();
  const elsWithCurrentColorToDelete = new Set();

  return {
    instruction: {
      enter: (node) => {
        if (defaultMarkupDeclarations) {
          node.value = node.value.replace(/\s*standalone\s*=\s*(["'])no\1/, '');
        }
      },
    },
    element: {
      exit: (element, parentList) => {
        // Process on exit so transformations are bottom-up.

        // skip namespaced elements
        if (element.uri !== undefined) {
          return;
        }
        // skip visiting foreignObject subtree
        if (element.local === 'foreignObject') {
          return visitSkip;
        }

        const id = element.svgAtts.get('id')?.toString();
        if (id) {
          elementsById.set(id, element);
        }

        /** @type {import('../lib/types.js').ComputedPropertyMap} */
        const computedProps = styleData.computeProps(element, parentList);

        if (element.local === 'use') {
          const id = getHrefId(element);
          if (id) {
            let els = usedElsById.get(id);
            if (els === undefined) {
              els = [];
              usedElsById.set(id, els);
            }
            els.push({
              element: element,
              hasColor: !!computedProps.get('color'),
            });
          }
          addElsWhichHaveCurrentColor(
            elsWithCurrentColor,
            elsWithCurrentColorToDelete,
            element,
            computedProps,
          );

          // x="0" and y="0" can be removed.
          ['x', 'y'].forEach((attName) => {
            const val = element.svgAtts.get(attName)?.toString();
            if (val === '0') {
              element.svgAtts.delete(attName);
            }
          });

          // If there is a fill-rule, delete it unless it is necessary.
          const fillRule = element.svgAtts.get('fill-rule');
          if (fillRule !== undefined) {
            fillRulesToCheck.push(element);
          }

          // If there is a color attribute, save it to see if it is necessary.
          const props = getPresentationProperties(element);
          if (props.get('color')) {
            elsWithColorAtt.add(element);
          }
        }

        const allowedChildren = getAllowedChildren(element.local);
        if (allowedChildren) {
          // Remove any disallowed child elements.
          if (
            element.children.some(
              (child) =>
                child.type === 'element' &&
                !allowedChildren.has(child.local) &&
                child.uri === undefined,
            )
          ) {
            element.children = element.children.filter(
              (child) =>
                child.type !== 'element' ||
                allowedChildren.has(child.local) ||
                child.uri !== undefined,
            );
          }
        }

        const allowedAttributes = getAllowedAttributes(element.local);
        const attributesDefaults = getAttributeDefaults(element.local);

        // Remove any unnecessary style properties.
        /** @type {StyleAttValue|undefined} */
        const styleAttValue = element.svgAtts.get('style');
        if (styleAttValue) {
          // Delete the associated attributes, since they will always be overridden by the style property.
          for (let p of styleAttValue.keys()) {
            if (p === 'transform') {
              switch (element.local) {
                case 'linearGradient':
                case 'radialGradient':
                  p = 'gradientTransform';
                  break;
                case 'pattern':
                  p = 'patternTransform';
                  break;
              }
            }
            element.svgAtts.delete(p);
          }

          // Calculate the style if we remove all properties.
          const newComputedProps = styleData.computeProps(
            element,
            parentList,
            new SvgAttMap(),
          );

          // For each of the properties, remove it if the result was unchanged.
          const propsToDelete = [];
          for (const propertyName of styleAttValue.keys()) {
            // If the property is not allowed, delete it without checking the impact.
            if (!canHaveProperty(propertyName, allowedAttributes)) {
              propsToDelete.push(propertyName);
              continue;
            }

            const valOrig = computedProps.get(propertyName);
            const valNew = newComputedProps.get(propertyName);
            if (
              valOrig !== null &&
              (valOrig?.toString() === valNew?.toString() ||
                (valNew === undefined &&
                  isDefaultPropertyValue(
                    element,
                    propertyName,
                    valOrig?.toString(),
                    attributesDefaults,
                  )))
            ) {
              propsToDelete.push(propertyName);
            }
          }
          if (propsToDelete.length > 0) {
            propsToDeleteIfUnused.set(element, propsToDelete);
          }
        }

        // remove element's unknown attrs and attrs with default values
        const attsToDelete = [];
        for (const [name, attValue] of element.svgAtts.entries()) {
          if (keepDataAttrs && name.startsWith('data-')) {
            continue;
          }
          if (keepAriaAttrs && name.startsWith('aria-')) {
            continue;
          }
          if (keepRoleAttr && name === 'role') {
            continue;
          }
          // skip xmlns attribute
          if (name === 'xmlns') {
            continue;
          }

          if (
            unknownAttrs &&
            allowedAttributes &&
            !allowedAttributes.has(name)
          ) {
            element.svgAtts.delete(name);
            continue;
          }

          if (name === 'clip-path') {
            const parentProps = styleData.computeParentProps(parentList);
            const parentClipPath = parentProps.get(name);
            if (
              parentClipPath &&
              parentClipPath.toString() === attValue.toString()
            ) {
              element.svgAtts.delete(name);
              continue;
            }
          }

          const strValue = attValue.toString();
          // Remove rx/ry = 0 from <rect>.
          if (element.local === 'rect') {
            switch (name) {
              case 'rx':
              case 'ry':
                if (strValue === '0') {
                  const otherValue = element.svgAtts.get(
                    name === 'rx' ? 'ry' : 'rx',
                  );
                  if (
                    otherValue === undefined ||
                    otherValue.toString() === '0'
                  ) {
                    element.svgAtts.delete(name);
                    continue;
                  }
                }
            }
          }

          // Only remove it if it is either
          // (a) inheritable, and either
          // -- a default value, and is not overriding the parent value, or
          // -- has the same value as the parent.
          // (b) not inheritable, and a default value.
          const isDefault = isDefaultPropertyValue(
            element,
            name,
            strValue,
            attributesDefaults,
          );
          if (inheritableAttrs.has(name)) {
            const parentProps = styleData.computeParentProps(parentList);
            const parentValue = parentProps.get(name);
            if (
              (isDefault && parentValue === undefined) ||
              strValue === parentValue?.toString()
            ) {
              attsToDelete.push(name);
            }
          } else if (isDefault) {
            attsToDelete.push(name);
          }
        }
        if (attsToDelete.length > 0) {
          attsToDeleteIfUnused.set(element, attsToDelete);
        }

        // Remove attribute if value is "currentColor" and color is not set.
        if (computedProps.get('color') !== undefined) {
          elsWithColorAtt.add(element);
        }
        addElsWhichHaveCurrentColor(
          elsWithCurrentColor,
          elsWithCurrentColorToDelete,
          element,
          computedProps,
        );
      },
    },
    root: {
      exit: () => {
        for (const [element, attNames] of attsToDeleteIfUnused.entries()) {
          if (elementIsUsed(element, usedElsById)) {
            continue;
          }
          for (const attName of attNames) {
            element.svgAtts.delete(attName);
          }
        }
        for (const [element, propNames] of propsToDeleteIfUnused.entries()) {
          if (elementIsUsed(element, usedElsById)) {
            continue;
          }
          StyleAttValue.deleteProps(element, propNames.values());
        }

        fillRulesToCheck.forEach((element) => {
          const fillRule = element.svgAtts.get('fill-rule');
          if (fillRule && !needsFillRule(element, elementsById)) {
            element.svgAtts.delete('fill-rule');
          }
        });

        // Delete color property from elements where it is not needed.
        deleteColorAtts(elsWithColorAtt, elsWithCurrentColor, usedElsById);

        // Delete attributes with currentColor if they are not used by something with a color.
        deleteUnusedCurrentColors(elsWithCurrentColorToDelete, usedElsById);

        const childrenToDelete = new ChildDeletionQueue();
        for (const elements of usedElsById.values()) {
          for (const { element } of elements) {
            // If the element has attributes which are present in the referenced element, delete them.
            const referencedId = getHrefId(element);
            if (referencedId === undefined) {
              throw new Error();
            }
            const referencedElement = elementsById.get(referencedId);
            if (!referencedElement) {
              childrenToDelete.add(element);
              continue;
            }

            const referencedElementProps =
              styleData.computeOwnStyle(referencedElement);

            // Delete any attributes or style properties that are directly present in the referenced element.
            for (const attName of element.svgAtts.keys()) {
              if (presentationProperties.has(attName)) {
                if (attName === 'transform') {
                  continue;
                }
                if (referencedElementProps.has(attName)) {
                  element.svgAtts.delete(attName);
                }
              }
            }
            /** @type {StyleAttValue|undefined} */
            const styleAttValue = element.svgAtts.get('style');
            if (styleAttValue) {
              for (const propName of styleAttValue.keys()) {
                if (referencedElementProps.has(propName)) {
                  styleAttValue.delete(propName);
                }
              }
              styleAttValue.updateElement(element);
            }
          }
        }

        childrenToDelete.delete();
      },
    },
  };
};

/**
 * @param {Set<import('../lib/types.js').XastElement>} elsWhichCanHaveColorAtt
 * @param {IterableIterator<import('../lib/types.js').XastElement>} elsWithCurrentColor
 * @param {UsedElMap} usedElsById
 */
function addElsWhichCanHaveColorAtt(
  elsWhichCanHaveColorAtt,
  elsWithCurrentColor,
  usedElsById,
) {
  for (const element of elsWithCurrentColor) {
    // This element has currentColor; add all its parents as allowed to have color.
    /** @type {import('../lib/types.js').XastElement|undefined} */
    let el = element;
    let includeUses = true;
    while (el) {
      elsWhichCanHaveColorAtt.add(el);

      if (includeUses) {
        // See if it has a color property. If so, it will override any <use>ing element.
        includeUses = getProperty(el, 'color').count() === 0;
      }

      if (includeUses) {
        // If the element has an id, and it is <use>d, add the <use>ing element and its parents as allowed to have color.
        const id = el.svgAtts.get('id')?.toString();
        if (id) {
          const usingEls = usedElsById.get(id);
          if (usingEls) {
            addElsWhichCanHaveColorAtt(
              elsWhichCanHaveColorAtt,
              usingEls.map((info) => info.element).values(),
              usedElsById,
            );
          }
        }
      }
      el = el.parentNode.type === 'root' ? undefined : el.parentNode;
    }
  }
}

/**
 *
 * @param {Set<import('../lib/types.js').XastElement>} elsWithCurrentColor
 * @param {Set<import('../lib/types.js').XastElement>} elsWithCurrentColorToDelete
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').ComputedPropertyMap} computedProps
 */
function addElsWhichHaveCurrentColor(
  elsWithCurrentColor,
  elsWithCurrentColorToDelete,
  element,
  computedProps,
) {
  ALLOWED_CURRENTCOLOR_PROPS.forEach((attName) => {
    const attValue = computedProps.get(attName)?.toString();
    if (attValue === 'currentColor') {
      elsWithCurrentColor.add(element);
      // If color is not set, delete it at the end if it is not used by an element with color property.
      if (computedProps.get('color') === undefined) {
        elsWithCurrentColorToDelete.add(element);
      }
    }
  });
}

/**
 * @param {string} propName
 * @param {Set<string>|undefined} allowedAttributes
 * @returns {boolean}
 * @deprecated
 */
function canHaveProperty(propName, allowedAttributes) {
  if (!allowedAttributes || allowedAttributes.has(propName)) {
    return true;
  }
  return false;
}

/**
 * @param {Set<import('../lib/types.js').XastElement>} elsWithColorAtt
 * @param {Set<import('../lib/types.js').XastElement>} elsWithCurrentColor
 * @param {UsedElMap} usedElsById
 */
function deleteColorAtts(elsWithColorAtt, elsWithCurrentColor, usedElsById) {
  if (elsWithColorAtt.size === 0) {
    return;
  }

  const elsWhichCanHaveColorAtt = new Set();

  addElsWhichCanHaveColorAtt(
    elsWhichCanHaveColorAtt,
    elsWithCurrentColor.values(),
    usedElsById,
  );

  elsWithColorAtt.forEach((element) => {
    if (!elsWhichCanHaveColorAtt.has(element)) {
      element.svgAtts.delete('color');
      /** @type {StyleAttValue|undefined} */
      const styleAttValue = element.svgAtts.get('style');
      if (styleAttValue) {
        styleAttValue.delete('color');
        styleAttValue.updateElement(element);
      }
    }
  });
}

/**
 * @param {Set<import('../lib/types.js').XastElement>} elsWithCurrentColorToDelete
 * @param {UsedElMap} usedElsById
 */
function deleteUnusedCurrentColors(elsWithCurrentColorToDelete, usedElsById) {
  elsWithCurrentColorToDelete.forEach((element) => {
    // Check the element and each parent to see if it is used by an element with color set.
    /** @type {import('../lib/types.js').XastElement|undefined} */
    let el = element;
    while (el) {
      const id = el.svgAtts.get('id')?.toString();
      if (id) {
        if (usingElHasColor(id, usedElsById)) {
          return;
        }
      }
      el = el.parentNode.type === 'root' ? undefined : el.parentNode;
    }
    ALLOWED_CURRENTCOLOR_PROPS.forEach((attName) => {
      element.svgAtts.delete(attName);
    });
    StyleAttValue.deleteProps(element, ALLOWED_CURRENTCOLOR_PROPS.values());
  });
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {UsedElMap} usedIDs
 * @returns {boolean}
 */
function elementIsUsed(element, usedIDs) {
  if (usedIDs.size === 0) {
    return false;
  }
  // See if the element or any of its parents are used.
  while (true) {
    const id = element.svgAtts.get('id')?.toString();
    if (id !== undefined && usedIDs.has(id)) {
      return true;
    }
    const parent = element.parentNode;
    if (parent.type === 'root') {
      return false;
    }
    element = parent;
  }
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} propName
 * @param {string|undefined} value
 * @param {Map<string,string>|undefined} defaults
 * @returns {boolean}
 */
function isDefaultPropertyValue(element, propName, value, defaults) {
  if (defaults === undefined) {
    return false;
  }
  const defaultVals = defaults.get(propName);
  if (value === defaultVals) {
    return true;
  }
  if (propName === 'word-spacing' && (value === '0' || value === '0px')) {
    // 'normal' is equivalent to 0
    return true;
  }
  if (
    propName === 'overflow' &&
    value === 'visible' &&
    !preserveOverflowElements.has(element.local)
  ) {
    return true;
  }
  return false;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {Map<string,import('../lib/types.js').XastElement>} elementsById
 * @returns {boolean}
 */
function needsFillRule(element, elementsById) {
  if (element.local === 'use') {
    // See if the referenced element needs fill-rule.
    const id = getHrefId(element);
    if (id === undefined) {
      return false;
    }
    const referencedElement = elementsById.get(id);
    return (
      referencedElement !== undefined &&
      needsFillRule(referencedElement, elementsById)
    );
  }
  if (element.local === 'g') {
    // See if any children need fill-rule.
    return element.children.some(
      (child) => child.type === 'element' && needsFillRule(child, elementsById),
    );
  }
  return preserveFillRuleElements.has(element.local);
}

/**
 * @param {string} id
 * @param {UsedElMap} usedElsById
 * @returns {boolean}
 */
function usingElHasColor(id, usedElsById) {
  const usingEls = usedElsById.get(id);
  if (!usingEls) {
    return false;
  }

  if (usingEls.some((info) => info.hasColor)) {
    return true;
  }

  // See if any of the using elements are used by something with color.
  if (
    usingEls.some((info) => {
      const id = info.element.svgAtts.get('id')?.toString();
      if (!id) {
        return false;
      }
      return usingElHasColor(id, usedElsById);
    })
  ) {
    return true;
  }

  return false;
}

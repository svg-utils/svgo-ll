import {
  elems,
  attrsGroups,
  elemsGroups,
  attrsGroupsDefaults,
  inheritableAttrs,
} from './_collections.js';
import { visitSkip } from '../lib/xast.js';
import { getHrefId } from '../lib/tools-ast.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { updateStyleAttribute } from '../lib/svgo/tools-svg.js';
import { getPresentationProperties, getProperty } from './_styles.js';

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

/** @type {Map<string, Set<string>>} */
const allowedChildrenPerElement = new Map();
/** @type {Map<string, Set<string>>} */
const allowedAttributesPerElement = new Map();
/** @type {Map<string, Map<string, string>>} */
const attributesDefaultsPerElement = new Map();
const preserveOverflowElements = new Set([
  'foreignObject',
  'image',
  'marker',
  'pattern',
  'svg',
  'symbol',
  'text',
]);

// See https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Attribute/fill-rule#specifications
const preserveFillRuleElements = new Set([
  'path',
  'polygon',
  'polyline',
  'text',
  'textPath',
  'tspan',
  'g',
]);

for (const [name, config] of Object.entries(elems)) {
  /** @type {Set<string>} */
  const allowedChildren = new Set();
  if (config.content) {
    for (const elementName of config.content) {
      allowedChildren.add(elementName);
    }
  }
  if (config.contentGroups) {
    for (const contentGroupName of config.contentGroups) {
      const elemsGroup = elemsGroups[contentGroupName];
      if (elemsGroup) {
        for (const elementName of elemsGroup) {
          allowedChildren.add(elementName);
        }
      }
    }
  }

  /** @type {Set<string>} */
  const allowedAttributes = new Set();
  if (config.attrs) {
    for (const attrName of config.attrs) {
      if (attrName === 'fill-rule' && !preserveFillRuleElements.has(name)) {
        continue;
      }
      allowedAttributes.add(attrName);
    }
  }
  /** @type {Map<string, string>} */
  const attributesDefaults = new Map();
  if (config.defaults) {
    for (const [attrName, defaultValue] of Object.entries(config.defaults)) {
      attributesDefaults.set(attrName, defaultValue);
    }
  }
  for (const attrsGroupName of config.attrsGroups) {
    const attrsGroup = attrsGroups[attrsGroupName];
    if (attrsGroup) {
      for (const attrName of attrsGroup) {
        if (attrName === 'fill-rule' && !preserveFillRuleElements.has(name)) {
          continue;
        }
        allowedAttributes.add(attrName);
      }
    }
    const groupDefaults = attrsGroupsDefaults[attrsGroupName];
    if (groupDefaults) {
      for (const [attrName, defaultValue] of Object.entries(groupDefaults)) {
        attributesDefaults.set(attrName, defaultValue);
      }
    }
  }
  allowedChildrenPerElement.set(name, allowedChildren);
  allowedAttributesPerElement.set(name, allowedAttributes);
  attributesDefaultsPerElement.set(name, attributesDefaults);
}

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
  if (info.docData.hasScripts() || styleData === null) {
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

        /** @type {Map<string, string | null>} */
        const computedStyle = styleData.computeStyle(element, parentList);

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
              hasColor: !!computedStyle.get('color'),
            });
          }
          // x="0" and y="0" can be removed; otherwise leave attributes alone.
          ['x', 'y'].forEach((attName) => {
            const val = element.svgAtts.get(attName)?.toString();
            if (val === '0') {
              element.svgAtts.delete(attName);
            }
          });

          // If there is a color attribute, save it to see if it is necessary.
          const props = getPresentationProperties(element);
          if (props.get('color')) {
            elsWithColorAtt.add(element);
          }

          return;
        }

        const allowedChildren = allowedChildrenPerElement.get(element.local);
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

        const allowedAttributes = allowedAttributesPerElement.get(
          element.local,
        );
        const attributesDefaults = attributesDefaultsPerElement.get(
          element.local,
        );

        // Remove any unnecessary style properties.
        const styleAttValue = StyleAttValue.getAttValue(element);
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
          const newComputedStyle = styleData.computeStyle(
            element,
            parentList,
            new Map(),
          );

          // For each of the properties, remove it if the result was unchanged.
          const propsToDelete = [];
          for (const propertyName of styleAttValue.keys()) {
            // If the property is not allowed, delete it without checking the impact.
            if (!canHaveProperty(propertyName, allowedAttributes)) {
              propsToDelete.push(propertyName);
              continue;
            }

            const origVal = computedStyle.get(propertyName);
            const newVal = newComputedStyle.get(propertyName);
            if (
              origVal !== null &&
              (origVal === newVal ||
                (newVal === undefined &&
                  isDefaultPropertyValue(
                    element,
                    propertyName,
                    origVal,
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
            const parentProperties = styleData.computeParentStyle(parentList);
            const parentClipPath = parentProperties.get(name);
            if (parentClipPath && parentClipPath === attValue.toString()) {
              delete element.attributes[name];
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
                  const otherValue =
                    element.attributes[name === 'rx' ? 'ry' : 'rx'];
                  if (
                    otherValue === undefined ||
                    otherValue.toString() === '0'
                  ) {
                    delete element.attributes[name];
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
            const parentProperties = styleData.computeParentStyle(parentList);
            const parentValue = parentProperties.get(name);
            if (
              (isDefault && parentValue === undefined) ||
              strValue === parentValue
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
        const props = getPresentationProperties(element);
        if (props.get('color') !== undefined) {
          elsWithColorAtt.add(element);
        }
        ALLOWED_CURRENTCOLOR_PROPS.forEach((attName) => {
          const attValue = computedStyle.get(attName);
          if (attValue === 'currentColor') {
            elsWithCurrentColor.add(element);
            // If color is not set, delete it at the end if it is not used by an element with color property.
            if (computedStyle.get('color') === undefined) {
              elsWithCurrentColorToDelete.add(element);
            }
          }
        });
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
              if (attrsGroups.presentation.has(attName)) {
                if (attName === 'transform') {
                  continue;
                }
                if (referencedElementProps.has(attName)) {
                  element.svgAtts.delete(attName);
                }
              }
            }
            const styleAttValue = StyleAttValue.getAttValue(element);
            if (styleAttValue) {
              for (const [propName, propValue] of styleAttValue.entries()) {
                if (
                  referencedElementProps.has(propName) ||
                  isDefaultPropertyValue(
                    element,
                    propName,
                    propValue.value.toString(),
                    attributesDefaultsPerElement.get(element.local),
                  )
                ) {
                  styleAttValue.delete(propName);
                }
              }
              updateStyleAttribute(element, styleAttValue);
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
        includeUses = getProperty(el, 'color').size === 0;
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
 * @param {string} propName
 * @param {Set<string>|undefined} allowedAttributes
 * @returns {boolean}
 */
function canHaveProperty(propName, allowedAttributes) {
  if (!allowedAttributes || allowedAttributes.has(propName)) {
    return true;
  }
  switch (propName) {
    case 'font':
      // "font" is allowed as a style property but not as an attribute; allow it only if the font attributes are allowed for
      // this element.
      return allowedAttributes.has('font-size');
    case 'marker':
      // "marker" is allowed as a style property but not as an attribute; allow it only if the marker attributes are allowed for
      // this element.
      return allowedAttributes.has('marker-start');
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
      const styleAttValue = StyleAttValue.getAttValue(element);
      if (styleAttValue) {
        styleAttValue.delete('color');
        updateStyleAttribute(element, styleAttValue);
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
        const usingEls = usedElsById.get(id);
        if (usingEls) {
          if (usingEls.some((info) => info.hasColor)) {
            return;
          }
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

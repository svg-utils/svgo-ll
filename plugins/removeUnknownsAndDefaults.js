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
import { getPresentationProperties } from './_styles.js';

export const name = 'removeUnknownsAndDefaults';
export const description =
  'removes unknown elements content and attributes, removes attrs with default values';

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

const colorEls = new Set();
const currentColorEls = new Set();

/**
 * Remove unknown elements content and attributes,
 * remove attributes with default values.
 *
 * @type {import('./plugins-types.js').Plugin<'removeUnknownsAndDefaults'>}
 */
export const fn = (info, params) => {
  /**
   * @param {import('../lib/types.js').XastElement} element
   * @returns {boolean}
   */
  function elementIsUsed(element) {
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

  /** @type {Map<import('../lib/types.js').XastElement,string[]>} */
  const attsToDeleteIfUnused = new Map();
  /** @type {Map<import('../lib/types.js').XastElement,string[]>} */
  const propsToDeleteIfUnused = new Map();
  /** @type {Set<string>} */
  const usedIDs = new Set();
  /** @type {Map<string,import('../lib/types.js').XastElement>} */
  const elementsById = new Map();
  /** @type {Set<import('../lib/types.js').XastElement>} */
  const useElements = new Set();

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

        if (element.local === 'use') {
          const id = getHrefId(element);
          if (id) {
            usedIDs.add(id);
            useElements.add(element);
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
            colorEls.add(element);
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
        /** @type {Map<string, string | null>} */
        const computedStyle = styleData.computeStyle(element, parentList);

        // Remove any unnecessary style properties.
        const styleAttValue = StyleAttValue.getStyleAttValue(element);
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
            delete element.attributes[p];
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
        const color = computedStyle.get('color')?.toString();
        const props = getPresentationProperties(element);
        if (props.get('color') !== undefined) {
          colorEls.add(element);
        }
        [
          'fill',
          'stroke',
          'stop-color',
          'flood-color',
          'lighting-color',
        ].forEach((attName) => {
          const attValue = props.get(attName)?.value.toString();
          if (attValue === 'currentColor') {
            // If there is no color in the cascade, delete the attribute
            if (!color) {
              element.svgAtts.delete(attName);
              if (styleAttValue) {
                styleAttValue.delete(attName);
                updateStyleAttribute(element, styleAttValue);
              }
            } else {
              // Otherwise record the fact that it is present.
              currentColorEls.add(element);
            }
          }
        });
      },
    },
    root: {
      exit: () => {
        for (const [element, attNames] of attsToDeleteIfUnused.entries()) {
          if (elementIsUsed(element)) {
            continue;
          }
          for (const attName of attNames) {
            delete element.attributes[attName];
          }
        }
        for (const [element, propNames] of propsToDeleteIfUnused.entries()) {
          if (elementIsUsed(element)) {
            continue;
          }
          const styleAttValue = StyleAttValue.getStyleAttValue(element);
          if (styleAttValue) {
            for (const propName of propNames) {
              styleAttValue.delete(propName);
            }
            updateStyleAttribute(element, styleAttValue);
          }
        }

        // Delete color property from elements where it is not needed.
        deleteColorAtts(colorEls, currentColorEls);

        const childrenToDelete = new ChildDeletionQueue();
        for (const element of useElements) {
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
          for (const attName of Object.keys(element.attributes)) {
            if (attrsGroups.presentation.has(attName)) {
              if (attName === 'transform') {
                continue;
              }
              if (referencedElementProps.has(attName)) {
                delete element.attributes[attName];
              }
            }
          }
          const styleAttValue = StyleAttValue.getStyleAttValue(element);
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

        childrenToDelete.delete();
      },
    },
  };
};

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
 * @param {Set<import('../lib/types.js').XastElement>} colorEls
 * @param {Set<import('../lib/types.js').XastElement>} currentColorEls
 */
function deleteColorAtts(colorEls, currentColorEls) {
  if (colorEls.size === 0) {
    return;
  }

  const validColorEls = new Set();
  currentColorEls.forEach((element) => {
    /** @type {import('../lib/types.js').XastElement|undefined} */
    let el = element;
    while (el) {
      validColorEls.add(el);
      el = el.parentNode.type === 'root' ? undefined : el.parentNode;
    }
  });

  colorEls.forEach((element) => {
    if (!validColorEls.has(element)) {
      element.svgAtts.delete('color');
      const styleAttValue = StyleAttValue.getStyleAttValue(element);
      if (styleAttValue) {
        styleAttValue.delete('color');
        updateStyleAttribute(element, styleAttValue);
      }
    }
  });
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

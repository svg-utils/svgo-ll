import {
  elems,
  attrsGroups,
  elemsGroups,
  attrsGroupsDefaults,
  inheritableAttrs,
} from './_collections.js';
import { visitSkip, detachNodeFromParent } from '../lib/xast.js';
import { getHrefId, writeStyleAttribute } from '../lib/svgo/tools.js';
import { getStyleDeclarations } from '../lib/css-tools.js';

export const name = 'removeUnknownsAndDefaults';
export const description =
  'removes unknown elements content and attributes, removes attrs with default values';

// resolve all groups references

/**
 * @type {Map<string, Set<string>>}
 */
const allowedChildrenPerElement = new Map();
/**
 * @type {Map<string, Set<string>>}
 */
const allowedAttributesPerElement = new Map();
/**
 * @type {Map<string, Map<string, string>>}
 */
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

for (const [name, config] of Object.entries(elems)) {
  /**
   * @type {Set<string>}
   */
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
  /**
   * @type {Set<string>}
   */
  const allowedAttributes = new Set();
  if (config.attrs) {
    for (const attrName of config.attrs) {
      allowedAttributes.add(attrName);
    }
  }
  /**
   * @type {Map<string, string>}
   */
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
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} propName
 * @param {import('../lib/types.js').SVGAttValue|undefined} value
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
  if (
    propName === 'overflow' &&
    value === 'visible' &&
    !preserveOverflowElements.has(element.name)
  ) {
    return true;
  }
  return false;
}

/**
 * Remove unknown elements content and attributes,
 * remove attributes with default values.
 *
 * @type {import('./plugins-types.js').Plugin<'removeUnknownsAndDefaults'>}
 */
export const fn = (root, params, info) => {
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
      if (
        element.attributes.id &&
        usedIDs.has(element.attributes.id.toString())
      ) {
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
    unknownContent = true,
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

  return {
    instruction: {
      enter: (node) => {
        if (defaultMarkupDeclarations) {
          node.value = node.value.replace(/\s*standalone\s*=\s*(["'])no\1/, '');
        }
      },
    },
    element: {
      enter: (element, parentList) => {
        // skip namespaced elements
        if (element.name.includes(':')) {
          return;
        }
        // skip visiting foreignObject subtree
        if (element.name === 'foreignObject') {
          return visitSkip;
        }

        if (element.name === 'use') {
          const id = getHrefId(element);
          if (id) {
            usedIDs.add(id);
          }
          // x="0" and y="0" can be removed; otherwise leave attributes alone.
          ['x', 'y'].forEach((attName) => {
            if (element.attributes[attName] === '0') {
              delete element.attributes[attName];
            }
          });
          return;
        }

        // remove unknown element's content
        const parentNode = parentList[parentList.length - 1].element;
        if (unknownContent && parentNode.type === 'element') {
          const allowedChildren = allowedChildrenPerElement.get(
            parentNode.name,
          );
          if (!allowedChildren || allowedChildren.size === 0) {
            // TODO: DO WE NEED THIS CHECK? SHOULDN'T IT HAVE BEEN HANDLED BY THE PARENT IN THE ELSE BLOCK BELOW?
            // remove unknown elements
            if (allowedChildrenPerElement.get(element.name) == null) {
              detachNodeFromParent(element);
              return;
            }
          } else {
            // remove not allowed children
            if (allowedChildren.has(element.name) === false) {
              detachNodeFromParent(element);
              return;
            }
          }
        }

        const allowedAttributes = allowedAttributesPerElement.get(element.name);
        const attributesDefaults = attributesDefaultsPerElement.get(
          element.name,
        );
        /** @type {Map<string, import('../lib/types.js').SVGAttValue | null>} */
        const computedStyle = styleData.computeStyle(element, parentList);

        // Remove any unnecessary style properties.
        const styleProperties = getStyleDeclarations(element);
        if (styleProperties) {
          // Delete the associated attributes, since they will always be overridden by the style property.
          for (let p of styleProperties.keys()) {
            if (p === 'transform') {
              switch (element.name) {
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
          for (const p of styleProperties.keys()) {
            const origVal = computedStyle.get(p);
            const newVal = newComputedStyle.get(p);
            if (
              origVal !== null &&
              (origVal === newVal ||
                (newVal === undefined &&
                  isDefaultPropertyValue(
                    element,
                    p,
                    origVal,
                    attributesDefaults,
                  )))
            ) {
              propsToDelete.push(p);
            }
          }
          if (propsToDelete.length > 0) {
            propsToDeleteIfUnused.set(element, propsToDelete);
          }
        }

        // remove element's unknown attrs and attrs with default values
        const attsToDelete = [];
        for (const [name, value] of Object.entries(element.attributes)) {
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
          // skip namespaced attributes except xml:* and xlink:*
          if (name.includes(':')) {
            const [prefix] = name.split(':');
            if (prefix !== 'xml' && prefix !== 'xlink') {
              continue;
            }
          }

          if (
            unknownAttrs &&
            allowedAttributes &&
            !allowedAttributes.has(name)
          ) {
            delete element.attributes[name];
            continue;
          }

          // Remove rx/ry = 0 from <rect>.
          if (element.name === 'rect') {
            switch (name) {
              case 'rx':
              case 'ry':
                if (value.toString() === '0') {
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
            value.toString(),
            attributesDefaults,
          );
          if (inheritableAttrs.has(name)) {
            const parentProperties = styleData.computeParentStyle(parentList);
            const parentValue = parentProperties.get(name);
            if (
              (isDefault && parentValue === undefined) ||
              value === parentValue
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
          const props = getStyleDeclarations(element);
          if (props) {
            for (const propName of propNames) {
              props.delete(propName);
            }
            writeStyleAttribute(element, props);
          }
        }
      },
    },
  };
};

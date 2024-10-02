import {
  elems,
  attrsGroups,
  elemsGroups,
  attrsGroupsDefaults,
  presentationNonInheritableGroupAttrs,
} from './_collections.js';
import { visitSkip, detachNodeFromParent } from '../lib/xast.js';
import { findReferences } from '../lib/svgo/tools.js';
import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';

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
 * @param {string} name
 * @param {string|undefined} value
 * @param {Map<string,string>|undefined} defaults
 * @returns {boolean}
 */
function isDefaultPropertyValue(name, value, defaults) {
  if (defaults === undefined) {
    return false;
  }
  const defaultVals = defaults.get(name);
  return value === defaultVals;
}

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {string} attName
 */
function getUseID(element, attName) {
  const value = element.attributes[attName];
  if (value) {
    const ids = findReferences(attName, value);
    if (ids) {
      return ids[0];
    }
  }
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
      if (element.attributes.id && usedIDs.has(element.attributes.id)) {
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
   * @param {import('../lib/types.js').XastElement} node
   * @param {string} attName
   */
  function saveForUsageCheck(node, attName) {
    let attNames = deleteIfUnused.get(node);
    if (!attNames) {
      attNames = [];
      deleteIfUnused.set(node, attNames);
    }
    attNames.push(attName);
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
  const deleteIfUnused = new Map();
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
      enter: (node, parentNode, parentInfo) => {
        // skip namespaced elements
        if (node.name.includes(':')) {
          return;
        }
        // skip visiting foreignObject subtree
        if (node.name === 'foreignObject') {
          return visitSkip;
        }

        if (node.name === 'use') {
          let id = getUseID(node, 'href');
          if (!id) {
            id = getUseID(node, 'xlink:href');
          }
          if (id) {
            usedIDs.add(id);
          }
          return;
        }

        // remove unknown element's content
        if (unknownContent && parentNode.type === 'element') {
          const allowedChildren = allowedChildrenPerElement.get(
            parentNode.name,
          );
          if (!allowedChildren || allowedChildren.size === 0) {
            // TODO: DO WE NEED THIS CHECK? SHOULDN'T IT HAVE BEEN HANDLED BY THE PARENT IN THE ELSE BLOCK BELOW?
            // remove unknown elements
            if (allowedChildrenPerElement.get(node.name) == null) {
              detachNodeFromParent(node, parentNode);
              return;
            }
          } else {
            // remove not allowed children
            if (allowedChildren.has(node.name) === false) {
              detachNodeFromParent(node, parentNode);
              return;
            }
          }
        }

        const allowedAttributes = allowedAttributesPerElement.get(node.name);
        const attributesDefaults = attributesDefaultsPerElement.get(node.name);
        const parentParentInfo = parentInfo.slice(0, -1);
        /** @type {Map<string, string | null>} */
        /** @deprecated */
        const computedParentStyle =
          parentNode.type === 'element'
            ? styleData.computeStyle(parentNode, parentParentInfo)
            : new Map();
        const computedStyle = styleData.computeStyle(node, parentInfo);

        if (!node.attributes.id) {
          // Remove any unnecessary style properties.
          const styleProperties = getStyleDeclarations(node);
          if (styleProperties) {
            // Delete the associated attributes, since they will always be overridden by the style property.
            for (const p of styleProperties.keys()) {
              delete node.attributes[p];
            }

            // Calculate the style if we remove all properties.
            const newComputedStyle = styleData.computeStyle(
              node,
              parentInfo,
              new Map(),
            );

            // For each of the properties, remove it if the result was unchanged.
            const origSize = styleProperties.size;
            for (const p of styleProperties.keys()) {
              const origVal = computedStyle.get(p);
              const newVal = newComputedStyle.get(p);
              if (
                origVal !== null &&
                (origVal === newVal ||
                  (newVal === undefined &&
                    isDefaultPropertyValue(p, origVal, attributesDefaults)))
              ) {
                styleProperties.delete(p);
              }
            }
            if (origSize !== styleProperties.size) {
              writeStyleAttribute(node, styleProperties);
            }
          }
        }

        // remove element's unknown attrs and attrs with default values
        for (const [name, value] of Object.entries(node.attributes)) {
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
            allowedAttributes.has(name) === false
          ) {
            delete node.attributes[name];
          }

          // Don't remove default attributes from elements with an id attribute; they may be linearGradient, etc.
          // where the attribute serves a purpose. If the id is unnecessary, it will be removed by another plugin
          // and the attribute will then be removable.
          if (
            !node.attributes.id &&
            attributesDefaults &&
            attributesDefaults.get(name) === value
          ) {
            // keep defaults if parent has own or inherited style
            const value = computedParentStyle.get(name);
            if (value === undefined) {
              saveForUsageCheck(node, name);
            }
          }
          if (!node.attributes.id) {
            const computedValue = computedParentStyle.get(name);
            if (
              presentationNonInheritableGroupAttrs.has(name) === false &&
              computedValue === value
            ) {
              delete node.attributes[name];
            }
          }
        }
      },
    },
    root: {
      exit: () => {
        for (const [element, attNames] of deleteIfUnused.entries()) {
          if (elementIsUsed(element)) {
            continue;
          }
          for (const attName of attNames) {
            delete element.attributes[attName];
          }
        }
      },
    },
  };
};

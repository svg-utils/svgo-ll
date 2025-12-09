import {
  attrsGroups,
  attrsGroupsDefaults,
  elems,
  elemsGroups,
  preserveFillRuleElements,
} from '../../plugins/_collections.js';

/** @type {Map<string, Set<string>>} */
const allowedAttributesPerElement = new Map();
/** @type {Map<string, Set<string>>} */
const allowedChildrenPerElement = new Map();
/** @type {Map<string, Map<string, string>>} */
const attributesDefaultsPerElement = new Map();

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
 * @param {string} tagName
 * @returns {Set<string>|undefined}
 */
export function getAllowedAttributes(tagName) {
  return allowedAttributesPerElement.get(tagName);
}

/**
 * @param {string} tagName
 * @returns {Set<string>|undefined}
 */
export function getAllowedChildren(tagName) {
  return allowedChildrenPerElement.get(tagName);
}

/**
 * @param {string} tagName
 * @returns {Map<string,string>|undefined}
 */
export function getAttributeDefaults(tagName) {
  return attributesDefaultsPerElement.get(tagName);
}

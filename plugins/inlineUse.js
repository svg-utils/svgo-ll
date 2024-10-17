import { getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { svgSetAttValue } from '../lib/svg-parse-att.js';
import { getHrefId, getReferencedIds } from '../lib/svgo/tools.js';

export const name = 'inlineUse';
export const description = 'move <defs> inline when <use> only once';

/**
 * @type {import('./plugins-types.js').Plugin<'inlineUse'>};
'>}
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

  /** @type {Map<string,import('../lib/types.js').XastElement>}*/
  const defIds = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const referencedIds = new Map();

  /** @type {Map<string,import('../lib/types.js').XastElement[]>} */
  const usedIds = new Map();

  return {
    element: {
      enter: (element) => {
        if (element.name === 'defs') {
          // Record the ids of all <defs> children as potential candidates for inlining.
          for (const child of element.children) {
            if (child.type === 'element' && child.attributes.id) {
              defIds.set(child.attributes.id.toString(), child);
            }
          }
        } else if (element.name === 'use') {
          const id = getHrefId(element);
          if (id) {
            let usingEls = usedIds.get(id);
            if (!usingEls) {
              usingEls = [];
              usedIds.set(id, usingEls);
            }
            usingEls.push(element);
          }
        }

        // Record all referenced ids.
        for (const { id } of getReferencedIds(element)) {
          let referencingEls = referencedIds.get(id);
          if (!referencingEls) {
            referencingEls = [];
            referencedIds.set(id, referencingEls);
          }
          referencingEls.push(element);
        }
      },
    },
    root: {
      exit: () => {
        /** @type {Map<import('../lib/types.js').XastParent,Set<import('../lib/types.js').XastChild>>} */
        const defsToDelete = new Map();

        for (const [id, def] of defIds.entries()) {
          // If it is only referenced by a single <use>, try to inline it.
          const usingEls = usedIds.get(id);
          if (usingEls && usingEls.length === 1) {
            const referencingEls = referencedIds.get(id);
            if (referencingEls && referencingEls.length === 1) {
              if (inlineUse(usingEls[0], def)) {
                // Add def to list to be deleted.
                let defsChildren = defsToDelete.get(def.parentNode);
                if (!defsChildren) {
                  defsChildren = new Set();
                  defsToDelete.set(def.parentNode, defsChildren);
                }
                defsChildren.add(def);
              }
            }
          }
        }

        // Remove any deleted defs.
        for (const [parent, deletedChildren] of defsToDelete.entries()) {
          parent.children = parent.children.filter(
            (c) => !deletedChildren.has(c),
          );
        }
      },
    },
  };
};

/**
 *
 * @param {import('../lib/types.js').XastElement} use
 * @param {import('../lib/types.js').XastElement} def
 * @returns {boolean}
 */
function inlineUse(use, def) {
  if (use.children.length > 0) {
    return false;
  }

  // Convert the <use> to <g>.
  use.name = 'g';

  // Update properties.
  const useProperties = getStyleDeclarations(use) ?? new Map();
  const defProperties = getStyleDeclarations(def);

  // Remove any <use> properties that are def attributes.
  for (const propName of useProperties.keys()) {
    if (def.attributes[propName]) {
      useProperties.delete(propName);
    }
  }
  // Overwrite <use> properties with def properties.
  if (defProperties) {
    for (const [propName, propValue] of defProperties.entries()) {
      useProperties.set(propName, propValue);
    }
  }

  // Update attributes.
  let tx = '0';
  let ty = '0';
  for (const [attName, attValue] of Object.entries(use.attributes)) {
    switch (attName) {
      case 'x':
        tx = attValue.toString();
        break;
      case 'y':
        ty = attValue.toString();
        break;
    }
    delete use.attributes[attName];
  }

  // Overwrite attributes with those from <use>d element.
  for (const [attName, attValue] of Object.entries(def.attributes)) {
    switch (attName) {
      case 'id':
      case 'style':
        continue;
      default:
        svgSetAttValue(use, attName, attValue);
        break;
    }
  }

  // Add translation if necessary.
  if (tx !== '0' || ty !== '0') {
    use.attributes.transform = `translate(${tx},${ty})`;
  }
  writeStyleAttribute(use, useProperties);

  use.children = def.children;
  use.children.forEach((c) => (c.parentNode = use));

  return true;
}

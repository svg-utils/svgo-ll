import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { cssTransformToSVGAtt } from '../lib/svg-to-css.js';
import {
  getReferencedIds,
  updateStyleAttribute,
} from '../lib/svgo/tools-svg.js';
import { getHrefId } from '../lib/svgo/tools.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'inlineUse';
export const description = 'move <defs> inline when <use>d only once';

/**
 * @type {import('./plugins-types.js').Plugin<'inlineUse'>};
'>}
 */
export const fn = (info) => {
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
              // Record parent in case it is changed by inlining.
              const parent = def.parentNode;
              if (inlineUse(usingEls[0], def)) {
                // Add def to list to be deleted.
                let defsChildren = defsToDelete.get(parent);
                if (!defsChildren) {
                  defsChildren = new Set();
                  defsToDelete.set(parent, defsChildren);
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
  // Don't inline if <use> has children.
  if (use.children.length > 0) {
    return false;
  }

  // Don't inline symbols that are <use>d with a width/height.
  if (
    (use.attributes.width || use.attributes.height) &&
    def.name === 'symbol'
  ) {
    return false;
  }

  // Check referenced element.
  let isContainer = false;
  switch (def.name) {
    case 'path':
      break;
    case 'symbol':
      isContainer = true;
      break;
    default:
      return false;
  }

  const defProperties = getPresentationProperties(def);
  // Don't convert <symbol> unless overflow is visible.
  if (def.name === 'symbol') {
    const overflow = defProperties.get('overflow');
    if (!overflow || overflow.value !== 'visible') {
      return false;
    }
    // Remove overflow since there is no need to carry it over to <use>; remove transform properties since they are ignored.
    ['overflow', 'transform', 'transform-origin'].forEach((name) =>
      defProperties.delete(name),
    );
  }

  const useProperties = getPresentationProperties(use);

  // Overwrite <use> properties with def properties.
  if (defProperties) {
    for (const [propName, propValue] of defProperties.entries()) {
      useProperties.set(propName, propValue);
    }
  }

  // If there is a transform property, convert to an attribute.
  let transform = '';
  const cssTransform = useProperties.get('transform');
  if (cssTransform) {
    const svgTransform = cssTransformToSVGAtt(cssTransform);
    if (!svgTransform) {
      return false;
    }
    transform = svgTransform.toString();
    useProperties.delete('transform');
  }

  // Convert the <use>.
  use.local = isContainer ? 'g' : def.name;
  use.name = use.prefix === '' ? use.local : `${use.prefix}:${use.local}`;

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

  // Copy any non-presentation properties from def.
  for (const [attName, attValue] of Object.entries(def.attributes)) {
    switch (attName) {
      case 'id':
      case 'overflow':
      case 'style':
      case 'transform':
      case 'transform-origin':
        continue;
      default:
        if (!useProperties.has(attName)) {
          use.attributes[attName] = attValue.toString();
        }
        break;
    }
  }

  // Add translation if necessary.
  if (tx !== '0' || ty !== '0') {
    const translate = `translate(${tx},${ty})`;
    transform = isContainer ? transform + translate : translate + transform;
  }
  if (transform !== '') {
    use.attributes.transform = transform;
  }
  updateStyleAttribute(use, new StyleAttValue(useProperties));

  use.children = def.children;
  use.children.forEach((c) => (c.parentNode = use));

  return true;
}

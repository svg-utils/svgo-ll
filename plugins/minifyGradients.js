import { StopOffsetValue } from '../lib/attrs/stopOffsetValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { getReferencedIdInStyleProperty } from '../lib/svgo/tools.js';
import { recordReferencedIds } from '../lib/tools-ast.js';

export const name = 'minifyGradients';
export const description =
  'minify stop offsets and remove stops where possible';

/**
 * @typedef {{color:import('../lib/types.js').SVGAttValue,opacity:import('../lib/types.js').SVGAttValue|undefined}} ColorData
 */

/**
 * @type {import('./plugins-types.js').Plugin<'minifyGradients'>};
 */
export const fn = (info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const inlineGradients = !styleData.hasStyles();

  /** Map gradient id to ColorData.
   * @type {Map<string,ColorData>} */
  const solidGradients = new Map();

  /** @type {import('../lib/tools-ast.js').IdReferenceMap} */
  const allReferencedIds = new Map();

  /**
   * Maps ids to linearGradient/radialGradient elements
   * @type {Map<string,import('../lib/types.js').XastElement>} */
  const gradientMap = new Map();

  return {
    element: {
      enter: (element) => {
        // Record any referenced ids.
        recordReferencedIds(element, allReferencedIds);

        switch (element.local) {
          case 'linearGradient':
          case 'radialGradient':
            if (inlineGradients) {
              const id = element.svgAtts.get('id')?.toString();
              if (id) {
                gradientMap.set(id, element);

                const colorData = checkStops(element, styleData);
                if (
                  colorData &&
                  (colorData.opacity === undefined || colorData.opacity === '1')
                ) {
                  solidGradients.set(id, colorData);
                }
              }
            }
            break;
          case 'stop':
            {
              const offset = element.svgAtts.get('offset');
              if (offset) {
                const value = StopOffsetValue.getObj(offset);
                element.svgAtts.set('offset', value);
              }
            }
            break;
        }
      },
    },
    root: {
      exit: () => {
        const childrenToDelete = new ChildDeletionQueue();

        // See if any template references can be inlined.
        for (const [templateId, referencedGradient] of gradientMap.entries()) {
          if (referencedGradient.svgAtts.get('id')?.toString() !== templateId) {
            // This has already been merged, skip it.
            continue;
          }
          const templateRefs = allReferencedIds.get(templateId);
          if (templateRefs && templateRefs.length === 1) {
            const referencingEl = templateRefs[0].referencingEl;
            if (
              (referencingEl.local === 'linearGradient' ||
                referencingEl.local === 'radialGradient') &&
              referencingEl.local === referencedGradient.local
            ) {
              if (referencingEl.children.length === 0) {
                inlineGradient(
                  referencingEl,
                  referencedGradient,
                  gradientMap,
                  solidGradients,
                  childrenToDelete,
                );
              }
            }
          }
        }

        childrenToDelete.delete();

        // Replace any solid-color gradients.
        updateSolidGradients(solidGradients, allReferencedIds);
      },
    },
  };
};

/**
 * @param {import('../lib/types.js').XastElement} element
 * @param {import('../lib/types.js').StyleData} styleData
 * @returns {ColorData|undefined}
 */
function checkStops(element, styleData) {
  if (element.children.length < 1) {
    return;
  }
  const firstChild = element.children[0];
  if (firstChild.type !== 'element' || firstChild.local !== 'stop') {
    return;
  }
  const props = styleData.computeOwnStyle(firstChild);
  const color = props.get('stop-color');
  const opacity = props.get('stop-opacity');
  if (!color || opacity === null) {
    return;
  }
  const colorData = { color: color, opacity: opacity };
  for (let index = 1; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element' || child.local !== 'stop') {
      return;
    }
    const props = styleData.computeOwnStyle(child);
    if (
      props.get('stop-color') !== colorData.color ||
      props.get('stop-opacity') !== colorData.opacity
    ) {
      return;
    }
  }
  return colorData;
}

/**
 * @param {import('../lib/types.js').XastElement} outer
 * @param {import('../lib/types.js').XastElement} inner
 * @param {Map<string,import('../lib/types.js').XastElement>} gradientMap
 * @param {Map<string,ColorData>} solidGradients
 * @param {ChildDeletionQueue} childrenToDelete
 */
function inlineGradient(
  outer,
  inner,
  gradientMap,
  solidGradients,
  childrenToDelete,
) {
  const origInnerId = inner.svgAtts.get('id')?.toString();

  // Move all properties from outer gradient to the one it references.
  for (const [attName, attValue] of outer.svgAtts.entries()) {
    switch (attName) {
      case 'href':
        // Don't move these, just delete them.
        outer.svgAtts.delete(attName);
        break;
      case 'gradientTransform':
      case 'style':
        // Skip these and handle them below.
        break;
      default:
        inner.svgAtts.set(attName, attValue);
        outer.svgAtts.delete(attName);
        if (attName === 'id') {
          childrenToDelete.add(outer);
        }
        break;
    }
  }

  // The only style property which may be relevant to a gradient is "transform". If it is there, convert it to gradientTransform
  // attribute.
  let transform = outer.svgAtts.get('gradientTransform');
  const styleAttValue = StyleAttValue.getStyleAttValue(outer);
  if (styleAttValue) {
    const cssTransform = styleAttValue.get('transform');
    if (cssTransform) {
      transform = cssTransform.value;
    }
  }
  if (transform) {
    inner.svgAtts.set('gradientTransform', transform);
    outer.svgAtts.delete('gradientTransform');
    outer.svgAtts.delete('style');

    // Remove the style attribute on the referenced gradient; the only useful property it should have is transform.
    inner.svgAtts.delete('style');
  }

  // Update the gradient maps to reflect the moved id.
  const innerId = inner.svgAtts.get('id');
  if (innerId === undefined) {
    throw new Error();
  }
  const innerIdStr = innerId.toString();
  gradientMap.set(innerIdStr, inner);
  if (origInnerId) {
    const colorData = solidGradients.get(origInnerId);
    if (colorData) {
      solidGradients.set(innerIdStr, colorData);
      solidGradients.delete(origInnerId);
    }
  }
}

/**
 * @param {Map<string,ColorData>} solidGradients
 * @param {import('../lib/svgo/tools-svg.js').IdReferenceMap} allReferencedIds
 */
function updateSolidGradients(solidGradients, allReferencedIds) {
  /** @type {Map<string,ColorData>} */
  const gradientRefs = new Map();

  for (const [id, colorData] of solidGradients.entries()) {
    const referencingEls = allReferencedIds.get(id);
    if (!referencingEls) {
      continue;
    }
    for (const { referencingEl, referencingAtt } of referencingEls) {
      switch (referencingAtt) {
        case 'fill':
        case 'stroke':
          referencingEl.svgAtts.set(referencingAtt, colorData.color);
          break;
        case 'style':
          {
            const styleAttValue = StyleAttValue.getStyleAttValue(referencingEl);
            if (!styleAttValue) {
              continue;
            }
            for (const [propName, decl] of styleAttValue.entries()) {
              if (propName !== 'fill' && propName !== 'stroke') {
                continue;
              }
              const value = decl.value.toString();
              const idInfo = getReferencedIdInStyleProperty(value);
              if (!idInfo || idInfo.id !== id) {
                continue;
              }
              styleAttValue.set(propName, {
                value: colorData.color,
                important: decl.important,
              });
            }
          }
          break;
        case 'href':
          if (
            referencingEl.local === 'linearGradient' ||
            referencingEl.local === 'radialGradient'
          ) {
            const id = referencingEl.svgAtts.get('id');
            // If the solid color is being used as a template by another gradient, update any references to the referencing gradient.
            if (referencingEl.children.length === 0 && id) {
              gradientRefs.set(id.toString(), colorData);
            }
          }
          break;
      }
    }
  }

  if (gradientRefs.size > 0) {
    updateSolidGradients(gradientRefs, allReferencedIds);
  }
}

import { StopOffsetValue } from '../lib/attrs/stopOffsetValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { cssTransformToSVGAtt } from '../lib/svg-to-css.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import {
  getReferencedIdInStyleProperty,
  recordReferencedIds,
  SVGOError,
} from '../lib/svgo/tools.js';

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

  /** @type {import('../lib/svgo/tools.js').IdReferenceMap} */
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

        switch (element.name) {
          case 'linearGradient':
          case 'radialGradient':
            if (inlineGradients) {
              const id = element.attributes.id?.toString();
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
              const offset = element.attributes.offset;
              if (offset) {
                const value = StopOffsetValue.getObj(offset);
                const min = value.toString();
                if (min) {
                  element.attributes['offset'] = min;
                }
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
          if (referencedGradient.attributes.id !== templateId) {
            // This has already been merged, skip it.
            continue;
          }
          const templateRefs = allReferencedIds.get(templateId);
          if (templateRefs && templateRefs.length === 1) {
            const referencingEl = templateRefs[0].referencingEl;
            if (
              (referencingEl.name === 'linearGradient' ||
                referencingEl.name === 'radialGradient') &&
              referencingEl.name === referencedGradient.name
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
  if (firstChild.type !== 'element' || firstChild.name !== 'stop') {
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
    if (child.type !== 'element' || child.name !== 'stop') {
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
  const origInnerId = inner.attributes.id.toString();

  // Move all properties from outer gradient to the one it references.
  for (const [attName, attValue] of Object.entries(outer.attributes)) {
    switch (attName) {
      case 'href':
      case 'xlink:href':
        // Don't move these, just delete them.
        delete outer.attributes[attName];
        break;
      case 'gradientTransform':
      case 'style':
        // Skip these and handle them below.
        break;
      default:
        inner.attributes[attName] = attValue;
        delete outer.attributes[attName];
        if (attName === 'id') {
          childrenToDelete.add(outer);
        }
        break;
    }
  }

  // The only style property which may be relevant to a gradient is "transform". If it is there, convert it to gradientTransform
  // attribute.
  /** @type {import('../lib/types.js').SVGAttValue|undefined} */
  let transform = outer.attributes.gradientTransform;
  const styleAttValue = StyleAttValue.getStyleAttValue(outer);
  if (styleAttValue) {
    const cssTransform = styleAttValue.get('transform');
    if (cssTransform) {
      transform = cssTransformToSVGAtt(cssTransform);
      if (transform === undefined) {
        throw new SVGOError(
          `unable to convert css transform "${cssTransform}"`,
        );
      }
    }
  }
  if (transform) {
    inner.attributes['gradientTransform'] = transform;
    delete outer.attributes.gradientTransform;
    delete outer.attributes.style;

    // Remove the style attribute on the referenced gradient; the only useful property it should have is transform.
    delete inner.attributes.style;
  }

  // Update the gradient maps to reflect the moved id.
  const innerId = inner.attributes.id.toString();
  gradientMap.set(innerId, inner);
  if (origInnerId) {
    const colorData = solidGradients.get(origInnerId);
    if (colorData) {
      solidGradients.set(innerId, colorData);
      solidGradients.delete(origInnerId);
    }
  }
}

/**
 * @param {Map<string,ColorData>} solidGradients
 * @param {import('../lib/svgo/tools.js').IdReferenceMap} allReferencedIds
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
          referencingEl.attributes[referencingAtt] = colorData.color;
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
        case 'xlink:href':
          if (
            referencingEl.name === 'linearGradient' ||
            referencingEl.name === 'radialGradient'
          ) {
            // If the solid color is being used as a template by another gradient, update any references to the referencing gradient.
            if (
              referencingEl.children.length === 0 &&
              referencingEl.attributes.id
            ) {
              gradientRefs.set(
                referencingEl.attributes.id.toString(),
                colorData,
              );
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

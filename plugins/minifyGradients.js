import { ColorAttValue } from '../lib/attrs/colorAttValue.js';
import { OpacityAttValue } from '../lib/attrs/opacityAttValue.js';
import { PaintAttValue } from '../lib/attrs/paintAttValue.js';
import { StopOffsetAttValue } from '../lib/attrs/stopOffsetAttValue.js';
import { StyleAttValue } from '../lib/attrs/styleAttValue.js';
import { ChildDeletionQueue } from '../lib/svgo/childDeletionQueue.js';
import { recordReferencedIds } from '../lib/tools-ast.js';
import { getPresentationProperties } from './_styles.js';

export const name = 'minifyGradients';
export const description =
  'minify stop offsets and remove stops where possible';

/**
 * @typedef {{color:import('../types/types.js').ColorAttValue,opacity:import('../lib/types.js').AttValue|undefined}} ColorData
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
        if (element.uri !== undefined) {
          return;
        }

        // Record any referenced ids.
        recordReferencedIds(element, allReferencedIds);

        switch (element.local) {
          case 'linearGradient':
          case 'radialGradient':
            removeDuplicateStops(element);
            if (inlineGradients) {
              const id = element.svgAtts.get('id')?.toString();
              if (id) {
                gradientMap.set(id, element);

                const colorData = checkStops(element, styleData);
                if (
                  colorData &&
                  (colorData.opacity === undefined ||
                    colorData.opacity.toString() === '1')
                ) {
                  solidGradients.set(id, colorData);
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
  const props = styleData.computeOwnProps(firstChild);
  const color =
    /** @type {import('../types/types.js').ColorAttValue|undefined|null} */ (
      props.get('stop-color')
    );
  const opacity = props.get('stop-opacity');
  if (!color || opacity === null) {
    return;
  }
  for (let index = 1; index < element.children.length; index++) {
    const child = element.children[index];
    if (child.type !== 'element' || child.local !== 'stop') {
      return;
    }
    const props = styleData.computeOwnProps(child);
    if (
      props.get('stop-color')?.toString() !== color.toString() ||
      props.get('stop-opacity')?.toString() !== opacity?.toString()
    ) {
      return;
    }
  }
  return {
    color: color,
    opacity: opacity === undefined ? undefined : opacity,
  };
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
  const styleAttValue = StyleAttValue.getAttValue(outer);
  if (styleAttValue) {
    const cssTransform = styleAttValue.get('transform');
    if (cssTransform) {
      transform = cssTransform;
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
 * @param {import('../lib/types.js').XastElement} element
 */
function removeDuplicateStops(element) {
  /** @type {{
   * offset:StopOffsetAttValue,
   * color:import('../types/types.js').ColorAttValue,
   * opacity:import('../types/types.js').OpacityAttValue,
   * element:import('../lib/types.js').XastElement
   * }[]} */
  const stops = [];
  /** @type {Set<import('../lib/types.js').XastChild>} */
  const unneededStops = new Set();
  for (const child of element.children) {
    if (
      child.type !== 'element' ||
      child.uri !== undefined ||
      child.local !== 'stop'
    ) {
      continue;
    }
    /** @type {StopOffsetAttValue} */
    const offset = child.svgAtts.get('offset') ?? new StopOffsetAttValue('0');
    const props = getPresentationProperties(child);
    /** @type {ColorAttValue} */
    const color = props.get('stop-color') ?? new ColorAttValue('black');
    /** @type {import('../types/types.js').OpacityAttValue} */
    const opacity = props.get('stop-opacity') ?? new OpacityAttValue('1');
    const stop = {
      offset: offset,
      color: color,
      opacity: opacity,
      element: child,
    };

    if (stops.length > 0) {
      const lastStop = stops[stops.length - 1];
      // if (lastStop.offset.toString() === '1') {
      //   unneededStops.add(child);
      //   continue;
      // }

      if (
        lastStop.offset.toString() === stop.offset.toString() &&
        lastStop.color.toString() === stop.color.toString() &&
        lastStop.opacity.toString() === stop.opacity.toString()
      ) {
        unneededStops.add(child);
        continue;
      }
    }

    // If there are more than 2 consecutive stops with identical color/opacity, the intermediates are irrelevant.
    // if (stops.length > 1) {
    //   const lastStop = stops[stops.length - 1];
    //   const prevStop = stops[stops.length - 2];
    //   if (
    //     lastStop.color.toString() === stop.color.toString() &&
    //     lastStop.opacity.toString() === stop.opacity.toString() &&
    //     prevStop.color.toString() === stop.color.toString() &&
    //     prevStop.opacity.toString() === stop.opacity.toString()
    //   ) {
    //     unneededStops.add(lastStop.element);
    //     stops.pop();
    //   }
    // }

    stops.push(stop);
  }

  if (unneededStops.size > 0) {
    element.children = element.children.filter(
      (child) => !unneededStops.has(child),
    );
  }
}

/**
 * @param {Map<string,ColorData>} solidGradients
 * @param {import('../lib/tools-ast.js').IdReferenceMap} allReferencedIds
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
          referencingEl.svgAtts.set(
            referencingAtt,
            new PaintAttValue(undefined, false, colorData.color),
          );
          break;
        case 'style':
          {
            const styleAttValue = StyleAttValue.getAttValue(referencingEl);
            if (!styleAttValue) {
              continue;
            }
            for (const [propName, decl] of styleAttValue.entries()) {
              if (propName !== 'fill' && propName !== 'stroke') {
                continue;
              }
              const id = decl.getReferencedID();
              if (id === undefined) {
                continue;
              }
              styleAttValue.set(
                propName,
                new PaintAttValue(
                  undefined,
                  decl.isImportant(),
                  colorData.color,
                ),
              );
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

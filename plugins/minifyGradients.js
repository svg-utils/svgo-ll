import { cssPropToString, getStyleDeclarations } from '../lib/css-tools.js';
import { writeStyleAttribute } from '../lib/css.js';
import { StopOffsetValue } from '../lib/stop-offset.js';
import { svgSetAttValue } from '../lib/svg-parse-att.js';
import {
  getReferencedIdInStyleProperty,
  recordReferencedIds,
} from '../lib/svgo/tools.js';

export const name = 'minifyGradients';
export const description =
  'minify stop offsets and remove stops where possible';

/**
 * @typedef {{color:string,opacity:string|undefined}} ColorData
 */

/**
 * @type {import('./plugins-types.js').Plugin<'minifyGradients'>};
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  const checkForSolidColors = !styleData.hasStyles();

  /** @type {Map<string,ColorData>} */
  const solidGradients = new Map();

  /** @type {import('../lib/svgo/tools.js').IdReferenceMap} */
  const allReferencedIds = new Map();

  return {
    element: {
      enter: (element) => {
        // Record any referenced ids.
        recordReferencedIds(element, allReferencedIds);

        switch (element.name) {
          case 'linearGradient':
          case 'radialGradient':
            if (checkForSolidColors) {
              const id = element.attributes.id;
              if (id) {
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
                const value = StopOffsetValue.getStopOffsetObj(offset);
                const min = value.getMinifiedValue();
                if (min) {
                  svgSetAttValue(element, 'offset', min);
                }
              }
            }
            break;
        }
      },
    },
    root: {
      exit: () => {
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
            const props = getStyleDeclarations(referencingEl);
            if (!props) {
              continue;
            }
            for (const [propName, decl] of props.entries()) {
              if (propName !== 'fill' && propName !== 'stroke') {
                continue;
              }
              const value = cssPropToString(decl);
              const idInfo = getReferencedIdInStyleProperty(value);
              if (!idInfo || idInfo.id !== id) {
                continue;
              }
              props.set(propName, {
                value: colorData.color,
                important: decl.important,
              });
            }
            writeStyleAttribute(referencingEl, props);
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
              gradientRefs.set(referencingEl.attributes.id, colorData);
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

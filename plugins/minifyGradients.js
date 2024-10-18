import { StopOffsetValue } from '../lib/stop-offset.js';
import { svgSetAttValue } from '../lib/svg-parse-att.js';

export const name = 'minifyGradients';
export const description =
  'minify stop offsets and remove stops where possible';

/**
 * @type {import('./plugins-types.js').Plugin<'minifyGradients'>};
 */
export const fn = (root, params, info) => {
  const styleData = info.docData.getStyles();
  if (info.docData.hasScripts() || styleData === null) {
    return;
  }

  return {
    element: {
      enter: (element) => {
        switch (element.name) {
          case 'stop':
            {
              const offset = element.attributes.offset;
              if (!offset) {
                return;
              }
              const value = StopOffsetValue.getStopOffsetObj(offset);
              const min = value.getMinifiedValue();
              if (min) {
                svgSetAttValue(element, 'offset', min);
              }
            }
            break;
        }
      },
    },
  };
};

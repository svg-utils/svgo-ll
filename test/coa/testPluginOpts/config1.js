import * as cleanupTextNodes from '../../../plugins/cleanupTextNodes.js';
import * as minifyTransforms from '../../../plugins/minifyTransforms.js';

export default {
  plugins: { pre: [cleanupTextNodes], plugins: [minifyTransforms] },
};

import * as cleanupTextNodes from '../../../plugins/cleanupTextNodes.js';
import * as convertShapeToPath from '../../../plugins/convertShapeToPath.js';

export default {
  plugins: { pre: [cleanupTextNodes], plugins: [convertShapeToPath] },
};

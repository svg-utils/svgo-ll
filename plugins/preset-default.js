import { createPreset } from '../lib/svgo/plugins.js';
import * as cleanupIds from './cleanupIds.js';
import * as cleanupStyleAttributes from './cleanupStyleAttributes.js';
import * as cleanupXlink from './cleanupXlink.js';
import * as collapseGroups from './collapseGroups.js';
import * as combineStyleElements from './combineStyleElements.js';
import * as convertColors from './convertColors.js';
import * as convertEllipseToCircle from './convertEllipseToCircle.js';
import * as convertShapeToPath from './convertShapeToPath.js';
import * as inlineStyles from './inlineStyles.js';
import * as minifyPathData from './minifyPathData.js';
import * as minifyStyles from './minifyStyles.js';
import * as minifyTransforms from './minifyTransforms.js';
import * as moveElemsAttrsToGroup from './moveElemsAttrsToGroup.js';
import * as moveElemsStylesToGroup from './moveElemsStylesToGroup.js';
import * as removeComments from './removeComments.js';
import * as removeDesc from './removeDesc.js';
import * as removeDoctype from './removeDoctype.js';
import * as removeEditorsNSData from './removeEditorsNSData.js';
import * as removeEmptyContainers from './removeEmptyContainers.js';
import * as removeEmptyText from './removeEmptyText.js';
import * as removeHiddenElems from './removeHiddenElems.js';
import * as removeMetadata from './removeMetadata.js';
import * as removeNonInheritableGroupAttrs from './removeNonInheritableGroupAttrs.js';
import * as removeUnknownsAndDefaults from './removeUnknownsAndDefaults.js';
import * as removeUnusedNS from './removeUnusedNS.js';
import * as removeUselessStrokeAndFill from './removeUselessStrokeAndFill.js';
import * as removeXMLProcInst from './removeXMLProcInst.js';

const presetDefault = createPreset({
  name: 'preset-default',
  plugins: [
    removeDoctype,
    removeXMLProcInst,
    removeComments,
    removeMetadata,
    removeEditorsNSData,
    removeDesc,
    cleanupXlink,
    cleanupStyleAttributes,
    combineStyleElements,
    inlineStyles,
    minifyStyles,
    cleanupIds,
    convertColors,
    removeUnknownsAndDefaults,
    removeNonInheritableGroupAttrs,
    removeUselessStrokeAndFill,
    removeHiddenElems,
    removeEmptyText,
    minifyTransforms,
    convertEllipseToCircle,
    moveElemsAttrsToGroup,
    moveElemsStylesToGroup,
    collapseGroups,
    convertShapeToPath,
    minifyPathData,
    removeEmptyContainers,
    removeUnusedNS,
  ],
});

export default presetDefault;

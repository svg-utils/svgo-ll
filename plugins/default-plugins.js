import * as cleanupIds from './cleanupIds.js';
import * as cleanupStyleAttributes from './cleanupStyleAttributes.js';
import * as cleanupTextElements from './cleanupTextElements.js';
import * as cleanupXlink from './cleanupXlink.js';
import * as collapseGroups from './collapseGroups.js';
import * as combineStyleElements from './combineStyleElements.js';
import * as convertEllipseToCircle from './convertEllipseToCircle.js';
import * as convertShapeToPath from './convertShapeToPath.js';
import * as createGroups from './createGroups.js';
import * as inlineStyles from './inlineStyles.js';
import * as minifyAttrsAndStyles from './minifyAttrsAndStyles.js';
import * as mergeGradients from './mergeGradients.js';
import * as minifyColors from './minifyColors.js';
import * as minifyGradients from './minifyGradients.js';
import * as minifyIds from './minifyIds.js';
import * as minifyPathData from './minifyPathData.js';
import * as minifyStyles from './minifyStyles.js';
import * as minifyTransforms from './minifyTransforms.js';
import * as moveElemsStylesToGroup from './moveElemsStylesToGroup.js';
import * as removeComments from './removeComments.js';
import * as removeDesc from './removeDesc.js';
import * as removeDoctype from './removeDoctype.js';
import * as removeEditorsNSData from './removeEditorsNSData.js';
import * as removeEmptyContainers from './removeEmptyContainers.js';
import * as removeHiddenElems from './removeHiddenElems.js';
import * as removeMetadata from './removeMetadata.js';
import * as removeNonInheritableGroupAttrs from './removeNonInheritableGroupAttrs.js';
import * as removeUnknownsAndDefaults from './removeUnknownsAndDefaults.js';
import * as removeUnusedNS from './removeUnusedNS.js';
import * as removeUselessStrokeAndFill from './removeUselessStrokeAndFill.js';
import * as removeXMLProcInst from './removeXMLProcInst.js';
import * as stylesToClasses from './stylesToClasses.js';

/**
 * @typedef {Readonly<import('../lib/svgo.js').CustomPlugin[]>} ReadOnlyPluginList
 */

/** @type {Readonly<{pre:ReadOnlyPluginList, plugins:ReadOnlyPluginList,post:ReadOnlyPluginList}>} */
export const defaultPlugins = Object.freeze({
  pre: Object.freeze([
    removeDoctype,
    removeXMLProcInst,
    removeComments,
    removeMetadata,
    removeEditorsNSData,
    removeDesc,
    cleanupXlink,
    combineStyleElements,
  ]),
  plugins: Object.freeze([
    cleanupStyleAttributes,
    inlineStyles,
    minifyStyles,
    cleanupIds,
    minifyColors,
    minifyGradients,
    removeUnknownsAndDefaults,
    removeNonInheritableGroupAttrs,
    removeUselessStrokeAndFill,
    removeHiddenElems,
    minifyTransforms,
    convertEllipseToCircle,
    moveElemsStylesToGroup,
    convertShapeToPath,
    minifyPathData,
    mergeGradients,
    removeEmptyContainers,
    createGroups,
    collapseGroups,
    cleanupTextElements,
  ]),
  post: Object.freeze([
    removeUnusedNS,
    minifyIds,
    minifyAttrsAndStyles,
    stylesToClasses,
  ]),
});

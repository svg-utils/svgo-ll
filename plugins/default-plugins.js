import * as cleanupIds from './cleanupIds.js';
import * as cleanupAttributes from './cleanupAttributes.js';
import * as cleanupTextElements from './cleanupTextElements.js';
import * as cleanupTextNodes from './cleanupTextNodes.js';
import * as cleanupXlink from './cleanupXlink.js';
import * as collapseGroups from './collapseGroups.js';
import * as combineStyleElements from './combineStyleElements.js';
import * as convertEllipseToCircle from './convertEllipseToCircle.js';
import * as convertImageToUse from './convertImageToUse.js';
import * as convertPathToUse from './convertPathToUse.js';
import * as convertShapeToPath from './convertShapeToPath.js';
import * as createGroups from './createGroups.js';
import * as inlineStyles from './inlineStyles.js';
import * as mergeDefs from './mergeDefs.js';
import * as mergeGradients from './mergeGradients.js';
import * as minifyAttrsAndStyles from './minifyAttrsAndStyles.js';
import * as minifyClassNames from './minifyClassNames.js';
import * as minifyColors from './minifyColors.js';
import * as minifyGradients from './minifyGradients.js';
import * as minifyIds from './minifyIds.js';
import * as minifyPathData from './minifyPathData.js';
import * as minifyStyles from './minifyStyles.js';
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
    cleanupTextNodes,
    removeDoctype,
    removeXMLProcInst,
    removeComments,
    removeMetadata,
    removeEditorsNSData,
    removeDesc,
    cleanupXlink,
    combineStyleElements,
    cleanupAttributes,
  ]),
  plugins: Object.freeze([
    inlineStyles,
    // Run minifyStyles after inlineStyles; minifyStyles can split a single class reference into multiple references.
    minifyStyles,
    cleanupIds,
    minifyColors,
    minifyGradients,
    removeUnknownsAndDefaults,
    removeNonInheritableGroupAttrs,
    removeUselessStrokeAndFill,
    removeHiddenElems,
    // Run mergeDefs after removeHiddenElems, since removeHiddenElems may create <defs>.
    mergeDefs,
    convertEllipseToCircle,
    moveElemsStylesToGroup,
    convertShapeToPath,
    minifyPathData,
    mergeGradients,
    removeEmptyContainers,
    convertPathToUse,
    createGroups,
    collapseGroups,
    cleanupTextElements,
  ]),
  post: Object.freeze([
    removeUnusedNS,
    convertImageToUse,
    minifyIds,
    minifyAttrsAndStyles,
    stylesToClasses,
    minifyClassNames,
  ]),
});

import presetDefault from '../plugins/preset-default.js';
import presetNext from '../plugins/preset-next.js';
import presetNone from '../plugins/preset-none.js';
import * as addAttributesToSVGElement from '../plugins/addAttributesToSVGElement.js';
import * as cleanupIds from '../plugins/cleanupIds.js';
import * as cleanupStyleAttributes from '../plugins/cleanupStyleAttributes.js';
import * as cleanupTextElements from '../plugins/cleanupTextElements.js';
import * as cleanupXlink from '../plugins/cleanupXlink.js';
import * as collapseGroups from '../plugins/collapseGroups.js';
import * as combineStyleElements from '../plugins/combineStyleElements.js';
import * as convertEllipseToCircle from '../plugins/convertEllipseToCircle.js';
import * as convertShapeToPath from '../plugins/convertShapeToPath.js';
import * as createGroups from '../plugins/createGroups.js';
import * as inlineStyles from '../plugins/inlineStyles.js';
import * as inlineUse from '../plugins/inlineUse.js';
import * as mergeGradients from '../plugins/mergeGradients.js';
import * as minifyColors from '../plugins/minifyColors.js';
import * as minifyGradients from '../plugins/minifyGradients.js';
import * as minifyPathData from '../plugins/minifyPathData.js';
import * as minifyStyles from '../plugins/minifyStyles.js';
import * as minifyTransforms from '../plugins/minifyTransforms.js';
import * as moveElemsAttrsToGroup from '../plugins/moveElemsAttrsToGroup.js';
import * as moveElemsStylesToGroup from '../plugins/moveElemsStylesToGroup.js';
import * as moveGroupAttrsToElems from '../plugins/moveGroupAttrsToElems.js';
import * as removeComments from '../plugins/removeComments.js';
import * as removeDesc from '../plugins/removeDesc.js';
import * as removeDimensions from '../plugins/removeDimensions.js';
import * as removeDoctype from '../plugins/removeDoctype.js';
import * as removeEditorsNSData from '../plugins/removeEditorsNSData.js';
import * as removeEmptyAttrs from '../plugins/removeEmptyAttrs.js';
import * as removeEmptyContainers from '../plugins/removeEmptyContainers.js';
import * as removeHiddenElems from '../plugins/removeHiddenElems.js';
import * as removeMetadata from '../plugins/removeMetadata.js';
import * as removeNonInheritableGroupAttrs from '../plugins/removeNonInheritableGroupAttrs.js';
import * as removeStyleElement from '../plugins/removeStyleElement.js';
import * as removeTitle from '../plugins/removeTitle.js';
import * as removeUnknownsAndDefaults from '../plugins/removeUnknownsAndDefaults.js';
import * as removeUnusedNS from '../plugins/removeUnusedNS.js';
import * as removeUselessStrokeAndFill from '../plugins/removeUselessStrokeAndFill.js';
import * as removeXMLNS from '../plugins/removeXMLNS.js';
import * as removeXMLProcInst from '../plugins/removeXMLProcInst.js';
import * as round from '../plugins/round.js';
import * as sortAttrs from '../plugins/sortAttrs.js';
import * as sortDefsChildren from '../plugins/sortDefsChildren.js';

export const builtinPresets = new Set(['default', 'next', 'none']);

export const builtin = Object.freeze([
  presetDefault,
  presetNext,
  presetNone,
  addAttributesToSVGElement,
  cleanupIds,
  cleanupStyleAttributes,
  cleanupTextElements,
  cleanupXlink,
  collapseGroups,
  combineStyleElements,
  convertEllipseToCircle,
  convertShapeToPath,
  createGroups,
  inlineStyles,
  inlineUse,
  mergeGradients,
  minifyColors,
  minifyGradients,
  minifyPathData,
  minifyStyles,
  minifyTransforms,
  moveElemsAttrsToGroup,
  moveElemsStylesToGroup,
  moveGroupAttrsToElems,
  removeComments,
  removeDesc,
  removeDimensions,
  removeDoctype,
  removeEditorsNSData,
  removeEmptyAttrs,
  removeEmptyContainers,
  removeHiddenElems,
  removeMetadata,
  removeNonInheritableGroupAttrs,
  removeStyleElement,
  removeTitle,
  removeUnknownsAndDefaults,
  removeUnusedNS,
  removeUselessStrokeAndFill,
  removeXMLNS,
  removeXMLProcInst,
  round,
  sortAttrs,
  sortDefsChildren,
]);

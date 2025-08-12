import presetDefault from '../plugins/preset-default.js';
import presetNext from '../plugins/preset-next.js';
import presetNone from '../plugins/preset-none.js';
import * as addAttributesToSVGElement from '../plugins/addAttributesToSVGElement.js';
import * as addClassesToSVGElement from '../plugins/addClassesToSVGElement.js';
import * as cleanupIds from '../plugins/cleanupIds.js';
import * as cleanupStyleAttributes from '../plugins/cleanupStyleAttributes.js';
import * as cleanupTextElements from '../plugins/cleanupTextElements.js';
import * as cleanupXlink from '../plugins/cleanupXlink.js';
import * as collapseGroups from '../plugins/collapseGroups.js';
import * as combinePaths from '../plugins/combinePaths.js';
import * as combineStyleElements from '../plugins/combineStyleElements.js';
import * as convertEllipseToCircle from '../plugins/convertEllipseToCircle.js';
import * as convertShapeToPath from '../plugins/convertShapeToPath.js';
import * as convertStyleToAttrs from '../plugins/convertStyleToAttrs.js';
import * as createGroups from '../plugins/createGroups.js';
import * as inlineStyles from '../plugins/inlineStyles.js';
import * as inlineUse from '../plugins/inlineUse.js';
import * as mergePaths from '../plugins/mergePaths.js';
import * as mergeGradients from '../plugins/mergeGradients.js';
import * as minifyColors from '../plugins/minifyColors.js';
import * as minifyGradients from '../plugins/minifyGradients.js';
import * as minifyPathData from '../plugins/minifyPathData.js';
import * as minifyStyles from '../plugins/minifyStyles.js';
import * as minifyTransforms from '../plugins/minifyTransforms.js';
import * as moveElemsAttrsToGroup from '../plugins/moveElemsAttrsToGroup.js';
import * as moveElemsStylesToGroup from '../plugins/moveElemsStylesToGroup.js';
import * as moveGroupAttrsToElems from '../plugins/moveGroupAttrsToElems.js';
import * as prefixIds from '../plugins/prefixIds.js';
import * as removeAttributesBySelector from '../plugins/removeAttributesBySelector.js';
import * as removeAttrs from '../plugins/removeAttrs.js';
import * as removeComments from '../plugins/removeComments.js';
import * as removeDesc from '../plugins/removeDesc.js';
import * as removeDimensions from '../plugins/removeDimensions.js';
import * as removeDoctype from '../plugins/removeDoctype.js';
import * as removeEditorsNSData from '../plugins/removeEditorsNSData.js';
import * as removeElementsByAttr from '../plugins/removeElementsByAttr.js';
import * as removeEmptyAttrs from '../plugins/removeEmptyAttrs.js';
import * as removeEmptyContainers from '../plugins/removeEmptyContainers.js';
import * as removeHiddenElems from '../plugins/removeHiddenElems.js';
import * as removeMetadata from '../plugins/removeMetadata.js';
import * as removeNonInheritableGroupAttrs from '../plugins/removeNonInheritableGroupAttrs.js';
import * as removeOffCanvasPaths from '../plugins/removeOffCanvasPaths.js';
import * as removeRasterImages from '../plugins/removeRasterImages.js';
import * as removeScripts from '../plugins/removeScripts.js';
import * as removeStyleElement from '../plugins/removeStyleElement.js';
import * as removeTitle from '../plugins/removeTitle.js';
import * as removeUnknownsAndDefaults from '../plugins/removeUnknownsAndDefaults.js';
import * as removeUnusedNS from '../plugins/removeUnusedNS.js';
import * as removeUselessDefs from '../plugins/removeUselessDefs.js';
import * as removeUselessStrokeAndFill from '../plugins/removeUselessStrokeAndFill.js';
import * as removeViewBox from '../plugins/removeViewBox.js';
import * as removeXlink from '../plugins/removeXlink.js';
import * as removeXMLNS from '../plugins/removeXMLNS.js';
import * as removeXMLProcInst from '../plugins/removeXMLProcInst.js';
import * as reusePaths from '../plugins/reusePaths.js';
import * as round from '../plugins/round.js';
import * as sortAttrs from '../plugins/sortAttrs.js';
import * as sortDefsChildren from '../plugins/sortDefsChildren.js';

export const builtinPresets = new Set(['default', 'next', 'none']);

export const builtin = Object.freeze([
  presetDefault,
  presetNext,
  presetNone,
  addAttributesToSVGElement,
  addClassesToSVGElement,
  cleanupIds,
  cleanupStyleAttributes,
  cleanupTextElements,
  cleanupXlink,
  collapseGroups,
  combinePaths,
  combineStyleElements,
  convertEllipseToCircle,
  convertShapeToPath,
  convertStyleToAttrs,
  createGroups,
  inlineStyles,
  inlineUse,
  mergeGradients,
  mergePaths,
  minifyColors,
  minifyGradients,
  minifyPathData,
  minifyStyles,
  minifyTransforms,
  moveElemsAttrsToGroup,
  moveElemsStylesToGroup,
  moveGroupAttrsToElems,
  prefixIds,
  removeAttributesBySelector,
  removeAttrs,
  removeComments,
  removeDesc,
  removeDimensions,
  removeDoctype,
  removeEditorsNSData,
  removeElementsByAttr,
  removeEmptyAttrs,
  removeEmptyContainers,
  removeHiddenElems,
  removeMetadata,
  removeNonInheritableGroupAttrs,
  removeOffCanvasPaths,
  removeRasterImages,
  removeScripts,
  removeStyleElement,
  removeTitle,
  removeUnknownsAndDefaults,
  removeUnusedNS,
  removeUselessDefs,
  removeUselessStrokeAndFill,
  removeViewBox,
  removeXlink,
  removeXMLNS,
  removeXMLProcInst,
  reusePaths,
  round,
  sortAttrs,
  sortDefsChildren,
]);

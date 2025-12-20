import * as applyTransforms from '../plugins/applyTransforms.js';
import * as cleanupAttributes from '../plugins/cleanupAttributes.js';
import * as cleanupGradientAttributes from '../plugins/cleanupGradientAttributes.js';
import * as cleanupTextNodes from '../plugins/cleanupTextNodes.js';
import * as cleanupTextElements from '../plugins/cleanupTextElements.js';
import * as cleanupXlink from '../plugins/cleanupXlink.js';
import * as collapseGroups from '../plugins/collapseGroups.js';
import * as combineStyleElements from '../plugins/combineStyleElements.js';
import * as convertEllipseToCircle from '../plugins/convertEllipseToCircle.js';
import * as convertImageToUse from '../plugins/convertImageToUse.js';
import * as convertPathToUse from '../plugins/convertPathToUse.js';
import * as convertShapeToPath from '../plugins/convertShapeToPath.js';
import * as createGroups from '../plugins/createGroups.js';
import * as inlineStyles from '../plugins/inlineStyles.js';
import * as inlineUse from '../plugins/inlineUse.js';
import * as mergeFilters from '../plugins/mergeFilters.js';
import * as mergeGradients from '../plugins/mergeGradients.js';
import * as minifyAttrsAndStyles from '../plugins/minifyAttrsAndStyles.js';
import * as minifyClassNames from '../plugins/minifyClassNames.js';
import * as minifyColors from '../plugins/minifyColors.js';
import * as minifyGradients from '../plugins/minifyGradients.js';
import * as minifyIds from '../plugins/minifyIds.js';
import * as minifyPathData from '../plugins/minifyPathData.js';
import * as minifyPatterns from '../plugins/minifyPatterns.js';
import * as minifyStyles from '../plugins/minifyStyles.js';
import * as moveElemsStylesToGroup from '../plugins/moveElemsStylesToGroup.js';
import * as moveGradientAttsToTemplate from '../plugins/moveGradientAttsToTemplate.js';
import * as removeComments from '../plugins/removeComments.js';
import * as removeDesc from '../plugins/removeDesc.js';
import * as removeDimensions from '../plugins/removeDimensions.js';
import * as removeDoctype from '../plugins/removeDoctype.js';
import * as removeEditorsNSData from '../plugins/removeEditorsNSData.js';
import * as removeEmptyContainers from '../plugins/removeEmptyContainers.js';
import * as removeMetadata from '../plugins/removeMetadata.js';
import * as removeNonInheritableGroupAttrs from '../plugins/removeNonInheritableGroupAttrs.js';
import * as removeUnknownsAndDefaults from '../plugins/removeUnknownsAndDefaults.js';
import * as removeUnusedElements from '../plugins/removeUnusedElements.js';
import * as removeUnusedNS from '../plugins/removeUnusedNS.js';
import * as removeUselessProperties from '../plugins/removeUselessProperties.js';
import * as removeUselessStrokeAndFill from '../plugins/removeUselessStrokeAndFill.js';
import * as removeXMLProcInst from '../plugins/removeXMLProcInst.js';
import * as round from '../plugins/round.js';
import * as stylesToClasses from '../plugins/stylesToClasses.js';

/**
 * @template K
 * @template V
 */
class StaticMap {
  /** @type {Map<K,V>} */
  #map;

  /**
   * @param {Map<K,V>} map
   */
  constructor(map) {
    this.#map = map;
  }

  /**
   * @param {K} key
   * @returns {V|undefined}
   */
  get(key) {
    return this.#map.get(key);
  }

  /**
   * @param {K} key
   * @returns {boolean}
   */
  has(key) {
    return this.#map.has(key);
  }

  /**
   * @returns {IterableIterator<K>}
   */
  keys() {
    return this.#map.keys();
  }

  /**
   * @returns {IterableIterator<V>}
   */
  values() {
    return this.#map.values();
  }
}

/** @type {[string,import('../lib/svgo.js').CustomPlugin][]} */
const pluginList = [
  applyTransforms,
  cleanupAttributes,
  cleanupGradientAttributes,
  cleanupTextNodes,
  cleanupTextElements,
  cleanupXlink,
  collapseGroups,
  combineStyleElements,
  convertEllipseToCircle,
  convertImageToUse,
  convertPathToUse,
  convertShapeToPath,
  createGroups,
  inlineStyles,
  inlineUse,
  mergeFilters,
  mergeGradients,
  minifyAttrsAndStyles,
  minifyClassNames,
  minifyColors,
  minifyGradients,
  minifyIds,
  minifyPathData,
  minifyPatterns,
  minifyStyles,
  moveElemsStylesToGroup,
  moveGradientAttsToTemplate,
  removeComments,
  removeDesc,
  removeDimensions,
  removeDoctype,
  removeEditorsNSData,
  removeEmptyContainers,
  removeMetadata,
  removeNonInheritableGroupAttrs,
  removeUnknownsAndDefaults,
  removeUnusedElements,
  removeUnusedNS,
  removeUselessProperties,
  removeUselessStrokeAndFill,
  removeXMLProcInst,
  round,
  stylesToClasses,
].map((p) => [p.name, p]);

/** @type {StaticMap<string,Readonly<import('../lib/svgo.js').CustomPlugin>>} */
export const builtinPlugins = new StaticMap(new Map(pluginList));

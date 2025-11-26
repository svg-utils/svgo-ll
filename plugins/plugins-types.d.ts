import type { Plugin as PluginDef } from '../lib/types.js';

type BuiltinPlugins = {
  applyTransforms: void;
  cleanupAttributes: void;
  cleanupTextElements: void;
  cleanupTextNodes: void;
  cleanupXlink: void;
  collapseGroups: void;
  combineStyleElements: void;
  convertEllipseToCircle: void;
  convertImageToUse: void;
  convertPathToUse: void;
  convertShapeToPath: void;
  createGroups: void;
  inlineStyles: {
    /** If true, do not inline styles if any CSS at rules are present. */
    disableIfAtRulesPresent?: boolean;
    /**
     * Inlines selectors that match once only.
     *
     * @default true
     */
    onlyMatchedOnce?: boolean;
    /**
     * Clean up matched selectors. Unused selects are left as-is.
     *
     * @default true
     */
    removeMatchedSelectors?: boolean;
    /**
     * Pseudo-classes and elements to use. An empty string indicates all
     * all non-pseudo-classes and elements.
     */
    usePseudos?: string[];
  };
  inlineUse: void;
  mergeFilters: void;
  mergeGradients: void;
  minifyAttrsAndStyles: void;
  minifyClassNames: void;
  minifyColors: void;
  minifyGradients: void;
  minifyIds: {
    preserve?: string[];
    preservePrefixes?: string[];
  };
  minifyPathData: void;
  minifyStyles: void;
  moveElemsStylesToGroup: void;
  removeComments: {
    preservePatterns: Array<RegExp | string> | false;
  };
  removeDesc: {
    removeAny?: boolean;
  };
  removeDimensions: void;
  removeDoctype: void;
  removeEditorsNSData: {
    additionalNamespaces?: string[];
  };
  removeEmptyContainers: void;
  removeMetadata: void;
  removeNonInheritableGroupAttrs: void;
  removeUnknownsAndDefaults: {
    unknownAttrs?: boolean;
    defaultAttrs?: boolean;
    /**
     * If to remove XML declarations that are assigned their default value. XML
     * declarations are the properties in the `<?xml … ?>` block at the top of
     * the document.
     */
    defaultMarkupDeclarations?: boolean;
    uselessOverrides?: boolean;
    keepDataAttrs?: boolean;
    keepAriaAttrs?: boolean;
    keepRoleAttr?: boolean;
  };
  removeUnusedElements: void;
  removeUnusedNS: void;
  removeUselessProperties: void;
  removeUselessStrokeAndFill: void;
  removeXMLProcInst: void;
  round: {
    coordDigits?: number;
    fontSizeDigits?: number;
    opacityDigits?: number;
    stopOffsetDigits?: number;
    stdDeviationDigits?: number;
  };
  stylesToClasses: void;
};

export type Plugin<Name extends keyof BuiltinPlugins> = PluginDef<
  BuiltinPlugins[Name]
>;

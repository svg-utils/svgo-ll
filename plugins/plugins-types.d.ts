import type { Plugin as PluginDef } from '../lib/types.js';

type BuiltinPlugins = {
  cleanupAttributes: void;
  cleanupIds: {
    preserve?: string[];
    preservePrefixes?: string[];
  };
  cleanupTextElements: void;
  cleanupTextNodes: void;
  cleanupXlink: void;
  collapseGroups: void;
  combineStyleElements: void;
  convertEllipseToCircle: void;
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
  mergeDefs: void;
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
  minifyTransforms: void;
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
  removeHiddenElems: {
    isHidden?: boolean;
    displayNone?: boolean;
    opacity0?: boolean;
    circleR0?: boolean;
    ellipseRX0?: boolean;
    ellipseRY0?: boolean;
    rectWidth0?: boolean;
    rectHeight0?: boolean;
    patternWidth0?: boolean;
    patternHeight0?: boolean;
    imageWidth0?: boolean;
    imageHeight0?: boolean;
    pathEmptyD?: boolean;
    polylineEmptyPoints?: boolean;
    polygonEmptyPoints?: boolean;
  };
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
  removeUnusedNS: void;
  removeUselessStrokeAndFill: void;
  removeXMLProcInst: void;
  round: {
    coordDigits?: number;
    fontSizeDigits?: number;
    opacityDigits?: number;
    stopOffsetDigits?: number;
    stdDeviationDigits?: number;
  };
  sortAttrs: {
    order?: string[];
    xmlnsOrder?: 'front' | 'alphabetical';
  };
  stylesToClasses: void;
};

export type Plugin<Name extends keyof BuiltinPlugins> = PluginDef<
  BuiltinPlugins[Name]
>;

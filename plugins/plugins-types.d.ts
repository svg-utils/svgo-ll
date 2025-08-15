import type {
  Plugin as PluginDef,
  PluginInfo,
  XastElement,
} from '../lib/types.js';

type DefaultPlugins = {
  cleanupIds: {
    preserve?: string[];
    preservePrefixes?: string[];
  };
  cleanupStyleAttributes: void;
  cleanupStyleElements: void;
  cleanupTextElements: void;
  collapseGroups: void;
  convertEllipseToCircle: void;
  convertShapeToPath: {
    convertArcs?: boolean;
  };
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
     * Media queries to use. An empty string indicates all selectors outside of
     * media queries.
     */
    useMqs?: string[];
    /**
     * Pseudo-classes and elements to use. An empty string indicates all
     * all non-pseudo-classes and elements.
     */
    usePseudos?: string[];
  };
  mergeGradients: void;
  minifyColors: void;
  minifyGradients: void;
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
    unknownContent?: boolean;
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
  removeUselessStrokeAndFill: {
    stroke?: boolean;
    fill?: boolean;
    removeNone?: boolean;
  };
  removeXMLProcInst: void;
  sortAttrs: {
    order?: string[];
    xmlnsOrder?: 'front' | 'alphabetical';
  };
  sortDefsChildren: void;
};

type PresetDefaultOverrides = {
  [Name in keyof DefaultPlugins]?: DefaultPlugins[Name] | false;
};

export type BuiltinsWithOptionalParams = DefaultPlugins & {
  'preset-default': {
    overrides?: PresetDefaultOverrides;
  };
  'preset-none': {};
  cleanupXlink: void;
  inlineUse: void;
  removeDimensions: void;
  removeStyleElement: void;
  removeTitle: void;
  removeXMLNS: void;
  round: {
    coordDigits?: number;
    opacityDigits?: number;
    stopOffsetDigits?: number;
  };
};

export type BuiltinsWithRequiredParams = {};

export type PluginsParams = BuiltinsWithOptionalParams &
  BuiltinsWithRequiredParams;

export type Plugin<Name extends keyof PluginsParams> = PluginDef<
  PluginsParams[Name]
>;

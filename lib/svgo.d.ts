import type { StringifyOptions, DataUri, Plugin, XastRoot } from './types.js';

type CustomPlugin<T = any> = {
  name: string;
  description?: string;
  fn: Plugin<T>;
  params?: T;
};

export type ResolvedConfig = {
  path?: string;
  maxPasses?: number;
  js2svg?: import('./types.js').StringifyOptions;
  datauri?: import('./types.js').DataUri;
};

export type Config = ResolvedConfig & {
  plugins?: CustomPlugin[];
  pluginNames?: string[];
  enable?: string[];
  disable?: string[];
  // Configuration parameters for plugins.
  options?: Record<string, {}>;
};

type Output = {
  data: string;
  passes?: number;
  time?: number;
  parseTime?: number;
  ast?: XastRoot;
  error?: unknown;
};

export declare const _collections: {
  elemsGroups: Readonly<Record<string, Set<string>>>;
  /**
   * Elements where adding or removing whitespace may effect rendering, metadata,
   * or semantic meaning.
   *
   * @see https://developer.mozilla.org/docs/Web/HTML/Element/pre
   */
  textElems: Readonly<Set<string>>;
  pathElems: Readonly<Set<string>>;
  /**
   * @see https://www.w3.org/TR/SVG11/intro.html#Definitions
   */
  attrsGroups: Readonly<Record<string, Set<string>>>;
  attrsGroupsDefaults: Readonly<Record<string, Record<string, string>>>;
  /**
   * @see https://www.w3.org/TR/SVG11/eltindex.html
   */
  elems: Readonly<
    Record<
      string,
      {
        attrsGroups: Set<string>;
        attrs?: Set<string>;
        defaults?: Record<string, string>;
        deprecated?: {
          safe?: Set<string>;
          unsafe?: Set<string>;
        };
        contentGroups?: Set<string>;
        content?: Set<string>;
      }
    >
  >;
  /**
   * @see https://wiki.inkscape.org/wiki/index.php/Inkscape-specific_XML_attributes
   */
  editorNamespaces: Readonly<Set<string>>;
  /**
   * @see https://www.w3.org/TR/SVG11/linking.html#processingIRI
   */
  referencesProps: Readonly<Set<string>>;
  /**
   * @see https://www.w3.org/TR/SVG11/propidx.html
   */
  inheritableAttrs: Readonly<Set<string>>;
  presentationNonInheritableGroupAttrs: Readonly<Set<string>>;
  /**
   * @see https://www.w3.org/TR/SVG11/single-page.html#types-ColorKeywords
   */
  colorsNames: Readonly<Record<string, string>>;
  colorsShortNames: Readonly<Record<string, string>>;
  /**
   * @see https://www.w3.org/TR/SVG11/single-page.html#types-DataTypeColor
   */
  colorsProps: Readonly<Set<string>>;
  /**
   * @see https://developer.mozilla.org/docs/Web/CSS/Pseudo-classes
   */
  pseudoClasses: Readonly<Record<string, Set<string>>>;
};

export declare const VERSION: string;

export declare const builtinPlugins: Map<string, CustomPlugin>;

export declare const defaultPlugins: CustomPlugin[];

export type OptimizationCallbackInfo = {
  type: 'plugin';
  pluginName: string;
  event: 'begin' | 'end';
  passNumber: number;
};
export type OptimizationCallback = (info: OptimizationCallbackInfo) => void;

export declare function resolvePlugins(config: Config): CustomPlugin[];

export declare function optimize(
  input: string,
  config?: Config,
  callback?: OptimizationCallback,
): Output;

export declare function optimizeResolved(
  input: string,
  config: Config,
  resolvedPlugins: CustomPlugin[],
  callback?: OptimizationCallback,
): Output;

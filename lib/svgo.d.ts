import type { StringifyOptions, DataUri, Plugin, XastRoot } from './types.js';
import type { PluginsParams } from '../plugins/plugins-types.js';

type CustomPlugin<T = any> = {
  name: string;
  description?: string;
  fn: Plugin<T>;
  params?: T;
};

export type Config = {
  /** Can be used by plugins, for example prefixids */
  path?: string;
  maxPasses?: number;
  plugins?: CustomPlugin[];
  pluginNames?: string[];
  enable?: string[];
  disable?: string[];
  // Configuration parameters for plugins.
  options?: Record<string, {}>;
  /** Options for rendering optimized SVG from AST. */
  js2svg?: StringifyOptions;
  /** Output as Data URI string. */
  datauri?: DataUri;
};

type Output = {
  data: string;
  passes: number;
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

/** Installed version of SVGO. */
export declare const VERSION: string;

/** The core of SVGO */
export declare function optimize(input: string, config?: Config): Output;

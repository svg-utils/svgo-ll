import { CSSRule } from '../types/types.js';

export type XastDoctype = {
  type: 'doctype';
  parentNode: XastParent;
  name: string;
  data: {
    doctype: string;
  };
};

export type XastInstruction = {
  type: 'instruction';
  parentNode: XastParent;
  name: string;
  value: string;
};

export type XastComment = {
  type: 'comment';
  parentNode: XastParent;
  value: string;
};

export type XastText = {
  type: 'text';
  parentNode: XastParent;
  value: string;
};

export type SVGAttValue = string | AttValue;
export type XastAttOther = {
  prefix: string | undefined;
  local: string;
  uri: string;
  value: string;
};
export type XastAttSvg = {
  local: string;
  value: AttValue;
};
export type SvgAttValues = {
  keys(): IterableIterator<string>;
  delete(name: string): void;
  entries(): IterableIterator<[string, AttValue]>;
  get<T extends AttValue>(name: string): T | undefined;
  hasAttributes(): boolean;
  set(name: string, value: AttValue): void;
  values(): IterableIterator<AttValue>;
};
export type XastElement = {
  type: 'element';
  parentNode: XastParent;
  local: string;
  prefix: string;
  uri: string | undefined;
  svgAtts: SvgAttValues;
  otherAtts: XastAttOther[] | undefined;
  children: XastChild[];
  isSelfClosing?: boolean;
};

export type ParentList = {
  element: XastParent;
}[];

export type XastChild =
  | XastDoctype
  | XastInstruction
  | XastComment
  | XastText
  | XastElement;

export type XastRoot = {
  type: 'root';
  children: XastChild[];
};

export type XastParent = XastRoot | XastElement;

export type XastNode = XastRoot | XastChild;

export type StringifyOptions = {
  indent?: number | string;
  pretty?: boolean;
  eol?: 'lf' | 'crlf';
  finalNewline?: boolean;
};

type VisitorNode<Node> = {
  enter?: (node: Node, parentList: Readonly<ParentList>) => void | symbol;
  exit?: (node: Node, parentList: Readonly<ParentList>) => void;
};

type VisitorRoot = {
  enter?: (node: XastRoot) => void | symbol;
  exit?: (node: XastRoot) => void;
};

export type Visitor = {
  doctype?: VisitorNode<XastDoctype>;
  instruction?: VisitorNode<XastInstruction>;
  comment?: VisitorNode<XastComment>;
  text?: VisitorNode<XastText>;
  element?: VisitorNode<XastElement>;
  root?: VisitorRoot;
};

export class DocData {
  hasAnimations(): boolean;
  hasScripts(): boolean;
  getStyles(): StyleData | null;
}

type CSSGlobalKeyword = 'inherit' | 'revert' | 'initial' | 'unset';

type CSSFeatures =
  | 'atrules'
  | 'attribute-selectors'
  | 'class-selectors'
  | 'combinators'
  | 'id-selectors'
  | 'pseudos'
  | 'type-selectors';

export type AttValue = {
  isImportant(): boolean;
  round(numDigits: number): AttValue;
  toString(): string;
  toStyleAttString(): string;
  toStyleElementString(): string;
};

export class StyleData {
  addStyleSection(css: string): void;
  computeOwnStyle(node: XastElement): Map<string, string | null>;
  computeParentStyle(
    parentList: Readonly<ParentList>,
  ): Map<string, string | null>;
  computeStyle(
    node: XastElement,
    parentList: Readonly<ParentList>,
    declarations?: CSSDeclarationMap,
  ): ComputedStyleMap;
  deleteRules(rules: Set<CSSRule>): void;
  getFeatures(): Set<CSSFeatures>;
  getIdsReferencedByProperties(): string[];
  getMatchingRules(element: XastElement): CSSRule[];
  getReferencedClasses(): Set<string>;
  getReferencedIds(): Map<string, CSSRule[]>;
  hasAttributeSelector(attName?: string): boolean;
  hasClassReference(className: string): boolean;
  hasIdSelector(id: string): boolean;
  hasOnlyFeatures(features: CSSFeatures[]): boolean;
  hasStyles(): boolean;
  hasTypeSelector(tagName: string): boolean;
  mergeStyles(): void;
  minifyStyles(usage: {
    tags?: string[];
    ids?: string[];
    classes?: string[];
  }): void;
  updateClassNames(renameMap: Map<string, string>): void;
  updateReferencedIds(
    styleElementIds: Map<string, CSSRule[]>,
    idMap: Map<string, string>,
  ): void;
  writeRules(): void;
}

export type ComputedStyleMap = Map<string, string | null>;
/** @deprecated */
export type CSSPropertyMap = Map<string, CSSPropertyValue>;

/** @deprecated */
export type CSSPropertyValue = {
  value: SVGAttValue;
  important: boolean;
};

/** @deprecated */
export type CSSDeclarationMap = {
  delete(name: string): void;
  entries(): IterableIterator<[string, CSSPropertyValue]>;
  keys(): IterableIterator<string>;
  get(name: string): CSSPropertyValue | undefined;
  set(name: string, value: CSSPropertyValue): void;
  values(): IterableIterator<CSSPropertyValue>;
};

export type PluginInfo = {
  path?: string;
  passNumber: number;
  docData: DocData;
};

export type Plugin<Params> = (
  info: PluginInfo,
  params: Params,
) => Visitor | null | void;

export type Specificity = [number, number, number];

export type StylesheetDeclaration = {
  name: string;
  value: string;
  important: boolean;
};

export type StylesheetRule = {
  dynamic: boolean;
  selector: string;
  specificity: Specificity;
  declarations: StylesheetDeclaration[];
};

export type Stylesheet = {
  rules: StylesheetRule[];
  parents: Map<XastElement, XastParent>;
};

type StaticStyle = {
  type: 'static';
  inherited: boolean;
  value: string;
};

type DynamicStyle = {
  type: 'dynamic';
  inherited: boolean;
};

export type ComputedStyles = Record<string, StaticStyle | DynamicStyle>;

export type PathDataCommand =
  | 'M'
  | 'm'
  | 'Z'
  | 'z'
  | 'L'
  | 'l'
  | 'H'
  | 'h'
  | 'V'
  | 'v'
  | 'C'
  | 'c'
  | 'S'
  | 's'
  | 'Q'
  | 'q'
  | 'T'
  | 't'
  | 'A'
  | 'a';

export type DataUri = 'base64' | 'enc' | 'unenc';

export type ExactNum = {
  add(n: ExactNum): ExactNum | undefined;
  clone(): ExactNum;
  getMinifiedString(): string;
  isEqualTo(n: ExactNum): boolean;
  isZero(): boolean;
  negate(): ExactNum;
  round(numDigits: number): ExactNum;
  sub(n: ExactNum): ExactNum | undefined;
};

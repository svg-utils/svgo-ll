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

export type XastCdata = {
  type: 'cdata';
  parentNode: XastParent;
  value: string;
};

export type XastText = {
  type: 'text';
  parentNode: XastParent;
  value: string;
};

export type SVGAttValue = string | AttValue;
export type XastElement = {
  type: 'element';
  parentNode: XastParent;
  /** @deprecated */
  name: string;
  local: string;
  prefix: string;
  uri: string | undefined;
  attributes: Record<string, SVGAttValue>;
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
  | XastCdata
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
  cdata?: VisitorNode<XastCdata>;
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
  | 'combinators'
  | 'pseudos'
  | 'simple-selectors';

export class AttValue {
  round(numDigits: number): AttValue;
  toString(): string;
  toStyleAttString(): string;
  toStyleElementString(): string;
}

export class LengthValue extends AttValue {}
export class PctValue extends AttValue {}

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
  ): Map<string, string | null>;
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

export class CSSRule {
  addReferencedClasses(classes: Set<string>): void;
  addReferencedIds(ids: Map<string, CSSRule[]>): void;
  getDeclarations(): Map<string, CSSPropertyValue>;
  getFeatures(): Set<CSSFeatures>;
  getSpecificity(): [number, number, number];
  hasAttributeSelector(attName: string | undefined): boolean;
  hasPseudos(): boolean;
  isInMediaQuery(): boolean;
  matches(element: XastElement): boolean;
  updateClassNames(renameMap: Map<string, string>): void;
  updateReferencedIds(ids: Map<string, string>): void;
}

export class CSSRuleSet {
  deleteRules(rules: Set<CSSRule>): void;
  getFeatures(): Set<CSSFeatures>;
  getRules(): CSSRule[];
  getString(): string;
  hasAtRules(): boolean;
  hasIdSelector(id: string): boolean;
  hasTypeSelector(type: string): boolean;
}

export type CSSPropertyValue = {
  value: SVGAttValue;
  important: boolean;
};

export type CSSDeclarationMap = {
  entries(): IterableIterator<[string, CSSPropertyValue]>;
  delete(name: string): void;
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
  clone(): ExactNum;
  getMinifiedString(): string;
  isEqualTo(n: ExactNum): boolean;
  isZero(): boolean;
  negate(): ExactNum;
  round(numDigits: number): ExactNum;
};

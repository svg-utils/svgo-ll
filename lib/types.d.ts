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

export type XastElement = {
  type: 'element';
  parentNode: XastParent;
  name: string;
  attributes: Record<string, string>;
  children: XastChild[];
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
  doctypeStart?: string;
  doctypeEnd?: string;
  procInstStart?: string;
  procInstEnd?: string;
  tagOpenStart?: string;
  tagOpenEnd?: string;
  tagCloseStart?: string;
  tagCloseEnd?: string;
  tagShortStart?: string;
  tagShortEnd?: string;
  attrStart?: string;
  attrEnd?: string;
  commentStart?: string;
  commentEnd?: string;
  cdataStart?: string;
  cdataEnd?: string;
  textStart?: string;
  textEnd?: string;
  indent?: number | string;
  regEntities?: RegExp;
  regValEntities?: RegExp;
  encodeEntity?: (char: string) => string;
  pretty?: boolean;
  useShortTags?: boolean;
  eol?: 'lf' | 'crlf';
  finalNewline?: boolean;
};

type VisitorNode<Node> = {
  enter?: (
    node: Node,
    parentNode: XastParent,
    parents: ParentList,
  ) => void | symbol;
  exit?: (node: Node, parentNode: XastParent, parents: ParentList) => void;
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

type CSSFeatures =
  | 'atrules'
  | 'attribute-selectors'
  | 'combinators'
  | 'pseudos'
  | 'simple-selectors';

export class StyleData {
  computeOwnStyle(node: XastElement): Map<string, string | null>;
  computeParentStyle(
    parentInfo: { element: XastParent; styles?: Map<string, string | null> }[],
  ): Map<string, string | null>;
  computeStyle(
    node: XastElement,
    parentInfo: { element: XastParent; styles?: Map<string, string | null> }[],
    declarations?: CSSDeclarationMap,
  ): Map<string, string | null>;
  deleteRules(rules: Set<CSSRule>): void;
  getFeatures(): Set<CSSFeatures>;
  getFirstStyleElement(): XastElement | undefined;
  getIdsReferencedByProperties(): string[];
  getMatchingRules(element: XastElement): CSSRule[];
  getReferencedIds(): Map<string, CSSRule[]>;
  hasAttributeSelector(attName?: string): boolean;
  hasClassReference(className: string): boolean;
  hasOnlyFeatures(features: CSSFeatures[]): boolean;
  hasStyles(): boolean;
  mergeStyles(): void;
  minifyStyles(usage: {
    tags: string[];
    ids: string[];
    classes: string[];
  }): void;
  updateReferencedIds(
    styleElementIds: Map<string, CSSRule[]>,
    idMap: Map<string, string>,
  ): void;
  writeRules(): void;
}

export class CSSRule {
  addReferencedClasses(classes: Set<string>): void;
  getDeclarations(): Map<string, { value: string; important?: boolean }>;
  getFeatures(): Set<CSSFeatures>;
  getSpecificity(): [number, number, number];
  hasAttributeSelector(attName: string | undefined): boolean;
  hasPseudos(): boolean;
  isInMediaQuery(): boolean;
  matches(element: XastElement): boolean;
}

export type CSSPropertyValue = { value: string; important: boolean };

export type CSSDeclarationMap = Map<string, CSSPropertyValue>;

export type PluginInfo = {
  path?: string;
  passNumber: number;
  docData: DocData;
};

export type Plugin<Params> = (
  root: XastRoot,
  params: Params,
  info: PluginInfo,
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

export type PathDataItem = {
  command: PathDataCommand;
  args: number[];
};

export type DataUri = 'base64' | 'enc' | 'unenc';

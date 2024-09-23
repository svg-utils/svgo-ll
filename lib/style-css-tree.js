import * as csstree from 'css-tree';
import * as CSSselect from 'css-select';
import { syntax } from 'csso';
import xastAdaptor from './svgo/css-select-adapter.js';
import {
  CSSParseError,
  CSSRuleSet,
  CSSRule,
  CSSSelector,
  CSSSelectorSequence,
} from './css.js';

/**
 * @typedef {import('./types.js').CSSFeatures} CSSFeatures
 */

const SELECT_OPTIONS = {
  xmlMode: true,
  adapter: xastAdaptor,
};

const REGEX_NESTED_SELECTOR = /{.*}/;

class CSSRuleConcrete extends CSSRule {
  // @ts-ignore
  #compiledSelector;

  /**
   * @param {import('./types.js').XastElement} element
   * @returns {boolean}
   */
  matches(element) {
    if (!this.#compiledSelector) {
      this.#compiledSelector = CSSselect.compile(
        this.getSelectorStringWithoutPseudos(),
        SELECT_OPTIONS,
      );
    }
    return CSSselect.is(element, this.#compiledSelector, SELECT_OPTIONS);
  }
}

/**
 * @type {(ruleNode: csstree.Rule,isInMediaQuery:boolean) => CSSRuleConcrete[]}
 */
const parseRule = (ruleNode, isInMediaQuery) => {
  /**
   * @param {csstree.CssNode} listNode
   */
  function createSelectorList(listNode) {
    /** @type {{selector:CSSSelector,specificity:[number,number,number]}[]} */
    const selectors = [];
    csstree.walk(listNode, (node) => {
      switch (node.type) {
        case 'Selector':
          selectors.push({
            selector: createCSSSelector(node),
            specificity: syntax.specificity(node),
          });
          return csstree.walk.skip;
        case 'SelectorList':
          // expected
          break;
        default:
          throw new Error(`unexpected node type ${node.type}`);
      }
    });
    return selectors;
  }

  function getSelectorsAndDeclarations() {
    /** @type {{selectorList?:{selector:CSSSelector,specificity:[number,number,number]}[],declarations?:Map<string,{value:string,important?:boolean}>}} */
    const data = {};
    csstree.walk(ruleNode, (node) => {
      switch (node.type) {
        case 'Block':
          data.declarations = parseStyleSheetDeclarations(node);
          return csstree.walk.skip;
        case 'Rule':
          // expected
          break;
        case 'SelectorList':
          data.selectorList = createSelectorList(node);
          return csstree.walk.skip;
        default:
          throw new Error(`unexpected node type ${node.type}`);
      }
    });
    return data;
  }

  const data = getSelectorsAndDeclarations();

  const declarations = data.declarations;
  if (declarations === undefined || data.selectorList === undefined) {
    throw new Error();
  }

  return data.selectorList.map(
    (s) =>
      new CSSRuleConcrete(
        s.selector,
        s.specificity,
        declarations,
        isInMediaQuery,
      ),
  );
};

/**
 * @param {csstree.Selector} node
 */
function createCSSSelector(node) {
  /**
   * @param {csstree.Selector} node
   */
  function cloneSelectorWithoutPseudos(node) {
    return {
      type: node.type,
      children: node.children.filter((n) => !isPseudo(n)).map(csstree.clone),
    };
  }

  /**
   * @param {csstree.CssNode} node
   */
  function isPseudo(node) {
    return (
      node.type === 'PseudoClassSelector' ||
      node.type === 'PseudoElementSelector'
    );
  }

  /**
   * @param {csstree.CssNode} node
   * @returns {import('./css.js').SimpleSelector}
   */
  function getSimpleSelector(node) {
    switch (node.type) {
      case 'ClassSelector':
      case 'IdSelector':
      case 'PseudoClassSelector':
      case 'PseudoElementSelector':
      case 'TypeSelector':
        return { type: node.type, name: node.name };
      case 'AttributeSelector':
        switch (node.name.type) {
          case 'Identifier':
            return {
              type: 'AttributeSelector',
              name: node.name.name,
              matcher: node.matcher,
              value:
                node.value === null
                  ? null
                  : node.value.type === 'Identifier'
                    ? node.value.name
                    : node.value.value,
            };
        }
        break;
      case 'NestingSelector':
        throw new CSSParseError('CSS nesting is not supported');
    }
    throw new Error(JSON.stringify(node));
  }

  /** @type {CSSSelectorSequence[]} */
  const selectorSequence = [];
  let combinator;
  /** @type {import('./css.js').SimpleSelector[]} */
  let simpleSelectors = [];
  let hasPseudos = false;
  for (const child of node.children) {
    switch (child.type) {
      case 'Combinator':
        selectorSequence.push(
          new CSSSelectorSequence(combinator, simpleSelectors),
        );
        combinator = child.name;
        simpleSelectors = [];
        break;
      case 'AttributeSelector':
      case 'ClassSelector':
      case 'IdSelector':
      case 'PseudoClassSelector':
      case 'PseudoElementSelector':
      case 'TypeSelector':
        if (isPseudo(child)) {
          hasPseudos = true;
        }
        simpleSelectors.push(getSimpleSelector(child));
        break;
      default:
        throw new Error(`unexpected node type ${child.type}`);
    }
  }
  selectorSequence.push(new CSSSelectorSequence(combinator, simpleSelectors));

  const strWithoutPseudos = hasPseudos
    ? csstree.generate(cloneSelectorWithoutPseudos(node))
    : undefined;
  return new CSSSelector(
    selectorSequence,
    csstree.generate(node),
    strWithoutPseudos,
  );
}

/**
 * @param {csstree.CssNode} ast
 * @returns {Map<string,import('./types.js').CSSPropertyValue>}
 */
export function parseStyleSheetDeclarations(ast) {
  /** @type {Map<string,import('./types.js').CSSPropertyValue>} */
  const declarations = new Map();
  csstree.walk(ast, (cssNode) => {
    switch (cssNode.type) {
      case 'Block':
        // Should be just one initial block.
        break;
      case 'Declaration':
        declarations.set(cssNode.property.toLowerCase(), {
          value: csstree.generate(cssNode.value),
          important: !!cssNode.important,
        });
        break;
      case 'Raw':
        // Raw nodes are expected for the value portion of a property. However, css-tree 3.0.0 does not parse
        // nested selectors correctly (see https://github.com/csstree/csstree/issues/268), so we need to check the value
        // for somwthing that looks like a nested selector.
        if (REGEX_NESTED_SELECTOR.test(cssNode.value)) {
          throw new CSSParseError('CSS nesting is not supported');
        }
        break;
      case 'Rule':
        throw new CSSParseError('CSS nesting is not supported');
      default:
        throw new Error(`unexpected node type ${cssNode.type}`);
    }
  });
  return declarations;
}

/**
 * @type {(css: string,media:string|undefined) => CSSRuleSet[]}
 */
export const parseStylesheet = (css, media) => {
  /**
   * @param {CSSRuleConcrete[]} rules
   * @param {string} [atRule]
   */
  function addRuleSet(rules, atRule) {
    if (rules.length === 0) {
      return rules;
    }
    ruleSets.push(new CSSRuleSet(rules, atRule));
    return [];
  }

  if (media !== undefined) {
    media = media.trim();
    if (media === '' || media === 'all') {
      media = undefined;
    } else {
      media = 'media ' + media;
    }
  }

  /** @type {CSSRuleSet[]} */
  const ruleSets = [];

  /** @type {CSSRuleConcrete[]} */
  let rules = [];

  const ast = csstree.parse(css, {
    parseValue: false,
    parseAtrulePrelude: false,
  });
  csstree.walk(ast, (cssNode) => {
    switch (cssNode.type) {
      case 'Rule':
        rules.push(...parseRule(cssNode, false));
        return csstree.walk.skip;
      case 'Atrule': {
        switch (cssNode.name) {
          case 'media': {
            if (media) {
              throw new CSSParseError(
                `at rule found within media="${media}" style`,
              );
            }
            rules = addRuleSet(rules, media);

            const name = cssNode.name;
            const data = cssNode.prelude
              ? ' ' + csstree.generate(cssNode.prelude)
              : '';
            const atRule =
              name === 'media' && (data === ' all' || data === '')
                ? undefined
                : `${name}${data}`;

            csstree.walk(cssNode, (ruleNode) => {
              if (ruleNode.type === 'Rule') {
                rules.push(...parseRule(ruleNode, atRule !== undefined));
                return csstree.walk.skip;
              }
            });
            rules = addRuleSet(rules, atRule);
            return csstree.walk.skip;
          }
          default:
            throw new CSSParseError(`unsupported style rule: @${cssNode.name}`);
        }
      }
      case 'StyleSheet':
        break;
      default:
        throw new CSSParseError(`unrecognized node type: ${cssNode.type}`);
    }
  });

  addRuleSet(rules, media);

  return ruleSets;
};

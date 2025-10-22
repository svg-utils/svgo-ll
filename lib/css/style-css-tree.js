import * as csstree from 'css-tree';
import * as CSSselect from 'css-select';
import { syntax } from 'csso';
import xastAdaptor from './css-select-adapter.js';
import { setStyleProperty } from './css-tools.js';
import { SvgAttMap } from '../ast/svgAttMap.js';
import {
  CSSParseError,
  CSSRule,
  CSSRuleSet,
  CSSSelector,
  CSSSelectorSequence,
} from './css.js';

/** @type {import('css-select').Options<import('../types.js').XastNode,import('../types.js').XastElement>} */
const SELECT_OPTIONS = {
  xmlMode: true,
  adapter: xastAdaptor,
};

const REGEX_NESTED_SELECTOR = /{.*}/;

export class CSSRuleConcrete extends CSSRule {
  // @ts-ignore
  #compiledSelector;

  /**
   * @param {import('../types.js').XastElement} element
   * @returns {boolean}
   */
  matches(element) {
    if (!this.#compiledSelector) {
      // Try to do a simple match with the rule.
      const result = super._matches(element);
      if (result !== null) {
        return result;
      }
      this.#compiledSelector = CSSselect.compile(
        this.getSelectorStringWithoutPseudos(),
        SELECT_OPTIONS,
      );
    }
    return CSSselect.is(element, this.#compiledSelector, SELECT_OPTIONS);
  }

  /**
   * @param {Map<string,string>} idMap
   */
  updateReferencedIds(idMap) {
    super.updateReferencedIds(idMap);
    // Clear cached compilation.
    this.#compiledSelector = undefined;
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
    /** @type {{selectorList?:{selector:CSSSelector,specificity:[number,number,number]}[],declarations?:SvgAttMap}} */
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
   * @param {csstree.CssNode} node
   * @returns {import('./css.js').SimpleSelector}
   */
  function getSimpleSelector(node) {
    switch (node.type) {
      case 'ClassSelector':
      case 'IdSelector':
      case 'TypeSelector':
        return { type: node.type, name: node.name };
      case 'PseudoClassSelector':
      case 'PseudoElementSelector': {
        let args;
        if (node.children) {
          const child = node.children.first;
          if (node.children.size !== 1) {
            throw new CSSParseError(
              `child count = ${node.children.size} for ${node.type}:${node.name}`,
            );
          }
          if (child === null) {
            throw new CSSParseError(
              `child is null for ${node.type}:${node.name}`,
            );
          }
          args = csstree.generate(child);
        }
        return { type: node.type, name: node.name, args: args };
      }
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
              flags: node.flags,
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
        simpleSelectors.push(getSimpleSelector(child));
        break;
      default:
        throw new Error(`unexpected node type ${child.type}`);
    }
  }
  selectorSequence.push(new CSSSelectorSequence(combinator, simpleSelectors));

  return new CSSSelector(selectorSequence);
}

/**
 * @param {csstree.CssNode} ast
 * @returns {SvgAttMap}
 */
export function parseStyleSheetDeclarations(ast) {
  const declarations = new SvgAttMap();
  csstree.walk(ast, (cssNode) => {
    switch (cssNode.type) {
      case 'Block':
        // Should be just one initial block.
        break;
      case 'Declaration':
        {
          const name = cssNode.property.toLowerCase();
          setStyleProperty(
            declarations,
            name,
            csstree.generate(cssNode.value),
            !!cssNode.important,
          );
        }
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
 * @param {string} css
 * @param {string} [media]
 * @returns {import('./css.js').CSSRuleSet[]}
 */
export function parseStylesheet(css, media) {
  /**
   * @param {CSSRuleConcrete[]} rules
   * @param {string|undefined} atRule
   * @param {string[]} fontFaces
   */
  function addRuleSet(rules, atRule, fontFaces) {
    if (rules.length === 0) {
      return rules;
    }
    ruleSets.push(new CSSRuleSet(rules, atRule, fontFaces));
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

  /** @type {import('./css.js').CSSRuleSet[]} */
  const ruleSets = [];
  /** @type {CSSRuleConcrete[]} */
  let rules = [];
  /** @type {string[]} */
  let fontFaces = [];

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
            rules = addRuleSet(rules, media, fontFaces);
            fontFaces = [];

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
            rules = addRuleSet(rules, atRule, fontFaces);
            return csstree.walk.skip;
          }
          case 'font-face':
            // Should just be a single block; stringify it.
            csstree.walk(cssNode, (node) => {
              if (node.type === 'Block') {
                fontFaces.push(csstree.generate(node));
                return csstree.walk.skip;
              }
            });
            return csstree.walk.skip;
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

  addRuleSet(rules, media, fontFaces);

  return ruleSets;
}

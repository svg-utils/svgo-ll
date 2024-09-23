import * as csstree from 'css-tree';
import { syntax } from 'csso';
import { attrsGroups, pseudoClasses } from './_collections.js';
import { visitSkip, querySelectorAll, matches } from '../lib/xast.js';
import { compareSpecificity, includesAttrSelector } from '../lib/style.js';

/**
 * @typedef {import('../lib/types.js').XastElement} XastElement
 * @typedef {import('../lib/types.js').XastParent} XastParent
 */

export const name = 'inlineStyles';
export const description = 'inline styles (additional options)';

/**
 * Some pseudo-classes can only be calculated by clients, like :visited,
 * :future, or :hover, but there are other pseudo-classes that we can evaluate
 * during optimization.
 *
 * The list of pseudo-classes that we can evaluate during optimization, and
 * shouldn't be toggled conditionally through the `usePseudos` parameter.
 *
 * @see https://developer.mozilla.org/docs/Web/CSS/Pseudo-classes
 */
const preservedPseudos = [
  ...pseudoClasses.functional,
  ...pseudoClasses.treeStructural,
];

/**
 * @param {import('css-tree').CssNode} node
 */
function getProperties(node) {
  const props = new Set();
  csstree.walk(node, {
    visit: 'Declaration',
    enter(ruleDeclaration) {
      props.add(ruleDeclaration.property.toLowerCase());
    },
  });
  return props;
}
/**
 * @param {import('css-tree').CssNode} node
 */
function isPseudo(node) {
  return (
    (node.type === 'PseudoClassSelector' ||
      node.type === 'PseudoElementSelector') &&
    !preservedPseudos.includes(node.name)
  );
}

/**
 * Merges styles from style nodes into inline styles.
 *
 * @type {import('./plugins-types.js').Plugin<'inlineStyles'>}
 */
export const fn = (root, params, info) => {
  const { disableIfAtRulesPresent = true, onlyMatchedOnce = true } = params;

  const styleData = info.docData.getStyles();
  if (
    info.docData.hasScripts() ||
    styleData === null ||
    !styleData.hasStyles() ||
    (disableIfAtRulesPresent && styleData.getFeatures().has('atrules'))
  ) {
    return;
  }

  /**
   * @type {{ node: XastElement, parentNode: XastParent, cssAst: csstree.StyleSheet }[]}
   */
  const styles = [];
  /**
   * @type {{
   *   node: csstree.Selector,
   *   item: csstree.ListItem<csstree.CssNode>,
   *   rule: csstree.Rule,
   *   matchedElements?: XastElement[]
   * }[]}
   */
  let selectors = [];
  /** @type {{selectorStr:string,props:Set<string>}[]} */
  const clientPseudoSelectors = [];

  return {
    element: {
      enter: (node, parentNode) => {
        if (node.name === 'foreignObject') {
          return visitSkip;
        }
        if (node.name !== 'style' || node.children.length === 0) {
          return;
        }
        if (
          node.attributes.type != null &&
          node.attributes.type !== '' &&
          node.attributes.type !== 'text/css'
        ) {
          return;
        }

        const cssText = node.children
          .filter((child) => child.type === 'text' || child.type === 'cdata')
          // @ts-ignore
          .map((child) => child.value)
          .join('');

        /** @type {?csstree.CssNode} */
        let cssAst = null;
        try {
          cssAst = csstree.parse(cssText, {
            parseValue: false,
            parseCustomProperty: false,
          });
        } catch {
          return;
        }
        if (cssAst.type === 'StyleSheet') {
          styles.push({ node, parentNode, cssAst });
        }

        // collect selectors
        csstree.walk(cssAst, {
          visit: 'Rule',
          enter(node) {
            const atrule = this.atrule;

            // skip media queries not included into useMqs param
            if (atrule != null) {
              return;
            }

            if (node.prelude.type === 'SelectorList') {
              node.prelude.children.forEach((childNode, item) => {
                if (childNode.type === 'Selector') {
                  /**
                   * @type {{
                   *   item: csstree.ListItem<csstree.CssNode>,
                   *   list: csstree.List<csstree.CssNode>
                   * }[]}
                   */
                  const pseudos = [];
                  childNode.children.forEach(
                    (grandchildNode, grandchildItem, grandchildList) => {
                      if (isPseudo(grandchildNode)) {
                        pseudos.push({
                          item: grandchildItem,
                          list: grandchildList,
                        });
                      }
                    },
                  );

                  let addToSelectors = true;
                  if (pseudos.length > 0) {
                    // The selector has pseudo classes that must be evaluated by the client. Don't inline the style.
                    // Record the selector (without the pseudo classes), so we can ensure we don't inline styles for any element that
                    // may be targeted by this selector.

                    /**
                     * @param {import('css-tree').Selector} node
                     * @returns {import('css-tree').CssNode}
                     */
                    function cloneSelectorWithoutPseudos(node) {
                      return {
                        type: node.type,
                        children: node.children
                          .filter((n) => !isPseudo(n))
                          .map(csstree.clone),
                      };
                    }

                    addToSelectors = false;
                    const selectorWithoutPseudos =
                      cloneSelectorWithoutPseudos(childNode);
                    clientPseudoSelectors.push({
                      selectorStr: csstree.generate(selectorWithoutPseudos),
                      props: getProperties(node),
                    });
                  }

                  if (addToSelectors) {
                    selectors.push({ node: childNode, rule: node, item: item });
                  }
                }
              });
            }
          },
        });
      },
    },

    root: {
      exit: () => {
        const sortedSelectors = selectors
          .slice()
          .sort((a, b) => {
            const aSpecificity = syntax.specificity(a.item.data);
            const bSpecificity = syntax.specificity(b.item.data);
            return compareSpecificity(aSpecificity, bSpecificity);
          })
          .reverse();

        const preservedClassNodes = new Set();

        for (const selector of sortedSelectors) {
          // match selectors
          const selectorText = csstree.generate(selector.item.data);
          /** @type {XastElement[]} */
          const matchedElements = [];
          try {
            for (const node of querySelectorAll(root, selectorText)) {
              if (node.type === 'element') {
                matchedElements.push(node);
              }
            }
          } catch {
            continue;
          }
          // nothing selected
          if (matchedElements.length === 0) {
            continue;
          }

          // apply styles to matched elements
          // skip selectors that match more than once if option onlyMatchedOnce is enabled
          if (onlyMatchedOnce && matchedElements.length > 1) {
            continue;
          }

          // apply <style/> to matched elements
          for (const selectedEl of matchedElements) {
            // Don't move properties to attribute if the element matches any selectors that have to be evaluated on the client.
            const matchedPseudos = clientPseudoSelectors.filter((data) =>
              matches(selectedEl, data.selectorStr),
            );
            const skippedProperties = matchedPseudos.reduce((props, data) => {
              data.props.forEach((p) => {
                props.add(p);
              });
              return props;
            }, new Set());

            const styleDeclarationList = csstree.parse(
              selectedEl.attributes.style ?? '',
              {
                context: 'declarationList',
                parseValue: false,
              },
            );
            if (styleDeclarationList.type !== 'DeclarationList') {
              continue;
            }
            const styleDeclarationItems = new Map();

            /** @type {csstree.ListItem<csstree.CssNode>} */
            let firstListItem;

            csstree.walk(styleDeclarationList, {
              visit: 'Declaration',
              enter(node, item) {
                if (firstListItem == null) {
                  firstListItem = item;
                }

                styleDeclarationItems.set(node.property.toLowerCase(), item);
              },
            });
            // merge declarations
            csstree.walk(selector.rule, {
              visit: 'Declaration',
              enter(ruleDeclaration) {
                // existing inline styles have higher priority
                // no inline styles, external styles,                                    external styles used
                // inline styles,    external styles same   priority as inline styles,   inline   styles used
                // inline styles,    external styles higher priority than inline styles, external styles used
                const property = ruleDeclaration.property.toLowerCase();

                if (
                  attrsGroups.presentation.has(property) &&
                  !selectors.some((selector) =>
                    includesAttrSelector(selector.item, property),
                  )
                ) {
                  delete selectedEl.attributes[property];
                }

                if (!skippedProperties.has(property)) {
                  const matchedItem = styleDeclarationItems.get(property);
                  const ruleDeclarationItem =
                    styleDeclarationList.children.createItem(ruleDeclaration);
                  if (matchedItem == null) {
                    styleDeclarationList.children.insert(
                      ruleDeclarationItem,
                      firstListItem,
                    );
                  } else if (
                    matchedItem.data.important !== true &&
                    ruleDeclaration.important === true
                  ) {
                    styleDeclarationList.children.replace(
                      matchedItem,
                      ruleDeclarationItem,
                    );
                    styleDeclarationItems.set(property, ruleDeclarationItem);
                  }
                }
              },
            });

            const newStyles = csstree.generate(styleDeclarationList);
            if (newStyles.length !== 0) {
              selectedEl.attributes.style = newStyles;
            }

            if (skippedProperties.size > 0) {
              // There are related selectors which have pseudo-classes. Don't delete the class attribute from the element, in case it is needed to
              // match the pseudo-classes.
              preservedClassNodes.add(selectedEl);
            }
          }

          selector.matchedElements = matchedElements;
        }

        // Clean up matched class attribute values.
        for (const selector of sortedSelectors) {
          if (!selector.matchedElements) {
            continue;
          }

          if (onlyMatchedOnce && selector.matchedElements.length > 1) {
            // skip selectors that match more than once if option onlyMatchedOnce is enabled
            continue;
          }

          for (const selectedEl of selector.matchedElements) {
            if (preservedClassNodes.has(selectedEl)) {
              continue;
            }

            const classList = new Set(
              selectedEl.attributes.class == null
                ? null
                : selectedEl.attributes.class.split(' '),
            );

            for (const child of selector.node.children) {
              if (
                child.type === 'ClassSelector' &&
                !selectors.some((selector) =>
                  includesAttrSelector(
                    selector.item,
                    'class',
                    child.name,
                    true,
                  ),
                )
              ) {
                classList.delete(child.name);
              }
            }

            if (classList.size === 0) {
              delete selectedEl.attributes.class;
            } else {
              selectedEl.attributes.class = Array.from(classList).join(' ');
            }
          }
        }
      },
    },
  };
};

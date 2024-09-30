import { generateData, generateTreeData } from './testutils.js';

test('make sure compiled query cache is cleared correctly when style ids are changed', () => {
  const data = generateData(
    './test/lib/docdata/style.updatereferencedids.1.svg',
  );
  const styleData = data.docData.getStyles();
  if (!styleData) {
    throw new Error();
  }
  const treeInfo = generateTreeData(data.root);
  const element = treeInfo.get('id1');
  if (!element) {
    throw new Error();
  }

  // Should match to begin with.
  const rules = styleData.getMatchingRules(element);
  const rule = rules[0];
  expect(rule._matches(element)).toBe(true);
  expect(rules.length).toBe(1);

  // Replace the id in the rules; should no longer match.
  const m = new Map();
  m.set('id1', 'a');
  styleData.updateReferencedIds(styleData.getReferencedIds(), m);
  expect(rule._matches(element)).toBe(false);
  expect(styleData.getMatchingRules(element).length).toBe(0);

  // Change the id of the element; it should match again.
  element.attributes.id = 'a';
  expect(rule._matches(element)).toBe(true);
  expect(styleData.getMatchingRules(element).length).toBe(1);
});

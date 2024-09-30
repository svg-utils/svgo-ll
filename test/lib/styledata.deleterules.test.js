import { generateData, generateTreeData } from './testutils.js';

test('make sure cache of referenced classes is cleared when rules are deleted', () => {
  const data = generateData('./test/lib/docdata/style.deleterules.1.svg');
  const styleData = data.docData.getStyles();
  if (!styleData) {
    throw new Error();
  }
  const treeInfo = generateTreeData(data.root);
  const element = treeInfo.get('id1');
  if (!element) {
    throw new Error();
  }

  // Should be referenced  to begin with.
  const rules = styleData.getMatchingRules(element);
  const rule = rules[0];
  expect(styleData.hasClassReference('class1')).toBe(true);

  // Delete the rule; should no longer match.
  styleData.deleteRules(new Set([rule]));
  expect(styleData.hasClassReference('class1')).toBe(false);
});

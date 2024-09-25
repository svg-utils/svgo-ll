import { generateData, generateTreeData } from './testutils.js';

/**
 * @param {import('../../lib/docdata.js').StyleData} styleData
 * @param {Map<string,import('../../lib/types.js').XastElement>} treeInfo
 * @param {string} id
 * @param {string} styleName
 */
function getComputed(styleData, treeInfo, id, styleName) {
  const node = treeInfo.get(id);
  if (node === undefined) {
    throw new Error();
  }
  return styleData.computeOwnStyle(node).get(styleName);
}

test('computeOwnStyle 1', () => {
  const data = generateData('./test/lib/docdata/style.computeownstyle.1.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'stroke-att', 'stroke')).toBe(
    'green',
  );
  expect(getComputed(styleData, treeInfo, 'stroke-att', 'stroke-width')).toBe(
    undefined,
  );

  expect(getComputed(styleData, treeInfo, 'stroke-style-att', 'stroke')).toBe(
    'red',
  );
  expect(getComputed(styleData, treeInfo, 'stroke-class', 'stroke')).toBe(
    'blue',
  );
  expect(
    getComputed(styleData, treeInfo, 'stroke-class-with-id', 'stroke'),
  ).toBe('yellow');
  expect(
    getComputed(styleData, treeInfo, 'stroke-style-class-imp', 'stroke'),
  ).toBe('orange');
  expect(
    getComputed(
      styleData,
      treeInfo,
      'stroke-style-class-imp-specific',
      'stroke',
    ),
  ).toBe('pink');
});

test('computeOwnStyle 2', () => {
  const data = generateData('./test/lib/docdata/style.computeownstyle.2.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'path1', 'marker-end')).toBe(null);
});

test('computeOwnStyle - combinators', () => {
  const data = generateData('./test/lib/docdata/style.computeownstyle.3.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'c1', 'fill')).toBe('red');
  expect(getComputed(styleData, treeInfo, 'c2', 'fill')).toBe('green');
});

test('computeOwnStyle - CDATA', () => {
  const data = generateData(
    './test/lib/docdata/style.computeownstyle.4.svg.txt',
  );
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'a', 'stroke')).toBe('red');
});

import { visit } from '../../lib/xast.js';
import { generateData } from './testutils.js';

/**
 * @param {import('../../lib/types.js').XastRoot} root
 */
function generateTreeData(root) {
  const idMap = new Map();
  const parentMap = new Map();
  /** @type {{element:import('../../lib/types.js').XastElement}[]} */
  const parents = [];
  visit(root, {
    element: {
      enter: (element) => {
        parentMap.set(element, parents.slice());
        const id = element.svgAtts.get('id');
        if (id) {
          idMap.set(id.toString(), element);
        }
        parents.push({ element: element });
      },
      exit: () => {
        parents.pop();
      },
    },
  });

  return { ids: idMap, parents: parentMap };
}

/**
 * @param {import('../../lib/types.js').StyleData} styleData
 * @param {{ids:Map<string,import('../../lib/types.js').XastElement>,
 * parents:Map<import('../../lib/types.js').XastElement,{element:import('../../lib/types.js').XastElement}[]>}} treeInfo
 * @param {string} id
 * @param {string} styleName
 */
function getComputed(styleData, treeInfo, id, styleName) {
  const node = treeInfo.ids.get(id);
  if (node === undefined) {
    throw new Error();
  }
  const parents = treeInfo.parents.get(node);
  if (parents === undefined) {
    throw new Error();
  }
  return styleData.computeStyle(node, parents).get(styleName);
}

test('computeStyle 1', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.1.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'gblue', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'gred-g', 'stroke')).toBe('red');
  expect(getComputed(styleData, treeInfo, 'gred-gblue', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'gredimp-gblue', 'stroke')).toBe(
    'blue',
  );
});

test('computeStyle 2', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.2.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'path1', 'marker-end')).toBe(null);
});

test('computeStyle - uninherited properties', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.3.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'path1', 'opacity')).toBeUndefined();
  expect(
    getComputed(styleData, treeInfo, 'path1', 'transform'),
  ).toBeUndefined();
});

test('computeStyle - selector lists', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.4.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  const rules = styleData.getSortedRules();
  expect(rules.length).toBe(3);
  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBe('blue');
  expect(getComputed(styleData, treeInfo, 'path2', 'stroke')).toBe('red');
});

test('computeStyle - custom properties', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.5.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBeNull();
});

test('computeStyle - pseudo-class', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.6.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'path1', 'stroke')).toBeNull();
  expect(getComputed(styleData, treeInfo, 'path2', 'stroke')).toBe('green');
});

test('computeStyle - @media all', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.7.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'r1', 'fill')).toBe('green');
});

test('computeStyle - :hover', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.8.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'r', 'fill')).toBeNull();
  expect(getComputed(styleData, treeInfo, 'g', 'fill')).toBe('red');
  expect(getComputed(styleData, treeInfo, 'g', 'stroke')).toBeUndefined();
});

test('computeStyle - selector list for tags', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.9.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'c', 'fill')).toBe('green');
  expect(getComputed(styleData, treeInfo, 'r', 'fill')).toBe('green');
});

test('computeStyle - !important', () => {
  const data = generateData('./test/lib/docdata/style.computestyle.10.svg');
  const treeInfo = generateTreeData(data.root);
  const styleData = data.docData.getStyles();

  expect(styleData).toBeTruthy();
  if (styleData === null) {
    return;
  }

  expect(getComputed(styleData, treeInfo, 'y', 'fill')).toBe('yellow');
  expect(getComputed(styleData, treeInfo, 'r', 'fill')).toBe('red');
});

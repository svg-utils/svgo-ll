import { StyleData } from '../../lib/styleData.js';
import { createElement, createRoot } from '../../lib/xast.js';
import { generateData } from './testutils.js';

test('import', () => {
  const data = generateData('./test/lib/docdata/style.import.1.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('invalid type', () => {
  const data = generateData('./test/lib/docdata/style.invalidtype.1.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('invalid attribute', () => {
  const data = generateData('./test/lib/docdata/style.invalidatt.1.svg');
  expect(data.docData.getStyles()).toBeNull();
});

// Test various nested selectors to make sure they are detected.
test('nested style with &', () => {
  const data = generateData('./test/lib/docdata/style.nested.1.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('nested style with 2 properties', () => {
  const data = generateData('./test/lib/docdata/style.nested.2.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('nested style with 1 property', () => {
  const data = generateData('./test/lib/docdata/style.nested.3.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('nested style with no properties', () => {
  const data = generateData('./test/lib/docdata/style.nested.4.svg');
  expect(data.docData.getStyles()).toBeNull();
});
test('nested style with +', () => {
  const data = generateData('./test/lib/docdata/style.nested.5.svg');
  expect(data.docData.getStyles()).toBeNull();
});

test('add and combine style elements', () => {
  const root = createRoot();
  createElement(root, 'svg');
  const sd = new StyleData(root, []);

  expect(sd.getSortedRules().length).toBe(0);

  sd.addStyleSection('.a{fill:red}');
  expect(sd.getSortedRules().length).toBe(1);

  sd.addStyleSection('.b{fill:green}');
  expect(sd.getSortedRules().length).toBe(2);

  sd.mergeStyles();
  expect(sd.getSortedRules().length).toBe(2);

  sd.updateClassNames(new Map([['a', 'c']]));
  expect(sd.getSortedRules().length).toBe(2);

  expect(sd.getReferencedClasses().size).toBe(2);
});

import { parseSvg } from '../../lib/parser.js';
import { getReferencedIds, NS_XLINK } from '../../lib/tools-ast.js';
import { getFirstChild } from '../utils.js';

describe('test getReferencedIds()', () => {
  const testCases = [
    {
      elem: '<use href="#ab"/>',
      expected: [{ id: 'ab', attName: 'href' }],
    },
    {
      elem: '<use xlink:href="#ab"/>',
      expected: [{ id: 'ab', attName: 'xlink:href' }],
      ns: [['xlink', NS_XLINK]],
    },
    {
      elem: '<use x:href="#ab"/>',
      expected: [{ id: 'ab', attName: 'xlink:href' }],
      ns: [['x', NS_XLINK]],
    },
  ];
  for (const testCase of testCases) {
    it(testCase.elem, () => {
      const ns = testCase.ns
        ? testCase.ns.map((item) => `xmlns:${item[0]}="${item[1]}"`).join(' ')
        : '';
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" ${ns}>${testCase.elem}</svg>`;
      const root = parseSvg(svg);
      const element = getFirstChild(root);
      const ids = getReferencedIds(element);

      const expected = testCase.expected;
      expect(ids.length).toBe(expected.length);
      for (let index = 0; index < ids.length; index++) {
        const data = ids[index];
        const exp = expected[index];
        expect(data.id).toBe(exp.id);
        expect(data.attName).toBe(exp.attName);
      }
    });
  }
});

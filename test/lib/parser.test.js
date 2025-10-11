import { parseSvg } from '../../lib/parser.js';
import { NS_XLINK } from '../../lib/tools-ast.js';

describe('test otherAtts values', () => {
  const testCases = [
    {
      input: '<d:el xmlns:d="x" att="val"/>',
      expected: [
        {
          local: 'd',
          prefix: 'xmlns',
          uri: 'http://www.w3.org/2000/xmlns/',
          value: 'x',
        },
        { local: 'att', prefix: undefined, uri: '', value: 'val' },
      ],
    },
    {
      input: '<d:el xmlns:d="x" d:att="val"/>',
      expected: [
        {
          local: 'd',
          prefix: 'xmlns',
          uri: 'http://www.w3.org/2000/xmlns/',
          value: 'x',
        },
        { local: 'att', prefix: 'd', uri: 'x', value: 'val' },
      ],
    },
    {
      input: '<d:el xmlns:d="x" xlink:href="#a"/>',
      ns: ['xmlns:xlink="http://www.w3.org/1999/xlink"'],
      expected: [
        {
          local: 'd',
          prefix: 'xmlns',
          uri: 'http://www.w3.org/2000/xmlns/',
          value: 'x',
        },
        { local: 'href', prefix: 'xlink', uri: NS_XLINK, value: '#a' },
      ],
    },
    {
      input: '<use id="b" xlink:href="#a"/>',
      ns: ['xmlns:xlink="http://www.w3.org/1999/xlink"'],
      expected: [
        { local: 'href', prefix: 'xlink', uri: NS_XLINK, value: '#a' },
      ],
    },
    {
      input: '<x:use id="b" x:href="#a"/>',
      svgPrefix: 'x:',
      expected: undefined,
    },
  ];

  for (const testCase of testCases) {
    it(`${testCase.input.slice(0, 20)}`, () => {
      const str = `<${testCase.svgPrefix ?? ''}svg xmlns${testCase.svgPrefix ? ':' + testCase.svgPrefix.slice(0, testCase.svgPrefix.length) : ''}="http://www.w3.org/2000/svg" ${testCase.ns ? testCase.ns.join(' ') : ''}>${testCase.input}</${testCase.svgPrefix ?? ''}svg>`;
      const root = parseSvg(str);
      const child = root.children[0];
      if (child.type !== 'element') {
        throw new Error();
      }
      const el = child.children[0];
      if (el.type !== 'element') {
        throw new Error();
      }

      const expected = testCase.expected;
      if (expected === undefined) {
        expect(el.otherAtts).toBeUndefined();
      } else {
        if (el.otherAtts === undefined) {
          throw new Error();
        }
        expect(el.otherAtts.length).toBe(expected.length);
        for (let index = 0; index < el.otherAtts.length; index++) {
          const att = el.otherAtts[index];
          expect(att.local).toBe(expected[index].local);
          expect(att.uri).toBe(expected[index].uri);
          expect(att.prefix).toBe(expected[index].prefix);
          expect(att.value).toBe(expected[index].value);
        }
      }
    });
  }
});

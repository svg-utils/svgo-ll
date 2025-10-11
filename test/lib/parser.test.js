import { parseSvg } from '../../lib/parser.js';

const str =
  '<svg xmlns="http://www.w3.org/2000/svg"><d:el xmlns:d="x" att="val"/></svg>';

it(`non-svg atts`, () => {
  const root = parseSvg(str);
  const child = root.children[0];
  if (child.type !== 'element') {
    throw new Error();
  }
  const el = child.children[0];
  if (el.type !== 'element') {
    throw new Error();
  }
  if (el.otherAtts === undefined) {
    throw new Error();
  }

  /** @type {import('../../lib/types.js').XastAttOther[]} */
  const expected = [
    { local: 'd', prefix: 'xmlns', value: 'x' },
    { local: 'att', prefix: undefined, value: 'val' },
  ];
  expect(el.otherAtts.length).toBe(expected.length);
  for (let index = 0; index < el.otherAtts.length; index++) {
    const att = el.otherAtts[index];
    expect(att.local).toBe(expected[index].local);
    expect(att.prefix).toBe(expected[index].prefix);
    expect(att.value).toBe(expected[index].value);
  }
});

import FS from 'fs';
import PATH from 'path';
import { fileURLToPath } from 'url';
import { parseSvg } from '../../lib/parser.js';
import { fail } from 'assert';
import { validateParentNodes } from '../utils.js';

const __dirname = PATH.dirname(fileURLToPath(import.meta.url));

describe('svg2js', function () {
  describe('working svg', function () {
    const filepath = PATH.resolve(__dirname, './test.svg');
    /** @type {import('../../lib/types.js').XastRoot} */
    let root;

    beforeAll(function (done) {
      FS.readFile(filepath, 'utf8', function (err, data) {
        if (err) {
          throw err;
        }

        root = parseSvg(data);
        done();
      });
    });

    describe('root', function () {
      it('should exist', function () {
        expect(root).toStrictEqual(expect.anything());
      });

      it('should be an instance of Object', function () {
        expect(root).toBeInstanceOf(Object);
      });

      it('should have property "children"', function () {
        expect(root).toHaveProperty('children');
      });

      it('should have valid parentNodes', function () {
        expect(validateParentNodes(root)).toBe(true);
      });
    });

    describe('root.children', function () {
      it('should be an instance of Array', function () {
        expect(root.children).toBeInstanceOf(Array);
      });

      it('should have length 4', function () {
        expect(root.children).toHaveLength(4);
      });
    });

    it('the first node should be instruction', () => {
      expect(root.children[0]).toMatchObject({
        type: 'instruction',
        name: 'xml',
        value: 'version="1.0" encoding="utf-8"',
      });
    });

    it('the second node should be comment', () => {
      expect(root.children[1]).toMatchObject({
        type: 'comment',
        value:
          ' Generator: Adobe Illustrator 15.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  ',
      });
    });

    it('the third node should be doctype', () => {
      expect(root.children[2]).toMatchObject({
        type: 'doctype',
        name: 'svg',
        data: {
          doctype:
            ' svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"',
        },
      });
    });

    describe('name', function () {
      it('should have property name: "svg"', function () {
        expect(root.children[3]).toStrictEqual(
          expect.objectContaining({
            name: 'svg',
          }),
        );
      });
    });

    describe('children', function () {
      it('should exist', function () {
        const el = root.children[3];
        if (el.type !== 'element') {
          fail();
        } else {
          expect(el.children).toStrictEqual(expect.anything());
        }
      });

      it('should be an instance of Array', function () {
        const el = root.children[3];
        if (el.type !== 'element') {
          fail();
        } else {
          expect(el.children).toBeInstanceOf(Array);
        }
      });

      it('should eventually have length 3', function () {
        const el = root.children[3];
        if (el.type !== 'element') {
          fail();
        } else {
          expect(el.children).toHaveLength(3);
        }
      });
    });

    describe('text nodes', function () {
      it('should contain preserved whitespace', function () {
        // @ts-ignore
        const textNode = root.children[3].children[1].children[0].children[1];
        expect(textNode.children[0].value).toBe('  test  ');
      });
    });
  });
});

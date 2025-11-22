import * as fs from 'node:fs';
import * as path from 'node:path/posix';
import { optimize } from '../../lib/svgo.js';

/** @type {{name:string,config:import('../../lib/svgo.js').Config}[]} */
const tests = [
  { name: 'minifyPathData-round', config: { enable: ['round'] } },
  {
    name: 'inlineStyles-stylesToClasses',
    config: { pluginNames: ['inlineStyles', 'stylesToClasses'] },
  },
  {
    name: 'cleanupAttributes-removeUnknownsAndDefaults',
    config: { pluginNames: ['cleanupAttributes', 'removeUnknownsAndDefaults'] },
  },
  {
    name: 'cleanupAttributes-stylesToClasses-minifyClassNames',
    config: {
      pluginNames: ['cleanupAttributes', 'stylesToClasses', 'minifyClassNames'],
    },
  },
];

describe('plugins tests', function () {
  for (const test of tests) {
    it(test.name, function () {
      const inputFilePath = path.join(
        import.meta.dirname,
        'input-files',
        test.name + '.svg',
      );
      const outputFilePath = path.join(
        import.meta.dirname,
        'output-files',
        test.name + '.svg',
      );
      /** @type {import('../../lib/svgo.js').Config} */
      const config = { ...test.config };
      if (config.pluginNames) {
        config.pluginNames = ['cleanupTextNodes'].concat(config.pluginNames);
      }

      const input = fs.readFileSync(inputFilePath, 'utf8');
      const expected = fs.readFileSync(outputFilePath, 'utf8');
      const result = optimize(input, {
        ...config,
        js2svg: { pretty: true, indent: 2 },
      });
      expect(result.data).toBe(expected);
    });
  }
});

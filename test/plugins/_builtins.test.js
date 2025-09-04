import { builtinPlugins } from '../../plugins/builtin.js';

describe('ensure exported builtins are immutable', () => {
  it('make sure name cannot be changed', () => {
    const name = 'cleanupIds';
    const plugin = builtinPlugins.get(name);
    if (!plugin) {
      throw new Error();
    }
    expect(plugin.name).toBe(name);
    try {
      // @ts-ignore
      plugin.name = 'xxx';
      expect(false).toBe(true);
    } catch {
      // expected
    }
    expect(plugin.name).toBe(name);
  });
});

import { builtinPlugins } from '../../plugins/builtin.js';
import { defaultPlugins } from '../../plugins/default-plugins.js';

describe('ensure exported builtins are immutable', () => {
  it('make sure builtin name cannot be changed', () => {
    const name = 'removeUnusedElements';
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

  it('make sure builtin Map cannot be changed', () => {
    const name = 'removeUnusedElements';
    expect(builtinPlugins.has(name)).toBe(true);
    try {
      // @ts-ignore
      builtinPlugins.delete(name);
      expect(false).toBe(true);
    } catch {
      // expected
    }
    expect(builtinPlugins.has(name)).toBe(true);
  });

  it('make sure default plugin name cannot be changed', () => {
    const plugin = defaultPlugins.plugins[0];
    const name = plugin.name;
    expect(plugin.name).toBe(name);

    try {
      plugin.name = name + 'xxx';
      expect(false).toBe(true);
    } catch {
      // expected
    }

    expect(plugin.name).toBe(name);
  });

  it('make sure default array cannot be changed', () => {
    const length = defaultPlugins.plugins.length;
    try {
      // @ts-ignore
      defaultPlugins.plugins.pop();
    } catch {
      // expected
    }
    expect(defaultPlugins.plugins.length).toBe(length);
  });
});

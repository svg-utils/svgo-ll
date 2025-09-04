import { resolvePlugins } from '../../lib/svgo.js';

describe('test resolvePlugins()', () => {
  it('--plugin should empty the pre array', () => {
    const resolved = resolvePlugins({ pluginNames: [] });
    expect(resolved.pre.length).toBe(0);
  });

  it('--disable should disable pre plugins', () => {
    const resolvedDefaults = resolvePlugins({});
    const defaultLen = resolvedDefaults.pre.length;
    expect(defaultLen).toBeGreaterThan(0);
    const pluginName = resolvedDefaults.pre[0].name;
    expect(resolvedDefaults.pre.some((p) => p.name === pluginName)).toBe(true);

    const resolvedDisabled = resolvePlugins({ disable: [pluginName] });
    expect(resolvedDisabled.pre.length).toBe(defaultLen - 1);
    expect(resolvedDisabled.pre.some((p) => p.name === pluginName)).toBe(false);
  });
});

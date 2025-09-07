import { resolvePlugins } from '../../lib/svgo.js';

describe('test resolvePlugins()', () => {
  it('--plugin should empty the pre array', () => {
    const resolved = resolvePlugins({ pluginNames: [] });
    expect(resolved.pre.length).toBe(0);
  });

  it('--plugin should empty the post array', () => {
    const resolved = resolvePlugins({ pluginNames: [] });
    expect(resolved.post.length).toBe(0);
  });

  it('--plugin with --pre should work', () => {
    const resolved = resolvePlugins({
      pre: ['convertShapeToPath'],
      pluginNames: ['minifyTransforms'],
    });
    expect(resolved.pre.length).toBe(1);
    expect(resolved.pre[0].name).toBe('convertShapeToPath');
  });

  it('--plugin with --post should work', () => {
    const resolved = resolvePlugins({
      post: ['convertShapeToPath'],
      pluginNames: ['minifyTransforms'],
    });
    expect(resolved.post.length).toBe(1);
    expect(resolved.post[0].name).toBe('convertShapeToPath');
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

  it('--disable should disable post plugins', () => {
    const resolvedDefaults = resolvePlugins({});
    const defaultLen = resolvedDefaults.post.length;
    expect(defaultLen).toBeGreaterThan(0);
    const pluginName = resolvedDefaults.post[0].name;
    expect(resolvedDefaults.post.some((p) => p.name === pluginName)).toBe(true);

    const resolvedDisabled = resolvePlugins({ disable: [pluginName] });
    expect(resolvedDisabled.post.length).toBe(defaultLen - 1);
    expect(resolvedDisabled.post.some((p) => p.name === pluginName)).toBe(
      false,
    );
  });

  it('--pre should override the default pre array', () => {
    const name = 'minifyTransforms';
    const resolvedPlugins = resolvePlugins({ pre: [name] });
    expect(resolvedPlugins.pre.length).toBe(1);
    expect(resolvedPlugins.pre[0].name).toBe(name);
  });

  it('--post should override the default post array', () => {
    const name = 'minifyTransforms';
    const resolvedPlugins = resolvePlugins({ post: [name] });
    expect(resolvedPlugins.post.length).toBe(1);
    expect(resolvedPlugins.post[0].name).toBe(name);
  });

  it('--pre with no args should empty the pre array', () => {
    const resolvedPlugins = resolvePlugins({ pre: [] });
    expect(resolvedPlugins.pre.length).toBe(0);
  });

  it('--post with no args should empty the post array', () => {
    const resolvedPlugins = resolvePlugins({ post: [] });
    expect(resolvedPlugins.post.length).toBe(0);
  });
});

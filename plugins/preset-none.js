import { createPreset } from '../lib/svgo/plugins.js';

const presetNone = createPreset({
  name: 'preset-none',
  description: 'do not run any plugins',
  plugins: [],
});

export default presetNone;

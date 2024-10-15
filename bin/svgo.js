#!/usr/bin/env node

import colors from 'picocolors';
import makeProgram from '../lib/svgo/coa.js';

const program = makeProgram();
program.parseAsync(process.argv).catch((error) => {
  console.error(colors.red(error.stack));
  process.exit(1);
});

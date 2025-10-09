/**
 * @typedef {import('child_process').ChildProcessWithoutNullStreams} ChildProcessWithoutNullStreams
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @type {(proc: ChildProcessWithoutNullStreams) => Promise<string>}
 */
const waitStdout = (proc) => {
  return new Promise((resolve) => {
    proc.stdout.on('data', (data) => {
      resolve(data.toString());
    });
  });
};

/**
 * @type {(proc: ChildProcessWithoutNullStreams) => Promise<void>}
 */
const waitClose = (proc) => {
  return new Promise((resolve) => {
    proc.on('close', () => {
      resolve();
    });
  });
};

test('shows plugins when flag specified', async () => {
  const proc = spawn(
    'node',
    ['../../bin/svgo', '--no-color', '--show-plugins'],
    { cwd: __dirname },
  );
  const stdout = await waitStdout(proc);
  expect(stdout).toMatch(/Currently available plugins:/);
});

test('accepts svg as input stream', async () => {
  const proc = spawn('node', ['../../bin/svgo', '--no-color', '-'], {
    cwd: __dirname,
  });
  proc.stdin.write(
    '<svg xmlns="http://www.w3.org/2000/svg"><desc>Created with Love</desc></svg>',
  );
  proc.stdin.end();
  const stdout = await waitStdout(proc);
  expect(stdout).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('accepts svg as string', async () => {
  const input =
    '<svg xmlns="http://www.w3.org/2000/svg"><desc>Created with Love</desc></svg>';
  const proc = spawn(
    'node',
    ['../../bin/svgo', '--no-color', '--string', input],
    { cwd: __dirname },
  );
  const stdout = await waitStdout(proc);
  expect(stdout).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('accepts svg as filename', async () => {
  const proc = spawn(
    'node',
    ['../../bin/svgo', '--no-color', 'single.svg', '-o', 'output/single.svg'],
    { cwd: __dirname },
  );
  await waitClose(proc);
  const output = fs.readFileSync(
    path.join(__dirname, 'output/single.svg'),
    'utf-8',
  );
  expect(output).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('output as stream when "-" is specified', async () => {
  const proc = spawn(
    'node',
    ['../../bin/svgo', '--no-color', 'single.svg', '-o', '-'],
    { cwd: __dirname },
  );
  const stdout = await waitStdout(proc);
  expect(stdout).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
});

test('should exit with 0 code and show error on syntax error', async () => {
  const proc = spawn('node', ['../../bin/svgo', '--no-color', 'invalid.svg'], {
    cwd: __dirname,
  });
  const [code, stderr] = await Promise.all([
    new Promise((resolve) => {
      proc.on('close', (code) => {
        resolve(code);
      });
    }),
    new Promise((resolve) => {
      proc.stderr.on('data', (error) => {
        resolve(error.toString());
      });
    }),
  ]);
  expect(code).toBe(0);
  expect(
    stderr.startsWith(
      'SvgoParserError: invalid.svg:2:27: Unquoted attribute value',
    ),
  ).toBe(true);
});

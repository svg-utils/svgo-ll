import fs from 'fs';
import path from 'path';
import stream from 'stream';
import util from 'util';
import zlib from 'zlib';
import tarStream from 'tar-stream';

const pipeline = util.promisify(stream.pipeline);

/**
 * @param {string} url
 * @param {string} baseDir
 */
const extractTarGz = async (url, baseDir) => {
  const extract = tarStream.extract();
  extract.on('entry', async (header, stream, next) => {
    const name = header.name;

    try {
      if (
        !header.name.includes('..') &&
        name.endsWith('.svg') &&
        // Exclude all W3C files until parsing is fixed - they all have sections where XHTML is the default namespace.
        !name.startsWith('svgo-test-suite/W3C_SVG_11_TestSuite/')
      ) {
        // Remove the initial "svgo-test-suite/" directory
        const newPath = name.split('/').slice(1).join('/');
        const file = path.join(baseDir, newPath);
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        await pipeline(stream, fs.createWriteStream(file));
      }
    } catch (error) {
      console.error(error);
      process.exit(1);
    }
    stream.resume();
    next();
  });
  const response = await fetch(url);
  // @ts-ignore
  await pipeline(response.body, zlib.createGunzip(), extract);
};

(async () => {
  const targetDir = path.join(
    process.cwd(),
    'ignored',
    'regression',
    'input-raw',
  );
  // Remove existing files for clean install.
  fs.rmSync(targetDir, { force: true, recursive: true });

  try {
    console.info('Downloading SVGO Test Suite and extracting files');
    await extractTarGz(
      'https://svg.github.io/svgo-test-suite/svgo-test-suite.tar.gz',
      targetDir,
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();

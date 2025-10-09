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
  const resolvedBase = path.resolve(baseDir);
  extract.on('entry', async (header, stream, next) => {
    try {
      const name = header.name;
      if (
        name.endsWith('.svg') &&
        !name.startsWith('svgo-test-suite/W3C_SVG_11_TestSuite/svg/animate-')
      ) {
        // Remove the initial "svgo-test-suite/" directory
        const newPath = name.split('/').slice(1).join('/');
        const filePath = path.join(baseDir, newPath);
        const resolvedFile = path.resolve(filePath);
        if (resolvedFile.startsWith(resolvedBase + path.sep)) {
          await fs.promises.mkdir(path.dirname(resolvedFile), {
            recursive: true,
          });
          await pipeline(stream, fs.createWriteStream(resolvedFile));
        }
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

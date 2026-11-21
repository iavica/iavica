import { readFileSync } from 'node:fs';
import typescript from '@rollup/plugin-typescript';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

// Replace the __IAVICA_SDK_VERSION__ placeholder with the package version.
const sdkVersion = {
  name: 'iavica-sdk-version',
  transform(code) {
    return code.includes('__IAVICA_SDK_VERSION__')
      ? { code: code.replaceAll('__IAVICA_SDK_VERSION__', JSON.stringify(version)), map: null }
      : null;
  },
};

export default {
  input: 'src/index.ts',
  output: [
    {
      file: 'dist/iavica.js',
      format: 'iife',
      name: 'Iavica',
      sourcemap: true,
      banner: `/*! iavica SDK ${version} · MIT License · (c) iavica.com · https://github.com/iavica/iavica */`,
    },
    {
      file: 'dist/iavica.esm.js',
      format: 'esm',
      sourcemap: true,
      banner: `/*! iavica SDK ${version} · MIT License · (c) iavica.com · https://github.com/iavica/iavica */`,
    },
  ],
  plugins: [typescript({ tsconfig: './tsconfig.json' }), sdkVersion],
};

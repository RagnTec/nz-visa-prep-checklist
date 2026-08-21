// @vitest-environment node

import { build } from 'vite';
import { describe, expect, it } from 'vitest';
import {
  assertProductionBundleSafety,
  findProhibitedProductionText,
  stripExternalFontFaces
} from '../build/stripExternalFonts';
import { resolveBasePath } from '../build/basePath';

describe('production bundle safety', () => {
  it('defaults to the root base and accepts an explicit project-site base', () => {
    expect(resolveBasePath(undefined)).toBe('/');
    expect(resolveBasePath('/nz-visa-prep-checklist/'))
      .toBe('/nz-visa-prep-checklist/');
  });

  it.each([
    '',
    'nz-visa-prep-checklist/',
    '/nz-visa-prep-checklist',
    null,
    42
  ])('rejects invalid deployment base %p', (value) => {
    expect(() => resolveBasePath(value)).toThrow(
      'VITE_BASE_PATH must be a string that begins and ends with "/".'
    );
  });

  it('removes only external font faces and behaves idempotently', () => {
    const css = [
      '@font-face{font-family:survey;src:url(https://fonts.gstatic.com/s/survey.woff2)}',
      '.sd-root-modern{display:block}',
      '.sd-body{padding:1rem}'
    ].join('');
    const result = stripExternalFontFaces(css);

    expect(css).toContain('fonts.gstatic.com');
    expect(result).toContain('.sd-root-modern');
    expect(result).toContain('.sd-body');
    expect(result.length).toBeLessThan(css.length);
    expect(result).not.toContain('fonts.gstatic.com');
    expect(result).not.toContain('fonts.googleapis.com');
    expect(stripExternalFontFaces(result)).toBe(result);
  });

  it('registers a production-only bundle assertion', () => {
    expect(assertProductionBundleSafety()).toEqual(expect.objectContaining({
      name: 'assert-production-bundle-safety',
      apply: 'build'
    }));
  });

  it.each([
    'fonts.gstatic.com',
    'fonts.googleapis.com',
    '__NZ_VISA_QA__'
  ])('rejects production text containing %s', (prohibitedText) => {
    expect(findProhibitedProductionText(`bundle:${prohibitedText}`)).toBe(prohibitedText);
    expect(findProhibitedProductionText('local production bundle')).toBeUndefined();
  });

  it('keeps external fonts and the development QA loader out of the production bundle', async () => {
    const result = await build({
      build: { write: false },
      configFile: 'vite.config.ts',
      define: {
        'import.meta.env.DEV': 'false',
        'import.meta.env.PROD': 'true'
      },
      logLevel: 'silent',
      mode: 'production',
      root: '.'
    });
    const outputs = (Array.isArray(result) ? result : [result]) as Array<{
      output: Array<{ code?: string; source?: string | Uint8Array }>;
    }>;
    const bundleText = outputs.flatMap((output) => output.output).map((output) => {
      if (output.code !== undefined) return output.code;
      if (typeof output.source === 'string') return output.source;
      return output.source ? new TextDecoder().decode(output.source) : '';
    }).join('\n');

    expect(bundleText).not.toContain('fonts.gstatic.com');
    expect(bundleText).not.toContain('fonts.googleapis.com');
    expect(bundleText).not.toContain('__NZ_VISA_QA__');
    expect(bundleText).not.toContain('qaProjectLoader');
    expect(bundleText).not.toContain('syntheticQa');
    expect(bundleText).toContain('.sd-root-modern');
    expect(bundleText).toContain('.sd-body');
  }, 15_000);
});

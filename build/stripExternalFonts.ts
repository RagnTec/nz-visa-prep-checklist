import type { Plugin } from 'vite';

const externalSurveyFontFace = /@font-face\s*\{[^{}]*https:\/\/fonts\.(?:gstatic|googleapis)\.com[^{}]*\}/gi;
const prohibitedProductionText = [
  'fonts.gstatic.com',
  'fonts.googleapis.com',
  '__NZ_VISA_QA__'
];

export function findProhibitedProductionText(content: string): string | undefined {
  return prohibitedProductionText.find((value) => content.includes(value));
}

export function stripExternalFontFaces(css: string): string {
  return css.replace(externalSurveyFontFace, '');
}

export function stripExternalSurveyFonts(): Plugin {
  return {
    name: 'strip-external-survey-fonts',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('survey-core') || !id.includes('survey-core.min.css')) return null;
      const transformed = stripExternalFontFaces(code);
      return transformed === code ? null : { code: transformed, map: null };
    }
  };
}

export function assertProductionBundleSafety(): Plugin {
  return {
    name: 'assert-production-bundle-safety',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        const content = output.type === 'chunk' ? output.code : String(output.source);
        const prohibited = findProhibitedProductionText(content);
        if (prohibited) {
          this.error(`Production bundle contains prohibited text: ${prohibited}`);
        }
      }
    }
  };
}

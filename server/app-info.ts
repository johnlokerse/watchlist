import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const packageJson = require('../package.json') as { version: string };

export function getAppVersion(): string {
  const appVersion = process.env.APP_VERSION?.trim();
  return appVersion || packageJson.version;
}

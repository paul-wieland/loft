// Signs the finished Loft.app with an ad-hoc signature, after electron-builder has added the icon and resources.
// Without this, the app's signature no longer matches its contents and macOS reports the app as damaged.
// No Apple certificate is used: other Macs will still ask the user to open the app with right-click, Open.
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');

exports.default = async function adhocSign(context) {
  if (context.electronPlatformName !== 'darwin') return;
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
};

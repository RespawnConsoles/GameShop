const { execFileSync } = require('node:child_process');
const path = require('node:path');

// Ad-hoc signs the packaged app. There's no paid Apple Developer certificate here, so
// this can't produce a fully trusted signature or pass notarization — but it's the
// difference between macOS refusing to open a downloaded copy as "damaged" (no signature
// at all) versus showing the normal "unidentified developer" warning that a right-click
// > Open bypasses.
module.exports = async function afterSign(context) {
  const { appOutDir, packager, electronPlatformName } = context;
  if (electronPlatformName !== 'darwin') return;
  const appPath = path.join(appOutDir, `${packager.appInfo.productFilename}.app`);
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
};

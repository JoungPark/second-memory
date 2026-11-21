import { X509Certificate } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [source, distDirectory] = process.argv.slice(2);
if (!source || !distDirectory) {
  throw new Error(
    'Usage: node copy-database-ca.mjs <source-pem> <dist-directory>',
  );
}

const pem = readFileSync(source, 'utf8');
const certificates = pem.match(
  /-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/g,
);
if (!certificates) {
  throw new Error(`${source} must contain a PEM certificate`);
}

const bundle = certificates
  .map((certificate) => new X509Certificate(certificate).toString())
  .join('');

mkdirSync(distDirectory, { recursive: true });
writeFileSync(join(distDirectory, 'database-ca.pem'), bundle);

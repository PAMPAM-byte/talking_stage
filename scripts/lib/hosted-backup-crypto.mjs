import assert from 'node:assert/strict';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { gzipSync, gunzipSync } from 'node:zlib';
const marker = Buffer.from('TSHBACK1');
export function encryptBundle(bundle, key, project) {
  assert.equal(key.length, 32); assert.equal(bundle.project, project);
  const serialized = Buffer.from(JSON.stringify(bundle));
  assert(serialized.length <= 256 * 1024 * 1024, 'Bundle exceeds the verified recovery limit.');
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from(project));
  const encrypted = Buffer.concat([cipher.update(gzipSync(serialized)), cipher.final()]);
  return Buffer.concat([marker, nonce, cipher.getAuthTag(), encrypted]);
}
export function decryptBundle(bytes, key, project) {
  assert.equal(key.length, 32); assert(bytes.length > 36 && bytes.subarray(0, 8).equals(marker));
  const decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(8, 20));
  decipher.setAAD(Buffer.from(project)); decipher.setAuthTag(bytes.subarray(20, 36));
  const compressed = Buffer.concat([decipher.update(bytes.subarray(36)), decipher.final()]);
  const bundle = JSON.parse(gunzipSync(compressed, { maxOutputLength: 256 * 1024 * 1024 }).toString('utf8'));
  assert.equal(bundle.project, project); assert.equal(bundle.version, 1);
  return bundle;
}

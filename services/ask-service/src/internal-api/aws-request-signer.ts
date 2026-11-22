import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { SignatureV4 } from '@smithy/signature-v4';
import { createHash, createHmac } from 'node:crypto';

type BinaryInput = ArrayBuffer | ArrayBufferView;
type HashInput = string | BinaryInput;

function toBytes(value: BinaryInput): Uint8Array {
  return value instanceof ArrayBuffer
    ? new Uint8Array(value)
    : new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}

class Sha256 {
  private readonly hash;

  constructor(secret?: HashInput) {
    this.hash =
      secret === undefined
        ? createHash('sha256')
        : createHmac(
            'sha256',
            typeof secret === 'string' ? secret : toBytes(secret),
          );
  }

  update(
    data: HashInput,
    encoding: 'utf8' | 'ascii' | 'latin1' = 'utf8',
  ): void {
    if (typeof data === 'string') {
      this.hash.update(data, encoding);
    } else {
      this.hash.update(toBytes(data));
    }
  }

  digest(): Promise<Uint8Array> {
    return Promise.resolve(this.hash.digest());
  }
}

export function createLambdaRequestSigner(region: string) {
  return new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: 'lambda',
    sha256: Sha256,
    applyChecksum: true,
  });
}

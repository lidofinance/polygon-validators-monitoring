import { BigNumber } from '@ethersproject/bignumber';
import { BytesLike, SignatureLike, hexlify } from '@ethersproject/bytes';
import { recoverAddress } from '@ethersproject/transactions';

/**
 * Convert raw signature params to SignatureLike object
 */
export function convertToSignature(
  sig: [BigNumber, BigNumber, BigNumber],
): SignatureLike {
  // TODO: sanity checks for params, e.g. v in [27, 28]
  return {
    r: hexlify(sig[0]),
    s: hexlify(sig[1]),
    v: sig[2].toNumber(),
  };
}

/**
 * Retrieve signer from the message and the signature
 * @throws {Error}
 */
export function getSignerAddress(msg: BytesLike, sig: SignatureLike): string {
  const signer = recoverAddress(msg, sig);
  if (!signer) {
    throw new Error(`Unable to recover signer from ${msg}, ${sig}`);
  }

  return signer;
}

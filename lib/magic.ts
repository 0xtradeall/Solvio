import { Magic } from 'magic-sdk';
import { SolanaExtension } from '@magic-ext/solana';
import { clusterApiUrl } from '@solana/web3.js';

let magic: Magic | null = null;

export const getMagic = () => {
  if (typeof window === 'undefined') return null;
  if (!magic) {
    magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY!, {
      extensions: {
        solana: new SolanaExtension({
          rpcUrl: clusterApiUrl('devnet'),
        }),
      },
    });
  }
  return magic;
};

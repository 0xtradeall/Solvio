import { Magic as MagicBase } from 'magic-sdk';
import { SolanaExtension } from '@magic-ext/solana';
import { clusterApiUrl } from '@solana/web3.js';

type MagicWithSolana = InstanceType<typeof MagicBase> & { solana: SolanaExtension; };

let magic: MagicWithSolana | null = null;

export const getMagic = (): MagicWithSolana | null => {
  if (typeof window === 'undefined') return null;
  if (!magic) {
    magic = new MagicBase(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY!, {
      extensions: {
        solana: new SolanaExtension({
          rpcUrl: clusterApiUrl('devnet'),
        }),
      },
    }) as unknown as MagicWithSolana;
  }
  return magic;
};

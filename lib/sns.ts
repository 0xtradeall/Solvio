import { Connection, clusterApiUrl } from '@solana/web3.js';
import { resolve } from '@bonfida/spl-name-service';

const SNS_SUFFIXES = ['.sol', '.abc', '.bonk', '.poor'];

let _conn: Connection | null = null;
function getMainnetConnection(): Connection {
  if (!_conn) _conn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  return _conn;
}

export function isSNSInput(value: string): boolean {
  const v = value.trim().toLowerCase();
  return SNS_SUFFIXES.some(s => v.endsWith(s));
}

export async function resolveSNSName(name: string): Promise<string> {
  const conn = getMainnetConnection();
  const pubkey = await resolve(conn, name.trim().toLowerCase());
  return pubkey.toBase58();
}

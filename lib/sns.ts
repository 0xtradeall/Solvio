import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { resolve, getHashedNameSync, getNameAccountKeySync } from '@bonfida/spl-name-service';

const SOL_SUFFIX = '.sol';
const BACKPACK_SUFFIX = '.backpack';

const ALL_DOMAINS_TLDS: string[] = [
  '.solana', '.abc', '.bonk', '.poor',
  '.glow', '.saga', '.og', '.crypto',
  '.nft', '.wallet', '.x', '.888',
  '.dao', '.blockchain',
];

export type ResolverProvider = 'bonfida' | 'alldomains' | 'backpack';

export interface ResolveResult {
  address: string;
  provider: ResolverProvider;
}

let _mainnetConn: Connection | null = null;
function getMainnetConnection(): Connection {
  if (!_mainnetConn) {
    _mainnetConn = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  }
  return _mainnetConn;
}

export function isSNSInput(value: string): boolean {
  const v = value.trim().toLowerCase();
  return (
    v.endsWith(SOL_SUFFIX) ||
    v.endsWith(BACKPACK_SUFFIX) ||
    ALL_DOMAINS_TLDS.some(tld => v.endsWith(tld))
  );
}

export function detectProvider(value: string): ResolverProvider | null {
  const v = value.trim().toLowerCase();
  if (v.endsWith(SOL_SUFFIX)) return 'bonfida';
  if (v.endsWith(BACKPACK_SUFFIX)) return 'backpack';
  if (ALL_DOMAINS_TLDS.some(tld => v.endsWith(tld))) return 'alldomains';
  return null;
}

async function resolveBonfida(name: string): Promise<string> {
  const conn = getMainnetConnection();
  const pubkey = await resolve(conn, name.trim().toLowerCase());
  return pubkey.toBase58();
}

async function resolveBackpack(domain: string): Promise<string> {
  const username = domain.trim().toLowerCase().replace(BACKPACK_SUFFIX, '');
  const res = await fetch(
    `https://xnft-api-server.xnfts.dev/v1/users/fromUsername?username=${encodeURIComponent(username)}`
  );
  if (!res.ok) throw new Error(`Backpack API error: ${res.status}`);
  const data = await res.json();
  const solanaKey = data?.user?.publicKeys?.find(
    (k: { blockchain: string; publicKey: string }) => k.blockchain === 'solana'
  );
  if (!solanaKey?.publicKey) throw new Error(`No Solana key found for Backpack user: ${username}`);
  return solanaKey.publicKey;
}

async function resolveAllDomainsOnChain(domain: string): Promise<string> {
  const v = domain.trim().toLowerCase();
  const tld = ALL_DOMAINS_TLDS.find(t => v.endsWith(t));
  if (!tld) throw new Error(`Unknown AllDomains TLD for: ${domain}`);

  const name = v.slice(0, v.length - tld.length);
  const tldName = tld.slice(1);
  const conn = getMainnetConnection();

  const tldHash = getHashedNameSync(tldName);
  const tldKey = getNameAccountKeySync(tldHash, undefined, undefined);

  const nameHash = getHashedNameSync(name);
  const nameKey = getNameAccountKeySync(nameHash, undefined, tldKey);

  const accountInfo = await conn.getAccountInfo(nameKey);
  if (!accountInfo?.data || accountInfo.data.length < 64) {
    throw new Error(`AllDomains: no account found for ${domain}`);
  }

  const ownerBytes = accountInfo.data.slice(32, 64);
  const owner = new PublicKey(ownerBytes);

  if (owner.equals(PublicKey.default)) {
    throw new Error(`AllDomains: account exists but has no owner for ${domain}`);
  }

  return owner.toBase58();
}

export async function resolveSNSName(name: string): Promise<ResolveResult> {
  const provider = detectProvider(name);

  if (provider === 'bonfida') {
    const address = await resolveBonfida(name);
    return { address, provider: 'bonfida' };
  }

  if (provider === 'backpack') {
    const address = await resolveBackpack(name);
    return { address, provider: 'backpack' };
  }

  if (provider === 'alldomains') {
    try {
      const address = await resolveAllDomainsOnChain(name);
      return { address, provider: 'alldomains' };
    } catch (e1) {
      console.warn('[SNS] AllDomains on-chain failed, trying Bonfida fallback:', e1);
      try {
        const address = await resolveBonfida(name);
        return { address, provider: 'bonfida' };
      } catch (e2) {
        console.warn('[SNS] Bonfida fallback also failed:', e2);
        throw new Error(`Name not found on AllDomains or Bonfida. Please check spelling or use wallet address directly.`);
      }
    }
  }

  throw new Error(`Unsupported domain type: ${name}`);
}

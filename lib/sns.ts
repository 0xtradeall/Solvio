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

const resolveSolDomain = async (domain: string): Promise<string | null> => {
  const name = domain.replace('.sol', '');
  const response = await fetch(
    'https://sns-sdk-proxy.bonfida.workers.dev/resolve/' + name
  );
  const data = await response.json();
  if (data?.result) return data.result;
  return null;
};

const resolveAllDomains = async (domain: string): Promise<string | null> => {
  const response = await fetch(
    'https://api.alldomains.id/v1/resolve?domain=' + domain
  );
  const data = await response.json();
  if (data?.owner) return data.owner;
  return null;
};

const resolveBackpack = async (domain: string): Promise<string | null> => {
  const username = domain.replace('.backpack', '');
  const response = await fetch(
    'https://xnft-api-server.xnfts.dev/v1/users/fromUsername?username=' + username
  );
  const data = await response.json();
  const solKey = data?.user?.publicKeys?.find(
    (k: any) => k.blockchain === 'solana'
  );
  return solKey?.publicKey || null;
};

export async function resolveSNSName(name: string): Promise<ResolveResult> {
  const provider = detectProvider(name);
  if (!provider) {
    throw new Error(`Unsupported domain type: ${name}`);
  }

  let address: string | null = null;

  if (provider === 'bonfida') {
    address = await resolveSolDomain(name);
  } else if (provider === 'alldomains') {
    address = await resolveAllDomains(name);
  } else if (provider === 'backpack') {
    address = await resolveBackpack(name);
  }

  if (!address) {
    throw new Error(`Name not found: ${name}`);
  }

  return { address, provider };
}

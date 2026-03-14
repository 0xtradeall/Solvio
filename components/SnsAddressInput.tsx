'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { isSNSInput, resolveSNSName, detectProvider, ResolverProvider } from '@/lib/sns';
import { validateSolanaAddress } from '@/lib/validators';

type ResolveStatus = 'idle' | 'resolving' | 'resolved' | 'error';

interface Props {
  value: string;
  onChange: (raw: string, resolved: string, snsName?: string) => void;
  disabled?: boolean;
  error?: string;
  inputClassName?: string;
}

const PROVIDER_LABELS: Record<ResolverProvider, string> = {
  bonfida: 'Resolved via Bonfida SNS',
  alldomains: 'Resolved via AllDomains',
  backpack: 'Resolved via Backpack',
};

export default function SnsAddressInput({ value, onChange, disabled, error, inputClassName }: Props) {
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle');
  const [resolvedAddr, setResolvedAddr] = useState('');
  const [resolveError, setResolveError] = useState('');
  const [provider, setProvider] = useState<ResolverProvider | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(value);

  useEffect(() => {
    latestValue.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResolveStatus('idle');
      setResolvedAddr('');
      setResolveError('');
      setProvider(null);
      onChange(value, '', undefined);
      return;
    }

    if (isSNSInput(value)) {
      setResolveStatus('resolving');
      setResolvedAddr('');
      setResolveError('');
      setProvider(null);
      onChange(value, '', undefined);

      debounceRef.current = setTimeout(async () => {
        try {
          const result = await resolveSNSName(value);
          if (latestValue.current !== value) return;
          setResolvedAddr(result.address);
          setProvider(result.provider);
          setResolveStatus('resolved');
          onChange(value, result.address, value.trim().toLowerCase());
        } catch {
          if (latestValue.current !== value) return;
          setResolveStatus('error');
          setResolveError(
            'Name not found on any name service. Please check spelling or use a wallet address directly.'
          );
          onChange(value, '', undefined);
        }
      }, 600);
    } else if (validateSolanaAddress(value.trim())) {
      setResolveStatus('resolved');
      setResolvedAddr(value.trim());
      setResolveError('');
      setProvider(null);
      onChange(value, value.trim(), undefined);
    } else {
      setResolveStatus('error');
      setResolvedAddr('');
      setResolveError('Not a valid wallet address or supported name (e.g. .sol, .solana, .backpack)');
      setProvider(null);
      onChange(value, '', undefined);
    }

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value, '', undefined);
  };

  const borderClass = error || resolveStatus === 'error'
    ? 'border-red-400 bg-red-50'
    : resolveStatus === 'resolved'
    ? 'border-green-400 bg-green-50/30'
    : resolveStatus === 'resolving'
    ? 'border-yellow-300'
    : 'border-gray-200 focus:border-primary-400';

  const shortAddr = resolvedAddr
    ? `${resolvedAddr.slice(0, 6)}…${resolvedAddr.slice(-4)}`
    : '';

  const providerLabel = provider ? PROVIDER_LABELS[provider] : 'Valid address';

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Address, .sol, .solana, .backpack or any SNS name"
          className={`w-full border-2 rounded-xl p-2.5 text-sm font-mono focus:outline-none transition-colors disabled:opacity-60 pr-10 ${borderClass} ${inputClassName ?? ''}`}
        />
        {resolveStatus === 'resolving' && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-yellow-500" />
        )}
        {resolveStatus === 'resolved' && (
          <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
        )}
        {resolveStatus === 'error' && (
          <XCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
        )}
      </div>

      {resolveStatus === 'resolving' && (
        <p className="text-yellow-600 text-xs mt-1 flex items-center gap-1">
          <Loader2 size={11} className="animate-spin" />
          {detectProvider(value) === 'bonfida' && 'Resolving via Bonfida SNS…'}
          {detectProvider(value) === 'alldomains' && 'Resolving via AllDomains…'}
          {detectProvider(value) === 'backpack' && 'Resolving via Backpack…'}
        </p>
      )}

      {resolveStatus === 'resolved' && resolvedAddr && (
        <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
          <CheckCircle2 size={11} />
          {providerLabel}: {shortAddr}
        </p>
      )}

      {resolveStatus === 'error' && (
        <p className="text-red-500 text-xs mt-1">{resolveError}</p>
      )}
    </div>
  );
}

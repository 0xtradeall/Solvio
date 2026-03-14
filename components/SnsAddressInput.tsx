'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { isSNSInput, resolveSNSName } from '@/lib/sns';
import { validateSolanaAddress } from '@/lib/validators';

type ResolveStatus = 'idle' | 'resolving' | 'resolved' | 'error';

interface Props {
  value: string;
  onChange: (raw: string, resolved: string, snsName?: string) => void;
  disabled?: boolean;
  error?: string;
  inputClassName?: string;
}

export default function SnsAddressInput({ value, onChange, disabled, error, inputClassName }: Props) {
  const [resolveStatus, setResolveStatus] = useState<ResolveStatus>('idle');
  const [resolvedAddr, setResolvedAddr] = useState('');
  const [resolveError, setResolveError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestValue = useRef(value);

  useEffect(() => {
    latestValue.current = value;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResolveStatus('idle');
      setResolvedAddr('');
      setResolveError('');
      return;
    }

    if (!isSNSInput(value)) {
      setResolveStatus('idle');
      setResolvedAddr('');
      setResolveError('');
      return;
    }

    setResolveStatus('resolving');
    setResolvedAddr('');
    setResolveError('');

    debounceRef.current = setTimeout(async () => {
      try {
        const addr = await resolveSNSName(value);
        if (latestValue.current !== value) return;
        setResolvedAddr(addr);
        setResolveStatus('resolved');
        onChange(value, addr, value.trim().toLowerCase());
      } catch {
        if (latestValue.current !== value) return;
        setResolveStatus('error');
        setResolveError('Name not found. Please check spelling.');
        onChange(value, '', undefined);
      }
    }, 600);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (!isSNSInput(raw)) {
      onChange(raw, raw, undefined);
    } else {
      onChange(raw, '', undefined);
    }
  };

  const borderClass = error || resolveStatus === 'error'
    ? 'border-red-400 bg-red-50'
    : resolveStatus === 'resolved'
    ? 'border-green-400 bg-green-50/30'
    : 'border-gray-200 focus:border-primary-400';

  const shortAddr = resolvedAddr
    ? `${resolvedAddr.slice(0, 4)}…${resolvedAddr.slice(-4)}`
    : '';

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="Wallet address or .sol name (e.g. akaki.sol)"
          className={`w-full border-2 rounded-xl p-2.5 text-sm font-mono focus:outline-none transition-colors disabled:opacity-60 pr-10 ${borderClass} ${inputClassName ?? ''}`}
        />
        {resolveStatus === 'resolving' && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400" />
        )}
        {resolveStatus === 'resolved' && (
          <CheckCircle2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500" />
        )}
        {resolveStatus === 'error' && (
          <XCircle size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-red-400" />
        )}
      </div>

      {resolveStatus === 'resolved' && resolvedAddr && (
        <p className="text-green-600 text-xs mt-1 flex items-center gap-1">
          <CheckCircle2 size={11} />
          Resolved: {shortAddr}
        </p>
      )}
      {resolveStatus === 'error' && (
        <p className="text-red-500 text-xs mt-1">{resolveError}</p>
      )}
    </div>
  );
}

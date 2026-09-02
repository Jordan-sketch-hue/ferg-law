'use client';

import { useState } from 'react';

interface Props {
  userRef: string;
  userRole?: 'admin' | 'partner';
  onSuccess: (token: string, userRole: string) => void;
  onError?: (msg: string) => void;
}

export default function BiometricLogin({
  userRef,
  userRole = 'admin',
  onSuccess,
  onError,
}: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error' | 'unsupported'>('idle');
  const [msg, setMsg] = useState('');

  const isSupported = typeof window !== 'undefined' && 'PublicKeyCredential' in window;

  const authenticate = async () => {
    if (!isSupported) { setState('unsupported'); return; }
    setState('loading');
    try {
      const { startAuthentication } = await import('@simplewebauthn/browser');
      const optRes = await fetch(`/api/webauthn/authenticate?userRef=${encodeURIComponent(userRef)}&userRole=${userRole}`);
      const { ok, options, error } = await optRes.json();
      if (!ok) { setMsg(error || 'No passkey found'); setState('error'); onError?.(error); return; }

      const response = await startAuthentication({ optionsJSON: options });
      const verifyRes = await fetch('/api/webauthn/authenticate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, userRef, userRole }),
      });
      const result = await verifyRes.json();
      if (result.ok) {
        setState('done');
        onSuccess(result.token, result.userRole);
      } else {
        setMsg(result.error || 'Authentication failed');
        setState('error');
        onError?.(result.error);
      }
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Authentication cancelled';
      setMsg(err);
      setState('error');
      onError?.(err);
    }
  };

  if (state === 'unsupported') return null;

  return (
    <button
      onClick={authenticate}
      disabled={state === 'loading' || state === 'done'}
      style={S.btn}
      title="Sign in with Face ID / fingerprint"
    >
      {state === 'loading' ? (
        <span style={S.ring} />
      ) : state === 'done' ? (
        <span>✓</span>
      ) : (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 12c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3z" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 14c-3.31 0-6 1.79-6 4v1h12v-1c0-2.21-2.69-4-6-4z" />
        </svg>
      )}
      <span>{state === 'loading' ? 'Verifying…' : state === 'done' ? 'Signed in' : 'Face ID / Fingerprint'}</span>
      {state === 'error' && <span style={S.errMsg}>{msg}</span>}
    </button>
  );
}

export function BiometricSetup({
  userRef,
  userRole = 'admin',
  deviceLabel,
  onSuccess,
}: {
  userRef: string;
  userRole?: 'admin' | 'partner';
  deviceLabel?: string;
  onSuccess?: () => void;
}) {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  const register = async () => {
    setState('loading');
    try {
      const { startRegistration } = await import('@simplewebauthn/browser');
      const optRes = await fetch(`/api/webauthn/register?userRef=${encodeURIComponent(userRef)}&userRole=${userRole}`);
      const { ok, options, error } = await optRes.json();
      if (!ok) { setMsg(error || 'Could not start registration'); setState('error'); return; }

      const response = await startRegistration({ optionsJSON: options });
      const verifyRes = await fetch('/api/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response, userRef, userRole, deviceLabel: deviceLabel || navigator.platform }),
      });
      const result = await verifyRes.json();
      if (result.ok) {
        setState('done');
        onSuccess?.();
      } else {
        setMsg(result.error || 'Registration failed');
        setState('error');
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Setup cancelled');
      setState('error');
    }
  };

  return (
    <button onClick={register} disabled={state === 'loading' || state === 'done'} style={S.setupBtn}>
      {state === 'done' ? '✓ Passkey saved' : state === 'loading' ? 'Setting up…' : 'Enable Face ID / Fingerprint'}
      {state === 'error' && <span style={S.errMsg}>{msg}</span>}
    </button>
  );
}

const S: Record<string, React.CSSProperties> = {
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '13px 16px',
    border: '1.5px solid rgba(16,42,30,.2)',
    borderRadius: 12,
    background: '#fff',
    color: '#0D1F16',
    fontWeight: 600,
    fontSize: '0.93rem',
    cursor: 'pointer',
    position: 'relative',
  },
  setupBtn: {
    display: 'block',
    width: '100%',
    padding: '12px 16px',
    border: '1.5px dashed rgba(200,166,92,.6)',
    borderRadius: 12,
    background: 'rgba(200,166,92,.06)',
    color: '#8a6a1a',
    fontWeight: 600,
    fontSize: '0.88rem',
    cursor: 'pointer',
  },
  ring: {
    width: 18,
    height: 18,
    border: '2px solid #0D1F16',
    borderTopColor: 'transparent',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.7s linear infinite',
  },
  errMsg: {
    fontSize: '0.75rem',
    color: '#c0392b',
    marginLeft: 'auto',
    maxWidth: 160,
    textAlign: 'right',
  },
};

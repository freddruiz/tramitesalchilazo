'use client';

import { useState, FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function StepUpPage() {
  const { update } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/step-up', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secondaryPassword: password }),
      });

      const data = (await res.json()) as {
        ok?: boolean;
        stepUpVerifiedAt?: number;
        error?: string;
        attemptsRemaining?: number;
      };

      if (res.ok && data.stepUpVerifiedAt) {
        // Propagate stepUpVerifiedAt into the JWT via NextAuth's session update.
        await update({ stepUpVerifiedAt: data.stepUpVerifiedAt });
        router.push(callbackUrl);
        return;
      }

      if (res.status === 423) {
        setError('Too many failed attempts. Step-up is locked for 15 minutes.');
      } else if (res.status === 429) {
        setError('Too many requests. Please wait before trying again.');
      } else {
        setError(data.error ?? 'Incorrect secondary password.');
        if (typeof data.attemptsRemaining === 'number') {
          setAttemptsLeft(data.attemptsRemaining);
        }
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Confirm your identity
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your secondary password to continue.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <label
            htmlFor="secondary-password"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Secondary password
          </label>
          <input
            id="secondary-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />

          {error && (
            <p className="mt-2 text-sm text-red-600">
              {error}
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <span> ({attemptsLeft} attempt{attemptsLeft !== 1 ? 's' : ''} remaining)</span>
              )}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => router.back()}
          className="mt-3 w-full text-center text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { isoBase64URL } from '@simplewebauthn/server/helpers';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function getRpId(): string {
  if (process.env.WEBAUTHN_RP_ID) return process.env.WEBAUTHN_RP_ID;
  const raw = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
  return new URL(raw).hostname;
}

function getOrigin(): string {
  return (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'Tramites al Chilazo Admin';

// ── Challenge helpers ──────────────────────────────────────

export async function storeChallenge(
  userId: string,
  challenge: string,
  type: 'registration' | 'authentication',
): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Prune expired challenges lazily
  await supabase
    .from('admin_webauthn_challenges')
    .delete()
    .lt('expires_at', new Date().toISOString());

  const { error } = await supabase.from('admin_webauthn_challenges').insert({
    user_id: userId,
    challenge,
    type,
  });
  if (error) throw new Error(`Failed to store WebAuthn challenge: ${error.message}`);
}

export async function consumeChallenge(
  userId: string,
  type: 'registration' | 'authentication',
): Promise<string> {
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('admin_webauthn_challenges')
    .select('id, challenge, expires_at')
    .eq('user_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) throw new Error('No pending WebAuthn challenge found');
  if (data.expires_at < now) throw new Error('WebAuthn challenge expired');

  // Delete after consuming (single-use)
  await supabase.from('admin_webauthn_challenges').delete().eq('id', data.id);

  return data.challenge as string;
}

// ── Registration ───────────────────────────────────────────

export async function buildRegistrationOptions(userId: string, email: string) {
  const supabase = getSupabaseAdmin();

  // Fetch existing credentials to exclude
  const { data: existing } = await supabase
    .from('admin_webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', userId);

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: email,
    userID: Buffer.from(userId),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'required',
    },
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id as string,
      transports: (c.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });

  await storeChallenge(userId, options.challenge, 'registration');
  return options;
}

export async function completeRegistration(
  userId: string,
  response: RegistrationResponseJSON,
  friendlyName?: string,
) {
  const expectedChallenge = await consumeChallenge(userId, 'registration');

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error('WebAuthn registration verification failed');
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('admin_webauthn_credentials').insert({
    user_id: userId,
    credential_id: credential.id,
    public_key: isoBase64URL.fromBuffer(credential.publicKey),
    counter: credential.counter,
    device_type: credentialDeviceType,
    backed_up: credentialBackedUp,
    transports: credential.transports ?? [],
    friendly_name: friendlyName ?? null,
  });

  if (error) throw new Error(`Failed to save WebAuthn credential: ${error.message}`);

  return { credentialId: credential.id };
}

// ── Authentication ─────────────────────────────────────────

export async function buildAuthenticationOptions(userId: string) {
  const supabase = getSupabaseAdmin();

  const { data: credentials } = await supabase
    .from('admin_webauthn_credentials')
    .select('credential_id, transports')
    .eq('user_id', userId);

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'required',
    allowCredentials: (credentials ?? []).map((c) => ({
      id: c.credential_id as string,
      transports: (c.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    })),
  });

  await storeChallenge(userId, options.challenge, 'authentication');
  return options;
}

export async function completeAuthentication(
  userId: string,
  response: AuthenticationResponseJSON,
) {
  const expectedChallenge = await consumeChallenge(userId, 'authentication');
  const supabase = getSupabaseAdmin();

  const { data: storedCred, error: credError } = await supabase
    .from('admin_webauthn_credentials')
    .select('id, credential_id, public_key, counter, transports')
    .eq('user_id', userId)
    .eq('credential_id', response.id)
    .single();

  if (credError || !storedCred) throw new Error('Credential not found for this admin');

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    credential: {
      id: storedCred.credential_id as string,
      publicKey: isoBase64URL.toBuffer(storedCred.public_key as string),
      counter: storedCred.counter as number,
      transports: (storedCred.transports as AuthenticatorTransportFuture[] | null) ?? undefined,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) throw new Error('WebAuthn authentication verification failed');

  // Update counter to prevent replay attacks
  await supabase
    .from('admin_webauthn_credentials')
    .update({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', storedCred.id);

  return { credentialId: response.id };
}

export async function listCredentials(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('admin_webauthn_credentials')
    .select('id, credential_id, friendly_name, device_type, backed_up, created_at, last_used_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Failed to list credentials: ${error.message}`);
  return data ?? [];
}

export async function hasPasskeys(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('admin_webauthn_credentials')
    .select('id')
    .eq('user_id', userId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

export async function deleteCredential(userId: string, credentialDbId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('admin_webauthn_credentials')
    .delete()
    .eq('id', credentialDbId)
    .eq('user_id', userId); // ownership guard
  if (error) throw new Error(`Failed to delete credential: ${error.message}`);
}

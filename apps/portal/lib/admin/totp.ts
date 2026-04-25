import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt, hashPassword, verifyPassword } from '@tramitesalchilazo/shared';
import { randomBytes } from 'node:crypto';

const RP_NAME = process.env.WEBAUTHN_RP_NAME ?? 'Tramites al Chilazo Admin';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

function getTotpKey(): Buffer {
  const raw = process.env.ADMIN_TOTP_ENCRYPTION_KEY;
  if (!raw) throw new Error('ADMIN_TOTP_ENCRYPTION_KEY is not set');
  const buf = Buffer.from(raw, 'base64url');
  if (buf.length !== 32) throw new Error('ADMIN_TOTP_ENCRYPTION_KEY must be 32 bytes (base64url)');
  return buf;
}

function generateBackupCodes(): string[] {
  return Array.from({ length: BACKUP_CODE_COUNT }, () =>
    randomBytes(BACKUP_CODE_LENGTH).toString('hex').slice(0, BACKUP_CODE_LENGTH).toUpperCase(),
  );
}

// ── Setup ──────────────────────────────────────────────────

export async function setupTotp(
  userId: string,
  email: string,
): Promise<{ otpauthUri: string; qrDataUrl: string; backupCodes: string[] }> {
  const secret = authenticator.generateSecret();
  const otpauthUri = authenticator.keyuri(email, RP_NAME, secret);
  const qrDataUrl = await QRCode.toDataURL(otpauthUri);

  const dek = getTotpKey();
  const envelope = encrypt(Buffer.from(secret, 'utf8'), dek);

  const backupCodes = generateBackupCodes();
  const backupCodesHashed = await Promise.all(
    backupCodes.map(async (code) => ({
      hash: await hashPassword(code),
      used: false,
    })),
  );

  const supabase = getSupabaseAdmin();
  // Upsert: replace any previous unverified TOTP setup
  const { error } = await supabase.from('admin_totp_secrets').upsert(
    {
      user_id: userId,
      secret_envelope: envelope,
      backup_codes: backupCodesHashed,
      verified: false,
    },
    { onConflict: 'user_id' },
  );
  if (error) throw new Error(`Failed to store TOTP secret: ${error.message}`);

  return { otpauthUri, qrDataUrl, backupCodes };
}

// ── Verification ───────────────────────────────────────────

export async function verifyTotpCode(userId: string, token: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('admin_totp_secrets')
    .select('secret_envelope, verified')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;

  const envelope = data.secret_envelope as { ciphertext: string; iv: string; tag: string };
  const dek = getTotpKey();
  const secretBuf = decrypt(envelope.ciphertext, envelope.iv, envelope.tag, dek);
  const secret = secretBuf.toString('utf8');

  const isValid = authenticator.verify({ token, secret });

  if (isValid && !data.verified) {
    await supabase
      .from('admin_totp_secrets')
      .update({ verified: true })
      .eq('user_id', userId);
  }

  return isValid;
}

export async function verifyBackupCode(userId: string, code: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('admin_totp_secrets')
    .select('id, backup_codes')
    .eq('user_id', userId)
    .single();

  if (error || !data) return false;

  const codes = (data.backup_codes as { hash: string; used: boolean }[]) ?? [];
  for (let i = 0; i < codes.length; i++) {
    const entry = codes[i]!;
    if (entry.used) continue;
    const match = await verifyPassword(code, entry.hash);
    if (match) {
      codes[i] = { ...entry, used: true };
      await supabase
        .from('admin_totp_secrets')
        .update({ backup_codes: codes })
        .eq('id', data.id);
      return true;
    }
  }

  return false;
}

export async function hasTotpConfigured(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from('admin_totp_secrets')
    .select('id, verified')
    .eq('user_id', userId)
    .eq('verified', true)
    .single();
  return !!data;
}

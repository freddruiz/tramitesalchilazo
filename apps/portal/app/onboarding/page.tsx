'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});
    setGlobalError('');
    setSubmitting(true);

    const form = e.currentTarget;
    const data = {
      full_name: (form.elements.namedItem('full_name') as HTMLInputElement).value,
      dpi: (form.elements.namedItem('dpi') as HTMLInputElement).value,
      secondary_password: (form.elements.namedItem('secondary_password') as HTMLInputElement).value,
      confirm_password: (form.elements.namedItem('confirm_password') as HTMLInputElement).value,
      consent_accepted: (form.elements.namedItem('consent_accepted') as HTMLInputElement).checked
        ? (true as const)
        : undefined,
    };

    try {
      const res = await fetch('/api/profile/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push('/dashboard');
        return;
      }

      const json = await res.json().catch(() => ({}));

      if (res.status === 422 && json.issues) {
        const fieldErrors: Record<string, string> = {};
        for (const issue of json.issues as Array<{ path: string[]; message: string }>) {
          const key = issue.path[0] ?? 'global';
          fieldErrors[key] = issue.message;
        }
        setErrors(fieldErrors);
      } else if (res.status === 409) {
        setGlobalError('A profile with this DPI already exists. Contact support if this is an error.');
      } else if (res.status === 429) {
        setGlobalError('Too many attempts. Please wait an hour before trying again.');
      } else {
        setGlobalError(json.error ?? 'Something went wrong. Please try again.');
      }
    } catch {
      setGlobalError('Network error. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main style={styles.main}>
      <div style={styles.card}>
        <h1 style={styles.heading}>Completar perfil</h1>
        <p style={styles.subtitle}>
          Necesitamos verificar tu identidad antes de continuar.
        </p>

        {globalError && <p style={styles.errorBanner}>{globalError}</p>}

        <form onSubmit={handleSubmit} noValidate style={styles.form}>
          <Field
            label="Nombre completo"
            name="full_name"
            type="text"
            autoComplete="name"
            required
            error={errors.full_name}
          />

          <Field
            label="DPI (13 dígitos)"
            name="dpi"
            type="text"
            inputMode="numeric"
            maxLength={13}
            pattern="\d{13}"
            autoComplete="off"
            required
            error={errors.dpi}
          />

          <Field
            label="Contraseña secundaria"
            name="secondary_password"
            type="password"
            autoComplete="new-password"
            required
            hint="Mínimo 8 caracteres, una mayúscula, una minúscula y un número."
            error={errors.secondary_password}
          />

          <Field
            label="Confirmar contraseña"
            name="confirm_password"
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirm_password}
          />

          <div style={styles.checkboxRow}>
            <input
              id="consent_accepted"
              name="consent_accepted"
              type="checkbox"
              style={styles.checkbox}
              required
            />
            <label htmlFor="consent_accepted" style={styles.checkboxLabel}>
              Acepto los{' '}
              <a href="/terms" target="_blank" rel="noopener noreferrer" style={styles.link}>
                términos y condiciones
              </a>{' '}
              y autorizo el tratamiento de mis datos personales conforme a la ley guatemalteca.
            </label>
          </div>
          {errors.consent_accepted && (
            <p style={styles.fieldError}>{errors.consent_accepted}</p>
          )}

          <button type="submit" disabled={submitting} style={styles.button}>
            {submitting ? 'Guardando...' : 'Completar perfil'}
          </button>
        </form>
      </div>
    </main>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: string;
  autoComplete?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  inputMode?: 'numeric' | 'text' | 'email';
  maxLength?: number;
  pattern?: string;
}

function Field({ label, name, type, autoComplete, required, hint, error, inputMode, maxLength, pattern }: FieldProps) {
  return (
    <div style={styles.fieldGroup}>
      <label htmlFor={name} style={styles.label}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        inputMode={inputMode}
        maxLength={maxLength}
        pattern={pattern}
        style={{ ...styles.input, ...(error ? styles.inputError : {}) }}
        aria-describedby={hint ? `${name}-hint` : undefined}
        aria-invalid={!!error}
      />
      {hint && (
        <p id={`${name}-hint`} style={styles.hint}>
          {hint}
        </p>
      )}
      {error && <p style={styles.fieldError}>{error}</p>}
    </div>
  );
}

const styles = {
  main: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '1rem',
    fontFamily: 'system-ui, sans-serif',
  } as React.CSSProperties,
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    padding: '2rem',
    width: '100%',
    maxWidth: '480px',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.5rem',
    fontWeight: 700,
    marginBottom: '0.25rem',
    color: '#111827',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '0.375rem',
    color: '#991b1b',
    fontSize: '0.875rem',
    padding: '0.75rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  } as React.CSSProperties,
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  } as React.CSSProperties,
  label: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#374151',
  } as React.CSSProperties,
  input: {
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    padding: '0.5rem 0.75rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  inputError: {
    borderColor: '#f87171',
  } as React.CSSProperties,
  hint: {
    fontSize: '0.75rem',
    color: '#6b7280',
    margin: 0,
  } as React.CSSProperties,
  fieldError: {
    fontSize: '0.75rem',
    color: '#dc2626',
    margin: 0,
  } as React.CSSProperties,
  checkboxRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
  } as React.CSSProperties,
  checkbox: {
    marginTop: '0.125rem',
    flexShrink: 0,
  } as React.CSSProperties,
  checkboxLabel: {
    fontSize: '0.875rem',
    color: '#374151',
    lineHeight: 1.5,
  } as React.CSSProperties,
  link: {
    color: '#2563eb',
    textDecoration: 'underline',
  } as React.CSSProperties,
  button: {
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '0.375rem',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    padding: '0.625rem 1rem',
    marginTop: '0.5rem',
  } as React.CSSProperties,
} satisfies Record<string, React.CSSProperties>;

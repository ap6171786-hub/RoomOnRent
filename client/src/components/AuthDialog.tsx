import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { login, loginSchema, register, registerSchema, type AuthUser } from '../lib/auth';

type Props = {
  mode: 'login' | 'register';
  onClose: () => void;
  onSuccess: (user: AuthUser) => void;
  onModeChange: (mode: 'login' | 'register') => void;
};

function AuthDialog({ mode, onClose, onSuccess, onModeChange }: Props) {
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#211333]/55 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="relative w-full max-w-[440px] rounded-[26px] bg-white p-7 shadow-2xl dark:bg-[#211b2c] sm:p-9">
      <button onClick={onClose} aria-label="Close dialog" className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full text-muted hover:bg-brand-50 dark:text-white/70 dark:hover:bg-white/10"><X size={19} /></button>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 dark:bg-brand-700/20 dark:text-brand-300"><span className="text-xl font-black">R</span></div>
      <h2 id="auth-title" className="mt-5 text-2xl font-extrabold tracking-tight">{mode === 'login' ? 'Welcome back' : 'Find your place'}</h2>
      <p className="mt-1 text-sm text-muted dark:text-white/55">{mode === 'login' ? 'Sign in to continue to RoomOnRent.' : 'Create one account to find or list a home.'}</p>
      {mode === 'login'
        ? <LoginForm onSuccess={onSuccess} />
        : <RegisterForm onSuccess={onSuccess} />}
      <p className="mt-5 text-center text-sm text-muted dark:text-white/55">
        {mode === 'login' ? 'New to RoomOnRent?' : 'Already have an account?'}{' '}
        <button onClick={() => onModeChange(mode === 'login' ? 'register' : 'login')} className="font-extrabold text-brand-700 dark:text-brand-300">{mode === 'login' ? 'Create account' : 'Sign in'}</button>
      </p>
    </section>
  </div>;
}

function LoginForm({ onSuccess }: Pick<Props, 'onSuccess'>) {
  const [serverError, setServerError] = useState('');
  const form = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  async function onSubmit(values: typeof form extends never ? never : { email: string; password: string }) {
    setServerError('');
    try {
      const session = await login(values);
      onSuccess(session.user);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign-in failed. Please try again.');
    }
  }
  return <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
    <Field label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={form.formState.errors.email?.message} register={form.register('email')} />
    <Field label="Password" type="password" placeholder="Your password" autoComplete="current-password" error={form.formState.errors.password?.message} register={form.register('password')} />
    {serverError && <p role="alert" className="text-sm font-semibold text-red-600">{serverError}</p>}
    <button disabled={form.formState.isSubmitting} className="mt-1 rounded-full bg-brand-700 py-3.5 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:opacity-60">{form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}</button>
  </form>;
}

function RegisterForm({ onSuccess }: Pick<Props, 'onSuccess'>) {
  const [serverError, setServerError] = useState('');
  const form = useForm({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', phone: '', password: '' } });
  async function onSubmit(values: { name: string; email: string; phone?: string; password: string }) {
    setServerError('');
    try {
      const session = await register(values);
      onSuccess(session.user);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Registration failed. Please try again.');
    }
  }
  return <form className="mt-6 grid gap-4" onSubmit={form.handleSubmit(onSubmit)}>
    <Field label="Your name" placeholder="Full name" autoComplete="name" error={form.formState.errors.name?.message} register={form.register('name')} />
    <Field label="Email address" type="email" placeholder="you@example.com" autoComplete="email" error={form.formState.errors.email?.message} register={form.register('email')} />
    <Field label="Mobile number (optional)" type="tel" placeholder="+91 98765 43210" autoComplete="tel" error={form.formState.errors.phone?.message} register={form.register('phone')} />
    <Field label="Password" type="password" placeholder="At least 10 characters" autoComplete="new-password" error={form.formState.errors.password?.message} register={form.register('password')} />
    {serverError && <p role="alert" className="text-sm font-semibold text-red-600">{serverError}</p>}
    <button disabled={form.formState.isSubmitting} className="mt-1 rounded-full bg-brand-700 py-3.5 text-sm font-extrabold text-white transition hover:bg-brand-800 disabled:opacity-60">{form.formState.isSubmitting ? 'Creating account…' : 'Create account'}</button>
  </form>;
}

function Field({ label, error, register: fieldRegister, ...inputProps }: {
  label: string;
  error?: string;
  register: ReturnType<ReturnType<typeof useForm>['register']>;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
}) {
  return <label className="grid gap-1.5 text-xs font-bold text-ink dark:text-white/80">{label}<input {...fieldRegister} {...inputProps} className="rounded-xl border border-line bg-[#fbfaff] px-4 py-3 text-sm font-medium outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:border-white/10 dark:bg-white/[0.04] dark:focus:ring-brand-700/20" />{error && <span className="font-medium text-red-600">{error}</span>}</label>;
}

export default AuthDialog;

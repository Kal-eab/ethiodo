import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, LogIn, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkUserAuth } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ email: '', password: '', full_name: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await base44.auth.login(form.email, form.password);
      } else {
        await base44.auth.register(form.email, form.password, form.full_name);
      }
      await checkUserAuth();
      const redirect = searchParams.get('redirect');
      navigate(redirect && redirect.startsWith('/') ? redirect : '/');
    } catch (err) {
      setError(err.message || 'Something went wrong');
      toast.error(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold">{mode === 'login' ? 'Sign in' : 'Create your account'}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login' ? 'Welcome back to Ethiodo' : 'Join Ethiodo to start shopping'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <Input
              placeholder="Full name"
              value={form.full_name}
              onChange={(e) => set('full_name', e.target.value)}
            />
          )}
          <Input
            type="email"
            placeholder="Email"
            required
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            required
            minLength={8}
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4 mr-2" /> Sign in
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" /> Create account
              </>
            )}
          </Button>
        </form>

        <button
          type="button"
          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

import React, { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button, Input } from '../components/ui';
import styles from './LoginPage.module.css';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { login, isAuthenticated, error: authError, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const state = location.state as LocationState | undefined;
  const from = state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    clearError();

    if (!email.trim()) {
      setFormError('Please enter your work email.');
      return;
    }
    if (!password) {
      setFormError('Please enter your password.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch {
      // Error is stored in auth context and handled
    } finally {
      setSubmitting(false);
    }
  };

  const activeError = formError || authError;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {activeError && (
        <div className={styles.errorBanner} role="alert">
          <AlertCircle size={16} className={styles.errorIcon} />
          <span>{activeError}</span>
        </div>
      )}

      <Input
        label="Work Email"
        type="email"
        id="email"
        name="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="operator@company.com"
        autoComplete="email"
        autoFocus
        isRequired
        leftIcon={<Mail size={16} />}
      />

      <Input
        label="Password"
        type="password"
        id="password"
        name="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••••••"
        autoComplete="current-password"
        isRequired
        leftIcon={<Lock size={16} />}
      />

      <Button
        type="submit"
        variant="primary"
        size="md"
        isLoading={submitting}
        fullWidth
        rightIcon={<ArrowRight size={14} />}
      >
        Sign In to Workspace
      </Button>

      <div className={styles.devHint}>
        <strong>Local Environment:</strong> Use credentials configured in your environment or backend service.
      </div>
    </form>
  );
};

export default LoginPage;

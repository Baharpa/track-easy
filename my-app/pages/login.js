import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import { apiFetch, setToken } from '../lib/api';

export default function Login() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(data) {
    try {
      setError('');
      const result = await apiFetch('/api/user/login', { method: 'POST', body: JSON.stringify(data) });
      setToken(result.token);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    }
  }

  return <><PageHeader title="Login" text="Welcome back to Track Easy." />
    <Card className="page-card p-4"><Form onSubmit={handleSubmit(submit)}>
      {error && <Alert variant="danger">{error}</Alert>}
      <Form.Group className="mb-3">
        <Form.Label>Username</Form.Label>
        <Form.Control isInvalid={!!errors.userName} {...register('userName', { required: 'Username is required.' })} />
        <Form.Control.Feedback type="invalid">{errors.userName?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Password</Form.Label>
        <Form.Control type="password" isInvalid={!!errors.password} {...register('password', { required: 'Password is required.' })} />
        <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
      </Form.Group>
      <Button type="submit" variant="success" disabled={isSubmitting}>{isSubmitting ? 'Logging in...' : 'Login'}</Button>
    </Form></Card></>;
}

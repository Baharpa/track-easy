import { useState } from 'react';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Form } from 'react-bootstrap';
import PageHeader from '../components/PageHeader';
import { apiFetch } from '../lib/api';

export default function Register() {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  async function submit(data) {
    try {
      setMessage('');
      setError('');
      await apiFetch('/api/user/register', { method: 'POST', body: JSON.stringify({ userName: data.userName, password: data.password }) });
      setMessage('Account created. Sending you to login...');
      setTimeout(() => router.push('/login'), 800);
    } catch (err) {
      setError(err.message);
    }
  }

  return <><PageHeader title="Register" text="Create your Track Easy account." />
    <Card className="page-card p-4"><Form onSubmit={handleSubmit(submit)}>
      {message && <Alert variant="success">{message}</Alert>}{error && <Alert variant="danger">{error}</Alert>}
      <Form.Group className="mb-3">
        <Form.Label>Username</Form.Label>
        <Form.Control isInvalid={!!errors.userName} {...register('userName', { required: 'Username is required.', minLength: { value: 3, message: 'Username must be at least 3 characters.' } })} />
        <Form.Control.Feedback type="invalid">{errors.userName?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Password</Form.Label>
        <Form.Control type="password" isInvalid={!!errors.password} {...register('password', { required: 'Password is required.', minLength: { value: 6, message: 'Password must be at least 6 characters.' } })} />
        <Form.Control.Feedback type="invalid">{errors.password?.message}</Form.Control.Feedback>
      </Form.Group>
      <Form.Group className="mb-3">
        <Form.Label>Confirm Password</Form.Label>
        <Form.Control type="password" isInvalid={!!errors.confirmPassword} {...register('confirmPassword', { required: 'Please confirm your password.', validate: value => value === watch('password') || 'Passwords do not match.' })} />
        <Form.Control.Feedback type="invalid">{errors.confirmPassword?.message}</Form.Control.Feedback>
      </Form.Group>
      <Button type="submit" variant="success" disabled={isSubmitting}>{isSubmitting ? 'Creating account...' : 'Register'}</Button>
    </Form></Card></>;
}

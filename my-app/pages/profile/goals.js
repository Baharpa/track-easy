import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useForm } from 'react-hook-form';
import { Alert, Button, Card, Col, Form, Row } from 'react-bootstrap';
import PageHeader from '../../components/PageHeader';
import RouteGuard from '../../components/RouteGuard';
import { ErrorMessage, LoadingMessage } from '../../components/StateMessage';
import { apiFetch } from '../../lib/api';

export default function ProfileGoals() {
  const { data: profile, error } = useSWR('/api/user/profile');
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm();
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) reset({ ...profile, sugarGoal: profile.sugarGoal ?? 0 });
  }, [profile, reset]);

  async function submit(data) {
    await apiFetch('/api/user/goals', { method: 'PUT', body: JSON.stringify(data) });
    setMessage('Goals saved.');
  }

  const rule = { required: 'This goal is required.', min: { value: 0, message: 'Please enter 0 or a positive number.' } };

  return (
    <RouteGuard>
      <PageHeader title="Edit Goals" text="Set your daily nutrition goals." />
      {error && <ErrorMessage text="Failed to load profile." />}
      {!profile && !error && <LoadingMessage text="Loading profile..." />}
      {profile && (
        <Card className="page-card p-4">
          {message && <Alert variant="success">{message}</Alert>}
          {Object.keys(errors).length > 0 && <Alert variant="warning">Please enter valid positive goal numbers.</Alert>}
          <p><strong>Username:</strong> {profile.userName}</p>
          <Form onSubmit={handleSubmit(submit)}>
            <Row>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Calorie goal</Form.Label><Form.Control type="number" min="0" step="0.1" isInvalid={!!errors.calorieGoal} {...register('calorieGoal', rule)} /><Form.Text className="text-muted">Daily calories target.</Form.Text><Form.Control.Feedback type="invalid">{errors.calorieGoal?.message}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Protein goal</Form.Label><Form.Control type="number" min="0" step="0.1" isInvalid={!!errors.proteinGoal} {...register('proteinGoal', rule)} /><Form.Text className="text-muted">Daily protein target in grams.</Form.Text><Form.Control.Feedback type="invalid">{errors.proteinGoal?.message}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Carbs goal</Form.Label><Form.Control type="number" min="0" step="0.1" isInvalid={!!errors.carbsGoal} {...register('carbsGoal', rule)} /><Form.Text className="text-muted">Daily carbs target in grams.</Form.Text><Form.Control.Feedback type="invalid">{errors.carbsGoal?.message}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Fats goal</Form.Label><Form.Control type="number" min="0" step="0.1" isInvalid={!!errors.fatsGoal} {...register('fatsGoal', rule)} /><Form.Text className="text-muted">Daily fats target in grams.</Form.Text><Form.Control.Feedback type="invalid">{errors.fatsGoal?.message}</Form.Control.Feedback></Form.Group></Col>
              <Col md={4}><Form.Group className="mb-3"><Form.Label>Sugar goal</Form.Label><Form.Control type="number" min="0" step="0.1" isInvalid={!!errors.sugarGoal} {...register('sugarGoal', rule)} /><Form.Text className="text-muted">Daily sugar target in grams, tracked separately from carbs.</Form.Text><Form.Control.Feedback type="invalid">{errors.sugarGoal?.message}</Form.Control.Feedback></Form.Group></Col>
            </Row>
            <Button type="submit" variant="success" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Goals'}</Button>
          </Form>
        </Card>
      )}
    </RouteGuard>
  );
}

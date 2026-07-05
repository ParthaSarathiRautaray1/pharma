import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/lib/axios';
import { useResetPassword } from '../api/auth-api';
import { AuthLayout } from '../components/AuthLayout';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Must contain a letter')
      .regex(/\d/, 'Must contain a digit'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
type FormValues = z.infer<typeof schema>;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const reset = useResetPassword();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((values) => {
    reset.mutate(
      { token, password: values.password },
      {
        onSuccess: () => {
          toast.success('Password updated — sign in with your new password');
          navigate('/auth/login', { replace: true });
        },
        onError: (error) => toast.error(apiErrorMessage(error, 'Reset failed')),
      },
    );
  });

  if (!token) {
    return (
      <AuthLayout>
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            This reset link is invalid.{' '}
            <Link to="/auth/forgot-password" className="text-primary hover:underline">
              Request a new one
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Set a new password</CardTitle>
          <CardDescription>Choose a strong password you haven't used before</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input id="password" type="password" autoFocus {...register('password')} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input id="confirm" type="password" {...register('confirm')} />
              {errors.confirm && (
                <p className="text-xs text-destructive">{errors.confirm.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" loading={reset.isPending}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

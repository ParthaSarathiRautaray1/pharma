import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiErrorMessage } from '@/lib/axios';
import { useForgotPassword } from '../api/auth-api';
import { AuthLayout } from '../components/AuthLayout';

const schema = z.object({ email: z.string().email('Enter a valid email') });
type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const forgot = useForgotPassword();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((values) => {
    forgot.mutate(values, {
      onError: (error) => toast.error(apiErrorMessage(error)),
    });
  });

  return (
    <AuthLayout>
      <Card>
        {forgot.isSuccess ? (
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-6 w-6" />
            </span>
            <p className="font-medium">Check your inbox</p>
            <p className="text-sm text-muted-foreground">
              If an account exists for that email, a reset link is on its way. The link is valid
              for 30 minutes.
            </p>
            <Link to="/auth/login" className="text-sm text-primary hover:underline">
              Back to sign in
            </Link>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle className="text-lg">Forgot password</CardTitle>
              <CardDescription>We'll email you a reset link</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4" noValidate>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@pharmacy.com"
                    autoComplete="email"
                    autoFocus
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full" loading={forgot.isPending}>
                  Send reset link
                </Button>
                <p className="text-center text-sm">
                  <Link to="/auth/login" className="text-primary hover:underline">
                    Back to sign in
                  </Link>
                </p>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </AuthLayout>
  );
}

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useChangePassword } from '@/features/auth/api/auth-api';
import { apiErrorMessage } from '@/lib/axios';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Za-z]/, 'Must contain a letter')
      .regex(/\d/, 'Must contain a digit'),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  });
type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit((values) => {
    change.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          toast.success('Password changed. Other devices have been signed out.');
          reset();
        },
        onError: (error) => toast.error(apiErrorMessage(error)),
      },
    );
  });

  return (
    <div>
      <PageHeader title="Change password" description="Changing your password signs out all other sessions" />
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Update your password</CardTitle>
          <CardDescription>Use at least 8 characters with letters and digits</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <Input id="currentPassword" type="password" autoComplete="current-password" {...register('currentPassword')} />
              {errors.currentPassword && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input id="newPassword" type="password" autoComplete="new-password" {...register('newPassword')} />
              {errors.newPassword && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm new password</Label>
              <Input id="confirm" type="password" autoComplete="new-password" {...register('confirm')} />
              {errors.confirm && <p className="text-xs text-destructive">{errors.confirm.message}</p>}
            </div>
            <Button type="submit" loading={change.isPending}>
              Update password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

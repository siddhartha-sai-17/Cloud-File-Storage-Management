import { z } from 'zod';
import { useForm, type ControllerRenderProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AuthService } from '@/services/auth.service';
import { useAuth } from '@/contexts/AuthProvider';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50, 'Username too long'),
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const inputClass =
  'pl-10 bg-[#0F172A] border-white/10 text-white placeholder:text-[#334155] focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1]/30 rounded-[10px] h-11 transition-all text-[13px]';

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: '', email: '', password: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: (data: RegisterFormValues) =>
      AuthService.register({ username: data.username, email: data.email, password: data.password }),
    onSuccess: (data) => {
      login(data.token, {
        id: data.userId,
        username: data.username,
        email: data.email,
        role: data.role ?? 'USER',
      });
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/dashboard');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      const message = err?.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
    },
  });

  const onSubmit = (values: RegisterFormValues) => {
    mutation.mutate(values);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Form Card */}
      <div className="rounded-[18px] border border-white/[0.08] bg-[#111827] shadow-vault-lg p-8 relative overflow-hidden">
        {/* Top ambient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#6366F1] to-[#8B5CF6]" />

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white">Create your account</h2>
          <p className="text-[12px] text-[#475569] mt-1 font-medium leading-relaxed">Start your enterprise storage journey today</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'username'> }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="label-caps">Username</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                      <Input id="register-username" placeholder="johnsmith" className={inputClass} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'email'> }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="label-caps">Work Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                      <Input id="register-email" placeholder="john@company.com" type="email" className={inputClass} {...field} />
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'password'> }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="label-caps">Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                      <Input
                        id="register-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Min 8 chars, 1 uppercase, 1 number"
                        className={`${inputClass} pr-11`}
                        autoComplete="new-password"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-white transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-400 text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }: { field: ControllerRenderProps<RegisterFormValues, 'confirmPassword'> }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="label-caps">Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#475569]" />
                      <Input
                        id="register-confirm-password"
                        type="password"
                        placeholder="••••••••"
                        className={inputClass}
                        autoComplete="new-password"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-rose-400 text-xs" />
                </FormItem>
              )}
            />

            {/* Password requirements hint */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
              {['8+ characters', 'Uppercase letter', 'Number'].map((req) => (
                <span key={req} className="flex items-center gap-1 text-[10px] font-bold text-[#475569]">
                  <Check className="h-3 w-3 text-[#6366F1]" />
                  {req}
                </span>
              ))}
            </div>

            <div className="pt-2">
              <Button
                id="register-submit"
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558DD] hover:to-[#7C3AED] text-white font-semibold rounded-[10px] shadow-lg shadow-indigo-600/20 border-0 gap-2 transition-all group"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <>
                    <LoadingSpinner size={16} className="mr-1" />
                    Creating account...
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Footer link */}
      <p className="text-center text-[12px] text-[#475569] font-medium">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-[#818CF8] hover:text-[#a5b4fc] transition-colors ml-1">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}
export default RegisterPage;

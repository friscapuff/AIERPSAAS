'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/Button';
import { Input, Checkbox } from '@/components/ui/FormField';
import { notify } from '@/components/ui/Toast';
import { post } from '@/lib/api';
import { getErrorMessage, slugify } from '@/lib/utils';

// ─── Validation ───────────────────────────────────────────────────────────────
const registerSchema = z
  .object({
    companyName: z.string().min(2, 'Company name must be at least 2 characters'),
    subdomain: z
      .string()
      .min(3, 'Subdomain must be at least 3 characters')
      .max(32, 'Subdomain must be at most 32 characters')
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must accept the terms to continue' }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Auto-fill subdomain from company name
  const companyName = watch('companyName');
  React.useEffect(() => {
    if (companyName) {
      setValue('subdomain', slugify(companyName).slice(0, 32));
    }
  }, [companyName, setValue]);

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await post('/tenants/register', {
        companyName: data.companyName,
        subdomain: data.subdomain,
        adminFirstName: data.firstName,
        adminLastName: data.lastName,
        adminEmail: data.email,
        adminPassword: data.password,
      });
      notify.success('Workspace created! Please sign in.', 'Welcome to AiERP');
      router.push('/login');
    } catch (error) {
      notify.error(getErrorMessage(error), 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 flex items-center justify-center p-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 bg-primary-600 rounded-2xl items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Create your workspace</h1>
          <p className="text-surface-400 text-sm mt-1">Set up AiERP for your company in minutes</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Section: Company */}
            <div>
              <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wide">
                Company Details
              </h2>
              <div className="space-y-3">
                <Input
                  {...register('companyName')}
                  label="Company Name"
                  placeholder="Acme Corporation"
                  autoComplete="organization"
                  error={errors.companyName?.message}
                  required
                />
                {/* Subdomain */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-surface-700">
                    Subdomain <span className="text-danger-500">*</span>
                  </label>
                  <div className="flex rounded-lg border border-surface-300 overflow-hidden focus-within:ring-2 focus-within:ring-primary-600 focus-within:border-transparent">
                    <input
                      {...register('subdomain')}
                      type="text"
                      placeholder="acme"
                      className="flex-1 h-9 px-3 text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none"
                    />
                    <div className="flex items-center px-3 bg-surface-50 border-l border-surface-300 text-xs text-surface-500 whitespace-nowrap">
                      .aierp.app
                    </div>
                  </div>
                  {errors.subdomain && (
                    <p className="text-xs text-danger-600">{errors.subdomain.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t border-surface-100 pt-4">
              <h2 className="text-sm font-semibold text-surface-700 mb-3 uppercase tracking-wide">
                Admin Account
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    {...register('firstName')}
                    label="First Name"
                    placeholder="John"
                    autoComplete="given-name"
                    error={errors.firstName?.message}
                    required
                  />
                  <Input
                    {...register('lastName')}
                    label="Last Name"
                    placeholder="Smith"
                    autoComplete="family-name"
                    error={errors.lastName?.message}
                    required
                  />
                </div>
                <Input
                  {...register('email')}
                  label="Email Address"
                  type="email"
                  placeholder="john@company.com"
                  autoComplete="email"
                  error={errors.email?.message}
                  required
                />
                {/* Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-surface-700">
                    Password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 chars, 1 uppercase, 1 number"
                      autoComplete="new-password"
                      className={`w-full h-9 px-3 pr-10 rounded-lg border text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent ${errors.password ? 'border-danger-400' : 'border-surface-300'}`}
                    />
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600">
                      {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-danger-600">{errors.password.message}</p>}
                </div>
                {/* Confirm password */}
                <div className="space-y-1">
                  <label className="block text-xs font-medium text-surface-700">
                    Confirm Password <span className="text-danger-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      {...register('confirmPassword')}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      className={`w-full h-9 px-3 pr-10 rounded-lg border text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent ${errors.confirmPassword ? 'border-danger-400' : 'border-surface-300'}`}
                    />
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600">
                      {showConfirm ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-danger-600">{errors.confirmPassword.message}</p>}
                </div>
              </div>
            </div>

            {/* Terms */}
            <div className="border-t border-surface-100 pt-4">
              <Checkbox
                {...register('acceptTerms')}
                label="I agree to the Terms of Service and Privacy Policy"
                error={errors.acceptTerms?.message}
              />
            </div>

            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              Create Workspace
            </Button>
          </form>

          <p className="text-center text-xs text-surface-500 pt-4 border-t border-surface-100 mt-2">
            Already have a workspace?{' '}
            <Link href="/login" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

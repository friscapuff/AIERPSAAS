'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { EyeIcon, EyeSlashIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Input, Checkbox } from '@/components/ui/FormField';
import { notify } from '@/components/ui/Toast';
import { getErrorMessage } from '@/lib/utils';

// ─── Validation schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  tenantSubdomain: z.string().min(1, 'Please enter your company subdomain').optional(),
  rememberMe: z.boolean().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      tenantSubdomain: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      await login({
        email: data.email,
        password: data.password,
        tenantSubdomain: data.tenantSubdomain || undefined,
        rememberMe: data.rememberMe,
      });
    } catch (error) {
      notify.error(getErrorMessage(error), 'Sign-in failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-900 via-primary-900 to-surface-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 bg-primary-600 rounded-2xl items-center justify-center shadow-lg mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-surface-400 text-sm mt-1">Sign in to your AiERP workspace</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-5">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Tenant subdomain */}
            <div className="space-y-1">
              <label className="block text-xs font-medium text-surface-700">
                Company Subdomain <span className="text-surface-400 font-normal">(optional)</span>
              </label>
              <div className="relative flex items-center">
                <BuildingOffice2Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
                <input
                  {...register('tenantSubdomain')}
                  type="text"
                  placeholder="your-company"
                  autoComplete="organization"
                  className="w-full h-9 pl-9 pr-3 rounded-lg border border-surface-300 text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent"
                />
                <span className="absolute right-3 text-xs text-surface-400">.aierp.app</span>
              </div>
              {errors.tenantSubdomain && (
                <p className="text-xs text-danger-600">{errors.tenantSubdomain.message}</p>
              )}
            </div>

            {/* Email */}
            <Input
              {...register('email')}
              label="Email address"
              type="email"
              placeholder="you@company.com"
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
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={`w-full h-9 px-3 pr-10 rounded-lg border text-sm text-surface-900 placeholder-surface-400 bg-white focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent ${errors.password ? 'border-danger-400' : 'border-surface-300'}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-surface-400 hover:text-surface-600"
                >
                  {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-danger-600">{errors.password.message}</p>
              )}
            </div>

            {/* Remember me + forgot password */}
            <div className="flex items-center justify-between">
              <Checkbox {...register('rememberMe')} label="Remember me" />
              <Link
                href="/forgot-password"
                className="text-xs text-primary-600 hover:text-primary-700 font-medium transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
            >
              Sign in
            </Button>
          </form>

          {/* Register link */}
          <p className="text-center text-xs text-surface-500 pt-2 border-t border-surface-100">
            Don&apos;t have a workspace?{' '}
            <Link href="/register" className="text-primary-600 font-medium hover:text-primary-700 transition-colors">
              Create one free
            </Link>
          </p>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-4 p-3 bg-white/10 rounded-xl border border-white/20">
          <p className="text-xs text-surface-400 text-center">
            Demo: <span className="text-white font-mono">admin@demo.aierp.app</span> / <span className="text-white font-mono">Demo123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}

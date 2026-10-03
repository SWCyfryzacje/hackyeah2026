import { z } from 'zod';

export const SignFormSchema = z.object({
  email: z.email('Invalid e-mail'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export const VerifyCodeSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits long'),
});

export type SignFormData = z.infer<typeof SignFormSchema>;
export type VerifyCodeData = z.infer<typeof VerifyCodeSchema>;

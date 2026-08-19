import { z } from 'zod';

export const addressSchema = z.object({
  line1: z.string().trim().min(3, 'Address is required').max(200),
  line2: z.string().trim().max(200).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z
    .string()
    .trim()
    .length(2, 'Use the 2-letter state code')
    .toUpperCase()
    .refine((v) => v === 'UT', 'We currently only deliver to Utah (UT)'),
  postalCode: z
    .string()
    .trim()
    .regex(/^\d{5}(-\d{4})?$/, 'Use a US ZIP code (e.g., 84101)'),
  country: z.literal('US').default('US'),
});

export const customerInputSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  fullName: z.string().trim().min(2, 'Name is required').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
});

export const checkoutInputSchema = z.object({
  customer: customerInputSchema,
  shippingAddress: addressSchema,
});

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type Address = z.infer<typeof addressSchema>;
export type CustomerInput = z.infer<typeof customerInputSchema>;

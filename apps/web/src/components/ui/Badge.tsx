import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger';

const variantClass: Record<BadgeVariant, string> = {
  default: '',
  primary: 'badge-primary',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({
  variant = 'default',
  className,
  ...props
}: BadgeProps) {
  return (
    <span className={cn('badge', variantClass[variant], className)} {...props} />
  );
}

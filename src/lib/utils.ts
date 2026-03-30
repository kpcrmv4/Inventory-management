import { type ClassValue, clsx } from 'clsx'

/** Combine class names (clsx wrapper) */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

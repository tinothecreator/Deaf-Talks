import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "danger";
export function buttonStyles(variant: ButtonVariant = "primary", className = "") {
  return `ui-button ui-button-${variant} ${className}`;
}
export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button className={buttonStyles(variant, className)} {...props} />;
}

import * as React from "react";

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className = "", type = "button", variant = "primary", ...props },
  ref
) {
  const classes = ["ds-button", `ds-button-${variant}`, className].filter(Boolean).join(" ");

  return <button ref={ref} className={classes} type={type} {...props} />;
});

import * as React from "react";

type TextInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> & {
  label: string;
  hint?: string;
  error?: string;
};

export const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { error, hint, id: idProp, label, ...props },
  ref
) {
  const reactId = React.useId();
  const id = idProp ?? `ds-input-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="ds-field">
      <label className="ds-label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={ref}
        className="ds-input"
        id={id}
        aria-describedby={describedBy}
        aria-invalid={error ? "true" : undefined}
        {...props}
      />
      {hint ? (
        <div className="ds-help" id={hintId}>
          {hint}
        </div>
      ) : null}
      {error ? (
        <div className="ds-error" id={errorId} role="alert">
          {error}
        </div>
      ) : null}
    </div>
  );
});

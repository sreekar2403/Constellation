import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  wrapperClassName = '',
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className={`flex flex-col gap-1.5 ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-text-secondary"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`h-10 w-full px-3 rounded-lg border border-border-primary bg-bg-primary text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-border-focus focus:border-transparent focus:shadow-sm transition-all duration-150 ${
          error ? 'border-status-error' : ''
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-status-error">{error}</p>}
    </div>
  );
};

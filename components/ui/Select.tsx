import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, children, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={`w-full p-2 border border-gray-300 rounded-lg text-base bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-gray-200 ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

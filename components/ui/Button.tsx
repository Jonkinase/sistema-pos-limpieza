import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-bold transition-all disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg';
    
    const variants = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      warning: 'bg-orange-500 hover:bg-orange-600 text-white',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-600',
      success: 'bg-green-500 hover:bg-green-600 text-white',
    };

    const sizes = {
      sm: 'py-1.5 px-3 text-xs',
      md: 'py-2 px-4 text-sm',
      lg: 'py-3 px-6 text-lg',
      icon: 'p-2',
    };

    const combinedClasses = `${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`;

    return (
      <button ref={ref} className={combinedClasses} {...props} />
    );
  }
);

Button.displayName = 'Button';

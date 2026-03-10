import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
}

export const Card = ({ children, className = '', title, subtitle, headerAction }: CardProps) => {
  return (
    <div className={`bg-white rounded-2xl shadow-lg p-6 ${className}`}>
      {(title || subtitle || headerAction) && (
        <div className="flex justify-between items-center mb-4">
          <div>
            {title && <h2 className="text-xl font-bold text-gray-800">{title}</h2>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
};

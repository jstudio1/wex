'use client';

import clsx from 'clsx';
import { forwardRef } from 'react';

type SwitchProps = {
  id?: string;
  name?: string;
  value?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
  onCheckedChange?: (checked: boolean) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ id, name, value, checked, defaultChecked, disabled, className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onCheckedChange) {
        onCheckedChange(e.target.checked);
      }
      if (onChange) {
        onChange(e);
      }
    };

  return (
    <label htmlFor={id} className={clsx('inline-flex items-center cursor-pointer select-none', disabled && 'opacity-50', className)}>
      <input
          ref={ref}
        id={id}
        name={name}
        value={value}
        type="checkbox"
          checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
          onChange={handleChange}
        className="peer sr-only"
          {...props}
      />
      <div className="relative h-6 w-12 rounded-full border border-gray-700 bg-gray-800 transition-colors peer-checked:bg-emerald-600 peer-checked:border-emerald-600 peer-checked:[&>span]:translate-x-6">
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform" />
      </div>
    </label>
  );
}
);
Switch.displayName = 'Switch';



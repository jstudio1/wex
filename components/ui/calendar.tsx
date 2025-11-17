'use client';

import * as React from 'react';
import { DayPicker, type DayPickerProps } from 'react-day-picker';
import 'react-day-picker/dist/style.css';

export function Calendar(props: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays
      className={['bg-transparent text-[color:var(--text)]'].join(' ')}
      classNames={{
        caption: 'mb-2 flex justify-center pt-1 relative items-center',
        caption_label: 'text-sm font-medium',
        nav: 'space-x-1 flex items-center',
        nav_button: 'h-7 w-7 bg-white/10 hover:bg-white/15 rounded',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-[color:var(--text)]/60 rounded-md w-9 font-normal text-[0.8rem]',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative',
        day: 'h-9 w-9 p-0 font-normal rounded-md hover:bg-white/20 hover:text-gray-900 focus:bg-white/20 focus:text-gray-900 text-[color:var(--text)]',
        day_range_start: 'bg-white/15 text-[color:var(--text)]',
        day_range_end: 'bg-white/15 text-[color:var(--text)]',
        day_selected: 'bg-white/15 text-[color:var(--text)]',
        day_today: 'border border-white/20',
        day_outside: 'text-[color:var(--text)]/30',
        day_disabled: 'text-[color:var(--text)]/30'
      }}
      {...props}
    />
  );
}




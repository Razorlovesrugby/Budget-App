'use client'

import { format } from 'date-fns'

interface DatePickerProps {
  value: Date
  onChange: (date: Date) => void
  onClose: () => void
  minDate?: Date
  maxDate?: Date
}

export default function DatePicker({
  value,
  onChange,
  onClose,
  minDate = new Date('2024-08-01'),
  maxDate,
}: DatePickerProps) {
  const defaultMax = new Date()
  defaultMax.setFullYear(defaultMax.getFullYear() + 2)
  const effectiveMax = maxDate || defaultMax

  const toInputValue = (d: Date) => format(d, 'yyyy-MM-dd')

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Picker */}
      <div className="relative bg-white rounded-t-3xl w-full max-w-md pb-8 pt-6 px-6 animate-slide-up">
        <div className="flex justify-center mb-4">
          <div className="w-9 h-1 rounded-full bg-black/15" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">Select Date</h2>
        </div>

        {/* Native date input styled nicely */}
        <input
          type="date"
          value={toInputValue(value)}
          min={toInputValue(minDate)}
          max={toInputValue(effectiveMax)}
          onChange={(e) => {
            const d = new Date(e.target.value)
            if (!isNaN(d.getTime())) {
              onChange(d)
            }
          }}
          className="w-full text-[17px] text-center text-[#1c1c1e] py-4 px-4
            rounded-xl border border-black/10 bg-black/[0.02]
            focus:outline-none focus:ring-2 focus:ring-black/10
            appearance-none"
          style={{ WebkitAppearance: 'none' }}
        />

        {/* Quick options */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => {
              onChange(new Date())
              onClose()
            }}
            className="flex-1 h-[44px] rounded-xl bg-black/[0.04] text-[15px] font-medium text-[#1c1c1e]
              hover:bg-black/[0.08] transition-colors
              active:scale-[0.98] transition-transform"
          >
            Today
          </button>
          <button
            onClick={onClose}
            className="flex-1 h-[44px] rounded-xl bg-[#1c1c1e] text-[15px] font-medium text-white
              hover:bg-black/90 transition-colors
              active:scale-[0.98] transition-transform"
          >
            Done
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        }
      `}</style>
    </div>
  )
}

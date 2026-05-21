'use client'

import { format, format as formatDate } from 'date-fns'
import { useState } from 'react'
import DatePicker from '@/components/ui/DatePicker'

export interface ReviewDateConfirmProps {
  lastReviewDate: string | null    // null = first review ever
  onContinue: (reviewDate: Date) => void
}

export default function ReviewDateConfirm({
  lastReviewDate,
  onContinue,
}: ReviewDateConfirmProps) {
  const [reviewDate, setReviewDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Check if today already reviewed
  const todayStr = formatDate(today, 'yyyy-MM-dd')
  const alreadyReviewedToday = lastReviewDate === todayStr

  // Min date: last review + 1 day (or opening date if first review)
  const minDate = lastReviewDate
    ? new Date(new Date(lastReviewDate).getTime() + 86400000) // +1 day
    : new Date('2024-08-01')

  function handleDateChange(date: Date) {
    // Strip time
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)

    if (d > today) {
      setError("Can't review a future date")
      return
    }

    setReviewDate(d)
    setError(null)
  }

  function handleContinue() {
    if (alreadyReviewedToday) {
      setError('Review already completed for today')
      return
    }
    onContinue(reviewDate)
  }

  return (
    <div className="min-h-screen bg-[#f2f2f7] flex flex-col">
      {/* Safe area */}
      <div className="h-[54px] shrink-0" />

      {/* Content */}
      <div className="flex-1 flex flex-col px-6">
        {/* Title */}
        <h1 className="text-[22px] font-bold text-[#1c1c1e] mb-8">
          Weekly Review
        </h1>

        {/* Review Date Section */}
        <div className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-black/30 mb-2">
            Review Date
          </p>
          <p className="text-[22px] font-semibold text-[#1c1c1e]">
            {format(reviewDate, "EEEE, d MMM yyyy")}
          </p>
        </div>

        {/* Change Date Button */}
        <button
          onClick={() => setShowDatePicker(true)}
          className="self-start text-[14px] font-medium text-[#007aff] mb-4
            hover:opacity-80 transition-opacity"
        >
          Change Date
        </button>

        {/* Last Review */}
        <p className="text-[13px] text-black/25 mb-8">
          {lastReviewDate
            ? `Last review: ${format(new Date(lastReviewDate), 'd MMM yyyy')}`
            : 'First review'}
        </p>

        {/* Error message */}
        {error && (
          <p className="text-[13px] text-red-500 mb-4">{error}</p>
        )}
      </div>

      {/* Continue Button */}
      <div className="px-6 pb-8">
        <button
          onClick={handleContinue}
          disabled={alreadyReviewedToday}
          className={`w-full h-[58px] rounded-[18px] text-[17px] font-bold text-white
            transition-all active:scale-[0.98]
            ${alreadyReviewedToday
              ? 'bg-black/15 text-black/40 cursor-not-allowed'
              : 'bg-[#1c1c1e] hover:bg-black/90'
            }`}
        >
          Continue →
        </button>
      </div>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DatePicker
          value={reviewDate}
          onChange={handleDateChange}
          onClose={() => setShowDatePicker(false)}
          minDate={minDate}
          maxDate={today}
        />
      )}
    </div>
  )
}

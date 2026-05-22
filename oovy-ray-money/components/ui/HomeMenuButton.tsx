'use client'

import { useState } from 'react'
import { SideMenu } from './SideMenu'

export function HomeMenuButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full bg-black/5 flex items-center justify-center text-[#1c1c1e] text-lg hover:bg-black/10 transition-colors"
      >
        ⋯
      </button>
      <SideMenu isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}

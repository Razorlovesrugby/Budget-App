'use client'

import { useRouter } from 'next/navigation'

interface SideMenuProps {
  isOpen: boolean
  onClose: () => void
}

const ITEMS = [
  { label: 'Recurring Transactions', route: '/recurring' },
  { label: 'Planned One-offs',       route: '/planned' },
  { label: 'Weekly Review',          route: '/review' },
  { label: 'Settings',               route: '/settings' },
]

export function SideMenu({ isOpen, onClose }: SideMenuProps) {
  const router = useRouter()

  if (!isOpen) return null

  function handleNavigate(route: string) {
    router.push(route)
    onClose()
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-black/10 z-40"
        onClick={onClose}
      />
      <div
        className="fixed top-[54px] right-4 z-50 w-[62%] bg-white/95 backdrop-blur-xl rounded-[20px] border border-black/10 py-2"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.1)' }}
      >
        {ITEMS.map((item, i) => (
          <button
            key={item.route}
            onClick={() => handleNavigate(item.route)}
            className={`
              w-full text-left px-4 py-3.5 flex justify-between items-center
              ${i < ITEMS.length - 1 ? 'border-b border-black/5' : ''}
              ${i === ITEMS.length - 1
                ? 'text-black/45 text-[15px] font-medium'
                : 'text-[16px] font-medium text-black hover:bg-black/[0.02]'}
            `}
          >
            {item.label}
            {i < ITEMS.length - 1 && <span className="text-black/20 text-[13px]">›</span>}
          </button>
        ))}
      </div>
    </>
  )
}

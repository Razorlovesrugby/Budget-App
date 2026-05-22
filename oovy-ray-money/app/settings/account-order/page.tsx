'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Account } from '@/types'

function SortableRow({ account }: { account: Account }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: account.id,
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : 'auto',
      }}
      className="flex items-center justify-between px-4 h-[52px] bg-white border-b border-black/[0.05] last:border-0"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 -ml-2 text-black/25 text-[18px] leading-none select-none touch-none"
      >
        ≡
      </div>
      <div className="flex-1 px-3">
        <span className="text-[16px] font-medium text-[#1c1c1e]">{account.name}</span>
      </div>
      <span className="text-[13px] text-black/30">
        {account.currency} · {account.type}
      </span>
    </div>
  )
}

function CurrencyDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-black/30">{label}</span>
      <div className="flex-1 h-px bg-black/10" />
    </div>
  )
}

export default function AccountOrderPage() {
  const router = useRouter()
  const supabase = createSupabaseBrowserClient()
  const [accounts, setAccounts] = useState<Account[]>([])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  useEffect(() => {
    supabase
      .from('accounts')
      .select('*')
      .eq('is_archived', false)
      .eq('is_system', false)
      .order('display_order')
      .returns<Account[]>()
      .then(({ data }) => {
        if (data) setAccounts(data)
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = accounts.findIndex((a) => a.id === active.id)
    const newIndex = accounts.findIndex((a) => a.id === over.id)
    const reordered = arrayMove(accounts, oldIndex, newIndex)
    setAccounts(reordered)

    for (let i = 0; i < reordered.length; i++) {
      await supabase
        .from('accounts')
        .update({ display_order: i + 1 })
        .eq('id', reordered[i].id)
    }
  }

  const gbpAccounts = accounts.filter((a) => a.currency === 'GBP')
  const nzdAccounts = accounts.filter((a) => a.currency === 'NZD')

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <div className="max-w-md mx-auto pt-6 pb-12 px-5">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-black/45 hover:text-black/70 transition-colors mb-6"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3L5 7L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Settings
        </button>

        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#1c1c1e] mb-6">
          Account Order
        </h1>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          {gbpAccounts.length > 0 && (
            <>
              <CurrencyDivider label="GBP" />
              <div className="rounded-[14px] overflow-hidden border border-black/[0.06]">
                <SortableContext items={gbpAccounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {gbpAccounts.map((account) => (
                    <SortableRow key={account.id} account={account} />
                  ))}
                </SortableContext>
              </div>
            </>
          )}

          {nzdAccounts.length > 0 && (
            <>
              <CurrencyDivider label="NZD" />
              <div className="rounded-[14px] overflow-hidden border border-black/[0.06]">
                <SortableContext items={nzdAccounts.map((a) => a.id)} strategy={verticalListSortingStrategy}>
                  {nzdAccounts.map((account) => (
                    <SortableRow key={account.id} account={account} />
                  ))}
                </SortableContext>
              </div>
            </>
          )}
        </DndContext>

        {accounts.length === 0 && (
          <p className="text-[15px] text-black/30 text-center py-20">No accounts</p>
        )}
      </div>
    </div>
  )
}

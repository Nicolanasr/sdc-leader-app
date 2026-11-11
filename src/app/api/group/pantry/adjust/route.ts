import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

interface RawBatch {
  id?: string
  brand?: string
  quantity?: number
  expiry_date?: string
  package_size?: string
  lot_number?: string
  notes?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Please sign in.' }, { status: 401 })
    }

    const body = await req.json()
    const { itemId, actionType, amount, reason, notes, batchId, brand, expiryDate, packageSize } = body

    if (!itemId || !actionType || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payload: itemId, actionType (add|remove), and positive amount are required.' },
        { status: 400 }
      )
    }

    const adminDb = createAdminClient()

    // 1. Fetch current item
    const { data: item, error: fetchErr } = await adminDb
      .from('group_pantry_items')
      .select('id, name, unit, category, quantity_available, group_id, notes, expiry_batches, expiry_date')
      .eq('id', itemId)
      .eq('is_deleted', false)
      .single()

    if (fetchErr || !item) {
      return NextResponse.json({ error: 'Pantry item not found.' }, { status: 404 })
    }

    const currentQty = Number(item.quantity_available) || 0
    let updatedBatches: RawBatch[] = Array.isArray(item.expiry_batches) ? [...item.expiry_batches] : []
    let lotDetailText = ''

    let newQty: number
    let delta: number

    if (actionType === 'remove') {
      newQty = Math.max(0, currentQty - amount)
      delta = -(currentQty - newQty) // Actual deducted

      if (updatedBatches.length > 0) {
        if (batchId) {
          // Deduct from the specific batch chosen by the leader
          const targetIndex = updatedBatches.findIndex((b) => b.id === batchId)
          if (targetIndex !== -1) {
            const b = updatedBatches[targetIndex]
            lotDetailText = `${b.brand || 'Standard'} (${b.expiry_date || 'No Date'})`
            const bQty = Number(b.quantity) || 0
            const rem = Math.max(0, bQty - amount)
            if (rem > 0) {
              updatedBatches[targetIndex] = { ...b, quantity: rem }
            } else {
              // Batch is completely consumed
              updatedBatches.splice(targetIndex, 1)
            }
          }
        } else {
          // FIFO auto-deduction starting from oldest expiring lot
          const sorted = [...updatedBatches].sort((a, b) => {
            if (!a.expiry_date) return 1
            if (!b.expiry_date) return -1
            return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
          })

          let remToDeduct = amount
          const touchedLots: string[] = []

          for (const lot of sorted) {
            if (remToDeduct <= 0) break
            const lotQty = Number(lot.quantity) || 0
            const take = Math.min(lotQty, remToDeduct)
            lot.quantity = lotQty - take
            remToDeduct -= take
            touchedLots.push(`${lot.brand || 'Lot'} (${take}x)`)
          }

          updatedBatches = sorted.filter((b) => (Number(b.quantity) || 0) > 0)
          lotDetailText = touchedLots.join(', ')
        }
      }
    } else {
      // actionType === 'add'
      newQty = currentQty + amount
      delta = amount

      const brandName = (brand || 'Standard').trim()
      const formattedExp = expiryDate ? expiryDate.trim() : null
      lotDetailText = `${brandName} (Exp: ${formattedExp || 'None'})`

      // Check if existing batch matches brand & expiry_date
      const existingMatch = updatedBatches.find(
        (b) =>
          (b.brand || '').toLowerCase().trim() === brandName.toLowerCase() &&
          (b.expiry_date || '') === (formattedExp || '')
      )

      if (existingMatch) {
        existingMatch.quantity = (Number(existingMatch.quantity) || 0) + amount
        if (packageSize && !existingMatch.package_size) {
          existingMatch.package_size = packageSize.trim()
        }
      } else {
        updatedBatches.push({
          id: `b_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          brand: brandName,
          quantity: amount,
          expiry_date: formattedExp || undefined,
          package_size: packageSize ? packageSize.trim() : '',
          lot_number: `Lot #${updatedBatches.length + 1}`,
        })
      }
    }

    // Recompute earliest expiry date from remaining batches
    const remainingDates = updatedBatches
      .map((b) => b.expiry_date)
      .filter((d): d is string => Boolean(d))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    const earliestExpiry = remainingDates.length > 0 ? remainingDates[0] : item.expiry_date

    // 2. Update stock and batches in database
    const updatePayload: Record<string, unknown> = {
      quantity_available: newQty,
      updated_at: new Date().toISOString(),
    }

    if (updatedBatches.length > 0) {
      updatePayload.expiry_batches = updatedBatches
      if (earliestExpiry) {
        updatePayload.expiry_date = earliestExpiry
      }
    }

    const { error: updateErr } = await adminDb
      .from('group_pantry_items')
      .update(updatePayload)
      .eq('id', itemId)

    if (updateErr) {
      throw updateErr
    }

    // 3. Insert audit log record for activity timeline
    const logId = crypto.randomUUID()
    const nowIso = new Date().toISOString()
    const finalNotes = lotDetailText
      ? `[${actionType === 'add' ? 'Added' : 'Taken'}: ${lotDetailText}] ${notes || ''}`.trim()
      : (notes || '')

    const logPayload = {
      record_id: itemId,
      table_name: 'group_pantry_items',
      action: 'UPDATE',
      changed_fields: {
        quantity_available: { old: currentQty, new: newQty },
        delta,
        action_type: actionType,
        reason: reason || (actionType === 'add' ? 'Manual Restock' : 'Manual Consumption'),
        notes: finalNotes,
        lot_details: lotDetailText,
        item_name: item.name,
        unit: item.unit || 'units',
        category: item.category,
      },
      performed_by: user.id,
      performed_by_email: user.email || 'Leader',
      group_id: item.group_id,
      created_at: nowIso,
    }

    try {
      await adminDb.from('audit_logs').insert(logPayload)
    } catch (auditErr) {
      console.warn('[PantryAdjust] Could not insert audit_log entry:', auditErr)
    }

    return NextResponse.json({
      success: true,
      itemId,
      newQuantity: newQty,
      delta,
      updatedBatches,
      earliestExpiry,
      log: {
        id: logId,
        ...logPayload,
      },
    })
  } catch (err: any) {
    console.error('[PantryAdjustRoute] Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to adjust stock' }, { status: 500 })
  }
}

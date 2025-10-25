import { formatMoney } from '../../../lib/currency'
import { useState } from 'react'
import { uploadLineItemAttachment } from '../api'

function blankItem() {
  return {
    id: `li_${Math.random().toString(36).slice(2,9)}`,
    name: '',
    item_category: '',
    quantity: 1,
    unit_price: 0,
    line_total: 0,
    unit_type: 'count',
    unit_label: '',
    unit_value: '',
    serial_number: '',
    model_number: '',
    return_by_date: '',
    item_status: 'normal',
    tags: [],
    attachments: [],
    warranty: {
      provider: '',
      policy_ref: '',
      start_date: '',
      end_date: '',
      coverage_notes: '',
    },
  }
}

export default function LineItemsEditor({ value = [], onChange, purchaseId = null }) {
  const [rows, setRows] = useState(() => (Array.isArray(value) ? value.map((r) => ({ ...r })) : []))
  const [uploading, setUploading] = useState({})

  function updateRow(idx, patch) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r))
    // recalc line_total
    if (typeof next[idx].quantity !== 'undefined' || typeof next[idx].unit_price !== 'undefined') {
      const q = Number(next[idx].quantity || 0)
      const p = Number(next[idx].unit_price || 0)
      next[idx].line_total = Math.round((q * p) * 100) / 100
    }
    setRows(next)
    onChange && onChange(next)
  }

  async function uploadForRow(idx, files) {
    if (!purchaseId) return
    const file = files && files[0]
    if (!file) return
    const row = rows[idx]
    setUploading((s) => ({ ...s, [row.id]: true }))
    try {
      const resp = await uploadLineItemAttachment(purchaseId, row.id, file)
      // resp should include attachment object
      const att = resp?.attachment || resp
      const next = rows.map((r, i) => (i === idx ? { ...r, attachments: [...(r.attachments || []), att] } : r))
      setRows(next)
      onChange && onChange(next)
    } catch (e) {
      // swallow - parent toasts will handle if necessary
    } finally {
      setUploading((s) => ({ ...s, [row.id]: false }))
    }
  }

  function addRow() {
    const next = [...rows, blankItem()]
    setRows(next)
    onChange && onChange(next)
  }

  function removeRow(idx) {
    const next = rows.filter((_, i) => i !== idx)
    setRows(next)
    onChange && onChange(next)
  }

  const subtotal = rows.reduce((s, r) => s + Number(r.line_total || 0), 0)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Line items</h3>
        <div className="text-sm text-[rgb(var(--muted-fg))]">Subtotal: <span className="font-medium">{formatMoney(subtotal)}</span></div>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && (
          <div className="rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3 text-sm text-[rgb(var(--muted-fg))]">No items added.</div>
        )}

        {rows.map((r, idx) => (
          <div key={r.id || idx} className="rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))] p-3">
            <div className="grid gap-2 sm:grid-cols-6">
              <div className="sm:col-span-2">
                <label className="text-xs text-[rgb(var(--muted-fg))]">Item</label>
                <input className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.name} onChange={(e) => updateRow(idx, { name: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[rgb(var(--muted-fg))]">Qty</label>
                <input type="number" min="0" className="w-20 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.quantity} onChange={(e) => updateRow(idx, { quantity: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[rgb(var(--muted-fg))]">Unit price</label>
                <input type="number" step="0.01" className="w-28 rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.unit_price} onChange={(e) => updateRow(idx, { unit_price: e.target.value })} />
              </div>
              <div>
                <label className="text-xs text-[rgb(var(--muted-fg))]">Total</label>
                <div className="w-28 rounded-md px-3 py-2 text-[rgb(var(--fg))]">{formatMoney(r.line_total)}</div>
              </div>
              <div>
                <label className="text-xs text-[rgb(var(--muted-fg))]">Warranty</label>
                <div className="mt-1 flex gap-2">
                  <button type="button" className={`rounded-md px-2 py-1 text-sm ${r.warranty && r.warranty.end_date ? 'bg-[rgb(var(--surface-hover))]' : 'bg-[rgb(var(--surface))]'}`} onClick={() => updateRow(idx, { warranty: { ...(r.warranty || {}), end_date: r.warranty?.end_date ? '' : '' } })}>
                    {r.warranty && r.warranty.end_date ? 'Has' : 'No'}
                  </button>
                  <button type="button" className="rounded-md border border-[rgb(var(--border))] px-2 py-1 text-sm" onClick={() => removeRow(idx)}>Remove</button>
                </div>
              </div>
            </div>

            {/* Expandable warranty fields */}
            {r.warranty && (
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div>
                  <label className="text-xs text-[rgb(var(--muted-fg))]">Provider</label>
                  <input className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.warranty.provider || ''} onChange={(e) => updateRow(idx, { warranty: { ...(r.warranty || {}), provider: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs text-[rgb(var(--muted-fg))]">Start</label>
                  <input type="date" className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.warranty.start_date || ''} onChange={(e) => updateRow(idx, { warranty: { ...(r.warranty || {}), start_date: e.target.value } })} />
                </div>
                <div>
                  <label className="text-xs text-[rgb(var(--muted-fg))]">End</label>
                  <input type="date" className="w-full rounded-md border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-[rgb(var(--fg))]" value={r.warranty.end_date || ''} onChange={(e) => updateRow(idx, { warranty: { ...(r.warranty || {}), end_date: e.target.value } })} />
                </div>
                {/* Attachments preview + upload when purchaseId available */}
                <div className="sm:col-span-3 mt-2">
                  {r.attachments?.length ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {r.attachments.map((a) => (
                        <a key={a.id || a.filename} href={a.url} target="_blank" rel="noreferrer" className="rounded-md border px-2 py-1 text-xs text-[rgb(var(--muted-fg))]">{a.filename}</a>
                      ))}
                    </div>
                  ) : null}
                  {purchaseId ? (
                    <div className="mt-2">
                      <input type="file" onChange={(e) => uploadForRow(idx, e.target.files)} />
                      {uploading[r.id] && <div className="text-sm text-[rgb(var(--muted-fg))]">Uploading…</div>}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-[rgb(var(--muted-fg))]">Save the purchase to upload item-level attachments.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div>
          <button type="button" className="btn btn-outline" onClick={addRow}>Add item</button>
        </div>
      </div>
    </div>
  )
}

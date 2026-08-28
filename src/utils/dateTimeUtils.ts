/**
 * Date and Time utilities for reliable local timezone handling and SSR hydration safety.
 */

// Formats a Date or ISO string into local "YYYY-MM-DD"
export function formatLocalDateKey(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return ''
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

// Formats a Date or ISO string into local "YYYY-MM-DDTHH:mm" for <input type="datetime-local" />
export function toLocalDatetimeInputValue(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return ''
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return ''
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
}

// Formats a Date or ISO string into local "YYYY-MM-DD" for <input type="date" />
export function toLocalDateInputValue(dateInput: string | Date | null | undefined): string {
    return formatLocalDateKey(dateInput)
}

// Formats a date string safely for display (e.g., "28 Aug 2026")
export function formatDateDisplay(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '—'
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Formats a time string safely for display (e.g., "14:30" or "02:30 PM")
export function formatTimeDisplay(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '—'
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

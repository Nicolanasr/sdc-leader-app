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

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// Formats a date string safely and deterministically for SSR/Client (e.g., "05 Sep 2026")
export function formatDateDisplay(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '—'
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'
    const day = String(d.getDate()).padStart(2, '0')
    const month = MONTH_NAMES[d.getMonth()]
    const year = d.getFullYear()
    return `${day} ${month} ${year}`
}

// Formats a time string safely and deterministically for SSR/Client (e.g., "10:00 AM")
export function formatTimeDisplay(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return '—'
    const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
    if (isNaN(d.getTime())) return '—'
    const rawHours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = rawHours >= 12 ? 'PM' : 'AM'
    const hours = String(rawHours % 12 || 12).padStart(2, '0')
    return `${hours}:${minutes} ${ampm}`
}

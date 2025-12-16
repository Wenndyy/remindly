// Conflict detection utility for schedule events

export interface EventForConflictCheck {
    id?: string | number;
    startDate: string;  // YYYY-MM-DD format
    endDate?: string;   // YYYY-MM-DD format (for multi-day or same as startDate)
    startTime: string;  // HH:MM format
    endTime: string;    // HH:MM format
    title: string;
    allDay?: boolean;
}

export interface ConflictResult {
    hasConflict: boolean;
    conflictingEvent?: EventForConflictCheck;
    message?: string;
}

/**
 * Convert time string (HH:MM) to minutes from midnight for easier comparison
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * Format time for display (e.g., "09:00" -> "09:00")
 */
function formatTimeRange(startTime: string, endTime: string): string {
    return `${startTime}–${endTime}`;
}

/**
 * Validate that end time is strictly after start time
 * @returns Error message if invalid, null if valid
 */
export function validateTimeOrder(startTime: string, endTime: string): string | null {
    if (!startTime || !endTime) return null;

    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
        return "End time must be after start time";
    }

    return null;
}

/**
 * Check if two time ranges overlap on the same date.
 * Boundary case: if NewEnd equals ExistingStart or NewStart equals ExistingEnd,
 * that is NOT considered a conflict (adjacent, not overlapping).
 * 
 * Overlap rule: NewStart < ExistingEnd AND NewEnd > ExistingStart
 */
function doTimesOverlap(
    newStart: number,
    newEnd: number,
    existingStart: number,
    existingEnd: number
): boolean {
    // Strict inequality: adjacent times (touching boundaries) are allowed
    return newStart < existingEnd && newEnd > existingStart;
}

/**
 * Check for schedule conflicts between a new/edited event and existing events.
 * 
 * @param newEvent - The event being created or edited
 * @param existingEvents - List of existing events to check against
 * @param excludeEventId - ID of event to exclude (when editing, exclude self)
 * @returns ConflictResult with conflict details if found
 */
export function checkTimeConflict(
    newEvent: EventForConflictCheck,
    existingEvents: EventForConflictCheck[],
    excludeEventId?: string | number
): ConflictResult {
    // Skip conflict check for all-day events (they span the whole day)
    if (newEvent.allDay) {
        return { hasConflict: false };
    }

    // Validate required fields
    if (!newEvent.startDate || !newEvent.startTime || !newEvent.endTime) {
        return { hasConflict: false };
    }

    const newStartMinutes = timeToMinutes(newEvent.startTime);
    const newEndMinutes = timeToMinutes(newEvent.endTime);

    // Check against each existing event
    for (const existing of existingEvents) {
        // Skip the event being edited (exclude self)
        if (excludeEventId && existing.id && String(existing.id) === String(excludeEventId)) {
            continue;
        }

        // Skip all-day events in existing list
        if (existing.allDay) {
            continue;
        }

        // Only check events on the same date
        if (existing.startDate !== newEvent.startDate) {
            continue;
        }

        // Skip if existing event doesn't have time info
        if (!existing.startTime || !existing.endTime) {
            continue;
        }

        const existingStartMinutes = timeToMinutes(existing.startTime);
        const existingEndMinutes = timeToMinutes(existing.endTime);

        if (doTimesOverlap(newStartMinutes, newEndMinutes, existingStartMinutes, existingEndMinutes)) {
            return {
                hasConflict: true,
                conflictingEvent: existing,
                message: `Time conflict with "${existing.title}" (${formatTimeRange(existing.startTime, existing.endTime)})`
            };
        }
    }

    return { hasConflict: false };
}

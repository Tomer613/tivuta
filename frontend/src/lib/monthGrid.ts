/**
 * Builds a 7-column month-grid cell array: `null` for the leading blanks so day 1 lands under
 * its real weekday, then `mapDay(day)` for each day 1..daysInMonth. Generic over the payload
 * (`CalendarView` maps to plain day numbers, `AppointmentModal` maps to `Date` objects) since the
 * two components' actual rendering is legitimately different — an admin month-browser listing
 * multiple appointments per day vs. a member-facing single-date picker — only this date math
 * (which used to be independently duplicated in both) is genuinely shared.
 *
 * Does not pad trailing cells to a full last week — callers whose grid must always end on a
 * 7-cell boundary can pad the result themselves, e.g. `while (cells.length % 7 !== 0) cells.push(null)`.
 */
export function buildMonthGridCells<T>(year: number, month: number, mapDay: (day: number) => T): (T | null)[] {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const cells: (T | null)[] = Array(firstDayOfWeek).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
        cells.push(mapDay(d));
    }
    return cells;
}

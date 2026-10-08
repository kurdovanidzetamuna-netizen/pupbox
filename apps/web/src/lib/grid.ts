// Written out in full so Tailwind sees every class (it can't read `md:grid-cols-${n}`).
const MD_COLS = ['md:grid-cols-1', 'md:grid-cols-1', 'md:grid-cols-2', 'md:grid-cols-3', 'md:grid-cols-4', 'md:grid-cols-5', 'md:grid-cols-6'];

/** A desktop column count that fits a list admin can grow or shrink. */
export const mdCols = (n: number) => MD_COLS[Math.min(Math.max(n, 1), 6)];

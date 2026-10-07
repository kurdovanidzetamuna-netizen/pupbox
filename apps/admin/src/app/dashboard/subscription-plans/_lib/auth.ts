function decodeRole(): string {
  try {
    const t = localStorage.getItem('admin_token');
    if (!t) return '';
    const payload = JSON.parse(atob(t.split('.')[1]));
    return (payload.role || '').toLowerCase();
  } catch { return ''; }
}

/** Read from the token client-side, so it only gates UI; the API enforces it. */
export function isSuperAdmin(): boolean {
  return ['super admin', 'superadmin', 'super_admin'].includes(decodeRole());
}

/**
 * Ends the customer's session on this device: the token goes, and the cart
 * falls back to the guest cart. Callers then send them somewhere sensible.
 */
export function signOut() {
  localStorage.removeItem('pupbox_token');
  localStorage.removeItem('pupbox_me');
  document.documentElement.dataset.auth = 'out';
  window.dispatchEvent(new Event('pupbox:signed-out'));
}

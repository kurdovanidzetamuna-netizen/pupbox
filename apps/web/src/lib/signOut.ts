/**
 * Ends the customer's session on this device: the token goes, and the cart
 * falls back to the guest cart. Callers then send them somewhere sensible.
 */
export function signOut() {
  localStorage.removeItem('pupbox_token');
  window.dispatchEvent(new Event('pupbox:signed-out'));
}

// The day an account scheduled for deletion is erased, in the app's Lagos time.
export const erasureDate = (iso: string) => new Date(iso).toLocaleDateString('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'long', year: 'numeric' });

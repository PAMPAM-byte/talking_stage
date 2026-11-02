// Light per-character knowledge base (founder decision, 3 November 2026). The reply may carry up to
// two short facts the user just shared about themselves; the database repeats these checks.
export const memoryNotesGuidance='rememberFacts: up to 2 short notes (under 120 characters) of NEW lasting facts the user just stated about themselves in their latest message, e.g. "Name is Tolu", "Works at a bank in Lekki", "Supports Arsenal". Skip facts already in permittedFacts, guesses, passing moods, and any phone, email, address, bank, password or health detail. Usually [].';
const sensitive=/(@|https?:|www\.|password|passcode|\bpin\b|\bbvn\b|\bnin\b|account number|card number|cvv|otp)/i;
/** A malformed note is dropped, never allowed to fail the reply it came with. */
export function cleanMemoryNotes(value){
 if(!Array.isArray(value))return [];
 const seen=new Set();const notes=[];
 for(const item of value.slice(0,2)){
  if(typeof item!=='string')continue;
  const note=item.replace(/\s+/g,' ').trim();
  if(note.length<3||note.length>120||/\d{7,}/.test(note.replace(/[\s().+-]/g,''))||sensitive.test(note)||seen.has(note.toLowerCase()))continue;
  seen.add(note.toLowerCase());notes.push(note);
 }
 return notes;
}

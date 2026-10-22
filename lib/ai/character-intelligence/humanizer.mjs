// Archive-inspired surface cleanup. Preserve names, facts, emphasis and strict
// structured output; never parse arbitrary prose as a successful model result.
export function humanizeText(text){
 let clean=text.replace(/\*(?:smiles|winks|giggles|blushes|sighs)\*/giu,'').replace(/\((?:smiles|winks|giggles|blushes|sighs)\)/giu,'');
 clean=clean.replace(/^(?:certainly|great question|sure thing)[!,.]\s+/iu,'');
 clean=clean.replace(/\s+(?:is there anything else I can help you with|how can I assist you today)\?$/iu,'');
 clean=clean.replace(/[ \t]{2,}/gu,' ').trim();
 return clean||text;
}

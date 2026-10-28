// Archive-inspired surface cleanup. Preserve names, facts, emphasis and strict
// structured output; never parse arbitrary prose as a successful model result.
export function humanizeText(text){
 let clean=text.replace(/\*(?:smiles|winks|giggles|blushes|sighs)\*/giu,'').replace(/\((?:smiles|winks|giggles|blushes|sighs)\)/giu,'');
 clean=clean.replace(/^(?:certainly|great question|sure thing)[!,.]\s+/iu,'');
 clean=clean.replace(/\s+(?:is there anything else I can help you with|how can I assist you today)\?$/iu,'');
 clean=clean.replace(/[ \t]{2,}/gu,' ').trim();
 return clean||text;
}
// Phone-chat delivery: each line is its own bubble. A long block is split at
// sentence ends into short bubbles, and anything past three joins the last.
export function burstText(text){
 const bubbles=[];
 for(const line of text.split(/\n+/u).map(part=>part.trim()).filter(Boolean)){
  if(line.length<=140){bubbles.push(line);continue;}
  let current='';
  for(const sentence of line.split(/(?<=[.!?])\s+/u)){
   if(current&&current.length+sentence.length>120){bubbles.push(current);current=sentence;}
   else current=current?`${current} ${sentence}`:sentence;
  }
  if(current)bubbles.push(current);
 }
 return (bubbles.length>3?[...bubbles.slice(0,2),bubbles.slice(2).join(' ')]:bubbles).join('\n')||text;
}

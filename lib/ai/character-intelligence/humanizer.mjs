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
// sentence ends into short bubbles. Past four, the shortest neighbouring pair
// merges, so no single bubble swells back into a paragraph.
export function burstText(text){
 const bubbles=[];
 for(const line of text.split(/\n+/u).map(part=>part.trim()).filter(Boolean)){
  if(line.length<=120){bubbles.push(line);continue;}
  let current='';
  for(const sentence of line.split(/(?<=[.!?])\s+/u)){
   if(current&&current.length+sentence.length>100){bubbles.push(current);current=sentence;}
   else current=current?`${current} ${sentence}`:sentence;
  }
  if(current)bubbles.push(current);
 }
 while(bubbles.length>4){
  let pair=0;
  for(let i=1;i<bubbles.length-1;i++)if(bubbles[i].length+bubbles[i+1].length<bubbles[pair].length+bubbles[pair+1].length)pair=i;
  bubbles.splice(pair,2,`${bubbles[pair]} ${bubbles[pair+1]}`);
 }
 return bubbles.join('\n')||text;
}

// Original editable SVG illustrations, not traced celebrity or movie artwork.
const specs={
 'wahala':{skin:'#8a4e32',cloth:'#179d7b',hair:'wrap',eyes:'wide',mouth:'shock',caption:['WAHALA!'],pose:'hands'},
 'omo-laugh':{skin:'#673b29',cloth:'#eda934',hair:'fade',eyes:'laugh',mouth:'laugh',caption:['OMO, I DON LAUGH'],pose:'laugh'},
 'abeg-shift':{skin:'#a56340',cloth:'#c64364',hair:'wrap',eyes:'side',mouth:'flat',caption:['ABEG, SHIFT'],pose:'palm'},
 'no-small-thing':{skin:'#75432c',cloth:'#5054a0',hair:'cap',eyes:'wide',mouth:'shock',caption:['NO BE SMALL THING'],pose:'hands'},
 'gist-me':{skin:'#8f5738',cloth:'#dd7442',hair:'puff',eyes:'side',mouth:'smile',caption:['GIST ME'],pose:'ear'},
 'soft-life':{skin:'#69402e',cloth:'#2b8f86',hair:'cap',eyes:'laugh',mouth:'smile',caption:['SOFT LIFE ONLY'],pose:'cup'},
 'my-person':{skin:'#875035',cloth:'#d44370',hair:'puff',eyes:'laugh',mouth:'smile',caption:['MY PERSON'],pose:'heart'},
 'miss-you':{skin:'#6d402e',cloth:'#9b6bbb',hair:'fade',eyes:'sad',mouth:'soft',caption:['I MISS YOU'],pose:'heart'},
 'you-dey-do-me':{skin:'#a0603b',cloth:'#e5a531',hair:'wrap',eyes:'laugh',mouth:'smile',caption:['YOU DEY DO ME'],pose:'fan'},
 'take-flower':{skin:'#7b4c32',cloth:'#328d85',hair:'fade',eyes:'laugh',mouth:'smile',caption:['TAKE YOUR FLOWER'],pose:'flower'},
 'collect-hug':{skin:'#945e3c',cloth:'#c6577d',hair:'puff',eyes:'laugh',mouth:'smile',caption:['COME COLLECT HUG'],pose:'hug'},
 'dream-of-me':{skin:'#65412e',cloth:'#6f67ab',hair:'cap',eyes:'laugh',mouth:'soft',caption:['DREAM OF ME'],pose:'moon'},
};
const heart=(x,y,scale=1)=>'<path transform="translate('+x+' '+y+') scale('+scale+')" d="M0 5C-12-7-24 11 0 26C24 11 12-7 0 5Z" fill="#df3b69" stroke="white" stroke-width="2"/>';
export function naijaStickerArtwork(id,frame=0){const s=specs[id];if(!s)return null;
const wave=Math.sin(frame*Math.PI/4);
const eyes=s.eyes==='laugh'?'<path d="M76 57q7-10 14 0m13 0q7-10 14 0"/>':s.eyes==='side'?'<path d="m75 47 14 3m15-4 15-3"/><ellipse cx="86" cy="57" rx="3" ry="5" fill="#302127"/><ellipse cx="116" cy="55" rx="3" ry="5" fill="#302127"/>':s.eyes==='sad'?'<path d="m76 47 12-4m16 0 12 4"/><ellipse cx="83" cy="57" rx="3" ry="5" fill="#302127"/><ellipse cx="110" cy="57" rx="3" ry="5" fill="#302127"/>':'<ellipse cx="83" cy="55" rx="7" ry="9" fill="white"/><ellipse cx="110" cy="55" rx="7" ry="9" fill="white"/><circle cx="83" cy="56" r="3" fill="#302127"/><circle cx="110" cy="56" r="3" fill="#302127"/>';
const mouth=s.mouth==='laugh'?'<path d="M77 70q20 35 40-1Z" fill="#302127"/><path d="M82 72h29" stroke="white" stroke-width="5"/>':s.mouth==='shock'?'<ellipse cx="97" cy="76" rx="7" ry="10" fill="#302127"/>':s.mouth==='flat'?'<path d="M86 78h22"/>':s.mouth==='soft'?'<path d="M88 77q9-5 18 0"/>':'<path d="M84 73q13 16 26-1"/>';
const hair=s.hair==='wrap'?'<path d="M64 43Q50 15 76 12Q98-5 116 13Q145 14 128 44L113 31 95 27 76 34Z" fill="'+s.cloth+'"/><path d="M77 14q16 2 23 15M115 17l-13 12" stroke="#fff" stroke-opacity=".6"/>':s.hair==='cap'?'<path d="M65 35 72 13q22-10 48 3l8 23-31-6Z" fill="'+s.cloth+'"/><path d="M74 20l43 5M70 28l52 5" stroke="#ffe8b1"/>':s.hair==='puff'?'<path d="M66 43q-12-10-5-21 9-14 21-10 10-14 24-5 17-4 26 12 10 16-5 29l-10-16-19-5-21 7Z" fill="#302127"/>':'<path d="M66 43V29q6-20 30-19 30 1 31 25v9l-13-15-33-3Z" fill="#302127"/>';
let pose='';if(['hands','hug'].includes(s.pose))pose='<path d="M52 102 27 82m113 20 25-20" stroke="'+s.skin+'" stroke-width="17"/><path d="m27 83-6-14m9 12 1-15m133 17 6-14m-10 12-2-15" stroke="'+s.skin+'" stroke-width="6"/>';
if(s.pose==='heart')pose=heart(96,91,1.2)+'<path d="m61 101 20 14m50-14-20 14" stroke="'+s.skin+'" stroke-width="13"/>';
if(s.pose==='palm')pose='<path d="M145 110V77m-8 3V65m8 15V59m8 23V65m7 24V74" stroke="white" stroke-width="11"/><path d="M145 110V77m-8 3V65m8 15V59m8 23V65m7 24V74" stroke="'+s.skin+'" stroke-width="6"/>';
if(s.pose==='laugh')pose='<path d="M59 100q30 24 66 1" stroke="'+s.skin+'" stroke-width="15"/><path d="M65 60q-14 15-3 17m67-16q13 15 2 17" stroke="#86d5eb" stroke-width="5"/>';
if(s.pose==='ear')pose='<path d="m53 107 3-35 11-9" stroke="'+s.skin+'" stroke-width="14"/><path d="M35 41q-12 20 0 35" stroke="#e6ac32"/>';
if(s.pose==='cup')pose='<path d="m61 102 70 3" stroke="'+s.skin+'" stroke-width="14"/><path d="M133 81h23l-3 28h-17Z" fill="#fff3ca"/><path d="m148 80 9-16" stroke="#db3b6b"/>';
if(s.pose==='flower')pose='<path d="m140 116 3-49" stroke="#30996c" stroke-width="4"/><path d="M142 86q-18-16-18 0 8 7 18 0Z" fill="#30996c"/><circle cx="144" cy="48" r="14" fill="#de3c69" stroke="white"/><path d="M138 46q8-9 12 2-1 8-9 5" stroke="#9b204d"/>';
if(s.pose==='fan')pose='<path d="m140 108-8-30q16-20 35 0Z" fill="#f5bdd3"/><path d="m140 105-8-27m8 27 10-32m-10 32 27-27" stroke="#ac5579" stroke-width="1.5"/>'+heart(33,39,.6);
if(s.pose==='moon')pose='<path d="M153 22q-18 16 5 25-30 10-28-12 2-13 23-13Z" fill="#f4d473" stroke="white"/>'+heart(37,45,.55);
// Gesture animation stays in editable SVG; captions remain still and legible.
pose='<g transform="rotate('+wave*7+' 125 100) translate(0 '+(-Math.abs(wave)*3)+')">'+pose+'</g>';
const caption=s.caption.map((line,i)=>'<text x="96" y="'+(147+i*18)+'" font-family="Arial, sans-serif" font-size="'+(line.length>=14?15:18)+'" font-weight="900" text-anchor="middle" fill="#302127" stroke="white" stroke-width="5" paint-order="stroke">'+line+'</text>').join('');
return '<svg xmlns="http://www.w3.org/2000/svg" width="192" height="160" viewBox="0 0 192 160"><g transform="translate(0 '+(wave*2)+') rotate('+wave*2+' 96 100)" stroke="#302127" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M42 124q-4-35 27-40h54q28 5 27 40Z" fill="'+s.cloth+'" stroke="white" stroke-width="7"/><path d="M88 75h17v19q-8 8-17 0Z" fill="'+s.skin+'"/><ellipse cx="96" cy="56" rx="31" ry="35" fill="'+s.skin+'" stroke="white" stroke-width="6"/>'+hair+'<path d="m96 58-3 9h7" stroke="#482d26"/>'+eyes+mouth+pose+'</g>'+caption+'</svg>';}

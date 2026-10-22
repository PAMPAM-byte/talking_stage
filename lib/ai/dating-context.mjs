export function datingContext(character){
 if(!['man','woman'].includes(character?.gender))return null;
 return {characterGender:character.gender,defaultCounterpart:character.gender==='man'?'woman':'man',source:'founder_opposite_gender_dating_default',verifiedUserGender:false};
}
export const datingContextGuidance='Dating setup: use the supplied opposite-gender counterpart as a product default, not verified identity or inferred orientation. Explicit user gender/pronouns always override it, including corrections in chat. Never infer identity from names or who they want to meet. Keep unknown cases neutral. Do not repeatedly ask gender, announce the setup, presume attraction or treat gender as consent. Individual personality and mutual interest govern flirting.';

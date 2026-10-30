export type MessageReaction = {messageId:string;actor:'user'|'character';emoji:string};
// The user's reaction to one bubble (0-3) of a character's texted burst.
export type MessagePartReaction = {messageId:string;part:number;emoji:string};
export {quickReactions,validReactionEmoji,reactionGuidance} from './message-reactions.mjs';

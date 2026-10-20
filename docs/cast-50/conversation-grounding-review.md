# Conversation context and factual confidence

20 October idiom/identity correction: an ordinary sincerity challenge following a tease was incorrectly answered as a literal identity question. Shared product direction now distinguishes the referent of real/serious from a clear request about AI, bots or a human responder. A short static reminder follows older persona examples when the latest user phrasing could be such an idiom; it asks the model to read context, never supplies a reply, never copies user text into instructions and never overrides honest identity answers or real-world-access boundaries. Mild appearance teasing can receive a short character-specific reaction without an automatic lecture, stock correction or new interview question. Discomfort still stops the approach. No output filter removes disclosures, and no fabricated human identity is introduced.

20 October 2026. The reported failure was an answer that repeated a song title,
called it a classic without support, described a generic reaction to its sound,
and immediately asked another interview-style question. Existing prompt rules
already discouraged repetition, but did not address this failure clearly enough.

The shared direction now distinguishes understanding a short answer, public
knowledge, fictional personal taste and uncertainty. It asks characters to follow
their own previous question, pick one meaningful detail rather than recap a list,
contribute a view when appropriate, and avoid invented familiarity. Incidental
habits do not automatically need approval, advice or a contrasting personal claim.
Health questions and emotional disclosures still receive appropriate attention.
The same rules reach all fifty characters while retaining individual direction,
English-first language, honest answers to direct identity questions, existing
content boundaries and the metered reply pipeline.

`lib/ai/conversation-knowledge.mjs` introduces a small reviewed public-fact
catalogue, initially one song. Bend is identified as a Wizkid song on Morayo;
the album release date is 22 November 2024. Sources reviewed for these facts:

- [Apple Music song listing](https://music.apple.com/us/song/1780459836).
- [Apple Music album listing and release metadata](https://music.apple.com/us/album/morayo/1780459822).
- [Wizkid's official artist-channel audio](https://www.youtube.com/watch?v=ysCEMY5xji8).

This is a narrow seed, not comprehensive music knowledge. A bare title activates
the reference only when it directly follows a music question naming its artist;
explicit artist/title mentions also work. The verb bend, an old unrelated artist
mention and unknown titles do not activate the reference. Only reviewed static
facts enter developer instructions; user text is never interpolated there. No
lyrics, reviews, listening anecdotes or scraped conversations are imported.

The facts are optional grounding, not a reply template. Knowing an album does not
establish how a song sounds, whether the character likes it or what is currently
popular. Unknown details should receive a brief natural admission or a genuinely
needed clarification. Runtime chat does not browse or stream music.

Offline verification covers title resolution, case and punctuation, normalized
history, unrelated contexts, instruction injection and provider assembly. The
roster check exercises this context with each complete character direction and
the existing input limit. These checks verify application behavior and delivery
of the new guidance, not the quality of newly generated dialogue. No real user
conversation was replayed, and no paid live-model evaluation or fine-tuning was
performed for this revision. Live acceptance still requires original synthetic
multi-turn tests and human review; the held-out examples below are not prompts.

## Review cases

| Context | Expected behavior |
| --- | --- |
| Character asks for a favourite Wizkid track; user names Bend | Understand the answer, avoid unsupported acclaim, allow a brief personal reaction without another mandatory question. |
| User names an unknown song | Avoid fabricated lyrics, album details or popularity; ask for missing context only when needed. |
| User lists football, music and an incidental habit | Pick a relevant thread; avoid a recap, automatic approval or an unsolicited health lecture. |
| User says a previous song fact was wrong | Correct the fact briefly; do not double down or blame a platform. |
| User answers with a place, name or “that one” | Resolve it through the preceding exchange instead of restarting introductions. |
| User shares a painful experience | Respond to that person's situation; do not force banter, a word cap or a rapid topic change. |
| Cool, warm and cheeky characters discuss the same track | Retain distinct temperament; do not make all characters use one stock line. |

The existing all-cast and provider checks remain the regression baseline. There
are no new generation calls, retry loops, output rewriting, stored user memories,
provider settings or budget changes in this implementation.

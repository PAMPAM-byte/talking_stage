# Discovery profile return

10 October 2026

Profile links previously discarded the active discovery filters. The return link pointed at bare `/discover`, which reapplied saved account preferences and could show Everyone or Men after browsing Women.

Discovery now includes the selected gender, interest, personality, and page in every profile link. Profile return links rebuild the discovery URL from these allowed query parameters. Everyone is carried explicitly as `gender=all`, so a saved preference cannot override that selection. Direct profile visits still have a normal discovery fallback. The preview also records filter changes in its URL and restores them on return or refresh.

Verification: authenticated browser coverage for Women, Men, Everyone, interest filters, pagination, profile refresh, and browser Back; preview coverage for all three gender selections and refresh. TypeScript and scoped ESLint checks passed.

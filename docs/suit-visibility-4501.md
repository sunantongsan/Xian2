# COCKRO 4.50.1 — suit visibility only

Based on released 4.50.0. Insect characters are 20% larger than the previous patch (scale 1.10 → 1.32), with fixed foot anchors and labels raised above the head. Shop suit art grows from 48px to 80–88px, selected previews to 104px; alpha-bound viewBoxes remove empty padding while retaining the complete artwork. Inventory uses the same art. No server, career, skill, economy or save migration changes. The unfinished career system remains in draft PR #26.

Local relevant sprite/cache/commerce tests pass (20); syntax checked. Full repository tests are required by the existing Vercel build before release. Native-device visual acceptance is the purpose of this test patch.

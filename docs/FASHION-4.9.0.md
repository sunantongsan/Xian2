# COCKRO 4.9.0 — Wardrobe

Frontend commit: d7cffbcd61de7de3af4f9185af6595acb6ed87d2. Backend pin: dba7e2c7dcf79dde4557bb6ee5cd608968bbbd6d.

Six starter cosmetics (hat and outfit in Cowboy, Wuxia and Star Knight themes) work across all four classes. Existing and new characters receive the wardrobe. Cosmetics are separate from combat equipment and stats. The bag contains illustrated icons, try-on class previews, front/back and animation controls. Mixed hats/outfits persist in saves and synchronize to other players.

Artwork generated with built-in image generation. Production assets: web/fashion/cowboy.png, web/fashion/wuxia.png and web/fashion/knight-open.png. Each transparent atlas contains front/back overlays and inventory art. Prompt design: polished fantasy RPG equipment, detailed leather/turquoise cowboy clothing, ivory/jade martial robes, silver/blue/gold celestial armor; consistent six-cell layout; transparent background; no text. Knight face opening was refined with image editing to preserve the hero's face.

Validation: all 74 local tests pass. VPS release workflow https://github.com/sunantongsan/Xian2/actions/runs/40866278695 passed its 16 release checks plus live two-player smoke: shared world, remote movement, equipped appearance visible to another player, forged-save rejection and reconnect persistence. Browser inspection covered all four classes, inventory illustrations and equip controls. Physical Android device testing has not been performed.

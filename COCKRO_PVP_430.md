# COCKRO game patch 4.30.0: all equipped PvP skill slots

Previously the selected-player pursuit branch only used basic attacks, joystick movement cleared the PvP target, and a manual skill pressed during the basic attack windup was silently rejected. Offline defenders also restarted their skill search from slot 1 every time.

The selected-player mode now starts with auto PvP enabled and rotates through all five equipped, unlocked skill slots. It skips skills that are cooling down, unaffordable or out of range. The existing auto button independently toggles PvP automation without changing the monster-hunting preference. Turning PvP auto off keeps the target available for manual attack and skills. Joystick/keyboard movement retains that target.

Manual skill input has priority and waits for the current attack animation. Only the latest selection is queued, for at most two seconds; changing the selected opponent or equipped skill cancels it. The server publishes its remaining action time, validates MP/cooldown/range/slot, and reports manual rejection reasons. Damage still resolves after windup. Offline defenders rotate all five slots as well. This does not unlock unlearned skills or increase the five-slot loadout limit; players can change equipped skills from the existing Skills screen.

Scope: skill selection, input timing and rotation. Existing PvP skill damage/effect mechanics are retained; this change does not add new classes, skill artwork, or a new AoE/status-effect system.

Validation: 193 Node tests passed. New tests cover all five slots on all four playable heroes, resource consumption, cooldown independence, fair auto rotation, offline defense rotation, manual rejection reasons, queued input priority and cancellation. Playwright with a real local WebSocket server checks automatic use of all five skills, manual buttons, auto toggle and target retention during keyboard movement. No real player account is modified by the fixtures. Android physical-device testing remains outstanding.

Delivery uses the existing engine-88 auto-update feed. No native Android or Google Play track change is needed for this game-only patch.

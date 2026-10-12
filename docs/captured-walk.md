# Human walking replacement — 0.1.6

The previous hand-authored gait looked unnatural. This change replaces it with CMU trial 07_01: hips, spine, neck, shoulders, elbows, wrists, thighs, knees, ankles and toes come from the same recorded walk.

`tools/convert_walk.py` parses the original BVH hierarchy and forward kinematics, removes horizontal root travel, normalizes height, selects a matching 128-frame loop, distributes its small endpoint mismatch across the cycle and bakes 64 samples. It needs Python, NumPy and SciPy only when regenerating the track. Runtime has no new dependencies or network requirement.

`web/captured-walk.js` interpolates the track by actual distance travelled, preserves measured segment lengths after interpolation, blends to a neutral stance, and projects the joints through the game's isometric camera. `web/puppet.js` retargets the painted character pieces and splits the boot from the shin so heel/toe pitch follows the capture. The same four painted characters remain; this revision replaces their skeletal motion and adjusts their proportions, not the source paintings. Base movement is now 110/105 units per second to match the capture's approximately 1.07-second two-step cycle. Agility still affects speed.

Source, permissions and credit are in `web/assets/MOTION-LICENSE.txt` and the complete conversion README in `tools/mocap/READMEFIRST.txt`.

Verification: Node tests cover whole-body motion, opposing limb swing, stable segment lengths, seamless looping, grounded stance, eight projected directions and all four character render paths, plus existing combat/progression/runtime checks. The MP4 is rendered from the actual drawing function through an SVG Canvas adapter at the captured cadence. Contact sheets were inspected for front/back articulation. This is not a recording from an Android device; physical-device visual QA remains outstanding.

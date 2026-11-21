# COCKRO 7.1.2

Based on gameplay 4.50.2 and the existing single-character release.

- Red armor palette for the existing animated 3D cockroach.
- Floating touch joystick appears at the movement finger and hides on release/cancel/pinch.
- Character profile shows stat, skill and training point balances. Training balance uses the existing calculation; no new spending system is introduced.
- Monster drops and active shops/rewards use COCKRO. Legacy G balances are preserved but inactive; no automatic conversion.
- Existing G market listings cannot be bought; cancellation retains legacy refund behavior.

Validation: all 360 Node tests passed, syntax check passed, server bundle and update feed built successfully. Physical Android visual testing remains outstanding.

Deployment uses the existing self-hosted GitHub runner `cockro-vps-control`, SHA256-verified server installer and previous-binary rollback. Server save data is not rewritten by this release.

# COCKRO MAN Android advertising

## สถานะที่ตรวจเมื่อ 22 พฤศจิกายน 2026

Google Play Production ใช้ **4.42.0 (113)** เปิดให้บริการใน 178 ประเทศ/ภูมิภาค ส่วนซอร์ส Godot ในรีโปนี้เปิดฉากสนามฝึก และตั้งเวอร์ชันไว้ที่ **4.0.0-internal.2 (82)**. AAB รุ่น 113 ที่เก็บไว้มี Android activity และคลาส `com.sunantongsan.xian2.RewardedAds` พร้อมเกม HTML/JavaScript. ใน manifest ของ AAB 113 พบ App ID ของ COCKRO และ AD_ID ส่วนเมธอด `RewardedAds.show()` โหลด Rewarded ID ตรงกับตาราง โดย `start()` ขออัปเดต UMP และ `initialize()` ตรวจ `canRequestAds()` ก่อนเริ่ม Mobile Ads SDK การอัปเดตผู้เล่นเดิมต้อง build จากซอร์สของรุ่นใช้งานจริง

| รายการ | ผลตรวจ |
| --- | --- |
| แพ็กเกจที่ลิงก์ใน AdMob | `com.sunantongsan.networkcokcro` บน Google Play |
| Android App ID | `ca-app-pub-4585492700643566~3340769116` |
| Rewarded | `ca-app-pub-4585492700643566/6530873388` |
| การตรวจสอบแอป | ยืนยันแล้ว ปุ่ม Verify app ปิดอยู่ |
| การอนุมัติโฆษณา | กำลังเตรียมพร้อม จำกัดจำนวนโฆษณา ส่งตรวจเมื่อ 3 พ.ย. 2026 |
| บัญชีผู้เผยแพร่ | โปรไฟล์ชำระเงินสมบูรณ์ Google ยังแสดงว่ากำลังยืนยันบัญชี |
| ข้อความ UMP ยุโรป | ข้อความของ COCKRO MAN ภาษาอังกฤษ เผยแพร่แล้ว |
| เว็บไซต์ในหน้าร้าน | https://cockro-network.vercel.app/ |
| ไฟล์ผู้ขายโฆษณา | https://cockro-network.vercel.app/app-ads.txt ตอบ HTTP 200 ชนิด text/plain พร้อมบรรทัด `google.com, pub-4585492700643566, DIRECT, f08c47fec0942fa0` |

## Build และทดสอบซอร์ส Godot

1. ติดตั้ง Godot 4.6.3 พร้อม export templates รุ่นเดียวกัน, JDK 17, Android SDK platform 36 และ build-tools 36.1.0 ตั้ง Android SDK Path และ Java SDK Path ใน Editor Settings → Export → Android
2. จากโฟลเดอร์ที่มี `project.godot` รัน `python3 tools/install_admob.py` ก่อนเปิดโปรเจกต์ สคริปต์ตรวจ SHA-256 ของปลั๊กอิน Poing 5.1.0 และ AAR สำหรับ Godot 4.6.3
3. เปิดโปรเจกต์ เลือก Project → Install Android Build Template แล้วรันคำสั่งด้านล่างจากโฟลเดอร์เดิม

```sh
godot --headless --path . --import
godot --headless --path . --script tests/reward_consent_test.gd
godot --headless --path . --script tests/reward_inventory_test.gd
godot --headless --path . --script tests/training_test.gd
```

4. สำหรับทดสอบบน Android ใช้ Android preset แบบ debug (เลือก APK หากติดตั้งโดยตรง) แล้วเปิดร้านแลกของ เกมนี้ใช้ App ID ของ COCKRO ทั้งสองโหมดเพื่อโหลดข้อความ UMP ของเกม ส่วน debug ขอเฉพาะหน่วย Rewarded ทดสอบของ Google ตรวจการขอ consent ในพื้นที่ที่เกี่ยวข้อง การเปลี่ยนตัวเลือกความเป็นส่วนตัว การปิดก่อนจบ และการได้รับของครั้งเดียวเมื่อ SDK แจ้งว่าได้รางวัล
5. สำหรับ build AAB เลือก preset Android และตั้ง Gradle Build → Export Format เป็น AAB ค่าเดิมเปิด Gradle, การเซ็น, INTERNET, ACCESS_NETWORK_STATE และ `com.google.android.gms.permission.AD_ID` อยู่แล้ว ตั้ง upload keystore เดิมผ่าน Release keystore ในเครื่อง build หรือใช้ตัวแปร `GODOT_ANDROID_KEYSTORE_RELEASE_PATH`, `GODOT_ANDROID_KEYSTORE_RELEASE_USER` และ `GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD`
6. รันใน shell บนเครื่อง build

```sh
mkdir -p exports/android
godot --headless --path . --export-release Android exports/android/cockro-training.aab
bundletool validate --bundle=exports/android/cockro-training.aab
bundletool dump manifest --bundle=exports/android/cockro-training.aab --module=base
jarsigner -verify exports/android/cockro-training.aab
```

   หากติดตั้ง bundletool เป็นไฟล์ JAR ให้แทนคำสั่ง `bundletool` ด้วย `java -jar /path/to/bundletool.jar` ตรวจ manifest ว่ามี package, App ID และ AD_ID ตามตาราง และตรวจ upload certificate ด้วย Play Console → App integrity

7. สำหรับการอัปเดต **รุ่นใช้งานจริง** เปิดซอร์สที่ตรงกับ AAB 113 และแพตช์ที่ใช้งานอยู่ ตรวจเส้นทาง UMP, App ID, Rewarded และการให้รางวัลของซอร์สนั้น เลือก versionCode ใหม่ที่สูงกว่าทุกโค้ดที่เคยอัปโหลดใน App Bundle Explorer และสร้าง AAB ด้วย upload key เดิม
8. อัปโหลด AAB ของรุ่นใช้งานจริงใน Play Console → ทดสอบภายใน ตรวจการอัปเดตทับ 113 และการรักษาข้อมูลผู้เล่น ทดสอบโฆษณาด้วยอุปกรณ์ทดสอบที่ลงทะเบียน จากนั้นโปรโมตรุ่นที่ทดสอบผ่านไป Production และส่ง Google ตรวจ

## ประวัติการทดสอบสนามฝึก

### Cockro Android internal preview — code 82

Historical status: Google Play internal track shows code82 (4.0.0-internal.2), Rewarded Ads Test, ready for internal testers. Published 2026-10-28 06:52 Thailand time. Code81 was never rolled out. Historical code81 notes below are retained for traceability.

Fork of SlayHorizon/godot-tiny-mmo at f4ed04f20963c3285117e58b1149fa1117658d3c. Original license retained.

## Android training preview
- Package `com.sunantongsan.networkcokcro`; version `4.0.0-internal.1` (81), landscape, arm64.
- Local training menu using existing Cockro-Networkv4 mascot (assets/mascot-wai.webp).
- Multitouch movement, attack and area skill; sword, bow, gun, club and Cockroach Man training loadouts.
- Enemy targets, health, cooldowns, defeat and restart. Training does not read or modify accounts, currencies or database.
- Thai font: Noto Sans Thai, SIL Open Font License in assets/cockro/OFL.txt.
- These are prototype weapon loadouts, not completed MMORPG professions. Art, animations, maps and enemy behavior are placeholders.

## Online migration remains incomplete
No hosted Cockro gateway/master/world server configured. Online control is disabled when the HTTPS gateway setting is empty. Original Tiny MMO online client/server source remains in the fork. Prior account/database integration, five complete professions, original animal collection and two-client combat/save/reconnect validation are not complete.

## Validation
Godot 4.6.3 imports and starts the client. Automated training checks cover all five weapon damage paths, attack cooldown, skill cooldown, touch movement/release, focus-loss reset and defeat/restart. Desktop rendering inspected at 960x540. Upstream ObjectDB/resource warnings remain at engine shutdown.
Local gateway/master handshake previously returned {"ok":true}; this does not verify Internet multiplayer.
Existing COCKRO upload key was retrieved privately and used only for Android signing, never committed.

## Build
Install Godot 4.6.3 Android export templates, JDK17, Android SDK36 and build tools36.1.0. Install the Android build template to android/build and retain android/.gdignore. Set Godot editor SDK/JDK paths and GODOT_ANDROID_KEYSTORE_RELEASE_PATH, GODOT_ANDROID_KEYSTORE_RELEASE_USER, GODOT_ANDROID_KEYSTORE_RELEASE_PASSWORD privately. Run Godot --headless --path . --export-release Android exports/android/cockro-81.aab. Android generated files and exports are ignored by git.

Internal preview upload is permitted after successful signed build and package validation. Full online release requires hosted-server and multiplayer validation. Distribution status must be checked in Play Console; this document is not proof of rollout.

## Build and upload result (2026-10-27 UTC)
- Signed AAB successfully built: 42,535,267 bytes. SHA256 b9df6f9262867de8e97f5111b0014e9bf69e3b1a703db1afa0e04e71836bd36f.
- jarsigner verified the signature. bundletool validate passed. Manifest confirms package, version81, minSDK24/targetSDK36, arm64-v8a. No keystore files in bundle.
- Extracted exported Android game data starts with Godot headless without script errors; this is not a physical Android-device test.
- Uploaded and processed in Google Play internal track 4701506968907566093, draft release4. NOT rolled out. Existing release80 remains active.
- Release blocked by existing app Advertising ID declaration versus the preview's absent AD_ID permission. Preview has no ads. Automatic action review rejected Google's publish-without-permission option pending explicit user approval. No declaration or permission bypass applied.
- Other Play warnings: 5,588 fewer supported devices (arm64-only preview), larger download, missing deobfuscation/native symbol files.
- To reproduce the local build, keep android/.gdignore present before importing; remove stale *.import metadata from generated android resources if earlier imports scanned that directory.

## Rewarded ads — internal code82
- Added native Poing AdMob 5.1.0 / Godot4.6.3 Android integration, Google Mobile Ads next-gen SDK1.4.0, and AD_ID/network permissions. Uses Google's TEST app/unit IDs only; this build earns no advertising revenue.
- Run `python tools/install_admob.py` before opening/importing a fresh checkout. Dependency archives are pinned to official release URLs and SHA256 hashes; generated dependency files stay out of git.
- Voluntary shop: 1 rewarded ad unlocks weapon (+5 damage) or hero armor (130 starting HP), or grants 1 enhancement stone. Weapon enhancement consumes a stone, succeeds deterministically, adds +3 damage per level, capped at +5.
- Reward is issued only from the native SDK earned-reward callback, with a unique receipt and duplicate guard. Close/failure/timeout never grants rewards. Loading prevents concurrent requests. Owned nonconsumables cannot be claimed again.
- Inventory is atomically persisted under user://training_rewards_v1.json. This is local INTERNAL TEST inventory only, never an authoritative online account or transferable economy. Live advertising and online rewards require production AdMob IDs, UMP consent configuration, authenticated SSV and server-side inventory transactions before launch.
- Inventory tests pass: invalid claims, duplicate receipts, ownership, enhancement consumption/cap, reload persistence, and no reward on ad failure/non-Android fallback. Shop rendered and inspected at960x540. Native ad playback still needs testing on an Android device.
- Code82 supersedes draft81. Do not use the rejected publish-without-AD_ID workaround: this version includes actual ad functionality requested by the user.
- Code82 signed AAB: 50,969,010 bytes; SHA256 8d7fc60d28781648483a7ab4cedc3174333ecff6a3083b764bf6d5e330c86636. bundletool validation and jarsigner signature verification pass. Exported game data starts without script errors (desktop/headless, not physical Android).
- Manifest verified: code82, original package, native PoingGodotAdMobRewardedAd registration and AD_ID permission. Required MIT/font notices included; no signing keys inside bundle. Full-screen callbacks ignore stale ad generations.

- Final Play validation: no Advertising ID error; four nonblocking warnings (device coverage, download size, missing deobfuscation/native symbols). Normal Save and Publish completed. Internal track4701506968907566093 confirms latest release82 ready for testers. No production/closed-track rollout performed.

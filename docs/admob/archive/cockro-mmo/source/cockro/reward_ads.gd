extends Node
## Rewards belong to the local training inventory.
signal changed
const TEST_UNIT := "ca-app-pub-3940256099942544/5224354917"
const RELEASE_UNIT := "ca-app-pub-4585492700643566/6530873388"

var inventory := CockroRewardInventory.new()
var message := ""
var busy := false
var initialized := false
var ad: RewardedAd
var pending := ""
var receipt := ""
var earned := false
var generation := 0
var native_ads := false
var consent_pending := false
var consent_ready := false
var privacy_required := false
var initializing := false

func _ready() -> void:
	inventory.load_data()
	native_ads = OS.get_name() == "Android" and Engine.has_singleton("PoingGodotAdMob") \
		and Engine.has_singleton("PoingGodotAdMobConsentInformation") \
		and Engine.has_singleton("PoingGodotAdMobUserMessagingPlatform")
	if native_ads:
		_update_consent()
	else:
		message = "โฆษณายังไม่พร้อมบนอุปกรณ์นี้"

func _update_consent() -> void:
	consent_pending = true
	consent_ready = false
	message = "กำลังตรวจตัวเลือกความเป็นส่วนตัว…"
	changed.emit()
	UserMessagingPlatform.consent_information.update(
		ConsentRequestParameters.new(), _on_consent_updated, _on_consent_error
	)

func _on_consent_updated() -> void:
	var info := UserMessagingPlatform.consent_information
	if info.get_consent_status() == ConsentInformation.ConsentStatus.REQUIRED and info.get_is_consent_form_available():
		privacy_required = info.get_privacy_options_requirement_status() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
		UserMessagingPlatform.load_consent_form(_on_form_loaded, _on_consent_error)
	else:
		_finish_consent(null)

func _on_form_loaded(form: ConsentForm) -> void:
	form.show(_finish_consent)

func show_privacy_options() -> void:
	if not privacy_required or consent_pending or busy or initializing:
		return
	consent_pending = true
	consent_ready = false
	changed.emit()
	UserMessagingPlatform.show_privacy_options_form(_finish_consent)

func _on_consent_error(error: FormError) -> void:
	consent_pending = false
	consent_ready = false
	push_warning("AdMob UMP [%d] %s" % [error.error_code, error.message])
	message = "ตรวจตัวเลือกความเป็นส่วนตัวไม่สำเร็จ แตะดูโฆษณาเพื่อลองใหม่"
	changed.emit()

func _finish_consent(error: FormError) -> void:
	if error:
		_on_consent_error(error)
		return
	var info := UserMessagingPlatform.consent_information
	privacy_required = info.get_privacy_options_requirement_status() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
	consent_pending = false
	# Poing 5.1.0 exposes UMP's status, but has no can_request_ads() binding.
	consent_ready = info.get_consent_status() in [
		ConsentInformation.ConsentStatus.NOT_REQUIRED, ConsentInformation.ConsentStatus.OBTAINED
	]
	if not consent_ready:
		message = "โฆษณายังไม่พร้อม แตะดูโฆษณาเพื่อตรวจความเป็นส่วนตัวอีกครั้ง"
	elif not initialized and not initializing:
		initializing = true
		message = "กำลังเตรียมโฆษณา…"
		var callback := OnInitializationCompleteListener.new()
		callback.on_initialization_complete = _on_ads_initialized
		MobileAds.initialize(callback)
	else:
		message = ""
	changed.emit()

func _on_ads_initialized(_status: InitializationStatus) -> void:
	initializing = false
	initialized = true
	message = ""
	changed.emit()

func request(item: String) -> void:
	if busy or consent_pending or initializing or not inventory.available(item):
		return
	if native_ads and not consent_ready:
		_update_consent()
		return
	if not initialized or not consent_ready:
		message = "โฆษณายังไม่พร้อมบนอุปกรณ์นี้"
		changed.emit()
		return
	busy = true
	earned = false
	pending = item
	receipt = Crypto.new().generate_random_bytes(16).hex_encode()
	generation += 1
	var current := generation
	message = "กำลังโหลดโฆษณา…"
	changed.emit()
	var callback := RewardedAdLoadCallback.new()
	callback.on_ad_failed_to_load = func(error: LoadAdError):
		if current == generation:
			if error:
				push_warning("AdMob rewarded load [%d] %s" % [error.code, error.message])
			finish("โหลดโฆษณาไม่ได้ ยังไม่ได้รับของ กดลองใหม่ได้")
	callback.on_ad_loaded = func(loaded: RewardedAd):
		if current != generation or not is_inside_tree():
			loaded.destroy()
			return
		ad = loaded
		var full := FullScreenContentCallback.new()
		full.on_ad_failed_to_show_full_screen_content = func(error: AdError):
			if current == generation:
				if error:
					push_warning("AdMob rewarded show [%d] %s" % [error.code, error.message])
				finish("เปิดโฆษณาไม่สำเร็จ ยังไม่ได้รับของ")
		full.on_ad_dismissed_full_screen_content = func():
			if current == generation:
				finish(message if earned else "ปิดโฆษณาก่อนรับรางวัล ยังไม่ได้รับของ")
		ad.full_screen_content_callback = full
		var reward := OnUserEarnedRewardListener.new()
		reward.on_user_earned_reward = func(_reward):
			if current != generation or earned or pending.is_empty():
				return
			earned = true
			if inventory.grant(pending, receipt):
				message = "ได้รับ %s แล้ว!" % CockroRewardInventory.CATALOG[pending]
			else:
				message = "บันทึกของไม่สำเร็จ กรุณาตรวจพื้นที่ว่าง"
			changed.emit()
		message = "กำลังแสดงโฆษณา ดูจบเพื่อรับของ"
		changed.emit()
		ad.show(reward)
	var unit_id := TEST_UNIT if OS.is_debug_build() else RELEASE_UNIT
	RewardedAdLoader.new().load(unit_id, AdRequest.new(), callback)
	get_tree().create_timer(40).timeout.connect(func():
		if current == generation and busy and ad == null:
			finish("หมดเวลาโหลดโฆษณา ยังไม่ได้รับของ กดลองใหม่ได้")
	)

func finish(text: String) -> void:
	generation += 1
	busy = false
	pending = ""
	message = text
	if ad:
		ad.destroy()
		ad = null
	changed.emit()

func _exit_tree() -> void:
	generation += 1
	if ad:
		ad.destroy()

extends SceneTree

class ConsentInfoStub extends ConsentInformation:
	var status := ConsentStatus.UNKNOWN
	var privacy := PrivacyOptionsRequirementStatus.UNKNOWN
	var updates := 0

	func get_consent_status() -> ConsentStatus:
		return status

	func get_is_consent_form_available() -> bool:
		return false

	func get_privacy_options_requirement_status() -> PrivacyOptionsRequirementStatus:
		return privacy

	func update(_parameters: ConsentRequestParameters, success := Callable(), _failure := Callable()) -> void:
		updates += 1
		success.call()

func _initialize() -> void:
	run.call_deferred()

func run() -> void:
	var info := ConsentInfoStub.new()
	var original := UserMessagingPlatform.consent_information
	UserMessagingPlatform.consent_information = info
	var ads := preload("res://source/cockro/reward_ads.gd").new()
	root.add_child(ads)
	ads.native_ads = true
	for status in [ConsentInformation.ConsentStatus.UNKNOWN, ConsentInformation.ConsentStatus.REQUIRED]:
		info.status = status
		ads.request("stone")
		assert(not ads.busy and not ads.initializing and not ads.consent_ready)
	assert(info.updates == 2)

	info.status = ConsentInformation.ConsentStatus.NOT_REQUIRED
	ads.request("stone")
	assert(ads.consent_ready and ads.initializing and not ads.busy)
	ads._on_ads_initialized(null)
	info.status = ConsentInformation.ConsentStatus.OBTAINED
	info.privacy = ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED
	ads._on_consent_updated()
	assert(ads.consent_ready and ads.privacy_required and not ads.initializing)
	ads.show_privacy_options()
	assert(ads.consent_pending and not ads.consent_ready)
	ads.request("stone")
	assert(not ads.busy and info.updates == 3)
	ads._finish_consent(FormError.new(1, "simulated UMP error"))
	assert(not ads.consent_ready and not ads.consent_pending)
	info.status = ConsentInformation.ConsentStatus.REQUIRED
	ads.request("stone")
	assert(info.updates == 4 and not ads.busy and not ads.consent_ready)

	UserMessagingPlatform.consent_information = original
	ads.free()
	print("PASS: consent gates initialization and requests, privacy changes and recovery")
	quit()

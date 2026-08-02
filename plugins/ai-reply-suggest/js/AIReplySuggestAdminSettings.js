// AI Reply Suggest Plugin - Admin Settings JavaScript

(rl => { if (rl) {

	class AIReplySuggestAdminSettings
	{
		constructor()
		{
			this.loading = ko.observable(false);
		}
	}

	rl.addSettingsViewModelForAdmin(
		AIReplySuggestAdminSettings,
		'AIReplySuggestAdminSettingsTab',
		'AI Reply Suggest',
		'ai-reply-suggest'
	);

}})(window.rl);
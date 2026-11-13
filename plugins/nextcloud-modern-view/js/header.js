/**
 * Nextcloud Modern View: message header helpers (step 5).
 * Runs first among the MailMessageView hooks: mvT is used by the other files and the template.
 */
(rl => {
	if (!rl) {
		return;
	}

	NcModernView.onView('MailMessageView', view => {
		const from = () => view.message()?.from?.[0];

		// Translate from the template: globals like rl are not reachable inside bindings
		view.mvT = (key, values) => rl.i18n(key, values);

		view.mvFromName = ko.computed(() => from()?.name || from()?.email || '');
		view.mvFromAddr = ko.computed(() => from()?.name && from()?.email ? '<' + from().email + '>' : '');
	});

})(window.rl);

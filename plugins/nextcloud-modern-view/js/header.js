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

		view.mvFromName = NcModernView.computed('mvFromName', () => from()?.name || from()?.email || '', '');
		view.mvFromAddr = NcModernView.computed('mvFromAddr', () => from()?.name && from()?.email ? '<' + from().email + '>' : '', '');

		// Tag options for the ☰ menu. Core's message.tagOptions() reads
		// FolderUserStore.currentFolder().optionalTags() without a null check, which can throw while
		// switching folders; a throw there surfaced as "Request failed" on the message list.
		view.mvTagOptions = NcModernView.computed('mvTagOptions', () =>
			view.tagsAllowed() ? (view.message()?.tagOptions() || []) : [], []);
	});

})(window.rl);

/**
 * Nextcloud Modern View: ✕ in the compose window saves the draft and closes, without asking.
 *
 * Core's ✕ (doClose) closes WITHOUT saving, so it asks "Are you sure you want to close this
 * window?": anything typed since the last autosave (every 60 s) would be lost. Like Outlook and
 * Gmail, ✕ here saves first and closes once the save succeeded. It still asks when there is
 * nothing to keep, when saving is not possible (no Drafts folder) or when the save failed.
 */
(rl => {
	if (!rl) {
		return;
	}

	const saveAndClose = view => () => {
		if (view.isEmptyForm?.() && !view.draftUid?.()) {
			view.close();
			return;
		}
		if (!view.saveCommand?.canExecute?.()) {
			view.doClose();
			return;
		}
		view.saveCommand();
		if (!view.saving?.()) {
			view.doClose(); // core did not start a save (e.g. no Drafts folder)
			return;
		}
		const done = view.saving.subscribe(busy => {
			if (!busy) {
				done.dispose();
				view.savedError?.() ? view.doClose() : view.close();
			}
		});
	};

	NcModernView.onView('PopupsCompose', view => {
		view.mvSaveAndClose = saveAndClose(view);
		const t = document.getElementById('PopupsCompose'),
			x = t?.content.querySelector('header [data-bind*="click: doClose"]');
		x?.setAttribute('data-bind', x.getAttribute('data-bind').replace('click: doClose', 'click: mvSaveAndClose'));
	});

})(window.rl);

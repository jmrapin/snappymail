/**
 * Nextcloud Modern View: "something is happening" feedback on both toolbars.
 *
 * mvBusy is true while SnappyMail works for that panel (core's own loading states):
 *  - message list: messageList.isLoading()  (folder load, refresh, after archive/delete/move)
 *  - reading pane: messageListOrViewLoading()  (list or the opened message loading)
 * The toolbars get the class mv-busy: an animated line under the toolbar and a spinning Refresh
 * (css/busy.css). Pressed feedback on every button is pure CSS.
 */
(rl => {
	if (!rl) {
		return;
	}

	// The list template is core's (not replaced): add the busy class to its toolbar binding.
	// It already has css: {'hasChecked': checkAll}, and an element can only have one css binding.
	const bar = document.getElementById('MailMessageList')?.content.querySelector('.btn-toolbar');
	if (bar) {
		const bind = bar.getAttribute('data-bind') || '';
		bar.setAttribute('data-bind', /css:\s*\{/.test(bind)
			? bind.replace(/css:\s*\{/, "css: {'mv-busy': mvBusy, ")
			: (bind ? bind + ', ' : '') + "css: {'mv-busy': mvBusy}");
	}

	NcModernView.onView('MailMessageList', view => {
		view.mvBusy = NcModernView.computed('mvBusy (list)', () => !!view.messageList?.isLoading?.(), false);
	});

	NcModernView.onView('MailMessageView', view => {
		view.mvBusy = NcModernView.computed('mvBusy (view)', () => !!view.messageListOrViewLoading?.(), false);
	});

})(window.rl);

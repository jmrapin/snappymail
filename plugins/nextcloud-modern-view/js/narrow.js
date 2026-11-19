/**
 * Nextcloud Modern View: more room for reading in narrow windows, like Outlook on the web.
 *
 * Below FOLD px the folder panel folds to its icon strip. This clicks core's own toggle, so the
 * user can still open it; it unfolds again when the window gets wider, unless the user unfolded
 * it meanwhile. Below SINGLE px the side-by-side layout shows one pane at a time: the list, or
 * the open message with Close as the way back (css/narrow.css). That keys on core's
 * #rl-right.message-selected, the class its own no-preview layout uses; the user's saved layout
 * is not touched (SettingsUserStore is not reachable from plugins).
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		FOLD = 1200,
		SINGLE = 1000,
		AUTO_KEY = 'mvAutoFoldedLeft',
		html = document.documentElement,
		fold = matchMedia(`(max-width: ${FOLD - 1}px)`),
		single = matchMedia(`(max-width: ${SINGLE - 1}px)`),
		// core opens / closes the panel itself when crossing its mobile width (Stores/Theme.js)
		mobile = matchMedia('(max-width: 799px)');

	let toggle;
	const folded = () => html.classList.contains('rl-left-panel-disabled');

	const update = NcModernView.safe('narrow', () => {
		html.classList.toggle('mv-single-pane', single.matches);
		// css/list-width.css keeps the list at its minimum while the folders are folded
		html.classList.toggle('mv-fold-width', fold.matches);
		if (!toggle || mobile.matches) {
			return;
		}
		if (fold.matches) {
			if (!folded()) {
				toggle.click();
				localStorage.setItem(AUTO_KEY, 1);
			}
		} else if (localStorage.getItem(AUTO_KEY)) {
			localStorage.removeItem(AUTO_KEY);
			folded() && toggle.click();
		}
	});
	// after core's own handlers for the same width change
	const later = () => setTimeout(update, 0);
	[fold, single, mobile].forEach(mq => mq.addEventListener('change', later));

	NcModernView.onBuild('MailMessageList', (view, dom) => {
		// core handles .toggleLeft clicks inside the list view, even with its toolbar hidden
		toggle = dom?.querySelector('.toggleLeft');
		later();
	});
	update();

})(window.rl);

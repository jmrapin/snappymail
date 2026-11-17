/**
 * Nextcloud Modern View: one action bar over the message list and the reading pane.
 *
 * Admin switch: Extensions → Nextcloud Modern View → "One action bar" (on by default). When on,
 * <html> gets the class mv-onebar; css/onebar.css then hides the two panel toolbars and pins
 * this bar to the top of #rl-right (only while the message list is on screen, so the Settings
 * screens are untouched). The buttons are rendered from templates/NcModernViewBar.html and bound
 * to js/onebar-model.js; nothing of core's DOM is moved, so switching it off restores the
 * two-toolbar layout.
 */
(rl => {
	if (!rl) {
		return;
	}

	NcModernView.oneBar = false !== rl.pluginSettingsGet('nextcloud-modern-view', 'one_bar');
	if (!NcModernView.oneBar) {
		return;
	}
	document.documentElement.classList.add('mv-onebar');

	let list, view;

	const mount = NcModernView.safe('one bar', () => {
		const right = document.getElementById('rl-right');
		if (!right || !list || !view || document.getElementById('mv-onebar')) {
			return;
		}
		const bar = Element.fromHTML('<div id="mv-onebar" class="btn-toolbar mv-onebar g-ui-user-select-none"></div>');
		right.prepend(bar);

		const model = NcModernView.oneBarModel(list.view, view, list.dom);
		// core only translates data-i18n in the views it builds, so the bar asks for it (i18nUpdate)
		ko.applyBindingAccessorsToNode(bar, {
			template: () => ({ name: 'NcModernViewBar' }),
			i18nUpdate: () => true
		}, model);
		// the bar element itself is outside the template, so its busy class is set here
		model.busy.subscribe(busy => bar.classList.toggle('mv-busy', busy));

		// css/onebar.css applies only while the message list is on screen (not in Settings, not
		// when an opened message replaces the list); core shows/hides views with [hidden]
		const shown = () => right.classList.toggle('mv-onebar-on', !list.dom.hidden);
		new MutationObserver(shown).observe(list.dom, { attributes: true, attributeFilter: ['hidden'] });
		shown();

		NcModernView.watchOverflow(bar);
		NcModernView.hookMove(bar.querySelector('.mv-move-btn'));
	});

	NcModernView.onBuild('MailMessageList', (v, dom) => {
		list = { view: v, dom };
		mount();
	});
	NcModernView.onBuild('MailMessageView', v => {
		view = v;
		mount();
	});

})(window.rl);

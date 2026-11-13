/**
 * Nextcloud Modern View: extra view-model logic for the replacement templates.
 * Hooks into views the same way the avatars plugin does (rl-view-model.create).
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		getEl = id => document.getElementById(id),

		// "Jean-Michel Rapin" -> "JR", "jm@rapin.com.au" -> "JM"
		initials = name => {
			name = (name || '').trim();
			if (name.includes('@')) {
				name = name.split('@')[0];
			}
			const parts = name.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
			return (parts.length > 1
				? parts[0][0] + parts[parts.length - 1][0]
				: (parts[0] || '?').slice(0, 2)
			).toUpperCase();
		};

	/**
	 * Step 4: compact account switcher - initials in a pill instead of the full address.
	 * The address stays in the tooltip (title) of the toggle.
	 */
	const systemDropDown = getEl('SystemDropDown');
	const toggle = systemDropDown?.content.querySelector('#top-system-dropdown-id');
	if (toggle) {
		toggle.setAttribute('data-bind', 'attr: { title: accountEmail }');
		toggle.prepend(Element.fromHTML('<span class="mv-initials" data-bind="text: mvInitials"></span>'));
		toggle.append(Element.fromHTML('<i class="mi mi-arrow-drop-down"></i>'));
	}

	addEventListener('rl-view-model.create', e => {
		const view = e.detail;
		if ('SystemDropDown' === view.viewModelTemplateID) {
			// accountName() is a method that reads observables, so the computed tracks them
			view.mvInitials = ko.computed(() => initials(
				('function' === typeof view.accountName ? view.accountName() : '')
				|| ko.unwrap(view.accountEmail)
			));
		}
	});

})(window.rl);

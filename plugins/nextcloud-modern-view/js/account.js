/**
 * Nextcloud Modern View: compact account switcher.
 * Initials in a pill instead of the full address; the address moves to the tooltip.
 */
(rl => {
	if (!rl) {
		return;
	}

	// "Jean-Michel Rapin" -> "JR", "jm@rapin.com.au" -> "JM"
	const initials = name => {
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

	// Templates are still unbound while plugin scripts load, so they can be changed here
	const toggle = document.getElementById('SystemDropDown')?.content.querySelector('#top-system-dropdown-id');
	if (toggle) {
		toggle.setAttribute('data-bind', 'attr: { title: accountEmail }');
		toggle.prepend(Element.fromHTML('<span class="mv-initials" data-bind="text: mvInitials"></span>'));
		toggle.append(Element.fromHTML('<i class="mi mi-arrow-drop-down"></i>'));
	}

	NcModernView.onView('SystemDropDown', view => {
		// accountName() is a method that reads observables, so the computed tracks them
		view.mvInitials = NcModernView.computed('mvInitials', () => initials(
			('function' === typeof view.accountName ? view.accountName() : '')
			|| ko.unwrap(view.accountEmail)
		), '?');
	});

	// The pill floats over the reading pane toolbar's right end; the toolbar keeps that much room
	// free (--mv-account-width in css/toolbar.css), measured since the pill's width varies.
	NcModernView.onBuild('SystemDropDown', (view, dom) => {
		const app = document.getElementById('rl-app');
		dom && app && new ResizeObserver(NcModernView.safe('account width', () => {
			if (dom.offsetWidth) {
				const right = (dom.offsetParent || app).getBoundingClientRect().right;
				app.style.setProperty('--mv-account-width', Math.ceil(right - dom.getBoundingClientRect().left) + 'px');
			}
		})).observe(dom);
	});

})(window.rl);

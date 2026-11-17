/**
 * Nextcloud Modern View: compose window fields (From, To, Cc, Bcc, Reply-To, Subject).
 *
 * Plain rows with a line between them (css/compose-fields.css). The Cc / Bcc buttons move from
 * the toolbar to the end of the To row, as links; each opens its row and hides itself (core's
 * own "visible: !showCc(), toggle: showCc" bindings are kept).
 */
(rl => {
	if (!rl) {
		return;
	}

	const patch = t => {
		const bHeader = t.querySelector('.b-header'),
			right = t.querySelector('header .pull-right'),
			toInput = bHeader?.querySelector('input[data-bind*="emailsTags: to,"]');
		if (!bHeader || !toInput) {
			return;
		}
		bHeader.classList.add('mv-cp-fields');

		const links = Element.fromHTML('<span class="mv-cp-links"></span>');
		['showCc', 'showBcc'].forEach(flag => {
			const a = right?.querySelector(`a.btn[data-bind*="toggle: ${flag}"]`);
			if (a) {
				a.className = 'mv-cp-link';
				links.append(a);
			}
		});
		const cell = toInput.closest('td');
		cell.classList.add('mv-cp-to');
		cell.append(links);

		// identity menu: an outline caret instead of core's ▼ text
		bHeader.querySelector('#identity-toggle')?.append(Element.fromHTML('<i class="mi mi-arrow-drop-down"></i>'));
	};

	NcModernView.onView('PopupsCompose', () => {
		const t = document.getElementById('PopupsCompose');
		if (t && !t.mvFields) {
			t.mvFields = true;
			patch(t.content);
		}
	});

})(window.rl);

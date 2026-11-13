/**
 * Nextcloud Modern View: message list toolbar (step 7).
 *
 * Core's MailMessageList template is NOT replaced (the nextcloud plugin hooks its ☰ menu and the
 * avatars plugin its rows). Instead, while plugin scripts load and the template is still unbound,
 * the toolbar buttons get outline icons and the reading pane's order:
 *   Refresh | Archive · Spam · Delete · Move … Sort · ☰
 * Bindings, ids and dropdowns stay as core defines them.
 */
(rl => {
	if (!rl) {
		return;
	}

	const bar = document.getElementById('MailMessageList')?.content.querySelector('.btn-toolbar');
	if (!bar) {
		return;
	}

	const
		find = selector => bar.querySelector(selector),
		el = html => Element.fromHTML(html),

		// replace a button's glyph with an outline icon; keeps its bindings, id and title
		iconize = (button, icon) => {
			if (!button) {
				return null;
			}
			button.classList.remove('btn', 'btn-thin', 'fontastic');
			button.classList.add('mv-btn');
			button.replaceChildren(el(`<i class="mi mi-${icon}"></i>`));
			return button;
		},

		reload = iconize(find('[data-bind*="click: reload"]'), 'refresh'),
		move = iconize(find('[data-bind*="command: moveCommand"]'), 'drive-file-move'),
		actions = find('.btn-group.onCheckedShow'),
		moreGroup = find('#more-list-dropdown-id')?.closest('.btn-group'),
		sortGroups = [find('#no-sort-list'), find('#sort-list-dropdown-id')].map(b => b?.closest('.btn-group'));

	bar.classList.add('mv-list-toolbar');
	reload?.classList.add('mv-reload');

	if (actions) {
		iconize(actions.querySelector('[data-bind*="archiveCommand"]'), 'archive');
		iconize(actions.querySelector('[data-bind*="command: spamCommand"]'), 'report');
		iconize(actions.querySelector('[data-bind*="notSpamCommand"]'), 'mark-email-read');
		iconize(actions.querySelector('[data-bind*="command: deleteCommand"]'), 'delete');
		actions.classList.add('mv-group');
		move && actions.append(move);
		reload?.after(el('<span class="mv-sep"></span>'));
	}

	iconize(find('#more-list-dropdown-id'), 'menu');
	iconize(find('#no-sort-list'), 'sort')?.classList.add('disabled');
	const sort = iconize(find('#sort-list-dropdown-id'), 'sort');
	if (sort) {
		// the glyph text (sortText) is replaced by the icon; the title still says "Sort"
		sort.setAttribute('data-bind', (sort.getAttribute('data-bind') || '').replace(/,?\s*text:\s*sortText/, ''));
	}

	// … Sort · ☰ at the right end
	if (moreGroup) {
		const spacer = el('<span class="mv-spacer"></span>');
		moreGroup.before(spacer);
		sortGroups.forEach(group => group && moreGroup.before(group));
	}

})(window.rl);

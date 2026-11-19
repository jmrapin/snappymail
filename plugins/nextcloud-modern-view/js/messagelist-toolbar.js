/**
 * Nextcloud Modern View: message list toolbar.
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

		// replace a button's glyph with an outline icon; keeps its bindings, id and title.
		// overflow: order in which it leaves a narrow toolbar (js/overflow.js), highest first
		iconize = (button, icon, overflow) => {
			if (!button) {
				return null;
			}
			button.classList.remove('btn', 'btn-thin', 'fontastic');
			button.classList.add('mv-btn');
			button.replaceChildren(el(`<i class="mi mi-${icon}"></i>`));
			overflow && button.setAttribute('data-mv-ovf', overflow);
			return button;
		},

		reload = iconize(find('[data-bind*="click: reload"]'), 'refresh'),
		move = iconize(find('[data-bind*="command: moveCommand"]'), 'drive-file-move', 9),
		actions = find('.btn-group.onCheckedShow'),
		moreGroup = find('#more-list-dropdown-id')?.closest('.btn-group'),
		sortGroups = [find('#no-sort-list'), find('#sort-list-dropdown-id')].map(b => b?.closest('.btn-group'));

	bar.classList.add('mv-list-toolbar');
	reload?.classList.add('mv-reload');
	// "Move to ▾" opens the quick folder menu (js/move-menu.js)
	move?.append(el('<i class="mi mi-arrow-drop-down mv-dd-caret"></i>'));

	if (actions) {
		// all four are also in core's ☰ menu, so they can overflow without a menu entry
		iconize(actions.querySelector('[data-bind*="archiveCommand"]'), 'archive', 7);
		iconize(actions.querySelector('[data-bind*="command: spamCommand"]'), 'report', 8);
		iconize(actions.querySelector('[data-bind*="notSpamCommand"]'), 'mark-email-read', 8);
		iconize(actions.querySelector('[data-bind*="command: deleteCommand"]'), 'delete', 6);
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

	// One action bar (js/onebar.js) hides this toolbar: Sort goes next to the search box instead
	const searchRow = document.getElementById('MailMessageList')?.content.querySelector('.second-toolbar');
	if (false !== rl.pluginSettingsGet('nextcloud-modern-view', 'one_bar') && searchRow) {
		sortGroups.filter(Boolean).forEach(group => {
			group.classList.add('mv-search-sort');
			searchRow.append(group);
		});
		return;
	}

	// … Sort · ☰ at the right end
	if (moreGroup) {
		const spacer = el('<span class="mv-spacer"></span>');
		moreGroup.before(spacer);
		sortGroups.forEach(group => group && moreGroup.before(group));
	}

})(window.rl);

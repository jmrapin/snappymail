/**
 * Nextcloud Modern View: "Move to ▾" folder menu (like Outlook on the web).
 *
 * Clicking a Move button opens: a search box, the most recently used folders and all folders as
 * a tree (typing filters them by path). Each row has two icons: move and copy; clicking the name
 * moves. Enter moves to the first match, Ctrl+Enter copies.
 * The click is caught in the capture phase so core's command binding (its "pick a folder in the
 * left panel" mode) doesn't also run; the move/copy uses core's MessagelistUserStore
 * (rl.app.messageList), exactly like dropping messages on a folder.
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		RECENT_KEY = 'mvMoveRecent',
		RECENT_MAX = 5,
		DRAFTS = 3,
		TYPE_ICON = { 1: 'mark-email-read', 4: 'report', 5: 'delete', 6: 'archive' },
		t = key => NcModernView.t(key),
		store = () => rl.app?.messageList,
		el = html => Element.fromHTML(html),
		esc = NcModernView.esc;

	// every folder you can move into, depth-first, with its depth for the tree
	const allFolders = () => {
		const out = [], walk = (list, depth) => (list || []).forEach(folder => {
			if (folder.selectable?.() && DRAFTS !== folder.type?.() && (folder.isSubscribed?.() || folder.type?.())) {
				out.push({ folder, depth });
			}
			walk(folder.subFolders?.(), depth + 1);
		});
		walk(rl.app?.folderList?.(), 0);
		return out;
	};
	const label = folder => folder.localName?.() || folder.name();
	const path = folder => folder.delimiter
		? folder.fullName.split(folder.delimiter).slice(0, -1).concat(label(folder)).join(' / ')
		: label(folder);

	const recent = () => {
		try {
			return JSON.parse(localStorage.getItem(RECENT_KEY)) || [];
		} catch (e) {
			return [];
		}
	};
	const remember = fullName => localStorage.setItem(RECENT_KEY,
		JSON.stringify([fullName, ...recent().filter(n => n !== fullName)].slice(0, RECENT_MAX)));

	let menu, input, list, anchorBtn, source = '';

	const close = () => {
		menu?.classList.remove('show');
		anchorBtn = null;
	};

	const transfer = (fullName, copy) => {
		const s = store(), uids = s?.listCheckedOrSelectedUidsWithSubMails?.();
		close();
		if (uids?.size) {
			remember(fullName);
			s.moveMessages(uids.folder, uids, fullName, !!copy);
		}
	};

	const row = (folder, text, depth) => {
		const p = esc(path(folder)),
			indent = depth ? ` style="padding-left:${10 + 18 * depth}px"` : '',
			a = el(`<a href="#" class="mv-move-item" title="${p}"${indent}>`
				+ `<i class="mi mi-${TYPE_ICON[folder.type()] || 'folder'}"></i><span>${esc(text)}</span>`
				+ `<b class="mv-move-act" data-act="move"><i class="mi mi-drive-file-move"></i></b>`
				+ `<b class="mv-move-act" data-act="copy"><i class="mi mi-content-copy"></i></b></a>`);
		a.querySelector('[data-act="move"]').title = rl.i18n('GLOBAL/MOVE_TO') + ' ' + path(folder);
		a.querySelector('[data-act="copy"]').title = rl.i18n('GLOBAL/COPY_TO') + ' ' + path(folder);
		a.addEventListener('click', e => {
			e.preventDefault();
			transfer(folder.fullName, 'copy' === e.target.closest('[data-act]')?.dataset.act || e.ctrlKey);
		});
		return a;
	};
	const head = text => el(`<div class="mv-move-head">${esc(text)}</div>`);

	const render = () => {
		const query = input.value.trim().toLowerCase(),
			folders = allFolders().filter(f => f.folder.fullName !== source);
		if (query) {
			const found = folders.filter(f => path(f.folder).toLowerCase().includes(query));
			list.replaceChildren(...(found.length
				? found.map(f => row(f.folder, path(f.folder), 0))
				: [el(`<div class="mv-move-none">${esc(t('MOVE_NONE'))}</div>`)]));
			return;
		}
		const byName = new Map(folders.map(f => [f.folder.fullName, f.folder])),
			recents = recent().map(n => byName.get(n)).filter(Boolean);
		list.replaceChildren(
			...(recents.length ? [head(t('MOVE_RECENT')), ...recents.map(f => row(f, label(f), 0))] : []),
			head(t('MOVE_ALL')),
			...folders.map(f => row(f.folder, label(f.folder), f.depth))
		);
	};

	const onKey = e => {
		if ('Escape' === e.key) {
			close();
		} else if ('Enter' === e.key) {
			e.preventDefault();
			const first = list.querySelector('.mv-move-item');
			first && (e.ctrlKey ? first.querySelector('[data-act="copy"]') : first).click();
		}
		e.stopPropagation(); // keep SnappyMail's keyboard shortcuts out of the search box
	};

	const build = () => {
		menu = el(`<div class="mv-move-menu" role="menu">
			<label class="mv-move-search"><i class="mi mi-search"></i><input type="search" autocomplete="off"></label>
			<div class="mv-move-list"></div>
		</div>`);
		input = menu.querySelector('input');
		list = menu.querySelector('.mv-move-list');
		input.placeholder = t('MOVE_SEARCH');
		input.addEventListener('input', render);
		input.addEventListener('keydown', onKey);
		document.addEventListener('mousedown', e =>
			menu.contains(e.target) || e.target.closest?.('.mv-move-btn') || close());
		addEventListener('resize', close);
		(document.getElementById('rl-app') || document.body).append(menu);
	};

	const open = btn => {
		menu || build();
		if (anchorBtn === btn) {
			close();
			return;
		}
		anchorBtn = btn;
		source = store()?.listCheckedOrSelectedUidsWithSubMails?.()?.folder || '';
		input.value = '';
		render();
		// a button moved into the ☰ menu has no box: open under its toolbar instead
		const r = (btn.offsetWidth ? btn : btn.closest('.btn-toolbar') || btn).getBoundingClientRect();
		menu.classList.add('show');
		menu.style.top = Math.round(r.bottom + 4) + 'px';
		menu.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - menu.offsetWidth - 8))) + 'px';
		list.scrollTop = 0;
		input.focus();
	};

	NcModernView.hookMove = btn => {
		if (!btn || btn.mvMoveHooked) {
			return;
		}
		btn.mvMoveHooked = true;
		btn.classList.add('mv-move-btn');
		btn.addEventListener('click', e => {
			e.preventDefault();
			e.stopImmediatePropagation();
			btn.classList.contains('disabled') || open(btn);
		}, true);
	};

	NcModernView.onBuild('MailMessageList', (view, dom) =>
		NcModernView.hookMove(dom?.querySelector('.mv-list-toolbar [data-bind*="command: moveCommand"]')));
	NcModernView.onBuild('MailMessageView', (view, dom) =>
		NcModernView.hookMove(dom?.querySelector('.mv-toolbar [data-bind*="command: moveCommand"]')));

})(window.rl);

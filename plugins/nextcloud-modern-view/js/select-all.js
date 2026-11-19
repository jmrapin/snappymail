/**
 * Nextcloud Modern View: "Select all in this folder", like Gmail and Outlook on the web.
 *
 * Ticking the list's top checkbox selects the loaded page only. When the folder (or the search)
 * has more, a banner at the top of the list offers to select all of them; the plugin's
 * NcmvFolderUids action (index.php) returns every UID. Core's commands (delete, move, archive,
 * spam, drag to a folder, the Move menu) all collect their UIDs through
 * MessagelistUserStore.listCheckedOrSelectedUidsWithSubMails(), so wrapping that one function makes
 * them act on the whole folder. Read and flag go through setFlag() below (core's own requests).
 * The selection ends as soon as a box is unticked or the folder, page or search changes.
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		t = (key, values) => NcModernView.t(key, values),
		store = () => rl.app?.messageList,
		all = ko.observable(null), // { folder, search, uids: Set }
		loading = ko.observable(false);
	let listView;

	const pageAllChecked = () => {
		const list = store()?.() || [];
		return list.length > 0 && list.every(item => item.checked?.());
	};
	// the folder-wide selection, while it still applies to what's on screen
	const current = () => {
		const sel = all(), s = store();
		return sel && s && sel.folder === s().folder && sel.search === s.listSearch() && pageAllChecked() ? sel : null;
	};

	const folderName = fullName => {
		let found;
		const walk = list => (list || []).forEach(f => found || (f.fullName === fullName ? found = f : walk(f.subFolders?.())));
		walk(rl.app?.folderList?.());
		return found ? (found.localName?.() || found.name()) : fullName;
	};

	const selectAll = () => {
		const s = store(), folder = s?.().folder, search = s?.listSearch() || '';
		if (!folder || loading()) {
			return;
		}
		loading(true);
		rl.pluginRemoteRequest(NcModernView.safe('select all', (error, data) => {
			loading(false);
			const uids = Array.isArray(data?.Result) ? data.Result : null;
			if (!error && uids && folder === store()?.().folder) {
				all({ folder, search, uids: new Set(uids) });
			}
		}), 'NcmvFolderUids', { folder, search, hideDeleted: listView?.hideDeleted?.() ? 1 : 0 });
	};

	// core's commands ask this for the UIDs to act on
	const wrapStore = () => {
		const s = store(), orig = s?.listCheckedOrSelectedUidsWithSubMails;
		if (!orig || orig.mvWrapped) {
			return;
		}
		s.listCheckedOrSelectedUidsWithSubMails = (...args) => {
			try {
				const sel = current();
				if (sel) {
					const result = new Set(sel.uids);
					result.folder = sel.folder;
					return result;
				}
			} catch (e) {
				console.error('NcModernView select all', e);
			}
			return orig.apply(s, args);
		};
		s.listCheckedOrSelectedUidsWithSubMails.mvWrapped = true;
	};

	NcModernView.selectAll = {
		size: NcModernView.computed('select all size', () => current()?.uids.size || 0, 0),
		// kind: 'Seen' or 'Flagged'; core's MessageSetSeen / MessageSetFlagged with every UID
		setFlag: (kind, on) => {
			const sel = current();
			sel && rl.app.Remote.request('MessageSet' + kind, () => store()?.reload(false, true), {
				folder: sel.folder,
				uids: [...sel.uids].join(','),
				setAction: on ? 1 : 0
			});
		}
	};

	// the banner's state: '' (hidden), 'offer' or 'all'
	const mode = NcModernView.computed('select all mode', () => {
		const s = store();
		if (!s || s.threadUid() || !pageAllChecked()) {
			return '';
		}
		return current() ? 'all' : (s.count() > s().length ? 'offer' : '');
	}, '');

	const render = NcModernView.safe('select all banner', (banner, m) => {
		const s = store(), search = s?.listSearch(),
			where = search ? t('THIS_SEARCH') : folderName(s?.().folder);
		banner.hidden = !m;
		if (!m) {
			return;
		}
		const [text, link] = banner.children;
		if ('all' === m) {
			text.textContent = t('ALL_IN_SELECTED', { N: current().uids.size.toLocaleString(), FOLDER: where });
			link.textContent = t('CLEAR_SELECTION');
		} else {
			text.textContent = t('PAGE_ALL_SELECTED', { N: s().length.toLocaleString() });
			link.textContent = loading() ? t('SELECTING') : t('SELECT_ALL_IN', { N: s.count().toLocaleString(), FOLDER: where });
		}
	});

	NcModernView.onBuild('MailMessageList', (view, dom) => {
		listView = view;
		wrapStore();
		const content = dom?.querySelector('.b-content');
		if (!content) {
			return;
		}
		const banner = Element.fromHTML('<div class="mv-selall" hidden><span></span><a href="#"></a></div>');
		banner.lastElementChild.addEventListener('click', e => {
			e.preventDefault();
			'all' === mode() ? (all(null), view.checkAll?.(false)) : selectAll();
		});
		content.prepend(banner);
		ko.computed(() => render(banner, mode(), loading()));
		// forget the folder-wide selection once it no longer applies
		mode.subscribe(m => 'all' === m || all(null));
	});

})(window.rl);

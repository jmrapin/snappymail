/**
 * Nextcloud Modern View: the "delete permanently?" question says how many messages it deletes.
 *
 * Core asks with its Ask popup (PopupsAsk, rl.app.ask) only when a delete is permanent: from Trash
 * or Spam, or "Delete permanently" (App/User.js moveMessagesToFolderType). It passes just the text
 * POPUPS_ASK/DESC_WANT_DELETE_MESSAGES and Yes / No. That call is recognised by its text; the
 * count comes from the same store function core used to collect the messages a moment earlier
 * (so it includes "select all in this folder", js/select-all.js). Every other use of the popup
 * (passwords, other questions) is left as it is. Styles: css/delete-ask.css.
 */
(rl => {
	if (!rl) {
		return;
	}

	const t = (key, values) => NcModernView.t(key, values),
		esc = NcModernView.esc;

	const count = () => rl.app?.messageList?.listCheckedOrSelectedUidsWithSubMails?.()?.size || 1;

	// the whole page is ticked but the folder has more: say that the rest is not included
	// (selecting all of them is a separate click on the list's banner, js/select-all.js)
	const notIncluded = n => {
		const store = rl.app?.messageList, page = store?.() || [];
		if (NcModernView.selectAll?.size() || n !== page.length || !page.every(item => item.checked?.())) {
			return 0;
		}
		return Math.max(0, (store.count?.() || 0) - n);
	};

	// core binds askDesc with html:, so the two lines are escaped markup
	const question = (n, rest) => `<div class="mv-ask-title">${esc(1 < n
		? t('DELETE_N_TITLE', { N: n.toLocaleString() })
		: t('DELETE_ONE_TITLE'))}</div>`
		+ `<div class="mv-ask-text">${esc(t(1 < n ? 'DELETE_N_TEXT' : 'DELETE_ONE_TEXT'))}</div>`
		+ (rest ? `<div class="mv-ask-note">${esc(t('DELETE_PAGE_ONLY', {
			N: n.toLocaleString(),
			M: rest.toLocaleString()
		}))}</div>` : '');

	NcModernView.onBuild('PopupsAsk', (view, dom) => {
		const onShow = view.onShow;
		if (!onShow || onShow.mvWrapped) {
			return;
		}
		view.onShow = function(desc, yes, no, focus, ask) {
			const isDelete = !ask && desc === rl.i18n('POPUPS_ASK/DESC_WANT_DELETE_MESSAGES');
			dom?.classList.toggle('mv-ask-delete', isDelete);
			if (!isDelete) {
				return onShow.apply(this, arguments);
			}
			const n = NcModernView.safe('delete count', count, 1)(),
				rest = NcModernView.safe('delete rest', notIncluded, 0)(n);
			onShow.call(this, question(n, rest), yes, no, focus, ask, 'GLOBAL/DELETE');
			view.noButton?.(rl.i18n('GLOBAL/CANCEL'));
		};
		view.onShow.mvWrapped = true;
	});

})(window.rl);

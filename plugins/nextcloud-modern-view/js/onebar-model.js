/**
 * Nextcloud Modern View: view model of the single action bar (templates/NcModernViewBar.html).
 *
 * L = core's message list view, V = the reading pane view. Core's list commands already act on
 * "the checked messages, or else the selected (open) one" (MessagelistUserStore
 * .listCheckedOrSelected), so most buttons use them directly. Actions that only make sense for
 * one message (reply, print, …) are wrapped so they are disabled while messages are ticked.
 */
(rl => {
	if (!rl) {
		return;
	}

	const C = NcModernView.computed;

	// a command (fn + fn.canExecute) built from another command, with an extra condition
	const guard = (label, when, cmd) => {
		const fn = (...args) => fn.canExecute() && cmd(...args);
		fn.canExecute = C(label, () => !!(when() && cmd?.canExecute?.()), false);
		return fn;
	};

	NcModernView.oneBarModel = (L, V, listDom) => {
		const
			store = rl.app.messageList,
			message = () => V.message?.(),
			targets = () => store.listCheckedOrSelected?.() || [],
			m = { L, V, t: key => rl.i18n(key) };

		m.checkedCount = C('bar checked', () => store.listChecked?.().length || 0, 0);
		m.hasMessage = C('bar message', () => !!message(), false);
		m.single = C('bar single', () => !m.checkedCount() && m.hasMessage(), false);
		m.hasTarget = C('bar target', () => m.checkedCount() > 0 || m.hasMessage(), false);
		m.isDraft = C('bar draft', () => !!V.isDraftFolder?.(), false);
		// "select all in this folder" (js/select-all.js) counts the whole folder
		m.checkedText = C('bar checked text', () => NcModernView.t('N_SELECTED',
			{ N: (NcModernView.selectAll?.size() || m.checkedCount()).toLocaleString() }), '');
		m.busy = C('bar busy', () => !!(store.isLoading?.() || V.messageListOrViewLoading?.()), false);

		// one-message actions
		m.reply = guard('reply', m.single, V.replyCommand);
		m.replyAll = guard('replyAll', m.single, V.replyAllCommand);
		m.forward = guard('forward', m.single, V.forwardCommand);
		m.edit = guard('edit', m.single, V.editCommand);
		m.editAsNew = guard('editAsNew', m.single, V.editAsNewCommand);
		m.prev = guard('prev', m.hasMessage, V.goUpCommand);
		m.next = guard('next', m.hasMessage, V.goDownCommand);

		// forward as attachment: core's list "forward" sends the checked ones as attachments
		m.forwardAsAttachment = (...args) => (m.checkedCount() ? L.forwardCommand : V.forwardAsAttachmentCommand)(...args);
		m.forwardAsAttachment.canExecute = C('fwdAtt', () => m.checkedCount()
			? L.forwardCommand.canExecute() : !!V.forwardAsAttachmentCommand?.canExecute?.(), false);

		// ▾ carets are disabled with their button, unless a menu entry still applies
		// (forward as attachment of ticked messages; save .eml / original of the open one)
		m.fwdMenuOff = C('fwd menu', () => !m.forward.canExecute() && !m.forwardAsAttachment.canExecute(), true);
		m.delMenuOff = C('del menu', () => !m.hasTarget(), true);
		m.dlMenuOff = C('dl menu', () => !L.downloadAttachCommand?.canExecute?.() && !m.single(), true);

		// read / unread and flag toggle on all targets, like Outlook
		m.allUnseen = C('bar unseen', () => m.hasTarget() && targets().every(msg => msg.isUnseen()), false);
		m.allFlagged = C('bar flagged', () => m.hasTarget() && targets().every(msg => msg.isFlagged()), false);
		m.seenIcon = C('bar seen icon', () => m.allUnseen() ? 'mi-mark-email-read' : 'mi-mark-email-unread', '');
		m.seenTitle = C('bar seen title', () => rl.i18n(m.allUnseen() ? 'MESSAGE_LIST/MENU_SET_SEEN' : 'MESSAGE_LIST/MENU_UNSET_SEEN'), '');
		m.flagTitle = C('bar flag title', () => rl.i18n(m.allFlagged() ? 'MESSAGE_LIST/MENU_UNSET_FLAG' : 'MESSAGE_LIST/MENU_SET_FLAG'), '');
		m.tagsTitle = C('bar tags title', () => NcModernView.t('TAGS'), '');
		// with the whole folder selected, the page's state decides the direction for all of it
		const folderWide = () => NcModernView.selectAll?.size() > 0;
		m.toggleSeen = () => m.hasTarget() && (folderWide()
			? NcModernView.selectAll.setFlag('Seen', m.allUnseen())
			: (m.allUnseen() ? L.listSetSeen() : L.listUnsetSeen()));
		m.toggleFlag = () => m.hasTarget() && (folderWide()
			? NcModernView.selectAll.setFlag('Flagged', !m.allFlagged())
			: (m.allFlagged() ? L.listUnsetFlags() : L.listSetFlags()));

		// open-message helpers (links and menu items)
		m.emlLink = C('bar eml', () => message()?.downloadLink?.() || '#', '#');
		m.rawLink = C('bar raw', () => message()?.viewRaw?.() || '#', '#');
		m.unsubscribeLink = C('bar unsubscribe', () => V.firstUnsubsribeLink?.() || '', '');
		m.canViewHtml = C('bar html', () => !!(message()?.html?.() && !message()?.isHtml?.()), false);
		m.canViewPlain = C('bar plain', () => !!message()?.isHtml?.(), false);
		m.canSaveAttachmentsToNextcloud = C('bar nc att', () => !!V.saveNextcloud && !!V.mvAttCount?.(), false);
		m.canSaveMessageToNextcloud = C('bar nc eml', () => !!V.nextcloudSaveMsg && m.hasMessage(), false);
		m.canEmptyFolder = C('bar empty', () => !!L.clearListIsVisible?.(), false);

		const onOpen = fn => () => {
			m.single() && fn(message());
			return false;
		};
		m.print = onOpen(msg => msg.printMessage());
		m.swapColors = onOpen(msg => msg.swapColors());
		m.viewHtml = onOpen(msg => msg.viewHtml());
		m.viewPlain = onOpen(msg => msg.viewPlain());
		m.saveAttachmentsToNextcloud = onOpen(() => {
			V.mvAttSetAllChecked?.(true);
			V.saveNextcloud();
		});
		m.saveMessageToNextcloud = onOpen(() => V.nextcloudSaveMsg());
		m.newTag = () => (V.newTag?.(), false);

		// list helpers
		m.reload = () => (L.reload(), false);
		m.compose = () => (L.composeClick(), false);
		m.markAllRead = () => (L.listSetAllSeen(), false);
		m.emptyFolder = () => (L.clear(), false);
		m.clearChecked = () => (L.checkAll(false), false);
		m.closeMessage = () => (V.closeMessage(), false);
		m.fullScreen = () => (V.toggleFullScreen(), false);
		// core handles .toggleLeft clicks inside the list view (its toolbar copy is hidden)
		m.toggleLeft = () => (listDom.querySelector('.toggleLeft')?.click(), false);

		return m;
	};

})(window.rl);

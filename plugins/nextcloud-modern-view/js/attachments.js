/**
 * Nextcloud Modern View: attachments, state and labels.
 *
 * Collapsed: one line of cards; those that don't fit go behind "Show all (N)".
 * Expanded / selecting: two rows (first half, rest) that scroll sideways together.
 * Layout lives in attachments-layout.js, clicks/menu/selection in attachments-actions.js.
 * Icons and fitting are shared with the compose window (attachments-common.js).
 * Note: SnappyMail's knockout build has no ko.pureComputed, use ko.computed.
 */
(rl => {
	if (!rl) {
		return;
	}

	NcModernView.onView('MailMessageView', view => {
		const list = () => view.listAttachments() || [];

		// all attachments of the message (listAttachments() may hide inline ones)
		view.mvAttAll = () => ko.unwrap(view.message()?.attachments) || [];
		view.mvAttSetAllChecked = value => view.mvAttAll().forEach(a => a.checked(value));

		view.mvAttExpanded = ko.observable(false);
		view.mvAttSelecting = ko.observable(false);
		view.mvAttFit = ko.observable(1000);
		view.mvAttMenu = ko.observable(null);
		view.mvAttMenuPos = ko.observable({ top: 0, left: 0 });
		view.mvHasNextcloud = NcModernView.computed('mvHasNextcloud',
			() => 'function' === typeof view.saveNextcloud, false);

		view.mvAttRows = NcModernView.computed('mvAttRows', () => {
			const items = list();
			items.forEach((a, i) => a.mvIndex = i);
			if ((view.mvAttExpanded() || view.mvAttSelecting()) && items.length > 1) {
				const half = Math.ceil(items.length / 2);
				return [items.slice(0, half), items.slice(half)];
			}
			return [items];
		}, [[]]);

		// core's listAttachments() is undefined while no message is open (folder switch): never
		// read .length on it from a binding, that threw "Request failed"
		view.mvAttCount = NcModernView.computed('mvAttCount', () => list().length, 0);

		// template state, named so the bindings stay free of logic
		view.mvAttCollapsed = NcModernView.computed('mvAttCollapsed',
			() => !view.mvAttExpanded() && !view.mvAttSelecting(), true);
		view.mvAttHeadVisible = NcModernView.computed('mvAttHeadVisible',
			() => view.mvAttExpanded() && !view.mvAttSelecting(), false);
		view.mvAttMulti = NcModernView.computed('mvAttMulti', () => view.mvAttCount() > 1, false);
		view.mvAttCanZip = NcModernView.computed('mvAttCanZip',
			() => !!view.downloadAsZipAllowed?.() && view.mvAttMulti(), false);
		view.mvAttShowChip = NcModernView.computed('mvAttShowChip',
			() => view.mvAttCollapsed() && view.mvAttFit() < view.mvAttCount(), false);
		view.mvAttShowZipLink = NcModernView.computed('mvAttShowZipLink',
			() => view.mvAttCollapsed() && view.mvAttCanZip(), false);
		view.mvAttMenuHasPreview = NcModernView.computed('mvAttMenuHasPreview',
			() => !!view.mvAttMenu()?.hasPreview(), false);

		// per card
		view.mvAttExt = att => NcModernView.att.extLabel(att.fileNameExt);
		view.mvAttIconClass = att => (att.hasThumbnail() ? 'mv-thumb ' : '') + NcModernView.att.iconClass(att.fileNameExt);
		view.mvAttIconText = att => att.hasThumbnail() ? '' : view.mvAttExt(att);
		view.mvAttHref = att => att.hasPreview() ? att.linkPreviewMain() : att.linkDownload();
		view.mvAttCardCss = att => ({
			'mv-hidden': view.mvAttCollapsed() && att.mvIndex >= view.mvAttFit(),
			'mv-sel': view.mvAttSelecting() && att.checked()
		});

		view.mvAttShowAllText = NcModernView.computed('mvAttShowAllText',
			() => NcModernView.t('SHOW_ALL', { N: list().length }), '');
		view.mvAttSummary = NcModernView.computed('mvAttSummary', () => NcModernView.t('ATTACHMENTS_SUMMARY', {
			N: list().length,
			SIZE: NcModernView.friendlySize(list().reduce((t, a) => t + (a.estimatedSize || 0), 0))
		}), '');

		view.mvAttSelectedCount = NcModernView.computed('mvAttSelectedCount',
			() => list().filter(a => a.checked()).length, 0);
		view.mvAttAllChecked = NcModernView.computed('mvAttAllChecked',
			() => list().length > 0 && list().every(a => a.checked()), false);
		// computeds run at once: this must come after mvAttSelectedCount
		view.mvAttAnySelected = NcModernView.computed('mvAttAnySelected', () => view.mvAttSelectedCount() > 0, false);
		view.mvAttSelectedText = NcModernView.computed('mvAttSelectedText', () => NcModernView.t('N_OF_M_SELECTED', {
			N: view.mvAttSelectedCount(),
			M: list().length
		}), '');

		// "Add to calendar" only for an invite the nextcloud plugin has parsed (nextcloudICS)
		view.mvAttMenuIsIcs = NcModernView.computed('mvAttMenuIsIcs', () => {
			const att = view.mvAttMenu();
			return !!att && 'function' === typeof view.nextcloudSaveICS && !!ko.unwrap(view.nextcloudICS)
				&& ('text/calendar' === att.mimeType || 'ics' === (att.fileNameExt || '').toLowerCase());
		}, false);
	});

})(window.rl);

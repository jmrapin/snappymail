/**
 * Nextcloud Modern View: attachment clicks, the per-card ▾ menu and selection mode (step 6).
 * Uses core's attachment model (checked(), linkPreviewMain(), linkDownload(), ...) and core's
 * downloadAsZip() (downloads the checked ones); Save to Nextcloud / Add to calendar call the
 * nextcloud plugin's saveNextcloud() / nextcloudSaveICS() on the same view.
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		MENU_WIDTH = 240,
		download = att => NcModernView.downloadUrl(att.linkDownload(), att.fileName);

	NcModernView.onView('MailMessageView', view => {
		const
			closeMenu = () => view.mvAttMenu(null),

			// saveNextcloud() saves the checked attachments: check only this one for the call
			saveOne = att => {
				const before = view.mvAttAll().map(a => [a, a.checked()]);
				view.mvAttAll().forEach(a => a.checked(a === att));
				view.saveNextcloud();
				before.forEach(([a, checked]) => a.checked(checked));
			},

			startSelecting = att => {
				view.mvAttAll().forEach(a => a.checked(a === att));
				view.mvAttSelecting(true);
				view.mvAttRelayout();
			},

			ACTIONS = {
				preview: att => NcModernView.openTab(att.linkPreviewMain()),
				open: att => NcModernView.openTab(att.hasPreview() ? att.linkPreview() : att.linkDownload()),
				download: download,
				nextcloud: saveOne,
				calendar: () => view.nextcloudSaveICS(),
				select: startSelecting
			};

		view.mvAttClick = (att, event) => {
			closeMenu();
			if (view.mvAttSelecting()) {
				att.checked(!att.checked());
				return false;
			}
			if (att.hasPreview()) {
				return true; // the card link opens the preview in a new tab
			}
			event?.preventDefault();
			download(att);
			return false;
		};

		view.mvAttOpenMenu = (att, event) => {
			event?.stopPropagation();
			if (view.mvAttMenu() === att) {
				closeMenu();
				return false;
			}
			const r = event.currentTarget.getBoundingClientRect();
			view.mvAttMenuPos({
				top: Math.round(r.bottom + 4),
				left: Math.round(Math.max(8, Math.min(r.right - MENU_WIDTH, innerWidth - MENU_WIDTH - 8)))
			});
			view.mvAttMenu(att);
			return false;
		};

		view.mvAttAction = kind => {
			const att = view.mvAttMenu();
			closeMenu();
			att && ACTIONS[kind]?.(att);
			return false;
		};

		view.mvAttDownloadAll = () => {
			view.mvAttSetAllChecked(true);
			view.downloadAsZip();
			return false;
		};
		view.mvAttToggleAll = () => {
			view.mvAttSetAllChecked(!view.mvAttAllChecked());
			return false;
		};
		view.mvAttDownloadSelected = () => { view.downloadAsZip(); return false; };
		view.mvAttSaveSelected = () => { view.saveNextcloud(); return false; };
		view.mvAttCancelSelect = () => {
			view.mvAttSetAllChecked(true);
			view.mvAttSelecting(false);
			view.mvAttExpanded(false);
			view.mvAttRelayout();
			return false;
		};

		document.addEventListener('click', e => {
			view.mvAttMenu() && !e.target.closest?.('.mv-att-menu, .mv-att-dd') && closeMenu();
		});
	});

})(window.rl);

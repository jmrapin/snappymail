/**
 * Nextcloud Modern View: extra view-model logic for the replacement templates.
 * Hooks into views the same way the avatars plugin does (rl-view-model.create).
 */
(rl => {
	if (!rl) {
		return;
	}


	const
		getEl = id => document.getElementById(id),

		// "Jean-Michel Rapin" -> "JR", "jm@rapin.com.au" -> "JM"
		initials = name => {
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

	/**
	 * Step 4: compact account switcher - initials in a pill instead of the full address.
	 * The address stays in the tooltip (title) of the toggle.
	 */
	const systemDropDown = getEl('SystemDropDown');
	const toggle = systemDropDown?.content.querySelector('#top-system-dropdown-id');
	if (toggle) {
		toggle.setAttribute('data-bind', 'attr: { title: accountEmail }');
		toggle.prepend(Element.fromHTML('<span class="mv-initials" data-bind="text: mvInitials"></span>'));
		toggle.append(Element.fromHTML('<i class="mi mi-arrow-drop-down"></i>'));
	}

	/**
	 * Step 5: sender verification shield.
	 * green  = SPF, DKIM and DMARC pass
	 * yellow = SPF and DKIM pass, no DMARC result (DMARC is nice to have)
	 * red    = SPF or DKIM missing / failed, or DMARC failed
	 * Hidden when there are no results at all on a locally delivered or unsent message
	 * (drafts, sent copies, internal mail without checks), where a red shield would mislead.
	 * Each *Data observable is [status, domain, raw header text] (core MessageView.js).
	 */
	const
		t = key => rl.i18n('MODERN_VIEW/' + key),
		authRow = (name, data) => {
			const status = (data?.[0] || 'none').toLowerCase(),
				pass = 'pass' === status,
				none = 'none' === status;
			return {
				name: name,
				status: status,
				mark: pass ? '✔' : (none ? '–' : '✖'),
				cls: pass ? 'mv-y' : (none ? 'mv-w' : 'mv-n'),
				why: status + (data?.[1] ? ' (' + data[1] + ')' : ''),
				title: data?.[2] || ''
			};
		},
		authStatus = view => {
			const rows = [
					authRow('SPF', view.spfData()),
					authRow('DKIM', view.dkimData()),
					authRow('DMARC', view.dmarcData())
				],
				[spf, dkim, dmarc] = rows.map(r => r.status),
				local = !!view.localDelivery(),
				allNone = rows.every(r => 'none' === r.status),
				level = ('pass' !== spf || 'pass' !== dkim || ('pass' !== dmarc && 'none' !== dmarc))
					? 'bad'
					: ('none' === dmarc ? 'warn' : 'ok');
			// The Sent folder holds your own mail: no shield there at all.
			// (SentFolder is the setting at page load; a change applies after a reload.)
			const sentFolder = rl.settings.get('SentFolder'),
				inSent = !!sentFolder && view.message()?.folder === sentFolder;
			return {
				show: !inSent && !(allNone && (local || view.isDraftFolder())),
				local: local,
				level: 'mv-' + level,
				icon: { ok: 'mi-verified-user', warn: 'mi-gpp-maybe', bad: 'mi-gpp-bad' }[level],
				head: t({ ok: 'SENDER_VERIFIED', warn: 'SENDER_NO_DMARC', bad: 'SENDER_NOT_VERIFIED' }[level]),
				rows: rows
			};
		};

	/**
	 * Step 6: attachments.
	 * Collapsed: one line of cards; the ones that don't fit are hidden behind "Show all (N)".
	 * Expanded / selecting: two rows (first half, rest) that scroll sideways together.
	 * Uses core's attachment model (checked(), linkPreviewMain(), linkDownload(), ...) and core's
	 * downloadAsZip() (downloads the checked ones); Save to Nextcloud / Add to calendar call the
	 * nextcloud plugin's saveNextcloud() / nextcloudSaveICS() on the same view.
	 */
	const
		EXT_CLASS = {
			pdf: 'pdf',
			doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', txt: 'doc', md: 'doc',
			xls: 'xls', xlsx: 'xls', ods: 'xls', csv: 'xls',
			ppt: 'ppt', pptx: 'ppt', odp: 'ppt',
			zip: 'zip', rar: 'zip', '7z': 'zip', gz: 'zip', tar: 'zip', tgz: 'zip',
			ics: 'ics', vcs: 'ics', vcf: 'ics',
			eml: 'eml', msg: 'eml',
			jpg: 'img', jpeg: 'img', png: 'img', gif: 'img', webp: 'img', heic: 'img', bmp: 'img', svg: 'img', tif: 'img', tiff: 'img'
		},
		friendlySize = bytes => {
			const units = ['B', 'KiB', 'MiB', 'GiB'];
			let i = 0;
			while (bytes >= 1024 && i < units.length - 1) {
				bytes /= 1024;
				++i;
			}
			return (i ? bytes.toFixed(1) : bytes) + ' ' + units[i];
		},
		downloadFile = att => {
			const a = document.createElement('a');
			a.href = att.linkDownload();
			a.download = att.fileName || '';
			a.rel = 'noopener';
			document.body.append(a);
			a.click();
			a.remove();
		},
		openTab = url => url && window.open(url, '_blank', 'noopener'),

		initAttachments = view => {
			const
				all = () => ko.unwrap(view.message()?.attachments) || [],
				list = () => view.listAttachments() || [],
				setAllChecked = value => all().forEach(a => a.checked(value)),
				listEl = () => document.querySelector('#V-MailMessageView .mv-att-list'),
				closeMenu = () => view.mvAttMenu(null);

			view.mvAttExpanded = ko.observable(false);
			view.mvAttSelecting = ko.observable(false);
			view.mvAttFit = ko.observable(1000);
			view.mvAttMenu = ko.observable(null);
			view.mvAttMenuPos = ko.observable({ top: 0, left: 0 });
			view.mvHasNextcloud = ko.pureComputed(() => 'function' === typeof view.saveNextcloud);

			view.mvAttRows = ko.computed(() => {
				const items = list();
				items.forEach((a, i) => a.mvIndex = i);
				if ((view.mvAttExpanded() || view.mvAttSelecting()) && items.length > 1) {
					const half = Math.ceil(items.length / 2);
					return [items.slice(0, half), items.slice(half)];
				}
				return [items];
			});

			view.mvAttExt = att => (att.fileNameExt || '').toUpperCase().slice(0, 4) || 'FILE';
			view.mvAttIconClass = att => (att.hasThumbnail() ? 'mv-thumb ' : '')
				+ 'mv-ic-' + (EXT_CLASS[(att.fileNameExt || '').toLowerCase()] || 'gen');

			view.mvAttShowAllText = ko.pureComputed(() => view.mvT('MODERN_VIEW/SHOW_ALL', { N: list().length }));
			view.mvAttSummary = ko.pureComputed(() => view.mvT('MODERN_VIEW/ATTACHMENTS_SUMMARY', {
				N: list().length,
				SIZE: friendlySize(list().reduce((t, a) => t + (a.estimatedSize || 0), 0))
			}));
			view.mvAttSelectedCount = ko.pureComputed(() => list().filter(a => a.checked()).length);
			view.mvAttAllChecked = ko.pureComputed(() => list().length && list().every(a => a.checked()));
			view.mvAttSelectedText = ko.pureComputed(() => view.mvT('MODERN_VIEW/N_OF_M_SELECTED', {
				N: view.mvAttSelectedCount(),
				M: list().length
			}));
			view.mvAttMenuIsIcs = ko.pureComputed(() => {
				const att = view.mvAttMenu();
				return !!att && 'function' === typeof view.nextcloudSaveICS && !!ko.unwrap(view.nextcloudICS)
					&& ('text/calendar' === att.mimeType || 'ics' === (att.fileNameExt || '').toLowerCase());
			});

			// How many cards fit on the collapsed line (the rest go behind "Show all")
			const fit = () => {
				const el = listEl();
				if (!el || view.mvAttExpanded() || view.mvAttSelecting()) {
					return;
				}
				view.mvAttFit(1000);
				requestAnimationFrame(() => {
					const cards = [...el.querySelectorAll('.mv-att')];
					if (!cards.length) {
						return;
					}
					const gap = 8, chip = 130,
						total = cards.reduce((t, c) => t + c.offsetWidth + gap, -gap),
						avail = el.clientWidth;
					if (total <= avail) {
						view.mvAttFit(cards.length);
						return;
					}
					let used = 0, n = 0;
					for (const c of cards) {
						if (used + c.offsetWidth + (n ? gap : 0) > avail - chip) {
							break;
						}
						used += c.offsetWidth + (n ? gap : 0);
						++n;
					}
					view.mvAttFit(Math.max(1, n));
				});
			};
			const fade = () => {
				const el = listEl();
				if (el) {
					const scrolling = view.mvAttExpanded() || view.mvAttSelecting();
					el.classList.toggle('mv-fade-r', scrolling && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
					el.classList.toggle('mv-fade-l', scrolling && el.scrollLeft > 2);
				}
			};
			const relayout = () => setTimeout(() => { fit(); fade(); }, 0);

			view.mvAttScrolled = () => { fade(); return true; };
			view.mvAttExpand = () => { view.mvAttExpanded(true); relayout(); return false; };
			view.mvAttCollapse = () => { view.mvAttExpanded(false); relayout(); return false; };

			view.mvAttDownloadAll = () => {
				setAllChecked(true);
				view.downloadAsZip();
				return false;
			};

			view.mvAttClick = (att, event) => {
				closeMenu();
				if (view.mvAttSelecting()) {
					att.checked(!att.checked());
					return false;
				}
				if (att.hasPreview()) {
					return true; // the link opens the preview in a new tab
				}
				event?.preventDefault();
				downloadFile(att);
				return false;
			};

			view.mvAttOpenMenu = (att, event) => {
				event?.stopPropagation();
				if (view.mvAttMenu() === att) {
					closeMenu();
					return false;
				}
				const r = event.currentTarget.getBoundingClientRect(), width = 240;
				view.mvAttMenuPos({
					top: Math.round(r.bottom + 4),
					left: Math.round(Math.max(8, Math.min(r.right - width, innerWidth - width - 8)))
				});
				view.mvAttMenu(att);
				return false;
			};

			view.mvAttAction = kind => {
				const att = view.mvAttMenu();
				closeMenu();
				if (!att) {
					return false;
				}
				switch (kind) {
					case 'preview':
						openTab(att.linkPreviewMain());
						break;
					case 'open':
						openTab(att.hasPreview() ? att.linkPreview() : att.linkDownload());
						break;
					case 'download':
						downloadFile(att);
						break;
					case 'nextcloud': {
						// saveNextcloud() saves the checked attachments: check only this one for the call
						const before = all().map(a => [a, a.checked()]);
						all().forEach(a => a.checked(a === att));
						view.saveNextcloud();
						before.forEach(([a, c]) => a.checked(c));
						break;
					}
					case 'calendar':
						view.nextcloudSaveICS();
						break;
					case 'select':
						all().forEach(a => a.checked(a === att));
						view.mvAttSelecting(true);
						relayout();
						break;
				}
				return false;
			};

			view.mvAttToggleAll = () => {
				setAllChecked(!view.mvAttAllChecked());
				return false;
			};
			view.mvAttDownloadSelected = () => { view.downloadAsZip(); return false; };
			view.mvAttSaveSelected = () => { view.saveNextcloud(); return false; };
			view.mvAttCancelSelect = () => {
				setAllChecked(true);
				view.mvAttSelecting(false);
				view.mvAttExpanded(false);
				relayout();
				return false;
			};

			// New message: start collapsed, nothing selected-only, menu closed
			view.message.subscribe(() => {
				closeMenu();
				view.mvAttSelecting(false);
				view.mvAttExpanded(false);
				relayout();
			});
			view.listAttachments.subscribe(relayout);
			addEventListener('resize', relayout);
			document.addEventListener('click', e => {
				view.mvAttMenu() && !e.target.closest?.('.mv-att-menu, .mv-att-dd') && closeMenu();
			});
		};

	addEventListener('rl-view-model.create', e => {
		const view = e.detail;
		if ('MailMessageView' === view.viewModelTemplateID) {
			const from = () => view.message()?.from?.[0];
			// translate from the template: globals like rl are not reachable inside bindings
			view.mvT = (key, values) => rl.i18n(key, values);
			view.mvFromName = ko.computed(() => from()?.name || from()?.email || '');
			view.mvFromAddr = ko.computed(() => from()?.name && from()?.email ? '<' + from().email + '>' : '');
			view.mvAuth = ko.computed(() => authStatus(view));
			initAttachments(view);
		}
		if ('SystemDropDown' === view.viewModelTemplateID) {
			// accountName() is a method that reads observables, so the computed tracks them
			view.mvInitials = ko.computed(() => initials(
				('function' === typeof view.accountName ? view.accountName() : '')
				|| ko.unwrap(view.accountEmail)
			));
		}
	});

})(window.rl);

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

	addEventListener('rl-view-model.create', e => {
		const view = e.detail;
		if ('MailMessageView' === view.viewModelTemplateID) {
			const from = () => view.message()?.from?.[0];
			view.mvFromName = ko.computed(() => from()?.name || from()?.email || '');
			view.mvFromAddr = ko.computed(() => from()?.name && from()?.email ? '<' + from().email + '>' : '');
			view.mvAuth = ko.computed(() => authStatus(view));
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

/**
 * Nextcloud Modern View: sender verification shield (step 5).
 *
 * green  = SPF, DKIM and DMARC pass
 * yellow = SPF and DKIM pass, no DMARC result (DMARC is nice to have)
 * red    = SPF or DKIM missing / failed, or DMARC failed
 * Hidden in the Sent folder, and when there are no results at all on drafts or locally delivered
 * mail, where a red shield would mislead.
 * Each *Data observable on core's view is [status, domain, raw header text].
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		LEVEL = {
			ok:   { icon: 'mi-verified-user', head: 'SENDER_VERIFIED' },
			warn: { icon: 'mi-gpp-maybe',     head: 'SENDER_NO_DMARC' },
			bad:  { icon: 'mi-gpp-bad',       head: 'SENDER_NOT_VERIFIED' }
		},

		row = (name, data) => {
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

		level = (spf, dkim, dmarc) => {
			if ('pass' !== spf || 'pass' !== dkim || ('pass' !== dmarc && 'none' !== dmarc)) {
				return 'bad';
			}
			return 'none' === dmarc ? 'warn' : 'ok';
		},

		// The Sent folder holds your own mail. SentFolder is the setting at page load.
		inSentFolder = view => {
			const sent = rl.settings.get('SentFolder');
			return !!sent && view.message()?.folder === sent;
		},

		status = view => {
			const rows = [
					row('SPF', view.spfData()),
					row('DKIM', view.dkimData()),
					row('DMARC', view.dmarcData())
				],
				lvl = level(...rows.map(r => r.status)),
				local = !!view.localDelivery(),
				noResults = rows.every(r => 'none' === r.status);
			return {
				show: !inSentFolder(view) && !(noResults && (local || view.isDraftFolder())),
				local: local,
				level: 'mv-' + lvl,
				icon: LEVEL[lvl].icon,
				head: NcModernView.t(LEVEL[lvl].head),
				rows: rows
			};
		};

	NcModernView.onView('MailMessageView', view => {
		view.mvAuth = ko.computed(() => status(view));
	});

})(window.rl);

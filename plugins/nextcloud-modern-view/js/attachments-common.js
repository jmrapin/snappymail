/**
 * Nextcloud Modern View: attachment card helpers shared by the reading pane (attachments.js,
 * attachments-layout.js) and the compose window (compose-attachments*.js), so both show the
 * same file-type icons and fit their one line of cards the same way.
 */
(rl => {
	if (!rl) {
		return;
	}

	const EXT_CLASS = {
		pdf: 'pdf',
		doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', txt: 'doc', md: 'doc',
		xls: 'xls', xlsx: 'xls', ods: 'xls', csv: 'xls',
		ppt: 'ppt', pptx: 'ppt', odp: 'ppt',
		zip: 'zip', rar: 'zip', '7z': 'zip', gz: 'zip', tar: 'zip', tgz: 'zip',
		ics: 'ics', vcs: 'ics', vcf: 'ics',
		eml: 'eml', msg: 'eml',
		jpg: 'img', jpeg: 'img', png: 'img', gif: 'img', webp: 'img', heic: 'img',
		bmp: 'img', svg: 'img', tif: 'img', tiff: 'img'
	};

	NcModernView.att = {
		GAP: 8,    // px between cards (css/attachments.css .mv-att-line gap)
		CHIP: 130, // px kept free for the "Show all (N)" chip

		// coloured file-type square: css/attachments.css .mv-ic-*
		iconClass: ext => 'mv-ic-' + (EXT_CLASS[String(ext || '').toLowerCase()] || 'gen'),
		// the text in that square: "PDF", "DOCX", …
		extLabel: ext => String(ext || '').toUpperCase().slice(0, 4) || 'FILE',

		// largest number of cards (at least 1) that fits in avail px, keeping room for the chip
		fitCount: (cards, avail) => {
			const { GAP, CHIP } = NcModernView.att,
				widths = cards.map(c => c.offsetWidth),
				total = widths.reduce((t, w) => t + w + GAP, -GAP);
			if (total <= avail) {
				return cards.length;
			}
			let used = 0, n = 0;
			for (const w of widths) {
				const next = used + w + (n ? GAP : 0);
				if (next > avail - CHIP) {
					break;
				}
				used = next;
				++n;
			}
			return Math.max(1, n);
		}
	};

})(window.rl);

/**
 * Nextcloud Modern View: attachments layout (step 6).
 * How many cards fit on the collapsed line, Show all / Show less, and the edge fades while the
 * two expanded rows scroll sideways. Needs the state from attachments.js.
 */
(rl => {
	if (!rl) {
		return;
	}

	const
		GAP = 8,      // px between cards (css/attachments.css .mv-att-line gap)
		CHIP = 130,   // px reserved for the "Show all (N)" chip
		listEl = () => document.querySelector('#V-MailMessageView .mv-att-list'),

		// largest number of cards (at least 1) that fits in avail px, keeping room for the chip
		countFitting = (cards, avail) => {
			const widths = cards.map(c => c.offsetWidth),
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
		};

	NcModernView.onView('MailMessageView', view => {
		const
			scrolling = () => view.mvAttExpanded() || view.mvAttSelecting(),

			fit = () => {
				const el = listEl();
				if (!el || scrolling()) {
					return;
				}
				view.mvAttFit(1000); // show all to measure, then hide what doesn't fit
				requestAnimationFrame(() => {
					const cards = [...el.querySelectorAll('.mv-att')];
					cards.length && view.mvAttFit(countFitting(cards, el.clientWidth));
				});
			},

			fade = () => {
				const el = listEl();
				if (el) {
					el.classList.toggle('mv-fade-r', scrolling() && el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
					el.classList.toggle('mv-fade-l', scrolling() && el.scrollLeft > 2);
				}
			};

		view.mvAttRelayout = () => setTimeout(() => { fit(); fade(); }, 0);
		view.mvAttScrolled = () => { fade(); return true; };
		view.mvAttExpand = () => { view.mvAttExpanded(true); view.mvAttRelayout(); return false; };
		view.mvAttCollapse = () => { view.mvAttExpanded(false); view.mvAttRelayout(); return false; };

		// A new message starts collapsed and out of selection mode
		view.message.subscribe(() => {
			view.mvAttMenu(null);
			view.mvAttSelecting(false);
			view.mvAttExpanded(false);
			view.mvAttRelayout();
		});
		view.listAttachments.subscribe(view.mvAttRelayout);
		addEventListener('resize', view.mvAttRelayout);
	});

})(window.rl);

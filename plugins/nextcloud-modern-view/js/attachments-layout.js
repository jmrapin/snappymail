/**
 * Nextcloud Modern View: attachments layout.
 * How many cards fit on the collapsed line, Show all / Show less, and the edge fades while the
 * two expanded rows scroll sideways. Needs the state from attachments.js.
 */
(rl => {
	if (!rl) {
		return;
	}

	const listEl = () => document.querySelector('#V-MailMessageView .mv-att-list');

	NcModernView.onView('MailMessageView', view => {
		const
			scrolling = () => view.mvAttExpanded() || view.mvAttSelecting(),

			fit = () => {
				const el = listEl();
				// still hidden (message loading): the ResizeObserver below runs fit again once it shows
				if (!el?.clientWidth || scrolling()) {
					return;
				}
				view.mvAttFit(1000); // show all to measure, then hide what doesn't fit
				requestAnimationFrame(() => {
					const cards = [...el.querySelectorAll('.mv-att')];
					cards.length && view.mvAttFit(NcModernView.att.fitCount(cards, el.clientWidth));
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

		// The list is inside "if: message", so each message gets a new element (initDom hands it
		// over). When a message opens, the list is often still hidden or empty and every card
		// measures 0px, so it is fitted again whenever it gets its real size.
		const resized = new ResizeObserver(() => view.mvAttRelayout());
		view.mvAttListInit = el => {
			resized.disconnect();
			el && resized.observe(el);
		};
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

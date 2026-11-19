/**
 * Nextcloud Modern View: compose attachments on one line, the rest behind "Show all (N)", like the
 * reading pane (attachments-layout.js; the fitting itself is shared in attachments-common.js).
 * Expanded, the cards wrap onto as many lines as they need.
 */
(rl => {
	if (!rl) {
		return;
	}

	NcModernView.onView('PopupsCompose', view => {
		let listEl = null;

		view.mvCpAttExpanded = ko.observable(false);
		view.mvCpAttFit = ko.observable(1000);
		// "Show all (N)" chip: only while collapsed and some cards don't fit
		view.mvCpAttShowChip = NcModernView.computed('mvCpAttShowChip',
			() => !view.mvCpAttExpanded() && view.mvCpAttFit() < (view.attachments?.() || []).length, false);

		const fit = () => {
			// hidden (window closed) or expanded: nothing to fit; the observer runs again on show
			if (!listEl?.clientWidth || view.mvCpAttExpanded()) {
				return;
			}
			view.mvCpAttFit(1000); // show all to measure, then hide what doesn't fit
			requestAnimationFrame(() => {
				const cards = [...listEl.querySelectorAll('.mv-att')];
				cards.length && view.mvCpAttFit(NcModernView.att.fitCount(cards, listEl.clientWidth));
			});
		};
		// batched: an upload's progress changes many times a second
		let timer = 0;
		const relayout = () => {
			clearTimeout(timer);
			timer = setTimeout(fit, 60);
		};

		const resized = new ResizeObserver(relayout);
		view.mvCpAttListInit = el => {
			listEl = el;
			resized.disconnect();
			el && resized.observe(el);
		};
		view.mvCpAttExpand = () => { view.mvCpAttExpanded(true); return false; };
		view.mvCpAttCollapse = () => { view.mvCpAttExpanded(false); relayout(); return false; };

		// none left: start collapsed next time
		view.attachments?.subscribe?.(items => items.length || view.mvCpAttExpanded(false));

		// A card's width changes after it is added (waiting → "45%" → final size, or an error, or
		// the name the server returns), so the line is fitted again on any of those, not only when
		// the window is resized
		NcModernView.computed('mvCpAttWatch', () => {
			(view.attachments?.() || []).forEach(a => {
				a.fileName?.();
				a.size?.();
				a.error?.();
				a.waiting?.();
				a.uploading?.();
				a.progress?.();
			});
			relayout();
		}, null);
	});

})(window.rl);

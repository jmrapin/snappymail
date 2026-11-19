/**
 * Nextcloud Modern View: toolbars that don't fit move buttons into their ☰ menu.
 *
 * Buttons with data-mv-ovf="N" may overflow; the highest N goes first. Whenever the toolbar
 * resizes or knockout shows/hides something in it, all of them are put back and then hidden one
 * by one until the last item ends before the toolbar's right padding (which keeps room for the
 * account pill). This runs in the ResizeObserver callback, before paint, so nothing flickers.
 *
 * Hidden buttons get an entry at the top of the ☰ menu (.mv-ovf-menu) that clicks the real
 * (hidden) element, so knockout's bindings and enabled state still apply. A button with
 * data-mv-sub="#menu" (a ▾ split button) brings that menu's items instead.
 * Message list toolbar: core's ☰ menu already has Move / Archive / Spam / Delete, so no entries.
 */
(rl => {
	if (!rl) {
		return;
	}

	const HIDDEN = 'mv-ovf-hidden';

	const overflows = bar => {
		const limit = bar.getBoundingClientRect().right - parseFloat(getComputedStyle(bar).paddingRight);
		return [...bar.children].some(child => child.offsetWidth && child.getBoundingClientRect().right > limit + .5);
	};

	// one ☰ entry that clicks "target"; icon and text copied from "source"
	const entry = (source, target, text) => {
		const li = Element.fromHTML('<li role="presentation"><a href="#" tabindex="-1"><span></span></a></li>'),
			a = li.firstElementChild,
			icon = source.querySelector('.mi');
		icon && a.prepend(icon.cloneNode(true));
		a.lastElementChild.textContent = text;
		// the menu closes itself on any click (bootstrap.native dismissHandler)
		a.addEventListener('click', e => {
			e.preventDefault();
			target.classList.contains('disabled') || target.click();
		});
		li.mvButton = target;
		return li;
	};

	// the visible items of a ▾ menu, as ☰ entries (built when shown, so tag ticks are current)
	const subItems = sub => [...sub.querySelectorAll('li')]
		.filter(li => 'none' !== li.style.display)
		.map(li => li.querySelector('a'))
		.filter(Boolean)
		.map(a => {
			const li = entry(a, a, a.textContent.trim());
			li.classList.toggle('disabled', a.classList.contains('disabled'));
			return li;
		});

	// a ▾ menu becomes one ☰ row with a side panel (like Outlook's overflow), so a long tag list
	// doesn't stretch ☰. The ☰ menu scrolls, which would clip a nested panel: it is fixed instead.
	const subEntry = (button, sub) => {
		const li = entry(button, button, button.title || button.textContent.trim()),
			a = li.firstElementChild,
			panel = Element.fromHTML('<menu class="dropdown-menu mv-menu mv-ovf-sub" role="menu"></menu>'),
			show = on => {
				if (on) {
					panel.replaceChildren(...subItems(sub));
					panel.classList.add('show');
					const r = li.getBoundingClientRect(), w = panel.offsetWidth, h = panel.offsetHeight;
					// opens to the left of ☰ (which sits at the right edge), else to its right
					// overlapping the row by 2px, so the mouse never leaves it on the way to the panel
					panel.style.left = (r.left - w + 2 >= 8 ? r.left - w + 2 : Math.min(r.right - 2, innerWidth - w - 8)) + 'px';
					panel.style.top = Math.max(8, Math.min(r.top, innerHeight - h - 8)) + 'px';
				} else {
					panel.classList.remove('show');
				}
			};
		li.classList.add('mv-ovf-has-sub');
		// usable while either the button or its ▾ caret is
		const caret = document.getElementById(sub.getAttribute('aria-labelledby'));
		li.mvDisabled = () => button.classList.contains('disabled') && (!caret || caret.classList.contains('disabled'));
		a.append(Element.fromHTML('<i class="mi mi-chevron-right mv-ovf-chevron"></i>'));
		li.append(panel);
		li.addEventListener('mouseenter', () => show(true));
		li.addEventListener('mouseleave', () => show(false));
		// a dropdown-only button (Tags) and the chevron open the panel; on a split button the row
		// itself still runs the main action (Delete, Forward, …). Stopping the click keeps ☰ open.
		a.addEventListener('click', e => {
			if (button.classList.contains('dropdown-toggle') || e.target.closest('.mv-ovf-chevron')) {
				e.preventDefault();
				e.stopImmediatePropagation();
				e.stopPropagation();
				// open, never toggle: a tap or a hover already fired mouseenter, which opened it
				show(true);
			}
		}, true);
		return li;
	};

	const entries = (button, bar) => {
		const sub = button.dataset.mvSub && bar.querySelector(button.dataset.mvSub);
		return [sub ? subEntry(button, sub) : entry(button, button, button.title || button.textContent.trim())];
	};

	// returns the buttons it hid, in toolbar order
	const fit = bar => {
		const items = [...bar.querySelectorAll('[data-mv-ovf]')],
			seps = [...bar.querySelectorAll('.mv-sep')];
		[...items, ...seps].forEach(el => el.classList.remove(HIDDEN));

		const queue = items.filter(el => el.offsetWidth).sort((a, b) => b.dataset.mvOvf - a.dataset.mvOvf);
		while (queue.length && overflows(bar)) {
			queue.shift().classList.add(HIDDEN);
		}
		// a separator followed by nothing visible up to the next separator / spacer
		seps.forEach(sep => {
			let next = sep.nextElementSibling;
			while (next && !next.offsetWidth && !next.matches('.mv-sep, .mv-spacer')) {
				next = next.nextElementSibling;
			}
			(!next || next.matches('.mv-sep, .mv-spacer')) && sep.classList.add(HIDDEN);
		});

		return items.filter(el => el.classList.contains(HIDDEN));
	};

	/**
	 * Keeps "bar" fitting; hidden buttons are listed at the top of its ☰ menu
	 * (the .mv-ovf-menu inside the .mv-more dropdown), if it has one.
	 */
	NcModernView.watchOverflow = bar => {
		const section = bar.querySelector('.mv-more .mv-ovf-menu'),
			toggle = bar.querySelector('.mv-more .dropdown-toggle');
		let queued = false;
		const run = NcModernView.safe('overflow', () => {
			queued = false;
			const hidden = fit(bar);
			section?.replaceChildren(...hidden.flatMap(button => entries(button, bar)));
		});
		new ResizeObserver(run).observe(bar);
		// knockout's visible binding writes style="display: none"; our own hiding only uses a class
		new MutationObserver(() => queued || (queued = true, queueMicrotask(run)))
			.observe(bar, { attributes: true, attributeFilter: ['style'], subtree: true });
		// copy the enabled state when the menu opens
		toggle?.addEventListener('click', () => section?.querySelectorAll('li').forEach(li =>
			li.classList.toggle('disabled', li.mvDisabled ? li.mvDisabled() : li.mvButton.classList.contains('disabled'))));
	};

	NcModernView.onBuild('MailMessageView', (view, dom) => {
		const bar = dom?.querySelector('.mv-toolbar');
		bar && NcModernView.watchOverflow(bar);
	});

	NcModernView.onBuild('MailMessageList', (view, dom) => {
		const bar = dom?.querySelector('.mv-list-toolbar');
		bar && NcModernView.watchOverflow(bar);
	});

})(window.rl);

/**
 * Nextcloud Modern View: text and highlight colour palettes for the HTML editor.
 *
 * Core opens the browser's own colour input (with 10 chart colours) and only applies a colour
 * when that picker reports a change, so it's unclear how to commit one. Here the two toolbar
 * buttons open a palette like Outlook's: Automatic / No colour, a grid of colours applied on
 * one click, and "More colours…" for the browser picker. The palette keeps the editor's
 * selection (mousedown is cancelled), so the colour goes on the selected text.
 */
(rl => {
	if (!rl) {
		return;
	}

	const GRID = [
		['#000000', '#434343', '#666666', '#999999', '#b7b7b7', '#cccccc', '#d9d9d9', '#efefef', '#f3f3f3', '#ffffff'],
		['#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#4a86e8', '#0000ff', '#9900ff', '#ff00ff'],
		['#e6b8af', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#c9daf8', '#cfe2f3', '#d9d2e9', '#ead1dc'],
		['#dd7e6b', '#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#a4c2f4', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
		['#cc4125', '#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6d9eeb', '#6fa8dc', '#8e7cc3', '#c27ba0'],
		['#a61c00', '#cc0000', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3c78d8', '#3d85c6', '#674ea7', '#a64d79'],
		['#85200c', '#990000', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#1155cc', '#0b5394', '#351c75', '#741b47']
	];
	let menu, grid, more, current;

	// "Automatic" / "No colour": take the colour off the spans in and around the selection (a
	// transparent span inside a coloured one would still show the outer colour)
	const reset = ({ ui, style }) => {
		const sq = ui.squire, range = sq?.getSelection(), root = sq?.getRoot();
		if (!range || !root) {
			return;
		}
		sq.saveUndoState(range);
		let node = range.commonAncestorContainer;
		node = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
		const spans = new Set([...node.querySelectorAll('span')].filter(span => range.intersectsNode(span)));
		for (let el = node; el && el !== root; el = el.parentElement) {
			'SPAN' === el.nodeName && spans.add(el);
		}
		spans.forEach(span => {
			span.style[style] = '';
			span.getAttribute('style') || span.removeAttribute('style');
		});
		sq.setSelection(range);
		sq._docWasChanged?.();
		sq.focus();
	};

	const close = () => {
		menu?.classList.remove('show');
		current = null;
	};

	const apply = value => {
		const target = current;
		close();
		target?.ui.squire?.setStyle({ [target.style]: value });
	};

	const build = () => {
		menu = Element.fromHTML(`<div class="mv-colors" role="menu">
			<button type="button" class="mv-colors-reset"><span class="mv-colors-none"></span><span></span></button>
			<div class="mv-colors-grid"></div>
			<label class="mv-colors-more"><input type="color"><span></span></label>
		</div>`);
		grid = menu.querySelector('.mv-colors-grid');
		more = menu.querySelector('input');
		GRID.flat().forEach(hex => {
			const b = Element.fromHTML(`<button type="button" class="mv-colors-swatch" title="${hex}"></button>`);
			b.style.background = hex;
			b.dataset.color = hex;
			grid.append(b);
		});
		menu.querySelector('.mv-colors-more span').textContent = NcModernView.t('COLOR_MORE');
		// keep the editor's selection: clicks in the palette must not take the focus
		menu.addEventListener('mousedown', e => e.target === more || e.preventDefault());
		menu.addEventListener('click', e => {
			const swatch = e.target.closest('[data-color]');
			swatch && apply(swatch.dataset.color);
			if (e.target.closest('.mv-colors-reset') && current) {
				const target = current;
				close();
				reset(target);
			}
		});
		// the browser picker reports its choice when it closes
		more.addEventListener('change', () => apply(more.value));
		document.addEventListener('mousedown', e => menu.contains(e.target)
			|| e.target.closest?.('[data-action="textColor"],[data-action="backgroundColor"]') || close());
		document.addEventListener('keydown', e => 'Escape' === e.key && menu.classList.contains('show') && close(), true);
		addEventListener('resize', close);
		document.body.append(menu);
	};

	const open = (ui, style, button) => {
		menu || build();
		if (current?.button === button) {
			close();
			return;
		}
		current = { ui, style, button };
		menu.querySelector('.mv-colors-reset span:last-child').textContent =
			NcModernView.t('color' === style ? 'COLOR_AUTO' : 'COLOR_NONE');
		// the compose window is a modal <dialog> (browser top layer): anything outside it is drawn
		// behind it, so the palette goes inside and is placed relative to it
		const host = button.closest('dialog') || document.body,
			r = button.getBoundingClientRect(),
			h = host === document.body ? { top: 0, left: 0, width: innerWidth } : host.getBoundingClientRect();
		host.append(menu);
		menu.style.position = host === document.body ? 'fixed' : 'absolute';
		menu.classList.add('show');
		menu.style.top = Math.round(r.bottom - h.top + 4) + 'px';
		menu.style.left = Math.round(Math.max(8, Math.min(r.left - h.left, h.width - menu.offsetWidth - 8))) + 'px';
	};

	// core builds each button's click as () => cfg.cmd(button), so replacing cmd here is enough
	addEventListener('squire-toolbar', e => {
		try {
			const ui = e.detail?.squire, colors = e.detail?.actions?.colors;
			colors?.textColor && (colors.textColor.cmd = button => open(ui, 'color', button));
			colors?.backgroundColor && (colors.backgroundColor.cmd = button => open(ui, 'backgroundColor', button));
		} catch (err) {
			console.error('[modern-view] colour palette:', err);
		}
	});

})(window.rl);

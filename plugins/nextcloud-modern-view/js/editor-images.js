/**
 * Nextcloud Modern View: select an image in the HTML editor and size it, like Gmail.
 *
 * Clicking an image frames it (a thin border with four corner grab handles: drag one to resize,
 * keeping the proportions) and shows a bar: Small · Medium · Large · Best fit · Original size ·
 * Delete. The image is also selected in the editor, so Delete / Backspace remove it too.
 * Sizes are a width in px with max-width:100%. Best fit (Gmail's default) is the message width,
 * but never larger than the image itself: width:100% with max-width = its own width. Core already
 * pastes clipboard images that way (SquireUI.js); images dropped in as files or added by URL go
 * through Squire's insertImage() with no size at all, so those get Best fit here too (only those:
 * images in a quoted reply keep the size they had).
 * Nothing is added to the image's HTML except that style: the frame and the bar are separate
 * elements, inside the compose <dialog> (the browser draws a modal dialog above everything
 * outside it).
 */
(rl => {
	if (!rl) {
		return;
	}

	const FIT = -1, // Best fit: not a width, see bestFit()
		SIZES = [['IMG_SMALL', 200], ['IMG_MEDIUM', 400], ['IMG_LARGE', 640], ['IMG_FIT', FIT], ['IMG_ORIGINAL', 0]],
		t = key => NcModernView.t(key);

	// the message width, but never wider than the image itself
	const bestFit = img => {
		img.removeAttribute('width');
		img.removeAttribute('height');
		img.style.width = '100%';
		img.style.height = 'auto';
		img.style.maxWidth = img.naturalWidth ? img.naturalWidth + 'px' : '100%';
	};
	const isBestFit = img => '100%' === img.style.width;

	let frame, bar, current; // current: { img, sq }

	const hide = () => {
		frame?.classList.remove('show');
		bar?.classList.remove('show');
		current = null;
	};

	const changed = (sq, fn) => {
		sq.saveUndoState();
		fn();
		sq._docWasChanged?.();
	};

	const setWidth = width => {
		const { img, sq } = current;
		changed(sq, () => {
			if (FIT === width) {
				bestFit(img);
				return;
			}
			img.removeAttribute('width');
			img.removeAttribute('height');
			img.style.width = (width || img.naturalWidth) + 'px';
			img.style.height = 'auto';
			img.style.maxWidth = '100%';
		});
		place();
		requestAnimationFrame(place); // again once the new size is laid out
	};

	// drag a corner: the width follows the pointer (left corners mirrored), height keeps the ratio
	const drag = (e, dir) => {
		if (!current) {
			return;
		}
		e.preventDefault();
		e.stopPropagation();
		const { img, sq } = current, startX = e.clientX, startW = img.getBoundingClientRect().width,
			maxW = img.parentElement?.clientWidth || startW, grip = e.target;
		sq.saveUndoState();
		grip.setPointerCapture?.(e.pointerId);
		const move = ev => {
			const width = Math.round(Math.max(24, Math.min(maxW, startW + dir * (ev.clientX - startX))));
			img.removeAttribute('width');
			img.removeAttribute('height');
			Object.assign(img.style, { width: width + 'px', height: 'auto', maxWidth: '100%' });
			place();
		};
		const up = () => {
			grip.removeEventListener('pointermove', move);
			grip.removeEventListener('pointerup', up);
			grip.removeEventListener('pointercancel', up);
			sq._docWasChanged?.();
		};
		grip.addEventListener('pointermove', move);
		grip.addEventListener('pointerup', up);
		grip.addEventListener('pointercancel', up);
	};

	const remove = () => {
		const { img, sq } = current;
		hide();
		changed(sq, () => img.remove());
		sq.focus();
	};

	const build = () => {
		frame = Element.fromHTML('<div class="mv-img-frame"></div>');
		['nw', 'ne', 'sw', 'se'].forEach(corner => {
			const handle = Element.fromHTML(`<span class="mv-img-grip mv-img-grip-${corner}"></span>`);
			handle.addEventListener('pointerdown', e => drag(e, corner.endsWith('e') ? 1 : -1));
			frame.append(handle);
		});
		bar = Element.fromHTML('<div class="mv-img-bar" role="toolbar"></div>');
		SIZES.forEach(([key, width]) => {
			const b = Element.fromHTML('<button type="button" class="mv-img-size"></button>');
			b.textContent = t(key);
			b.dataset.width = width;
			bar.append(b);
		});
		bar.append(Element.fromHTML('<span class="mv-sep"></span>'),
			Element.fromHTML(`<button type="button" class="mv-img-del"><i class="mi mi-delete"></i></button>`));
		bar.querySelector('.mv-img-del').title = t('IMG_REMOVE');
		// keep the editor's focus and its selection of the image
		bar.addEventListener('mousedown', e => e.preventDefault());
		bar.addEventListener('click', e => {
			const size = e.target.closest('.mv-img-size');
			current && size && setWidth(+size.dataset.width);
			current && e.target.closest('.mv-img-del') && remove();
		});
		document.addEventListener('mousedown', e => current && !bar.contains(e.target) && !frame.contains(e.target)
			&& e.target !== current.img && hide());
		document.addEventListener('keydown', e => current && !bar.contains(e.target) && hide());
		document.addEventListener('scroll', () => current && place(), true);
		addEventListener('resize', () => current && place());
	};

	// frame and bar follow the image (relative to the dialog, or the page outside one)
	const place = () => {
		const img = current?.img;
		if (!img?.isConnected) {
			hide();
			return;
		}
		const host = img.closest('dialog') || document.body,
			h = host === document.body ? { top: 0, left: 0, width: innerWidth } : host.getBoundingClientRect(),
			r = img.getBoundingClientRect(),
			pos = host === document.body ? 'fixed' : 'absolute';
		frame.parentElement !== host && host.append(frame, bar);
		Object.assign(frame.style, {
			position: pos,
			top: (r.top - h.top) + 'px',
			left: (r.left - h.left) + 'px',
			width: r.width + 'px',
			height: r.height + 'px'
		});
		frame.classList.add('show');
		bar.classList.add('show');
		bar.style.position = pos;
		const below = r.bottom - h.top + 6, above = r.top - h.top - bar.offsetHeight - 6;
		bar.style.top = (r.bottom + bar.offsetHeight + 12 > innerHeight && above > 0 ? above : below) + 'px';
		bar.style.left = Math.max(8, Math.min(r.left - h.left, h.width - bar.offsetWidth - 8)) + 'px';
		// the preset that matches the current width is highlighted
		const fit = isBestFit(img), w = fit ? 0 : Math.round(parseFloat(img.style.width) || 0);
		bar.querySelectorAll('.mv-img-size').forEach(b => {
			const preset = +b.dataset.width;
			b.classList.toggle('mv-on', FIT === preset ? fit : w > 0 && w === (preset || img.naturalWidth));
		});
	};

	const select = (img, sq) => {
		frame || build();
		current = { img, sq };
		const range = document.createRange();
		range.selectNode(img);
		sq.setSelection(range);
		place();
	};

	addEventListener('squire-toolbar', e => {
		const sq = e.detail?.squire?.squire, root = sq?.getRoot?.();
		root?.addEventListener('click', ev => {
			const img = ev.target.closest?.('img');
			img && root.contains(img) && select(img, sq);
		});
		// typing, undo or pasting may move or remove the image
		sq?.addEventListener?.('input', () => current && requestAnimationFrame(place));
		// images dropped in as files or added by URL start at Best fit (Gmail's default)
		const insertImage = sq?.insertImage;
		if (insertImage && !insertImage.mvWrapped) {
			sq.insertImage = function(...args) {
				const img = insertImage.apply(this, args);
				NcModernView.safe('image best fit', () => {
					const fit = () => img.isConnected && !img.style.width && bestFit(img);
					img.complete ? fit() : img.addEventListener('load', fit, { once: true });
				})();
				return img;
			};
			sq.insertImage.mvWrapped = true;
		}
	});

})(window.rl);

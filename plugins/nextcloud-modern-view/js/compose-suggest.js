/**
 * Nextcloud Modern View: recipient suggestions under the To / Cc / Bcc field, like Outlook's.
 *
 * Core (Component/EmailAddresses.js) fills a native <datalist id="emailaddresses-datalist">, which
 * the browser draws as its own offset dropdown with a ▼ far along the field (core also widens the
 * input to the longest suggestion for it). Here the field loses its `list` attribute, and the
 * datalist core keeps filling is shown as our list: initials, name, address, the first one
 * highlighted; ↑ ↓ move, Enter / Tab pick, Esc closes, or click. Picking types the address and a
 * comma, which is how core turns typed text into a recipient chip.
 */
(rl => {
	if (!rl) {
		return;
	}

	const COLORS = ['#2b579a', '#1d6f42', '#7b3fa0', '#c43e1c', '#00679e', '#8a5a00', '#a4262c', '#038387'],
		el = html => Element.fromHTML(html);

	let menu, input, items = [], active = 0;

	const parse = line => {
		const m = String(line).match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
		return m ? { name: m[1].trim(), email: m[2].trim() } : { name: '', email: String(line).trim() };
	};
	const initials = ({ name, email }) => (name
		? name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('')
		: email.slice(0, 2)).toUpperCase();
	const color = email => COLORS[[...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COLORS.length];

	const close = () => {
		menu?.classList.remove('show');
		items = [];
	};

	const highlight = i => {
		active = (i + items.length) % items.length;
		menu.querySelectorAll('.mv-sug-item').forEach((row, n) => row.classList.toggle('mv-on', n === active));
		menu.querySelectorAll('.mv-sug-item')[active]?.scrollIntoView({ block: 'nearest' });
	};

	const pick = i => {
		const line = items[i], field = input;
		close();
		if (line && field) {
			field.value = line + ',';
			field.dispatchEvent(new Event('input', { bubbles: true }));
		}
	};

	const build = () => {
		menu = el('<div class="mv-sug" role="listbox"></div>');
		menu.addEventListener('mousedown', e => e.preventDefault()); // keep the focus in the field
		menu.addEventListener('click', e => {
			const row = e.target.closest('.mv-sug-item');
			row && pick(+row.dataset.i);
		});
		// capture: runs before core's own Enter handling on the field
		document.addEventListener('keydown', e => {
			if (!menu.classList.contains('show') || e.target !== input) {
				return;
			}
			const keys = { ArrowDown: () => highlight(active + 1), ArrowUp: () => highlight(active - 1),
				Enter: () => pick(active), Tab: () => pick(active), Escape: close };
			if (keys[e.key]) {
				e.preventDefault();
				e.stopImmediatePropagation();
				keys[e.key]();
			}
		}, true);
		document.addEventListener('focusout', e => e.target === input && close());
		addEventListener('resize', close);
	};

	const show = list => {
		menu || build();
		items = [...list.options].map(o => o.value).filter(Boolean);
		if (!input?.isConnected || document.activeElement !== input || !input.value.trim() || !items.length) {
			close();
			return;
		}
		menu.replaceChildren(...items.map((line, i) => {
			const who = parse(line),
				row = el('<div class="mv-sug-item" role="option"><span class="mv-sug-av"></span>'
					+ '<span class="mv-sug-tx"><span class="mv-sug-nm"></span><span class="mv-sug-em"></span></span></div>');
			row.dataset.i = i;
			row.querySelector('.mv-sug-av').textContent = initials(who);
			row.querySelector('.mv-sug-av').style.background = color(who.email);
			row.querySelector('.mv-sug-nm').textContent = who.name || who.email;
			row.querySelector('.mv-sug-em').textContent = who.name ? who.email : '';
			return row;
		}));
		// core just widened the field to the longest suggestion (for the native list): undo that
		input.style.width = '';
		// under the field, starting where the typing is; inside the compose <dialog> (top layer)
		const host = input.closest('dialog') || document.body,
			box = (input.closest('.emailaddresses') || input).getBoundingClientRect(),
			r = input.getBoundingClientRect(),
			h = host === document.body ? { top: 0, left: 0, width: innerWidth } : host.getBoundingClientRect();
		menu.parentElement !== host && host.append(menu);
		menu.style.position = host === document.body ? 'fixed' : 'absolute';
		menu.classList.add('show');
		menu.style.top = Math.round(box.bottom - h.top + 2) + 'px';
		menu.style.left = Math.round(Math.max(8, Math.min(r.left - h.left, h.width - menu.offsetWidth - 8))) + 'px';
		highlight(0);
	};

	// core creates the datalist with the first recipient field; watch it once it exists
	let watched = null;
	const watch = () => {
		const list = document.getElementById('emailaddresses-datalist');
		if (list && list !== watched) {
			watched = list;
			new MutationObserver(() => show(list)).observe(list, { childList: true });
		}
	};

	const take = field => {
		if (field?.matches?.('.emailaddresses input') && (field !== input || field.hasAttribute('list'))) {
			input = field;
			// no native dropdown (and its ▼); core still fills the datalist by id
			field.removeAttribute('list');
			field.style.width = '';
			watch();
		}
	};
	// on focus, and on typing too: the field may have had the focus before this ran (autofocus)
	document.addEventListener('focusin', e => take(e.target));
	document.addEventListener('input', e => {
		take(e.target);
		// an emptied field drops the suggestions until core sends new ones
		e.target === input && !input.value.trim() && close();
	}, true);

})(window.rl);

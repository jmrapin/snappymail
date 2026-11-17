/**
 * Nextcloud Modern View: compose window toolbar, in the style of the one action bar.
 *
 *   [➤ Send] Save · Discard | Attach · Attach from Nextcloud · Contacts | Sign · Encrypt · Important
 *   "saved 16:20" … ☰ | Minimise · Close
 *
 * Core's PopupsCompose template is NOT replaced: other plugins patch it (nextcloud adds its attach
 * button after #composeUploadButton, ai-reply-suggest adds one into header .pull-right). It is
 * patched when the compose view is created, before it is bound, so all those patches are in and
 * every binding, id and class core relies on (#composeUploadButton for the uploader) is kept.
 */
(rl => {
	if (!rl) {
		return;
	}

	const el = html => Element.fromHTML(html),
		sep = () => el('<span class="mv-sep"></span>');

	// glyph → outline icon; keeps bindings, ids and titles
	const iconize = (button, icon, title) => {
		if (!button) {
			return null;
		}
		button.classList.remove('btn', 'btn-danger', 'fontastic', 'hide-mobile', 'close');
		button.classList.add('mv-btn');
		button.removeAttribute('style');
		button.replaceChildren(el(`<i class="mi mi-${icon}"></i>`));
		title && !button.getAttribute('data-i18n') && button.setAttribute('data-i18n', '[title]' + title);
		return button;
	};
	// a busy button shows core's spinner instead of its icon
	const busyIcon = (button, icon, busy) => button?.replaceChildren(
		el(`<i class="mi mi-${icon}" data-bind="hidden: ${busy}"></i>`),
		el(`<i class="icon-spinner" data-bind="visible: ${busy}"></i>`),
		...[...button.querySelectorAll('span')]
	);

	// ☰ menu: Cc, Bcc, Sign, Encrypt and Important have their own buttons now
	const trimMenu = menu => menu?.querySelectorAll(':scope > li').forEach(li => {
		const bind = li.getAttribute('data-bind') || '';
		if (/toggle: (showBcc|showCc|markAsImportant|doSign|doEncrypt)\b/.test(bind)) {
			li.remove();
			return;
		}
		const box = li.querySelector('i.fontastic'),
			flag = (box?.getAttribute('data-bind') || '').match(/text: (\w+)\(\)/)?.[1];
		flag && box.replaceWith(el(`<i class="mi" data-bind="css: { 'mi-check-box': ${flag}(), 'mi-check-box-outline-blank': !${flag}() }"></i>`));
	});

	const patch = t => {
		const header = t.querySelector('header'),
			right = header?.querySelector('.pull-right'),
			bHeader = t.querySelector('.b-header');
		if (!header || !right) {
			return;
		}
		header.classList.add('mv-cp-bar');

		const send = header.querySelector('[data-bind*="sendCommand"]');
		send?.classList.replace('btn', 'mv-cp-send');
		busyIcon(send, 'send', 'sending');
		const save = header.querySelector('.button-save');
		save?.classList.replace('btn', 'mv-btn');
		save?.setAttribute('data-i18n', '[title]GLOBAL/SAVE');
		busyIcon(save, 'save', 'saving');
		save?.querySelector('span')?.remove();
		const discard = iconize(header.querySelector('.button-delete'), 'delete', 'GLOBAL/DELETE');
		discard?.classList.add('mv-danger');

		const upload = iconize(t.querySelector('#composeUploadButton'), 'attach-file'),
			cloud = iconize(t.querySelector('[data-bind*="nextcloudAttach"]'), 'cloud-upload'),
			contacts = iconize(header.querySelector('[data-bind*="contactsCommand"]'), 'contacts');
		const sign = iconize(bHeader?.querySelector('a.btn[data-bind*="toggle: doSign"]'), 'signature'),
			encrypt = iconize(bHeader?.querySelector('a.btn[data-bind*="toggle: doEncrypt"]'), 'lock');
		[sign, encrypt].forEach(b => b?.setAttribute('data-bind', b.getAttribute('data-bind').replace(/'btn-success'/, "'mv-on'")));
		const important = el(`<a class="mv-btn" data-bind="toggle: markAsImportant, css: { 'mv-on': markAsImportant }"
			data-i18n="[title]COMPOSE/BUTTON_MARK_AS_IMPORTANT"><i class="mi mi-priority-high"></i></a>`);

		const saved = header.querySelector('.saved-text');
		(saved || discard || save).after(...[sep(), upload, cloud, contacts, sep(), sign, encrypt, important].filter(Boolean));
		(saved && important.after(saved));
		// the sign / encrypt / attach row under the fields is empty now
		bHeader?.querySelector(':scope > div[style*="display:flex"]')?.remove();

		right.classList.add('mv-cp-right');
		const menuToggle = right.querySelector('.dropdown-toggle');
		iconize(menuToggle, 'menu', 'GLOBAL/MORE')?.classList.add('dropdown-toggle');
		trimMenu(right.querySelector('menu'));
		const minimize = right.querySelector('.minimize-custom');
		iconize(minimize, 'minimize');
		minimize?.classList.remove('minimize-custom');
		iconize(right.querySelector('a.close'), 'close');
		minimize?.before(sep());
	};

	NcModernView.onView('PopupsCompose', () => {
		const t = document.getElementById('PopupsCompose');
		if (t && !t.mvPatched) {
			t.mvPatched = true;
			patch(t.content);
		}
	});

})(window.rl);

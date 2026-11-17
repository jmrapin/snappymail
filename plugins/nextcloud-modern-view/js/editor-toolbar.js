/**
 * Nextcloud Modern View: the HTML editor's toolbar (compose window, signature editor) with the
 * same outline icons as the rest of the plugin.
 *
 * Core's SquireUI fires "squire-toolbar" with its action list just before it builds the buttons
 * from each action's `html`, so swapping that html is enough: titles, shortcuts and commands stay
 * core's. Unknown or new actions keep their glyph.
 */
(() => {
	const ICONS = {
		dir_ltr: 'format-textdirection-l-to-r',
		dir_rtl: 'format-textdirection-r-to-l',
		textColor: 'format-color-text',
		backgroundColor: 'format-color-fill',
		bold: 'format-bold',
		italic: 'format-italic',
		underline: 'format-underlined',
		strike: 'strikethrough-s',
		sub: 'subscript',
		sup: 'superscript',
		ol: 'format-list-numbered',
		ul: 'format-list-bulleted',
		quote: 'format-quote',
		indentDecrease: 'format-indent-decrease',
		indentIncrease: 'format-indent-increase',
		link: 'link',
		imageUrl: 'image',
		imageUpload: 'add-photo-alternate',
		undo: 'undo',
		redo: 'redo',
		source: 'code',
		removeStyle: 'format-clear'
	};

	addEventListener('squire-toolbar', e => {
		try {
			Object.values(e.detail?.actions || {}).forEach(group =>
				Object.entries(group || {}).forEach(([action, cfg]) => {
					if (ICONS[action] && cfg && 'html' in cfg) {
						cfg.html = `<i class="mi mi-${ICONS[action]}"></i>`;
					}
				}));
		} catch (err) {
			console.error('[modern-view] editor toolbar:', err);
		}
	});
})();

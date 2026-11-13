/**
 * Nextcloud Modern View: shared helpers. Loaded first (see index.php).
 *
 * Feature files register view hooks with NcModernView.onView(templateId, fn); the hooks run in
 * the order the files are loaded, so a later file can rely on what an earlier one put on the view.
 */
(rl => {
	if (!rl) {
		return;
	}

	const hooks = [];

	/**
	 * Errors thrown by our computeds or bindings while SnappyMail processes a request (folder
	 * switch, message list) surface only as "Request failed", because core's production build
	 * strips console output. So: never let plugin code throw into core, log it instead.
	 */
	const safe = (label, fn, fallback) => (...args) => {
		try {
			return fn(...args);
		} catch (e) {
			console.error('[modern-view] ' + label + ':', e?.message, e);
			return fallback;
		}
	};

	/**
	 * Opt-in binding diagnostics: in the browser console run  localStorage.mvDebug = 1  and reload.
	 * Logs every failing knockout binding with its data-bind text and element.
	 */
	if (window.localStorage?.getItem('mvDebug') && window.ko?.bindingHandlers) {
		Object.entries(ko.bindingHandlers).forEach(([name, handler]) => {
			['init', 'update'].forEach(fn => {
				const original = handler?.[fn];
				if ('function' === typeof original) {
					handler[fn] = function(element) {
						try {
							return original.apply(this, arguments);
						} catch (e) {
							console.error('[modern-view] binding "' + name + '.' + fn + '" failed:', e?.message,
								'\n  data-bind:', element?.getAttribute?.('data-bind'), '\n  element:', element, e);
							throw e;
						}
					};
				}
			});
		});
		console.info('[modern-view] binding diagnostics on (localStorage.mvDebug)');
	}

	addEventListener('rl-view-model.create', e => {
		const view = e.detail;
		hooks.forEach(([templateId, fn]) => templateId === view.viewModelTemplateID && fn(view));
	});

	window.NcModernView = {
		onView: (templateId, fn) => hooks.push([templateId, safe('init ' + templateId, fn)]),

		// ko.computed that can't throw into core: NcModernView.computed('name', () => ..., fallback)
		computed: (label, fn, fallback) => ko.computed(safe(label, fn, fallback)),
		safe: safe,

		// Plugin strings live under MODERN_VIEW in langs/*.json
		t: (key, values) => rl.i18n('MODERN_VIEW/' + key, values),

		friendlySize: bytes => {
			const units = ['B', 'KiB', 'MiB', 'GiB'];
			let i = 0;
			while (bytes >= 1024 && i < units.length - 1) {
				bytes /= 1024;
				++i;
			}
			return (i ? bytes.toFixed(1) : bytes) + ' ' + units[i];
		},

		downloadUrl: (url, fileName) => {
			const a = document.createElement('a');
			a.href = url;
			a.download = fileName || '';
			a.rel = 'noopener';
			document.body.append(a);
			a.click();
			a.remove();
		},

		openTab: url => url && window.open(url, '_blank', 'noopener')
	};

})(window.rl);

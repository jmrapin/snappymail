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

	addEventListener('rl-view-model.create', e => {
		const view = e.detail;
		hooks.forEach(([templateId, fn]) => templateId === view.viewModelTemplateID && fn(view));
	});

	window.NcModernView = {
		onView: (templateId, fn) => hooks.push([templateId, fn]),

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

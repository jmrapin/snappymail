/**
 * Nextcloud Modern View: compose attachments as cards under the subject, like the reading pane.
 *
 * Core keeps them on an "Attachments" tab next to the text and switches to that tab when files
 * are dragged over the window (attachmentsArea()). Here the list moves under the fields, the drop
 * zone (.b-attachment-place, which core's uploader looks up by class) covers the whole window body,
 * and the text stays on screen. The tab row only shows when Mailvelope adds its own tab.
 */
(rl => {
	if (!rl) {
		return;
	}

	const patch = t => {
		const fields = t.querySelector('.b-header'),
			list = t.querySelector('.attachmentAreaParent .attachmentList'),
			drop = t.querySelector('.attachmentAreaParent .b-attachment-place'),
			body = t.querySelector('.modal-body');
		if (!fields || !list || !body) {
			return;
		}
		const strip = Element.fromHTML('<div class="mv-cp-atts" data-bind="visible: attachmentsCount"></div>');
		strip.append(list);
		fields.after(strip);
		drop && body.append(drop);

		t.querySelector('label[for="tab-body"]')?.setAttribute('data-bind', 'visible: canMailvelope');
		t.querySelector('label[for="tab-attachments"]')?.classList.add('mv-hidden');
		t.querySelector('.attachmentAreaParent')?.classList.add('mv-hidden');
	};

	NcModernView.onView('PopupsCompose', view => {
		const t = document.getElementById('PopupsCompose');
		if (t && !t.mvAtts) {
			t.mvAtts = true;
			patch(t.content);
		}
		// the text stays on screen while files are dragged in (the cards are always visible)
		view.attachmentsArea = () => {};
	});

	// anything else that still selects the hidden tab goes back to the text
	NcModernView.onBuild('PopupsCompose', view =>
		view.viewArea?.subscribe(area => 'attachments' === area && view.viewArea('body')));

})(window.rl);

/**
 * Nextcloud Modern View: compose attachments as the reading pane's cards, under the subject.
 *
 * Same cards as a received message (file-type icon, name, size; css/attachments.css), with ×
 * to remove instead of the ▾ menu, and the upload progress in place of the size. One line;
 * the rest behind "Show all (N)" (compose-attachments-layout.js), expanded they wrap.
 *
 * Core keeps attachments on an "Attachments" tab next to the text and switches to that tab when
 * files are dragged over the window (attachmentsArea()). Here the text stays on screen, the drop
 * zone (.b-attachment-place, which core's uploader looks up by class) covers the whole window
 * body, and the tab row only shows when Mailvelope adds its own tab.
 */
(rl => {
	if (!rl) {
		return;
	}

	const STRIP = `<div class="mv-cp-atts mv-atts"
		data-bind="visible: attachmentsCount, css: { 'mv-expanded': mvCpAttExpanded }">
		<div class="mv-att-head" data-bind="visible: mvCpAttExpanded">
			<span data-bind="text: mvCpAttSummary"></span>
			<span class="mv-spacer"></span>
			<a href="#" class="mv-lnk" data-bind="click: mvCpAttCollapse"><i class="mi mi-keyboard-arrow-up"></i>
				<span data-bind="text: mvCpT('SHOW_LESS')"></span></a>
		</div>
		<div class="mv-att-row">
			<div class="mv-att-list" data-bind="initDom: mvCpAttListInit">
				<div class="mv-att-line" data-bind="foreach: attachments">
					<div class="mv-att" data-bind="css: $root.mvCpAttCss($data, $index()), attr: { title: $data.title }">
						<span class="mv-att-main">
							<span class="mv-att-ic" data-bind="css: $root.mvCpAttIcon($data), text: $root.mvCpAttExt($data)"></span>
							<span class="mv-att-tx">
								<span class="mv-att-nm" data-bind="text: $data.fileName"></span>
								<span class="mv-att-sz" data-bind="text: $root.mvCpAttSize($data)"></span>
							</span>
						</span>
						<a href="#" class="mv-att-dd" data-bind="click: $data.cancel, attr: { title: $root.mvCpT('ATT_REMOVE') }">
							<i class="mi mi-close"></i></a>
					</div>
				</div>
			</div>
			<a href="#" class="mv-more-chip"
				data-bind="visible: mvCpAttShowChip, click: mvCpAttExpand, text: mvCpAttShowAll"></a>
		</div>
	</div>`;

	const patch = t => {
		const fields = t.querySelector('.b-header'),
			drop = t.querySelector('.attachmentAreaParent .b-attachment-place'),
			body = t.querySelector('.modal-body');
		if (!fields || !body) {
			return;
		}
		fields.after(Element.fromHTML(STRIP));
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
		const A = NcModernView.att, list = () => view.attachments?.() || [];

		view.mvCpT = key => NcModernView.t(key);
		view.mvCpAttIcon = att => A.iconClass(att.fileExt?.());
		view.mvCpAttExt = att => A.extLabel(att.fileExt?.());
		// uploading: its progress ("45%"), failed: the error, otherwise the size
		view.mvCpAttSize = att => att.error?.() || (att.uploading?.() ? att.progressText?.() : att.friendlySize?.()) || '';
		view.mvCpAttCss = (att, index) => ({
			'mv-hidden': !view.mvCpAttExpanded() && index >= view.mvCpAttFit(),
			'mv-att-err': !!att.error?.(),
			'mv-att-busy': !!(att.uploading?.() || att.waiting?.())
		});
		view.mvCpAttShowAll = NcModernView.computed('mvCpAttShowAll',
			() => NcModernView.t('SHOW_ALL', { N: list().length }), '');
		view.mvCpAttShowChip = NcModernView.computed('mvCpAttShowChip',
			() => !view.mvCpAttExpanded() && view.mvCpAttFit() < list().length, false);
		view.mvCpAttSummary = NcModernView.computed('mvCpAttSummary', () => NcModernView.t('ATTACHMENTS_SUMMARY', {
			N: list().length,
			SIZE: NcModernView.friendlySize(list().reduce((total, a) => total + (+a.size?.() || 0), 0))
		}), '');

		// the text stays on screen while files are dragged in (the cards are always visible)
		view.attachmentsArea = () => {};
	});

	// anything else that still selects the hidden tab goes back to the text
	NcModernView.onBuild('PopupsCompose', view =>
		view.viewArea?.subscribe(area => 'attachments' === area && view.viewArea('body')));

})(window.rl);

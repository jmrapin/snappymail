/**
 * Nextcloud Modern View: fixes for two core editor bugs (vendors/squire2 + dev/External/SquireUI.js),
 * both candidates for upstream. libs.js (Squire, SquireUI) loads before plugins, so the prototypes
 * can be patched here.
 *
 * 1. Lists, quote, indent do nothing, colours hit the whole message, after typing above the
 *    signature: SquireUI.execCommand('insertSignature') puts two bare <br> into the editor root.
 *    Squire needs every root child to be a block, so typed text lands outside any block. Here
 *    they become empty <div> lines, like the ones Squire makes on Enter.
 *
 * 2. Background / text colour on a whole text node: SnappyMail's Squire.setAttribute() then styles
 *    the node's PARENT (a whole line, or the editor itself when the text has no block, hence the
 *    whole message turning grey), and records the undo state with selection markers it never
 *    removes (<input id="squire-selection-start">, which then go out in the mail). Here a style
 *    on such a selection becomes a <span> like any other selection, and leftover markers are removed.
 *
 * 3. An extra empty bullet: a selection ending at the start of the next line takes that line too.
 *
 * (The list bug that skipped the first / last selected line was in core's squire2 copy itself:
 * fixed in vendors/squire2/dist/squire-raw.js, inlineNodeNames, as upstream Squire has it.)
 */
(() => {
	const Squire = window.Squire, SquireUI = window.SquireUI;
	if (!Squire?.prototype?.setAttribute || !SquireUI?.prototype?.execCommand) {
		return;
	}

	// 1.
	const execCommand = SquireUI.prototype.execCommand;
	SquireUI.prototype.execCommand = function (cmd, ...args) {
		const result = execCommand.call(this, cmd, ...args);
		if ('insertSignature' === cmd && 'plain' !== this.mode) {
			try {
				const root = this.squire?.getRoot?.();
				root?.querySelector(':scope > div.rl-signature') && [...root.children]
					.filter(node => 'BR' === node.nodeName)
					.forEach(br => {
						const line = document.createElement('div');
						br.replaceWith(line);
						line.append(br);
					});
			} catch (err) {
				console.error('[modern-view] signature fix:', err);
			}
		}
		return result;
	};

	// 3. A selection dragged to the end of a line usually ends at the START of the next line;
	// Squire then takes that line too (an extra empty bullet). Like Word, a line the selection only
	// touches at its very start is left out of lists, quote and indent.
	const modifyBlocks = Squire.prototype.modifyBlocks;
	Squire.prototype.modifyBlocks = function (modify, range) {
		try {
			range = range || this.getSelection();
			const root = this.getRoot(), end = range && !range.collapsed && range.endContainer,
				el = end && (end.nodeType === Node.ELEMENT_NODE ? end : end.parentElement),
				line = el?.closest('div,p,li,h1,h2,h3,h4,h5,h6,pre');
			if (line && line !== root && root.contains(line) && !line.contains(range.startContainer)) {
				const head = document.createRange();
				head.setStart(line, 0);
				head.setEnd(range.endContainer, range.endOffset);
				'' === head.toString() && !head.cloneContents().querySelector('img') && range.setEndBefore(line);
			}
		} catch (err) {
			console.error('[modern-view] block selection fix:', err);
		}
		return modifyBlocks.call(this, modify, range);
	};

	// 2.
	const setAttribute = Squire.prototype.setAttribute;
	Squire.prototype.setAttribute = function (name, value) {
		try {
			const range = this.getSelection(), text = range?.startContainer;
			if ('style' === name && null != value && text instanceof Text && text === range.endContainer
			 && 0 === range.startOffset && text.length === range.endOffset && 'SPAN' !== text.parentNode?.nodeName) {
				this.changeFormat({ tag: 'SPAN', attributes: { style: value } }, null, range);
				return this.focus();
			}
		} catch (err) {
			console.error('[modern-view] editor style fix:', err);
		}
		const result = setAttribute.call(this, name, value);
		this._root?.querySelectorAll(`#${this.startSelectionId}, #${this.endSelectionId}`).forEach(node => node.remove());
		return result;
	};
})();

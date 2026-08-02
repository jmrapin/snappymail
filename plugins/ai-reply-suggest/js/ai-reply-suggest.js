// AI Reply Suggest Plugin - Frontend JavaScript
// Adds a "Generate Suggestion" button to the compose window

(rl => {

	if (!rl) {
		return;
	}

	// Listen for compose view model creation
	addEventListener('rl-view-model.create', e => {
		if ('PopupsCompose' === e.detail.viewModelTemplateID) {
			let view = e.detail;
			// Wait for the view to be rendered
			setTimeout(() => addGenerateButton(view), 200);
		}
	});

	function addGenerateButton(view)
	{
		// Find the compose header (the <header> element in the compose popup)
		let header = view.viewModelDom?.querySelector('header');
		if (!header) {
			console.warn('AI Reply Suggest: compose header not found');
			return;
		}

		// Find the pull-right div where other buttons are
		let pullRight = header.querySelector('.pull-right');
		if (!pullRight) {
			console.warn('AI Reply Suggest: pull-right div not found');
			return;
		}

		// Check if button already exists
		if (pullRight.querySelector('.ai-reply-suggest-btn')) {
			return;
		}

		// Create the button - insert before the dropdown menu (☰)
		let dropdown = pullRight.querySelector('.btn-group.dropdown');
		let btn = Element.fromHTML('<a class="btn ai-reply-suggest-btn" title="AI Reply Suggest" style="cursor:pointer;">'
			+ '<i class="fontastic">🤖</i>'
			+ '</a>');

		btn.addEventListener('click', () => showSuggestModal(view));

		if (dropdown) {
			dropdown.before(btn);
		} else {
			pullRight.appendChild(btn);
		}
	}

	function showSuggestModal(view)
	{
		// Use native <dialog> element to match SnappyMail's popup style and z-index
		let dialog = document.createElement('dialog');
		dialog.style.cssText = 'max-width:500px;width:90%;padding:0;';
		dialog.innerHTML = '<header>'
			+ '<h3>AI Reply Suggest</h3>'
			+ '<a class="close" style="cursor:pointer;">&times;</a>'
			+ '</header>'
			+ '<div class="modal-body">'
			+ '<div class="control-group">'
			+ '<label class="control-label" style="display:block;margin-bottom:5px;font-weight:bold;">Instructions for AI:</label>'
			+ '<textarea class="ai-instructions" rows="4" style="width:100%;padding:8px;border:1px solid var(--border-color,#ccc);border-radius:var(--input-border-radius,3px);resize:vertical;box-sizing:border-box;background:var(--input-bg-clr,#fff);color:var(--input-clr,#333);" placeholder="e.g., Make it polite and professional"></textarea>'
			+ '</div>'
			+ '<div class="ai-error" style="display:none;color:red;margin-bottom:10px;font-size:13px;"></div>'
			+ '</div>'
			+ '<footer>'
			+ '<button type="button" class="btn-cancel btn">Cancel</button>'
			+ '<button type="button" class="btn-generate btn btn-success">Generate</button>'
			+ '</footer>';

		document.body.appendChild(dialog);
		dialog.showModal();
		// Add 'animate' class so SnappyMail's CSS makes it visible (dialog:not(.animate) has opacity:0)
		requestAnimationFrame(() => dialog.classList.add('animate'));

		let textarea = dialog.querySelector('.ai-instructions');
		let errorDiv = dialog.querySelector('.ai-error');
		let generateBtn = dialog.querySelector('.btn-generate');
		let cancelBtn = dialog.querySelector('.btn-cancel');
		let closeBtn = dialog.querySelector('.close');

		// Focus after a short delay
		setTimeout(() => textarea?.focus(), 50);

		function closeModal()
		{
			dialog.close();
			if (dialog.parentNode) {
				dialog.parentNode.removeChild(dialog);
			}
		}

		cancelBtn.onclick = closeModal;
		closeBtn.onclick = closeModal;

		generateBtn.addEventListener('click', () => {
			let instructions = textarea.value.trim();
			if (!instructions) {
				errorDiv.textContent = 'Please enter instructions for the AI';
				errorDiv.style.display = 'block';
				return;
			}

			errorDiv.style.display = 'none';
			generateBtn.disabled = true;
			generateBtn.textContent = 'Generating...';

			// Get email data from the compose view
			let emailData = getEmailData(view);
			console.log('AI Reply Suggest: sending request', { instructions, emailData });

			// Send request to the plugin's JSON handler
			rl.pluginRemoteRequest((iError, oData) => {
				console.log('AI Reply Suggest: response received', { iError, oData });
				generateBtn.disabled = false;
				generateBtn.textContent = 'Generate';

				if (iError) {
					console.error('AI Reply Suggest: error', iError, oData);
					errorDiv.textContent = oData?.ErrorMessage || oData?.message || 'Failed to generate suggestion (error ' + iError + ')';
					errorDiv.style.display = 'block';
					return;
				}

				// Check for error in result
				if (oData?.Result?.error) {
					console.error('AI Reply Suggest: result error', oData.Result.error);
					errorDiv.textContent = oData.Result.error;
					errorDiv.style.display = 'block';
					return;
				}

				let suggestion = oData?.Result?.suggestion || '';
				console.log('AI Reply Suggest: suggestion', suggestion);
				if (suggestion) {
					// For now, just display the suggestion in the dialog so we can verify it works
					let resultDiv = dialog.querySelector('.ai-result');
					if (!resultDiv) {
						resultDiv = document.createElement('div');
						resultDiv.className = 'ai-result';
						resultDiv.style.cssText = 'margin-top:15px;padding:10px;background:var(--bg-clr,#f5f5f5);border:1px solid var(--border-color,#ddd);border-radius:4px;white-space:pre-wrap;max-height:200px;overflow:auto;font-size:13px;';
						dialog.querySelector('.modal-body').appendChild(resultDiv);
					}
					resultDiv.textContent = suggestion;
					// Insert at the TOP of the compose window (prepend)
					view.editor(editor => {
						let current = editor.getData() || '';
						if (editor.isPlain && editor.isPlain()) {
							editor.setPlain(suggestion + '\n\n' + current);
						} else {
							editor.setHtml(suggestion.replace(/\n/g, '<br>') + '<br><br>' + current);
						}
					});
				} else {
					errorDiv.textContent = 'No suggestion received. Response: ' + JSON.stringify(oData);
					errorDiv.style.display = 'block';
				}
			}, 'GenerateReplySuggestion', {
				instructions: instructions,
				subject: emailData.subject,
				from: emailData.from,
				to: emailData.to,
				body: emailData.body
			}, 180000); // AI reasoning models can take well over 100s to reply
		});
	}

	function getEmailData(view)
	{
		let data = { subject: '', from: '', to: '', body: '' };

		try {
			if (view.subject) {
				data.subject = ko.unwrap(view.subject) || '';
			}
			// from/to are arrays of email objects
			if (view.from) {
				let from = ko.unwrap(view.from);
				if (Array.isArray(from) && from[0]) {
					data.from = from[0].email || from[0].name || String(from[0]);
				}
			}
			if (view.to) {
				let to = ko.unwrap(view.to);
				if (Array.isArray(to) && to[0]) {
					data.to = to[0].email || to[0].name || String(to[0]);
				}
			}
			// Get body from the editor (oEditor may be null if not yet initialized)
			if (view.oEditor) {
				data.body = view.oEditor.getData() || '';
			}
		} catch (e) {
			console.error('AI Reply Suggest: error getting email data', e);
		}

		return data;
	}

})(window.rl);
<?php

/**
 * Modern message view for SnappyMail in Nextcloud (fork-only plugin).
 *
 * Replaces the built-in MailMessageView template with a compact, Outlook/Gmail-like
 * reading pane and adds outline icons (Material Symbols). It only overrides templates and
 * adds JS/CSS, so SnappyMail's core files stay identical to upstream; disable the plugin
 * to get the standard layout back.
 *
 * Template overrides work because ServiceActions::compileTemplates() lets a plugin
 * template replace a built-in template with the same file name.
 *
 * Files are split per feature (see CLAUDE.md); js/util.js must load first and the
 * MailMessageView hooks run in the order the files are listed below.
 */
class NextcloudModernViewPlugin extends \RainLoop\Plugins\AbstractPlugin
{
	const
		NAME     = 'Nextcloud Modern View',
		AUTHOR   = 'jmrapin',
		URL      = 'https://github.com/jmrapin/snappymail',
		VERSION  = '0.2',
		RELEASE  = '2026-11-13',
		REQUIRED = '3.0.1',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Compact modern reading pane: actions in the toolbar, sender verification shield, one-line attachments, outline icons';

	const
		CSS = ['symbols', 'folders', 'toolbar', 'messagelist-toolbar', 'account', 'header', 'shield', 'attachments', 'attachments-select'],
		JS  = ['util', 'header', 'account', 'shield', 'attachments', 'attachments-layout', 'attachments-actions', 'messagelist-toolbar'];

	public function Init() : void
	{
		$this->UseLangs(true);
		foreach (static::CSS as $sName) {
			$this->addCss("css/{$sName}.css");
		}
		foreach (static::JS as $sName) {
			$this->addJs("js/{$sName}.js");
		}
		// Replaces the built-in template with the same name
		$this->addTemplate('templates/MailMessageView.html');
	}
}

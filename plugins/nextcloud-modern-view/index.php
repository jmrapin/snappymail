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
		VERSION  = '0.4',
		RELEASE  = '2026-11-17',
		REQUIRED = '3.0.1',
		CATEGORY = 'General',
		LICENSE  = 'MIT',
		DESCRIPTION = 'Compact modern reading pane: actions in the toolbar, sender verification shield, one-line attachments, outline icons';

	const
		CSS = ['symbols', 'folders', 'toolbar', 'messagelist-toolbar', 'account', 'header', 'shield', 'attachments', 'attachments-select', 'busy', 'toolbar-merge', 'overflow', 'move-menu', 'onebar', 'narrow', 'list-width', 'fullscreen', 'select-all', 'compose', 'compose-fields', 'compose-attachments', 'compose-suggest', 'editor-toolbar', 'editor-colors', 'editor-images'],
		JS  = ['util', 'attachments-common', 'header', 'account', 'shield', 'attachments', 'attachments-layout', 'attachments-actions', 'messagelist-toolbar', 'busy', 'overflow', 'move-menu', 'select-all', 'onebar-model', 'onebar', 'narrow', 'compose', 'compose-fields', 'compose-attachments', 'compose-attachments-layout', 'editor-toolbar', 'editor-fixes', 'compose-close', 'editor-colors', 'editor-images', 'compose-suggest'];

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
		// The single action bar (js/onebar.js)
		$this->addTemplate('templates/NcModernViewBar.html');
		// "Select all in this folder" (js/select-all.js)
		$this->addJsonHook('NcmvFolderUids', 'DoFolderUids');
	}

	/**
	 * Every message UID in a folder, or in the current search of it, so "select all in this
	 * folder" can act on more than the loaded page. Uses core's own search parser, so the result
	 * matches what the message list shows.
	 */
	public function DoFolderUids() : array
	{
		$sFolder = (string) $this->jsonParam('folder', '');
		if (!strlen($sFolder)) {
			throw new RainLoopExceptionsClientException(RainLoopNotifications::CantGetMessageList);
		}
		$oActions = RainLoopApi::Actions();
		$oImap = $oActions->ImapClient();
		if (!$oImap->IsLoggined()) {
			$oActions->getAccountFromToken()->ImapConnectAndLogin($oActions->Plugins(), $oImap, $oActions->Config());
		}
		$oImap->FolderExamine($sFolder);
		$bUseCache = false;
		$oCriterias = MailSoImapSearchCriterias::fromString(
			$oImap, $sFolder, (string) $this->jsonParam('search', ''), !empty($this->jsonParam('hideDeleted', 1)), $bUseCache
		);
		$aUids = array_map('intval', $oImap->MessageSearch((string) $oCriterias, true));
		return $this->jsonResponse(__FUNCTION__, $aUids);
	}

	protected function configMapping() : array
	{
		return [
			\RainLoop\Plugins\Property::NewInstance('one_bar')->SetLabel('One action bar')
				->SetType(\RainLoop\Enumerations\PluginPropertyType::BOOL)
				->SetDescription('One toolbar over the message list and the message, instead of one per panel')
				->SetAllowedInJs(true)
				->SetDefaultValue(true)
		];
	}
}

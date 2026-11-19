/**
 * Nextcloud Modern View: Settings → Filters, its script popup and the rule editor
 * (templates/SettingsFilters.html, PopupsSieveScript.html, PopupsFilter.html; css/filters.css).
 *
 * Core's filters are Sieve scripts. "rainloop.user" (allowFilters()) is the one SnappyMail edits as
 * a list of rules; other scripts are raw Sieve. Only one script is active on the server.
 * Core's handlers rely on "this" (deleteFilter and saveScript use the popup, addFilter the script
 * model), so the templates call these bound helpers instead of core's methods directly. Core still
 * opens a script from .script-item .script-name and a rule from td.e-action (its onBuild).
 */
(rl => {
	if (!rl) {
		return;
	}

	const t = (key, values) => NcModernView.t(key, values),
		// handlers for click bindings: run fn, never follow the link
		handler = (label, fn) => {
			const safeFn = NcModernView.safe(label, fn);
			return (...args) => (safeFn(...args), false);
		};

	// the list of scripts
	NcModernView.onView('SettingsFilters', view => {
		view.mvT = key => rl.i18n(key);
		view.mvNoneActive = NcModernView.computed('filters none active', () => !view.hasActive(), true);
		view.mvScriptName = script => script.allowFilters() ? t('FILTERS_MAIN') : script.name();
		view.mvScriptSub = script => {
			if (!script.allowFilters()) {
				return t('FILTERS_SIEVE_SCRIPT');
			}
			const n = script.filters().length;
			return 1 === n ? t('FILTERS_ONE_RULE') : t('FILTERS_N_RULES', { N: n });
		};
		view.mvEnable = handler('filters enable', script => view.enableScript(script));
		view.mvDisableAll = handler('filters disable', () => view.disableScripts());
		view.mvEdit = handler('filters edit', script => view.editScript(script));
		view.mvAskDelete = handler('filters ask delete', script => view.scriptForDeletion(script));
		view.mvDelete = handler('filters delete', script => view.deleteScript(script));
	});

	// one script: its rules
	NcModernView.onView('PopupsSieveScript', view => {
		view.mvT = key => rl.i18n(key);
		// core's summary comes as "(Move to "X")"
		view.mvRuleSub = filter => (filter.nameSub() || '').replace(/^\((.*)\)$/, '$1');
		view.mvToggleRule = handler('rule toggle', filter => {
			filter.enabled(!filter.enabled());
			view.script()?.hasChanges(true);
		});
		view.mvEditRule = handler('rule edit', filter => view.editFilter(filter));
		view.mvAskDeleteRule = handler('rule ask delete', filter => view.filterForDeletion(filter));
		view.mvDeleteRule = handler('rule delete', filter => view.deleteFilter(filter));
		view.mvAddRule = handler('rule add', () => view.addFilter.call(view.script()));
		view.mvSave = handler('script save', () => view.saveScript());
		view.mvToggleRaw = handler('script raw', () => view.toggleFiltersRaw());
		view.mvScriptTitle = NcModernView.computed('script title', () => view.script()?.allowFilters()
			? t('FILTERS_RULES_TITLE')
			: (view.script()?.name() || ''), '');
		view.mvNoRules = NcModernView.computed('script no rules',
			() => !!view.script()?.allowFilters() && !view.script().filters().length, false);
	});

	// one rule: conditions and action
	NcModernView.onView('PopupsFilter', view => {
		view.mvT = key => rl.i18n(key);
		view.mvRemoveCondition = handler('rule remove condition', condition => view.removeCondition(condition));
		view.mvManyConditions = NcModernView.computed('rule many conditions',
			() => 1 < (view.filter()?.conditions().length || 0), false);
		view.mvNoConditions = NcModernView.computed('rule no conditions',
			() => !(view.filter()?.conditions().length), true);
	});

})(window.rl);

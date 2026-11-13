# CLAUDE.md — jmrapin/snappymail fork

Fork of [the-djmaze/snappymail](https://github.com/the-djmaze/snappymail) running inside Nextcloud.
These rules apply to every change in this repository.

## Code organisation

- **One concern per file.** Never put unrelated features in the same file. Split by feature, not by
  file type: a plugin with a toolbar, a header and an attachments area gets one JS file and one CSS
  file per feature (e.g. `js/toolbar.js`, `js/shield.js`, `js/attachments.js`, `css/attachments.css`).
- **Size limits.** Aim for files under ~200 lines; split before a file passes ~300 lines.
  Functions should do one thing and stay under ~50 lines.
- **Shared helpers go in their own file** (e.g. `js/util.js`), loaded first. No copy-pasted helpers.
- **Generated files stay separate** from hand-written code and say in their header how to regenerate
  them (e.g. `symbols.css` ← `gen-symbols.js`).
- **Templates:** keep logic out of `data-bind`; compute in JS and bind to a named observable or
  method. One template file per overridden view.
- **Naming:** prefix plugin classes, observables and methods so they can't clash with core
  (`mv-*` CSS classes and `mv*` view properties in `nextcloud-modern-view`).
- **Comments** explain *why* (non-obvious constraints, upstream behaviour you depend on), not what.

## Fork policy: keep core identical to upstream

- New features and UI changes go in a **fork-only plugin** (e.g. `plugins/nextcloud-modern-view`),
  not in core files. A plugin template with the same name replaces the built-in one.
- Change core only for genuine bug fixes that upstream could take; keep those commits small and
  self-contained.
- After every upstream merge, run the test list in `.claude/plans/` — upstream renames don't
  conflict with plugin templates, they silently break them.

## SnappyMail pitfalls (learned the hard way)

- **No globals inside template bindings.** `rl`, `window` lookups etc. resolve to `undefined` in the
  binding scope. Expose a view method from the plugin JS instead (e.g. `view.mvT = key => rl.i18n(key)`).
  A throwing binding during a request callback surfaces as a misleading "Request failed".
- **SnappyMail's knockout is a trimmed build: there is no `ko.pureComputed`.** Use `ko.computed`.
  Check that any `ko.*` API you use exists in `vendors/knockout` before relying on it.
- **`foreach` has no `as:` alias** (only `foreach: list` / `foreach: { data: list }`): inside the
  loop the item is `$data`, the view is `$root`, the outer item is `$parent`.
- **Plugin code must never throw into core.** Core recomputes plugin observables while it handles
  requests (folder switch, message list); a throw there shows up as "Request failed". In
  `nextcloud-modern-view` use `NcModernView.computed(name, fn, fallback)` instead of `ko.computed`,
  and don't call core methods without null checks from bindings (e.g. `message().tagOptions()`
  assumes a current folder; `listAttachments()` is `undefined` with no open message). Bindings inside
  `if: message` still update once after the message is cleared, so they need guards too. For hard cases: `localStorage.mvDebug = 1` + reload logs failing bindings.
- **Core CSS hides things by layout and width** (e.g. `.top-toolbar` below 1400px, in the bottom
  layout and in full screen). When a plugin template removes core's fallback, grep
  `dev/Styles` for the element and override those rules too. Test narrow windows.
- **Production builds strip `console.*`** from core (`drop_console`), so core errors are invisible.
  Plugin JS is not stripped: debug with a temporary wrapper in the plugin, then remove it.
- **`with:` / `if:` / `foreach:` blocks re-render** and lose `data-i18n` translations unless the
  parent has `i18nUpdate`. Prefer `text: mvT('…')` inside such blocks.
- **Plugin cache keys** include file modification times (`Plugins\Manager::Hash()`), so changed plugin
  JS/CSS/templates are picked up without clearing caches.

## Quality gates before committing

- `php -l` every changed PHP file; `node --check` every changed JS file; validate JSON.
- `npx eslint` on changed files under `dev/`.
- Rebuild with `npx gulp build` when anything under `dev/` changes.
- Check translation keys used in templates exist (`app/localization/en/*.json` or the plugin's
  `langs/en.json`).
- No `Co-Authored-By: Claude` or other Claude attribution in commits or PRs.

## Deploying (Nextcloud server 192.168.2.5)

- Change the repo first, then deploy; never edit files only on the server.
- Plugins: upload `<name>.tgz` to `~/sm-deploy/` and run `~/sm-deploy/deploy-plugin.sh <name>`
  (restores `www-data` ownership; unreadable files make SnappyMail drop the plugin from
  `enabled_list`, which then has to be re-enabled in Admin → Extensions).
- Build releases from an LF checkout (`git -c core.autocrlf=false worktree add …`).
- Ship `static/sri.json` with any JS/CSS change.

// Usage: node gen-symbols.js <@material-symbols/svg-400 package>/rounded symbols.css
const fs = require('fs'), path = require('path');
const [dir, out] = process.argv.slice(2);
const icons = ['reply','reply_all','forward','attach_email','attach_file','archive','report','delete',
	'drive_file_move','content_copy','label','mark_email_unread','mark_email_read','menu','close',
	'chevron_left','chevron_right','keyboard_arrow_down','keyboard_arrow_up','arrow_drop_down',
	'star','star-fill','verified_user','gpp_maybe','gpp_bad','download','print','open_in_new',
	'article','fullscreen','code','edit','unsubscribe','cloud_upload','visibility','event',
	'check_box','check_box_outline_blank','sort','filter_list','refresh'];
let css = `/*
 * Material Symbols, Rounded, weight 400 (outline style; "-fill" = filled variant)
 * Copyright Google LLC, Apache License 2.0 - https://github.com/google/material-design-icons
 * SVGs from the npm package @material-symbols/svg-400 0.49.0 (rounded/), embedded as CSS masks
 * so no font or external request is needed. Regenerate with gen-symbols.js in this folder (node gen-symbols.js <package>/rounded symbols.css).
 *
 * Usage: <i class="mi mi-reply"></i> - the icon takes the current text colour and is 1.25em.
 */
.mi {
	display: inline-block;
	flex: none;
	width: 1.25em;
	height: 1.25em;
	vertical-align: -.25em;
	background-color: currentColor;
	-webkit-mask: var(--mi) center / contain no-repeat;
	mask: var(--mi) center / contain no-repeat;
}
`;
for (const name of icons) {
	const svg = fs.readFileSync(path.join(dir, name + '.svg'), 'utf8').trim();
	if (!/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="48" height="48" viewBox="0 -960 960 960">(<path d="[^"<>]*"\/>)+<\/svg>$/.test(svg)) {
		throw new Error('unexpected SVG content: ' + name);
	}
	css += `.mi-${name.replace(/_/g, '-')} { --mi: url("data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}"); }\n`;
}
fs.writeFileSync(out, css.replace(/\r/g, ''));
console.log(`wrote ${icons.length} icons, ${css.length} bytes`);

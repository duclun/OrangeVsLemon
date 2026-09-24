# Rebuild dist/ (the exact files published as the claude.ai artifact) from index.html + src/.
# The artifact host wraps the page in its own <!doctype>/<head>/<body>, so those tags are stripped here.
import re, shutil, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'index.html').read_text(encoding='utf-8')
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*', '', s, flags=re.I)
s = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', s)
s = s.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
(root / 'dist/src').mkdir(parents=True, exist_ok=True)
(root / 'dist/index.html').write_text(s, encoding='utf-8')
for f in (root / 'src').glob('*.js'): shutil.copy(f, root / 'dist/src' / f.name)
print('dist/ rebuilt')

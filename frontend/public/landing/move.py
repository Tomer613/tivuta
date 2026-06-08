import re

with open(r'c:\GitHub\tivuta\frontend\public\landing\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

pattern_benefits = r'(  <!-- ══════════════════════════════════════════════════════════\n     BENEFITS\n══════════════════════════════════════════════════════════ -->\n  <section id="benefits">.*?</section>\n\n\n)'
match = re.search(pattern_benefits, content, re.DOTALL)

if match:
    benefits_html = match.group(1)
    content = content.replace(benefits_html, '')
    pattern_footer = r'(  <!-- ══════════════════════════════════════════════════════════\n     FOOTER)'
    content = re.sub(pattern_footer, benefits_html.replace('\\', '\\\\') + r'\1', content, count=1)
    
    with open(r'c:\GitHub\tivuta\frontend\public\landing\index.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Move successful')
else:
    print('Benefits section not found')

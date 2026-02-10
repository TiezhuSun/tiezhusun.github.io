import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX_PATH = ROOT / 'index.html'
CONTENTS_DIR = ROOT / 'contents'

SECTION_NAMES = [
    'home',
    'news',
    'publications',
    'service',
    'grants',
    'supervision',
    'education',
    'experience',
    'awards'
]

ALIAS_IDS = {
    'page-top-title': ['hero-name'],
    'home-subtitle': ['hero-role']
}


def parse_simple_yaml(path: Path):
    data = {}
    for raw in path.read_text(encoding='utf-8').splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        if ':' not in line:
            continue
        key, value = line.split(':', 1)
        key = key.strip()
        value = value.strip()
        if (value.startswith('"') and value.endswith('"')) or (value.startswith("'") and value.endswith("'")):
            value = value[1:-1]
        data[key] = value
    return data


def replace_element_content(html: str, element_id: str, content: str) -> str:
    pattern = re.compile(rf'(<[^>]*\bid=["\"]{re.escape(element_id)}["\"][^>]*>)([\s\S]*?)(</[^>]+>)', re.IGNORECASE)
    if not pattern.search(html):
        return html
    return pattern.sub(rf'\1{content}\3', html, count=1)


def replace_div_content(html: str, element_id: str, content: str) -> str:
    pattern = re.compile(rf'(<div[^>]*\bid=["\"]{re.escape(element_id)}["\"][^>]*>)([\s\S]*?)(</div>)', re.IGNORECASE)
    if not pattern.search(html):
        return html
    return pattern.sub(rf'\1{content}\3', html, count=1)


def render_inline(text: str) -> str:
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', text)
    return text


def render_markdown(md: str) -> str:
    lines = md.splitlines()
    out = []
    i = 0
    in_ul = False
    in_ol = False
    para_lines = []

    def flush_paragraph():
        nonlocal para_lines
        if para_lines:
            text = ' '.join(para_lines).strip()
            if text:
                out.append(f'<p>{render_inline(text)}</p>')
            para_lines = []

    def close_lists():
        nonlocal in_ul, in_ol
        if in_ul:
            out.append('</ul>')
            in_ul = False
        if in_ol:
            out.append('</ol>')
            in_ol = False

    while i < len(lines):
        raw = lines[i]
        line = raw.rstrip()
        stripped = line.strip()

        if not stripped:
            flush_paragraph()
            close_lists()
            i += 1
            continue

        # Raw HTML passthrough
        if stripped.startswith('<'):
            flush_paragraph()
            close_lists()
            out.append(line)
            i += 1
            continue

        # Headings
        if stripped.startswith('#'):
            flush_paragraph()
            close_lists()
            level = len(stripped) - len(stripped.lstrip('#'))
            level = min(max(level, 1), 6)
            text = stripped[level:].strip()
            out.append(f'<h{level}>{render_inline(text)}</h{level}>')
            i += 1
            continue

        # Unordered list
        m_ul = re.match(r'^[\-*]\s+(.+)$', stripped)
        if m_ul:
            flush_paragraph()
            if not in_ul:
                close_lists()
                out.append('<ul>')
                in_ul = True
            out.append(f'<li>{render_inline(m_ul.group(1))}</li>')
            i += 1
            continue

        # Ordered list
        m_ol = re.match(r'^(\d+)\.\s+(.+)$', stripped)
        if m_ol:
            flush_paragraph()
            if not in_ol:
                close_lists()
                out.append('<ol>')
                in_ol = True
            out.append(f'<li>{render_inline(m_ol.group(2))}</li>')
            i += 1
            continue

        # Paragraph accumulation
        para_lines.append(stripped)
        i += 1

    flush_paragraph()
    close_lists()
    return '\n'.join(out)


def main():
    html = INDEX_PATH.read_text(encoding='utf-8')

    config = parse_simple_yaml(CONTENTS_DIR / 'config.yml')
    if 'title' in config:
        html = re.sub(r'<title[^>]*>[\s\S]*?</title>', f"<title>{config['title']}</title>", html, flags=re.IGNORECASE)

    for key, value in config.items():
        html = replace_element_content(html, key, value)
        if key in ALIAS_IDS:
            for alias in ALIAS_IDS[key]:
                html = replace_element_content(html, alias, value)

    for name in SECTION_NAMES:
        md_path = CONTENTS_DIR / f'{name}.md'
        if not md_path.exists():
            continue
        rendered = render_markdown(md_path.read_text(encoding='utf-8'))
        html = replace_div_content(html, f'{name}-md', rendered)

    INDEX_PATH.write_text(html, encoding='utf-8')
    print('Pre-render complete: index.html updated.')


if __name__ == '__main__':
    main()

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const indexPath = path.join(root, 'index.html');
const contentsDir = path.join(root, 'contents');

const marked = require(path.join(root, 'static', 'js', 'marked.min.js'));
const yaml = require(path.join(root, 'static', 'js', 'js-yaml.min.js'));

const config = yaml.load(fs.readFileSync(path.join(contentsDir, 'config.yml'), 'utf8'));

const sectionNames = [
  'home',
  'news',
  'publications',
  'service',
  'grants',
  'supervision',
  'education',
  'experience',
  'awards'
];

const aliasIds = {
  'page-top-title': ['hero-name'],
  'home-subtitle': ['hero-role']
};

function replaceElementContent(html, id, content) {
  const re = new RegExp(`(<[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</[^>]+>)`, 'i');
  if (!re.test(html)) return html;
  return html.replace(re, `$1${content}$3`);
}

function replaceDivContent(html, id, content) {
  const re = new RegExp(`(<div[^>]*\\bid=["']${id}["'][^>]*>)([\\s\\S]*?)(</div>)`, 'i');
  if (!re.test(html)) return html;
  return html.replace(re, `$1${content}$3`);
}

let html = fs.readFileSync(indexPath, 'utf8');

// Update title if configured
if (config && config.title) {
  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${config.title}</title>`);
}

// Populate config-driven IDs
if (config) {
  Object.keys(config).forEach((key) => {
    const value = String(config[key]);
    html = replaceElementContent(html, key, value);
    if (aliasIds[key]) {
      aliasIds[key].forEach((aliasId) => {
        html = replaceElementContent(html, aliasId, value);
      });
    }
  });
}

// Render markdown sections into HTML
if (marked && marked.marked) {
  marked.marked.use({ mangle: false, headerIds: false });
}

sectionNames.forEach((name) => {
  const mdPath = path.join(contentsDir, `${name}.md`);
  if (!fs.existsSync(mdPath)) return;

  const md = fs.readFileSync(mdPath, 'utf8');
  const rendered = marked && marked.marked ? marked.marked.parse(md) : md;

  html = replaceDivContent(html, `${name}-md`, rendered);
});

fs.writeFileSync(indexPath, html);
console.log('Pre-render complete: index.html updated.');


const content_dir = 'contents/'
const config_file = 'config.yml'
const section_names = ['home', 'news', 'publications', 'service', 'grants', 'supervision', 'education', 'experience', 'awards']
const alias_ids = {
    'page-top-title': ['hero-name'],
    'home-subtitle': ['hero-role']
}

window.addEventListener('DOMContentLoaded', event => {

    // 1. Sidebar Active State Logic (IntersectionObserver)
    const navLinks = document.querySelectorAll('#sidebarNav .nav-link');
    const sections = document.querySelectorAll('section');

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // Remove active class from all links
                navLinks.forEach(link => link.classList.remove('active'));

                // Add active class to corresponding link
                const id = entry.target.getAttribute('id');
                const activeLink = document.querySelector(`#sidebarNav a[href="#${id}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    // 2. YAML Config Loader
    fetch(content_dir + config_file)
        .then(response => response.text())
        .then(text => {
            const yml = jsyaml.load(text);
            Object.keys(yml).forEach(key => {
                try {
                    const el = document.getElementById(key);
                    if (el) el.innerHTML = yml[key];
                } catch (e) {
                    console.log("Error loading config key: " + key, e);
                }

                if (alias_ids[key]) {
                    alias_ids[key].forEach(aliasId => {
                        const aliasElement = document.getElementById(aliasId);
                        if (aliasElement) {
                            aliasElement.innerHTML = yml[key];
                        }
                    })
                }
            })
        })
        .catch(error => console.log(error));

    // 3. Markdown Loader
    if (typeof marked !== 'undefined') {
        marked.use({ mangle: false, headerIds: false });
    }

    section_names.forEach((name) => {
        fetch(content_dir + name + '.md')
            .then(response => {
                if (!response.ok) throw new Error("HTTP error " + response.status);
                return response.text();
            })
            .then(markdown => {
                if (typeof marked !== 'undefined') {
                    const html = marked.parse(markdown);
                    const target = document.getElementById(name + '-md');
                    if (target) {
                        target.innerHTML = html;

                        // Wait for render, then check height
                        setTimeout(() => {
                            const contentHeight = target.scrollHeight;
                            if (name !== 'home' && contentHeight > 550) { // Skip Home, fold others > 550px
                                target.classList.add('foldable-content', 'collapsed');

                                // Create Button
                                const btn = document.createElement('button');
                                btn.className = 'foldable-toggle-btn';
                                btn.innerHTML = '<i class="bi bi-chevron-down"></i> Read More';

                                btn.addEventListener('click', () => {
                                    if (target.classList.contains('collapsed')) {
                                        target.classList.remove('collapsed');
                                        target.style.maxHeight = target.scrollHeight + "px"; // Smooth expand
                                        btn.innerHTML = '<i class="bi bi-chevron-up"></i> Show Less';
                                    } else {
                                        target.classList.add('collapsed');
                                        target.style.maxHeight = null;
                                        btn.innerHTML = '<i class="bi bi-chevron-down"></i> Read More';
                                        // Optional: scroll back to top of section
                                    }
                                });

                                target.parentNode.appendChild(btn);
                            }
                        }, 100);
                    }
                }
            })
            .then(() => {
                // MathJax re-render
                if (typeof MathJax !== 'undefined') {
                    MathJax.typeset();
                }
            })
            .catch(error => console.log("Error loading markdown for " + name, error));
    })

    // 4. Last Updated Footer
    const lastUpdated = document.getElementById('last-updated');
    if (lastUpdated) {
        const updatedDate = new Date(document.lastModified);
        lastUpdated.innerHTML = `Last updated on ${updatedDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })}`;
    }
});

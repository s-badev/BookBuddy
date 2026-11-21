const isDemo = new URLSearchParams(window.location.search).get('demo') === '1';
const appStorage = isDemo ? window.sessionStorage : window.localStorage;

function appPage(href) {
    if (!isDemo) return href;
    const url = new URL(href, window.location.href);
    url.searchParams.set('demo', '1');
    return url.href;
}

document.addEventListener('DOMContentLoaded', () => {
    if ('serviceWorker' in navigator && /^https?:$/.test(window.location.protocol)) {
        navigator.serviceWorker.register('sw.js').catch(error => {
            console.warn('BookBuddy offline cache:', error);
        });
    }
    if (!isDemo) return;
    document.querySelectorAll('a[href^="form.html"], a[href^="index.html"]').forEach(link => {
        if (!link.hasAttribute('data-personal-library')) link.href = appPage(link.getAttribute('href'));
    });
    document.getElementById('demoNotice').hidden = false;
});

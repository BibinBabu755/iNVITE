/* ==========================================================================
   LIVE EDIT / AUTO-RELOAD CLIENT SCRIPT
   Provides instant hot-reload for CSS and seamless refresh for HTML/JS
   with scroll-restoration and live status indicator.
   ========================================================================== */
(function() {
    // Only run when viewing via local server (localhost / 127.0.0.1)
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        return;
    }

    let lastVersion = null;
    let isChecking = false;
    let toastTimeout = null;

    // Subtle Live-Edit Toast Notification
    function showLiveToast(message) {
        let toast = document.getElementById('livereload-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'livereload-toast';
            toast.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                background: rgba(106, 27, 41, 0.94);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                color: #FAF6F0;
                border: 1px solid rgba(184, 146, 74, 0.55);
                padding: 10px 18px;
                border-radius: 30px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 13px;
                font-weight: 600;
                box-shadow: 0 10px 30px rgba(0,0,0,0.28);
                z-index: 999999;
                display: flex;
                align-items: center;
                gap: 8px;
                pointer-events: none;
                transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
                opacity: 0;
                transform: translateY(14px);
            `;
            document.body.appendChild(toast);
        }

        toast.innerHTML = `<span style="color: #D4AF37;">⚡</span> ${message}`;
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';

        clearTimeout(toastTimeout);
        toastTimeout = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(14px)';
        }, 2200);
    }

    // Restore exact scroll position after reload only if cover page was already opened
    const savedScroll = sessionStorage.getItem('__live_reload_scroll__');
    const introEl = document.getElementById('intro-screen');
    const isCoverOpen = introEl && (introEl.classList.contains('open') || introEl.style.display === 'none');

    if (savedScroll !== null && isCoverOpen) {
        sessionStorage.removeItem('__live_reload_scroll__');
        setTimeout(() => {
            window.scrollTo({
                top: parseInt(savedScroll, 10),
                behavior: 'instant'
            });
            showLiveToast('Live edit updated');
        }, 60);
    } else {
        sessionStorage.removeItem('__live_reload_scroll__');
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }

    // Check local server for file updates
    async function checkChanges() {
        if (isChecking) return;
        isChecking = true;

        try {
            const res = await fetch('/__live_reload_status__?t=' + Date.now(), { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                const version = data.version;
                const file = data.file || '';

                if (lastVersion === null) {
                    lastVersion = version;
                    console.log('%c[LiveEdit] Connected! Auto-reload active for live editing.', 'color: #B8924A; font-weight: bold;');
                } else if (version && version !== lastVersion) {
                    lastVersion = version;
                    console.log(`%c[LiveEdit] Edit detected in: ${file}. Updating...`, 'color: #6A1B29; font-weight: bold;');

                    // Seamless hot-reload for CSS changes without reloading the page
                    if (file.toLowerCase().endsWith('.css')) {
                        const links = document.querySelectorAll('link[rel="stylesheet"]');
                        links.forEach(link => {
                            const href = link.href.split('?')[0];
                            link.href = href + '?v=' + Date.now();
                        });
                        showLiveToast(`CSS updated: ${file}`);
                    } else {
                        // For HTML, JS, or image changes: preserve scroll and refresh
                        sessionStorage.setItem('__live_reload_scroll__', window.scrollY);
                        location.reload();
                    }
                }
            }
        } catch (err) {
            // Server disconnected or busy; retries silently
        } finally {
            isChecking = false;
        }
    }

    // Poll every 650ms for snappy responsiveness
    setInterval(checkChanges, 650);
})();

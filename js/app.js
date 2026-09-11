/* ==========================================================================
   JEENA & ALAN — WEDDING INVITATION INTERACTIVE SCRIPT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    /* ----------------------------------------------------------------------
       1. BACKGROUND AUDIO & MUSIC CONTROLLER
       ---------------------------------------------------------------------- */
    const bgMusic = document.getElementById('bg-music');
    const musicBtn = document.getElementById('music-btn');
    const musicBtnText = document.getElementById('music-btn-text');
    let isMusicPlaying = false;

    // Web Audio synthesizer fallback in case audio file format isn't supported
    let audioCtx = null;
    let synthPlaying = false;
    let synthInterval = null;

    function startSynthMelody() {
        if (synthPlaying) return;
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            synthPlaying = true;
            
            // Canon in D soft romantic notes (frequencies in Hz)
            const notes = [
                293.66, 369.99, 440.00, 587.33, // D4, F#4, A4, D5
                220.00, 277.18, 329.63, 440.00, // A3, C#4, E4, A4
                246.94, 293.66, 369.99, 493.88, // B3, D4, F#4, B4
                185.00, 220.00, 277.18, 369.99, // F#3, A3, C#4, F#4
                196.00, 246.94, 293.66, 392.00, // G3, B3, D4, G4
                293.66, 369.99, 440.00, 587.33, // D4, F#4, A4, D5
                196.00, 246.94, 293.66, 392.00, // G3, B3, D4, G4
                220.00, 277.18, 329.63, 440.00  // A3, C#4, E4, A4
            ];
            let noteIdx = 0;

            synthInterval = setInterval(() => {
                if (!synthPlaying || !audioCtx) return;
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(notes[noteIdx], audioCtx.currentTime);
                
                gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.05, audioCtx.currentTime + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.2);

                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start();
                osc.stop(audioCtx.currentTime + 1.3);

                noteIdx = (noteIdx + 1) % notes.length;
            }, 600);
        } catch (e) {
            console.log("AudioContext not supported");
        }
    }

    function stopSynthMelody() {
        synthPlaying = false;
        if (synthInterval) clearInterval(synthInterval);
        if (audioCtx) {
            audioCtx.close().catch(() => {});
            audioCtx = null;
        }
    }

    function playAudio() {
        if (bgMusic && bgMusic.src) {
            bgMusic.play().then(() => {
                isMusicPlaying = true;
                if (musicBtn) musicBtn.classList.add('playing', 'active');
                if (musicBtnText) musicBtnText.textContent = 'Music: On';
            }).catch(() => {
                // Autoplay blocked or media file not playable, trigger soft synthesized melody
                startSynthMelody();
                isMusicPlaying = true;
                if (musicBtn) musicBtn.classList.add('playing', 'active');
                if (musicBtnText) musicBtnText.textContent = 'Music: On';
            });
        } else {
            startSynthMelody();
            isMusicPlaying = true;
            if (musicBtn) musicBtn.classList.add('playing', 'active');
            if (musicBtnText) musicBtnText.textContent = 'Music: On';
        }
    }

    function pauseAudio() {
        if (bgMusic) bgMusic.pause();
        stopSynthMelody();
        isMusicPlaying = false;
        if (musicBtn) musicBtn.classList.remove('playing', 'active');
        if (musicBtnText) musicBtnText.textContent = 'Music: Off';
    }

    if (musicBtn) {
        musicBtn.addEventListener('click', () => {
            if (isMusicPlaying) {
                pauseAudio();
            } else {
                playAudio();
            }
        });
    }

    /* ----------------------------------------------------------------------
       2. INTRO DOOR REVEAL
       ---------------------------------------------------------------------- */
    const introScreen = document.getElementById('intro-screen');
    const floatingBar = document.getElementById('floating-bar');

    // Force page to always start from the very top on fresh load
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    if (introScreen) {
        document.body.classList.add('intro-active');

        introScreen.addEventListener('click', () => {
            // Guarantee page starts from the very beginning / top when opened
            window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            currentScroll = 0;

            introScreen.classList.add('open');
            playAudio();

            setTimeout(() => {
                document.body.classList.remove('intro-active');
                if (floatingBar) floatingBar.classList.add('visible');
                setTimeout(() => {
                    introScreen.style.display = 'none';
                    // Re-confirm scroll is at top (0) before beginning auto-scroll
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                    currentScroll = 0;
                    setTimeout(startAutoScroll, 1200);
                }, 1600);
            }, 1000);
        });
    }

    /* ----------------------------------------------------------------------
       3. CINEMATIC AUTO-SCROLL ENGINE
       ---------------------------------------------------------------------- */
    let autoScrollActive = false;
    let autoScrollRAF = null;
    let userIdleTimer = null;
    let currentScroll = window.scrollY;
    const SCROLL_SPEED = 1.9;    // px per frame (~114px/sec at 60fps)
    const RESUME_DELAY = 4500;   // ms of user idle before resuming auto-scroll

    const autoScrollBtn = document.getElementById('autoscroll-btn');
    const autoScrollText = document.getElementById('autoscroll-text');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    function updateAutoScrollUI(active) {
        if (autoScrollBtn) {
            autoScrollBtn.classList.toggle('active', active);
        }
        if (autoScrollText) {
            autoScrollText.textContent = active ? 'Scroll: On' : 'Scroll: Paused';
        }
        if (statusDot) {
            statusDot.classList.toggle('paused', !active);
        }
        if (statusText) {
            statusText.textContent = active ? 'Auto-Scrolling' : 'Paused';
        }
    }

    function startAutoScroll() {
        if (autoScrollActive) return;
        autoScrollActive = true;
        currentScroll = window.scrollY;
        document.documentElement.style.scrollBehavior = 'auto';
        updateAutoScrollUI(true);

        function step() {
            if (!autoScrollActive) return;
            const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
            if (currentScroll >= maxScroll - 2) {
                autoScrollActive = false;
                document.documentElement.style.scrollBehavior = '';
                updateAutoScrollUI(false);
                return;
            }
            currentScroll += SCROLL_SPEED;
            window.scrollTo(0, Math.round(currentScroll));
            autoScrollRAF = requestAnimationFrame(step);
        }
        autoScrollRAF = requestAnimationFrame(step);
    }

    function pauseAutoScroll(resumable = true) {
        if (!autoScrollActive) return;
        autoScrollActive = false;
        document.documentElement.style.scrollBehavior = '';
        cancelAnimationFrame(autoScrollRAF);
        clearTimeout(userIdleTimer);
        updateAutoScrollUI(false);

        if (resumable) {
            userIdleTimer = setTimeout(startAutoScroll, RESUME_DELAY);
        }
    }

    if (autoScrollBtn) {
        autoScrollBtn.addEventListener('click', () => {
            if (autoScrollActive) {
                pauseAutoScroll(false); // manual pause, don't auto-resume
            } else {
                clearTimeout(userIdleTimer);
                startAutoScroll();
            }
        });
    }

    // Gracefully pause on user input
    ['wheel', 'touchstart', 'touchmove', 'mousedown', 'keydown'].forEach(evt => {
        window.addEventListener(evt, () => {
            if (autoScrollActive) {
                pauseAutoScroll(true);
            }
        }, { passive: true });
    });

    /* ----------------------------------------------------------------------
       4. SCROLL PROGRESS BAR & PARALLAX
       ---------------------------------------------------------------------- */
    const progressBar = document.getElementById('scroll-progress');

    function onScroll() {
        const scrolled = window.scrollY;
        const total = document.documentElement.scrollHeight - window.innerHeight;
        if (progressBar && total > 0) {
            progressBar.style.width = ((scrolled / total) * 100) + '%';
        }

        // Detect if user manually scrolled while auto-scroll thought it was running
        if (autoScrollActive && Math.abs(scrolled - Math.round(currentScroll)) > 15) {
            pauseAutoScroll(true);
        }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    /* ----------------------------------------------------------------------
       5. INTERSECTION OBSERVER FOR REVEALS
       ---------------------------------------------------------------------- */
    const revealElements = document.querySelectorAll('.reveal-up');
    const revealObserver = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    /* ----------------------------------------------------------------------
       6. DUAL COUNTDOWN TIMER (WEDDING & ENGAGEMENT)
       ---------------------------------------------------------------------- */
    const dates = {
        wedding: {
            target: new Date('October 5, 2026 11:00:00 GMT+05:30').getTime(),
            label: "Monday, 5th October 2026 • 11:00 AM"
        },
        engagement: {
            target: new Date('October 1, 2026 11:30:00 GMT+05:30').getTime(),
            label: "Thursday, 1st October 2026 • 11:30 AM"
        }
    };

    let activeCountdown = 'wedding';
    const cdDays = document.getElementById('cd-days');
    const cdHours = document.getElementById('cd-hours');
    const cdMins = document.getElementById('cd-mins');
    const cdSecs = document.getElementById('cd-secs');
    const cdTargetLabel = document.getElementById('countdown-target-label');

    function updateCountdown() {
        const now = Date.now();
        const dist = dates[activeCountdown].target - now;

        if (dist <= 0) {
            if (cdDays) cdDays.innerText = '00';
            if (cdHours) cdHours.innerText = '00';
            if (cdMins) cdMins.innerText = '00';
            if (cdSecs) cdSecs.innerText = '00';
            return;
        }

        const days = Math.floor(dist / (1000 * 60 * 60 * 24));
        const hours = Math.floor((dist % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((dist % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((dist % (1000 * 60)) / 1000);

        if (cdDays) cdDays.innerText = String(days).padStart(2, '0');
        if (cdHours) cdHours.innerText = String(hours).padStart(2, '0');
        if (cdMins) cdMins.innerText = String(mins).padStart(2, '0');
        if (cdSecs) {
            cdSecs.innerText = String(secs).padStart(2, '0');
            const secBox = cdSecs.closest('.cd-box');
            if (secBox) {
                secBox.classList.add('tick');
                setTimeout(() => secBox.classList.remove('tick'), 200);
            }
        }
    }

    setInterval(updateCountdown, 1000);
    updateCountdown();

    window.switchCountdown = function(type) {
        activeCountdown = type;
        if (cdTargetLabel) {
            cdTargetLabel.textContent = dates[type].label;
        }
        document.querySelectorAll('.cd-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.target === type);
        });
        updateCountdown();
    };

    /* ----------------------------------------------------------------------
       7. TABBED GOOGLE MAP SWITCHER
       ---------------------------------------------------------------------- */
    const mapUrls = {
        ceremony: "https://maps.google.com/maps?q=St.+Stephen%27s+Mount+Tabor+Diara+Chapel+Pathanapuram&t=&z=15&ie=UTF8&iwloc=&output=embed",
        engagement: "https://maps.google.com/maps?q=Hill+Garden+Parankimmamukal+Junction+Thalavoor&t=&z=15&ie=UTF8&iwloc=&output=embed",
        reception: "https://maps.google.com/maps?q=Crown+Convention+Centre+Kallumkadavu+Pathanapuram&t=&z=15&ie=UTF8&iwloc=&output=embed"
    };

    window.switchVenueMap = function(venueType) {
        const iframe = document.getElementById('venue-map-iframe');
        if (iframe && mapUrls[venueType]) {
            iframe.src = mapUrls[venueType];
        }
        document.querySelectorAll('.map-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.venue === venueType);
        });
    };

    /* ----------------------------------------------------------------------
       8. PHOTO GALLERY LIGHTBOX
       ---------------------------------------------------------------------- */
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('gallery-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');
    const lightboxPrev = document.getElementById('lightbox-prev');
    const lightboxNext = document.getElementById('lightbox-next');

    let currentGalleryIdx = 0;
    const galleryData = [];

    galleryItems.forEach((item, idx) => {
        const img = item.querySelector('img');
        const title = item.querySelector('.gallery-caption-title')?.textContent || '';
        const sub = item.querySelector('.gallery-caption-sub')?.textContent || '';
        
        galleryData.push({
            src: img ? img.src : '',
            caption: `${title} — ${sub}`
        });

        item.addEventListener('click', () => {
            openLightbox(idx);
        });
    });

    function openLightbox(idx) {
        if (!lightbox || !galleryData[idx]) return;
        currentGalleryIdx = idx;
        lightboxImg.src = galleryData[idx].src;
        lightboxCaption.textContent = galleryData[idx].caption;
        lightbox.classList.add('active');
        pauseAutoScroll(false);
    }

    function closeLightbox() {
        if (lightbox) lightbox.classList.remove('active');
    }

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });
    }

    if (lightboxPrev) {
        lightboxPrev.addEventListener('click', (e) => {
            e.stopPropagation();
            currentGalleryIdx = (currentGalleryIdx - 1 + galleryData.length) % galleryData.length;
            openLightbox(currentGalleryIdx);
        });
    }

    if (lightboxNext) {
        lightboxNext.addEventListener('click', (e) => {
            e.stopPropagation();
            currentGalleryIdx = (currentGalleryIdx + 1) % galleryData.length;
            openLightbox(currentGalleryIdx);
        });
    }

    document.addEventListener('keydown', (e) => {
        if (!lightbox || !lightbox.classList.contains('active')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft' && lightboxPrev) lightboxPrev.click();
        if (e.key === 'ArrowRight' && lightboxNext) lightboxNext.click();
    });
    /* ----------------------------------------------------------------------
       9. FLOATING PETALS & SPARKLES
       ---------------------------------------------------------------------- */
    const particlesContainer = document.getElementById('particles-container');
    if (particlesContainer) {
        for (let i = 0; i < 28; i++) {
            const p = document.createElement('div');
            p.classList.add('particle-petal');

            const size = Math.floor(Math.random() * 9 + 6);
            const left = Math.random() * 100;
            const dur = (Math.random() * 14 + 14).toFixed(1);
            const del = (Math.random() * 18).toFixed(1);
            const maxOp = (Math.random() * 0.28 + 0.16).toFixed(2);
            const sway = Math.floor(Math.random() * 90 - 45);
            const rot = Math.floor(Math.random() * 360 + 180);

            // Palette matching Burgundy / Rose / Gold
            const colors = [
                'linear-gradient(135deg, rgba(106, 27, 41, 0.55), rgba(201, 125, 138, 0.45))',
                'linear-gradient(135deg, rgba(232, 204, 209, 0.75), rgba(184, 146, 74, 0.45))',
                'linear-gradient(135deg, rgba(184, 146, 74, 0.65), rgba(245, 236, 225, 0.6))'
            ];
            const bg = colors[i % colors.length];

            p.style.cssText = `
                width: ${size}px;
                height: ${size * 1.3}px;
                left: ${left}%;
                background: ${bg};
                --dur: ${dur}s;
                --max-op: ${maxOp};
                --sway: ${sway}px;
                --rot: ${rot}deg;
                animation-delay: ${del}s;
                border-radius: ${Math.random() > 0.5 ? '60% 0 60% 0' : '0 60% 0 60%'};
            `;
            particlesContainer.appendChild(p);
        }
    }

});

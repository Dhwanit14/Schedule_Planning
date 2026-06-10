/* =========================================
   MOBILE TOUCH ENGINE (LONG-PRESS UPDATE)
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure the grid is fully rendered
    setTimeout(initTouchInteractions, 300);
});

function initTouchInteractions() {
    const grid = document.querySelector('.calendar-grid');
    if (!grid) return;

    // 1. HORIZONTAL CAROUSEL SNAP & RIBBON SYNC (Unchanged)
    const observerOptions = { root: grid, rootMargin: '0px', threshold: 0.6 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.id;
                const dayName = activeId.split('-')[1];
                updateMobileRibbon(dayName);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.day-column').forEach(col => observer.observe(col));

    // 2. LONG PRESS (Hold to open actions)
    bindCardLongPress();
}

function updateMobileRibbon(activeDay) {
    const daysOfWeekArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const activeIndex = daysOfWeekArray.indexOf(activeDay);
    if (activeIndex === -1) return;

    const btns = document.querySelectorAll('.mobile-nav-btn');
    btns.forEach((btn, index) => {
        btn.classList.toggle('active', index === activeIndex);
    });

    const glide = document.getElementById('nav-glide');
    if (glide) glide.style.transform = `translateX(${activeIndex * 100}%)`;
}

function bindCardLongPress() {
    const grid = document.getElementById('calendar-grid');
    let pressTimer;
    let activeCard = null;
    let startX = 0, startY = 0;

    // When the finger touches the card...
    grid.addEventListener('touchstart', (e) => {
        const card = e.target.closest('.event');
        if (!card) return;

        activeCard = card;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;

        // Add a visual CSS class to show it is being pressed down
        card.classList.add('pressing-card');

        // Start the hold timer (450 milliseconds)
        pressTimer = setTimeout(() => {
            // Trigger a physical phone vibration!
            if (navigator.vibrate) navigator.vibrate(40); 
            
            card.classList.remove('pressing-card');
            const taskId = card.id.replace('task-', '');
            
            // Set the target ID for main.js to use
            ctxSelectedId = taskId;
            
            // Trigger the menu to slide up from the bottom
            const menu = document.getElementById('context-menu');
            if (menu) {
                menu.style.display = 'block';
                menu.classList.add('mobile-active'); 
            }
        }, 450); 
    }, { passive: true });

    // Cancel the press if they start dragging their finger (scrolling)
    grid.addEventListener('touchmove', (e) => {
        if (!activeCard) return;
        const moveX = e.touches[0].clientX;
        const moveY = e.touches[0].clientY;
        
        // If finger moves more than 10 pixels, it's a scroll, not a hold
        if (Math.abs(moveX - startX) > 10 || Math.abs(moveY - startY) > 10) {
            clearTimeout(pressTimer);
            activeCard.classList.remove('pressing-card');
            activeCard = null;
        }
    }, { passive: true });

    // Cancel the press if they let go early (Standard Tap)
    grid.addEventListener('touchend', () => {
        clearTimeout(pressTimer);
        if (activeCard) {
            activeCard.classList.remove('pressing-card');
            activeCard = null;
        }
    }, { passive: true });
    
    // Hide the action menu when tapping anywhere else on the screen
    document.addEventListener('touchstart', (e) => {
        const menu = document.getElementById('context-menu');
        if (menu && !e.target.closest('#context-menu') && !e.target.closest('.event')) {
            menu.style.display = 'none';
            menu.classList.remove('mobile-active');
        }
    });
}
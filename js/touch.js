/* =========================================
   MOBILE TOUCH & SWIPE ENGINE
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure the grid is fully rendered by main.js
    setTimeout(initTouchInteractions, 300);
});

function initTouchInteractions() {
    // 1. HORIZONTAL CAROUSEL SNAP & RIBBON SYNC
    const grid = document.querySelector('.calendar-grid');
    if (!grid) return;

    // Use IntersectionObserver to detect which day is currently visible on the phone screen
    const observerOptions = {
        root: grid,
        rootMargin: '0px',
        threshold: 0.6 // Trigger when a column is 60% visible in the viewport
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const activeId = entry.target.id; // e.g., 'col-Monday'
                const dayName = activeId.split('-')[1];
                updateMobileRibbon(dayName);
            }
        });
    }, observerOptions);

    // Observe all day columns
    document.querySelectorAll('.day-column').forEach(col => {
        observer.observe(col);
    });

    // 2. SLIDE-TO-REVEAL QUICK ACTIONS (Swipe Left to Delete)
    bindSwipeToDelete();
}

function updateMobileRibbon(activeDay) {
    const daysOfWeekArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const activeIndex = daysOfWeekArray.indexOf(activeDay);
    if (activeIndex === -1) return;

    // Update button colors to highlight the active day
    const btns = document.querySelectorAll('.mobile-nav-btn');
    btns.forEach((btn, index) => {
        if (index === activeIndex) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Move the neon glide underline smoothly to the new active day
    const glide = document.getElementById('nav-glide');
    if (glide) {
        // Moves the underline by 100% of its own width per day step
        glide.style.transform = `translateX(${activeIndex * 100}%)`;
    }
}

function bindSwipeToDelete() {
    const grid = document.getElementById('calendar-grid');
    let startX = 0;
    let currentX = 0;
    let activeCard = null;

    // When the user touches a task card...
    grid.addEventListener('touchstart', (e) => {
        // Ensure we are only grabbing task cards, not the background
        const card = e.target.closest('.event');
        if (!card) return;
        
        startX = e.touches[0].clientX;
        activeCard = card;
        activeCard.style.transition = 'none'; // Remove CSS transition for direct 1:1 finger tracking
    }, { passive: true });

    // As the user drags their finger...
    grid.addEventListener('touchmove', (e) => {
        if (!activeCard) return;
        currentX = e.touches[0].clientX;
        const diffX = currentX - startX;

        // Only allow sliding to the left (negative diff) and cap it at -90px
        if (diffX < 0 && diffX > -90) {
            activeCard.style.transform = `translateX(${diffX}px)`;
            
            // If swiped far enough, pulse the border red to indicate danger
            if (diffX < -60) {
                activeCard.style.borderColor = '#ef4444';
                activeCard.style.boxShadow = '-10px 0 20px rgba(239, 68, 68, 0.2)';
            } else {
                activeCard.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                activeCard.style.boxShadow = 'none';
            }
        }
    }, { passive: true });

    // When the user lets go...
    grid.addEventListener('touchend', (e) => {
        if (!activeCard) return;
        // Restore smooth CSS animation for the snap-back or delete
        activeCard.style.transition = 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'; 
        
        const diffX = currentX - startX;
        
        // If swiped past the "danger" threshold, trigger the delete action
        if (diffX < -60) {
            const taskId = activeCard.id.replace('task-', '');
            if (confirm('Delete this task?')) {
                ctxSelectedId = taskId;
                ctxAction('delete'); // Calls the delete function from main.js
            } else {
                // If they cancel, snap the card back to normal
                activeCard.style.transform = `translateX(0)`;
                activeCard.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                activeCard.style.boxShadow = 'none';
            }
        } else {
            // If they didn't swipe far enough, snap it back
            activeCard.style.transform = `translateX(0)`;
            activeCard.style.borderColor = 'rgba(255, 255, 255, 0.05)';
            activeCard.style.boxShadow = 'none';
        }
        
        activeCard = null; // Reset
    });
}
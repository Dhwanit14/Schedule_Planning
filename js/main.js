/* =========================================
   CORE UI & INITIALIZATION
   ========================================= */
function applyDynamicStylesAndUI() {
    let cssStr = ''; 
    const filterContainer = document.getElementById('filter-container'); 
    const modalSelect = document.getElementById('modalCategory');
    if(filterContainer) filterContainer.innerHTML = ''; 
    if(modalSelect) modalSelect.innerHTML = '';

    for (const [id, tag] of Object.entries(appTags)) {
        cssStr += `
            .${id} { border-left: 4px solid ${tag.color}; }
            .${id}:hover { background: ${tag.color}15; }
        `;
        if(filterContainer) filterContainer.innerHTML += `<button class="filter-btn" data-cat="${id}" onclick="filterEvents('${id}', this)">${tag.name}</button>`;
        if(modalSelect) modalSelect.innerHTML += `<option value="${id}">${tag.name}</option>`;
    }
    
    if(filterContainer) {
        filterContainer.innerHTML += `<button class="clear-btn active" data-cat="all" onclick="filterEvents('all', this)">[Clear_Filters]</button> <button class="action-btn" onclick="openTagManager()">⚙️ Config</button>`;
    }
    
    const dynamicStyleTag = document.getElementById('dynamic-tag-styles');
    if (!dynamicStyleTag) {
        const style = document.createElement('style');
        style.id = 'dynamic-tag-styles';
        document.head.appendChild(style);
    }
    document.getElementById('dynamic-tag-styles').innerHTML = cssStr;
}

function toggleWeek() {
    currentWeek = currentWeek === 1 ? 2 : 1;
    updateTimeframeIndicator();
    document.getElementById('week-btn').innerText = `Switch to Week ${currentWeek === 1 ? 2 : 1}`;
    smoothRefresh();
}

function smoothRefresh() {
    const grid = document.getElementById('calendar-grid');
    grid.style.opacity = '0';
    setTimeout(() => {
        try { renderGrid(); } catch(e) { console.error(e); } 
        finally { grid.style.opacity = '1'; }
    }, 200);
}

/* =========================================
   GRID RENDERING ENGINE
   ========================================= */
function renderGrid() {
    const grid = document.getElementById('calendar-grid'); 
    grid.innerHTML = '';
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let todayIndex = new Date().getDay() - 1; 
    if (todayIndex === -1) todayIndex = 6; 

    daysOfWeek.forEach((day, index) => {
        let isTodayClass = (currentWeek === 1 && index === todayIndex) ? 'is-today' : '';
        let col = document.createElement('div');
        col.className = `day-column ${isTodayClass}`;
        col.id = `col-${day}`;
        col.style.animationDelay = `${index * 0.06}s`; // Staggered mobile load
        
        // Native Desktop Drag & Drop logic
        col.setAttribute('ondragover', 'allowDrop(event)');
        col.setAttribute('ondragleave', 'dragLeave(event)');
        col.setAttribute('ondrop', `drop(event, '${day}')`);
        
        col.innerHTML = `<div class="day-name">${day}</div>`;

        let dayTasks = [];
        for (let key in allTasks) {
            if (key.startsWith(`W${currentWeek}-${day}-`)) {
                let startHour = parseInt(key.split('-')[2]);
                dayTasks.push({ id: key, hour: startHour, data: allTasks[key] });
            }
        }
        dayTasks.sort((a, b) => a.hour - b.hour);

        dayTasks.forEach(taskObj => {
            let task = taskObj.data;
            let start = taskObj.hour;
            let end = start + task.duration;
            let completedClass = (task.status === 'complete' || task.completed) ? 'completed' : '';
            
            // New Feature: Overtime Heat Accel for incomplete past tasks
            let isPast = (new Date().getHours() >= end && isTodayClass !== '');
            let liquidClass = (task.status === 'incomplete') ? 'liquid-warning' : '';
            if (liquidClass && isPast) liquidClass += ' overtime-heat-accel';

            let tagColor = appTags[task.category] ? appTags[task.category].color : 'var(--color-accent)';
            let noteIcon = (task.notes && task.notes.trim() !== '') ? `<div class="note-indicator" style="background:${tagColor}"></div>` : '';
            let timeString = `${formatTime(start)} - ${formatTime(end)}`;

            let card = document.createElement('div');
            card.id = `task-${taskObj.id}`;
            card.className = `event ${task.category} ${completedClass} ${liquidClass}`;
            card.setAttribute('draggable', 'true');
            card.setAttribute('ondragstart', `dragStart(event, '${taskObj.id}')`);
            card.setAttribute('oncontextmenu', `handleContextMenu(event, '${taskObj.id}')`);
            
            // Mobile Feature: Double-Tap to Complete 
            let lastTap = 0;
            card.addEventListener('touchend', function(e) {
                let currentTime = new Date().getTime();
                let tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    ctxSelectedId = taskObj.id;
                    ctxAction('complete');
                    e.preventDefault();
                } else {
                    setTimeout(() => { if(currentTime - lastTap > 500) openTaskModal(taskObj.id, day, start); }, 500);
                }
                lastTap = currentTime;
            });
            // Desktop fallback click
            card.onclick = (e) => {
                if(e.detail === 2) {
                    ctxSelectedId = taskObj.id;
                    ctxAction('complete');
                } else {
                    setTimeout(() => { if(e.detail === 1) openTaskModal(taskObj.id, day, start); }, 200);
                }
            };
            
            // New Feature: Live Fill Opacity 
            let fillWidth = '0%';
            if (isTodayClass !== '') {
                let currH = new Date().getHours();
                if (currH >= start && currH < end) {
                    let minsPassed = new Date().getMinutes();
                    let totalMins = task.duration * 60;
                    let passedTotal = ((currH - start) * 60) + minsPassed;
                    fillWidth = `${(passedTotal / totalMins) * 100}%`;
                } else if (currH >= end) {
                    fillWidth = '100%';
                }
            }
            
            card.innerHTML = `
                <div class="event-progress-fill" style="width: ${fillWidth};"></div>
                <span class="event-time">${timeString}</span>
                <span class="event-title">${task.title || 'Untitled'}</span>
                ${noteIcon}
            `;
            col.appendChild(card);
        });

        let addBtn = document.createElement('div');
        addBtn.className = 'add-task-btn';
        addBtn.innerText = '+ Add Task';
        addBtn.onclick = () => openTaskModal(null, day, 8);
        col.appendChild(addBtn);
        grid.appendChild(col);
    });

    let activeBtn = document.querySelector('.controls button.active');
    if (activeBtn) filterEvents(activeBtn.getAttribute('data-cat'), activeBtn);

    updateInsights(); 
    buildMobileNav(); // Generates mobile swipe tracker
}

/* =========================================
   DASHBOARD & DATA AGGREGATION
   ========================================= */
function updateInsights() {
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let totals = {}; let grandTotal = 0;
    
    for (const id of Object.keys(appTags)) totals[id] = 0;
    
    for (const [key, task] of Object.entries(allTasks)) {
        if (key.startsWith(`W${currentWeek}-`) && totals[task.category] !== undefined) { 
            totals[task.category] += task.duration; 
            grandTotal += task.duration; 
        }
    }
    
    document.getElementById('total-hours').innerText = `${grandTotal} Hours (Week ${currentWeek})`;
    const barContainer = document.getElementById('insights-bar-container');
    if(barContainer) {
        barContainer.innerHTML = '';
        if (grandTotal === 0) return;
        for (const [id, tag] of Object.entries(appTags)) {
            if (totals[id] > 0) {
                let percent = (totals[id] / grandTotal) * 100;
                barContainer.innerHTML += `<div class="insight-segment" style="width: ${percent}%; background: ${tag.color};" data-label="${tag.name}: ${totals[id]}h"></div>`;
            }
        }
    }
}

/* =========================================
   MOBILE RIBBON INJECTION
   ========================================= */
function buildMobileNav() {
    if (!document.getElementById('mobile-nav-ribbon')) {
        const ribbon = document.createElement('div');
        ribbon.id = 'mobile-nav-ribbon';
        ribbon.className = 'mobile-nav-ribbon';
        
        const initials = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
        initials.forEach((init, i) => {
            let btn = document.createElement('button');
            btn.className = 'mobile-nav-btn' + (i === 0 ? ' active' : '');
            btn.innerText = init;
            btn.onclick = () => document.getElementById(`col-${daysOfWeek[i]}`).scrollIntoView({ behavior: 'smooth' });
            ribbon.appendChild(btn);
        });
        
        const glide = document.createElement('div');
        glide.className = 'nav-underline-glide';
        glide.id = 'nav-glide';
        ribbon.appendChild(glide);
        
        const header = document.querySelector('.header-section');
        header.insertBefore(ribbon, document.querySelector('.controls-top'));
    }
}

/* =========================================
   MODAL, EDITING & CONFLICT LOGIC
   ========================================= */
function filterEvents(cat, btn) {
    if(btn) { document.querySelectorAll('.controls button').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    document.querySelectorAll('.event:not(.add-task-btn)').forEach(ev => {
        if (cat === 'all' || ev.classList.contains(cat)) ev.classList.remove('dimmed');
        else ev.classList.add('dimmed');
    });
}

function openTaskModal(blockId, dayStr, defaultHour) {
    currentSelectedId = blockId; currentEditDay = dayStr;
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let taskData = blockId && allTasks[blockId] ? allTasks[blockId] : { title: '', category: 'cat-work', notes: '', status: 'active', duration: 1 };
    let startHour = blockId ? parseInt(blockId.split('-')[2]) : defaultHour;
    
    const titleInput = document.getElementById('modalTaskTitle');
    titleInput.value = taskData.title; titleInput.classList.remove('error-shake');
    document.getElementById('modalCategory').value = taskData.category || 'cat-work';
    
    // New Feature: Quick Day-Migration Dropdown (Mobile replacement for Drag & Drop)
    let daySelect = document.getElementById('modalDaySelect');
    if (!daySelect) {
        daySelect = document.createElement('select');
        daySelect.id = 'modalDaySelect';
        daySelect.style.marginBottom = '16px';
        daysOfWeek.forEach(d => {
            let opt = document.createElement('option');
            opt.value = d; opt.innerText = `Move to: ${d}`;
            daySelect.appendChild(opt);
        });
        document.getElementById('modalTaskTitle').after(daySelect);
    }
    daySelect.value = currentEditDay;

    const startSelect = document.getElementById('modalStartTime'); startSelect.innerHTML = '';
    const endSelect = document.getElementById('modalEndTime'); endSelect.innerHTML = '';
    
    for (let i = 0; i < 24; i++) {
        startSelect.innerHTML += `<option value="${i}" ${i === startHour ? 'selected' : ''}>Start: ${formatTime(i)}</option>`;
        let endVal = i + 1;
        endSelect.innerHTML += `<option value="${endVal}" ${endVal === startHour + taskData.duration ? 'selected' : ''}>End: ${formatTime(endVal)}</option>`;
    }

    document.getElementById('modalNotes').value = taskData.notes || '';
    document.querySelector('.modal').classList.remove('conflict-pulse-warning');
    
    document.getElementById('taskModal').style.display = 'flex';
}

function saveTask(newStatus) {
    const titleInput = document.getElementById('modalTaskTitle');
    if (titleInput.value.trim() === '') { 
        titleInput.classList.remove('error-shake'); void titleInput.offsetWidth; 
        titleInput.classList.add('error-shake'); return; 
    }

    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let targetDay = document.getElementById('modalDaySelect') ? document.getElementById('modalDaySelect').value : currentEditDay;
    let startHour = parseInt(document.getElementById('modalStartTime').value);
    let endHour = parseInt(document.getElementById('modalEndTime').value);
    let duration = Math.max(1, endHour - startHour);
    
    let newId = `W${currentWeek}-${targetDay}-${startHour}`;
    
    // New Feature: Non-Blocking Overlay Conflict Engine
    if (currentSelectedId !== newId && allTasks[newId]) {
        const modal = document.querySelector('.modal');
        modal.classList.add('conflict-pulse-warning');
        
        while (allTasks[newId]) { startHour++; newId = `W${currentWeek}-${targetDay}-${startHour}`; }
        titleInput.value = `[Shifted] ${titleInput.value}`;
    }

    let existingTask = currentSelectedId ? allTasks[currentSelectedId] : {};
    let finalStatus = newStatus === 'active' && existingTask.status ? existingTask.status : newStatus;

    let newTaskData = { 
        title: titleInput.value.replace('[Shifted] ', ''), 
        category: document.getElementById('modalCategory').value, 
        notes: document.getElementById('modalNotes').value, 
        duration: duration, 
        status: finalStatus, 
        completed: finalStatus === 'complete' 
    };

    if (currentSelectedId && currentSelectedId !== newId) delete allTasks[currentSelectedId];
    allTasks[newId] = newTaskData;
    
    localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks));
    closeModal('taskModal'); smoothRefresh(); 
}

function deleteTask() {
    if (currentSelectedId) {
        let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
        delete allTasks[currentSelectedId];
        localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks));
    }
    closeModal('taskModal'); smoothRefresh();
}

/* =========================================
   QUICK ACTIONS & CONTEXT MENUS
   ========================================= */
function ctxAction(action) {
    if(!ctxSelectedId) return; 
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let task = allTasks[ctxSelectedId]; if(!task) return;
    
    if (action === 'complete') {
        task.status = (task.status === 'complete') ? 'active' : 'complete';
        task.completed = (task.status === 'complete');
        allTasks[ctxSelectedId] = task;
        localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks));
        
        let card = document.getElementById(`task-${ctxSelectedId}`);
        if (card && task.completed) {
            card.classList.add('matrix-glitch'); // Trigger Matrix Glitch animation
            setTimeout(() => card.classList.add('just-completed'), 150);
            setTimeout(() => smoothRefresh(), 550);
            return;
        }
    }
    else if (action === 'incomplete') task.status = (task.status === 'incomplete') ? 'active' : 'incomplete';
    else if (action === 'delete') { delete allTasks[ctxSelectedId]; localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks)); smoothRefresh(); return; }
    
    task.completed = (task.status === 'complete');
    allTasks[ctxSelectedId] = task; localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks)); smoothRefresh();
}

function handleContextMenu(e, id) { 
    e.preventDefault(); e.stopPropagation(); ctxSelectedId = id; 
    const m = document.getElementById('context-menu'); 
    m.style.display = 'block'; m.style.left = `${e.pageX}px`; m.style.top = `${e.pageY}px`; 
}
document.addEventListener('click', () => { document.getElementById('context-menu').style.display = 'none'; });

function toggleFocusMode() { document.body.classList.toggle('focus-active'); document.getElementById('focusToggle').classList.toggle('active'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; currentSelectedId = null; }

/* =========================================
   TAGS & DRAG-AND-DROP HANDLERS
   ========================================= */
function openTagManager() {
    const c = document.getElementById('tag-edit-container'); c.innerHTML = '';
    for (const [id, t] of Object.entries(appTags)) c.innerHTML += `<div class="tag-edit-row"><input type="color" id="color-${id}" value="${t.color}"><input type="text" id="name-${id}" value="${t.name}"></div>`;
    document.getElementById('tagModal').style.display = 'flex';
}
function saveTags() {
    for (const id of Object.keys(appTags)) { appTags[id].name = document.getElementById(`name-${id}`).value; appTags[id].color = document.getElementById(`color-${id}`).value; }
    localStorage.setItem('plannerAppTags', JSON.stringify(appTags)); applyDynamicStylesAndUI(); closeModal('tagModal'); smoothRefresh(); 
}

function dragStart(ev, sourceId) { ev.dataTransfer.setData("text/plain", sourceId); }
function allowDrop(ev) { ev.preventDefault(); ev.currentTarget.classList.add('drag-over'); }
function dragLeave(ev) { ev.currentTarget.classList.remove('drag-over'); }
function drop(ev, targetDay) {
    ev.preventDefault(); ev.currentTarget.classList.remove('drag-over');
    const sourceId = ev.dataTransfer.getData("text/plain"); if(!sourceId) return;
    
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let task = allTasks[sourceId]; if(!task) return;
    
    let startHour = parseInt(sourceId.split('-')[2]);
    let newId = `W${currentWeek}-${targetDay}-${startHour}`;
    while (allTasks[newId] && newId !== sourceId) { startHour++; newId = `W${currentWeek}-${targetDay}-${startHour}`; }
    
    if (newId !== sourceId) {
        allTasks[newId] = task; delete allTasks[sourceId];
        localStorage.setItem('plannerAppTasks', JSON.stringify(allTasks)); smoothRefresh();
    }
}

/* =========================================
   BOOTSTRAP
   ========================================= */
document.addEventListener('DOMContentLoaded', () => {
    applyDynamicStylesAndUI();
    updateTimeframeIndicator();
    renderGrid();
});
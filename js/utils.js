/* =========================================
   GLOBAL STATE & VARIABLES
   ========================================= */
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
let currentWeek = 1;
let currentSelectedId = null; 
let currentEditDay = null; 
let ctxSelectedId = null;

const defaultTags = {
    'cat-work': { name: 'Work', color: '#38bdf8' },
    'cat-study': { name: 'Study / Linux', color: '#4ade80' },
    'cat-cook': { name: 'Cooking / Prep', color: '#fbbf24' },
    'cat-chill': { name: 'Chilling', color: '#c084fc' }
};

// Load tags from storage or use defaults
let appTags = JSON.parse(localStorage.getItem('plannerAppTags')) || defaultTags;


/* =========================================
   DATA MANAGEMENT & MIGRATION
   ========================================= */
function migrateData() {
    let allTasks = JSON.parse(localStorage.getItem('plannerAppTasks')) || {};
    let migrated = false; 
    const newTasks = {};
    
    for (let key in allTasks) {
        if (!key.startsWith('W1-') && !key.startsWith('W2-')) { 
            newTasks['W1-' + key] = allTasks[key]; 
            migrated = true; 
        } else { 
            newTasks[key] = allTasks[key]; 
        }
    }
    if (migrated) localStorage.setItem('plannerAppTasks', JSON.stringify(newTasks));
}
migrateData(); // Auto-run on load


/* =========================================
   BACKUP, IMPORT & NUKE
   ========================================= */
function exportData() {
    const data = { tags: appTags, tasks: JSON.parse(localStorage.getItem('plannerAppTasks')) || {} };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob); 
    a.download = 'schedule-backup.json';
    document.body.appendChild(a); 
    a.click(); 
    document.body.removeChild(a);
}

function importData(e) {
    const f = e.target.files[0]; 
    if(!f) return; 
    const r = new FileReader();
    
    r.onload = function(ev) {
        try {
            const data = JSON.parse(ev.target.result);
            if (data.tasks) localStorage.setItem('plannerAppTasks', JSON.stringify(data.tasks));
            if (data.tags) { 
                localStorage.setItem('plannerAppTags', JSON.stringify(data.tags)); 
                appTags = data.tags; 
            }
            migrateData(); 
            // Call functions from main.js safely
            if (typeof applyDynamicStylesAndUI === 'function') applyDynamicStylesAndUI(); 
            if (typeof smoothRefresh === 'function') smoothRefresh();
        } catch(err) { 
            alert("Error parsing file. Please ensure it is a valid JSON backup."); 
        }
    }; 
    r.readAsText(f);
}

function nukeSchedule() { 
    if (confirm("🚨 Clear entire 14-day schedule? This cannot be undone unless you have a backup.")) { 
        localStorage.removeItem('plannerAppTasks'); 
        if (typeof smoothRefresh === 'function') smoothRefresh(); 
    } 
}


/* =========================================
   UTILITY FORMATTERS
   ========================================= */
function formatTime(hour) {
    let ampm = hour >= 12 && hour < 24 ? 'PM' : 'AM'; 
    let displayHour = hour % 12 || 12; 
    return `${displayHour.toString().padStart(2, '0')}:00 ${ampm}`;
}

function updateTimeframeIndicator() {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
    
    let mondayDate = new Date(today.setDate(diffToMonday));
    
    if (currentWeek === 2) {
        mondayDate.setDate(mondayDate.getDate() + 7);
    }
    
    let sundayDate = new Date(mondayDate);
    sundayDate.setDate(sundayDate.getDate() + 6);
    
    const options = { month: 'short', day: 'numeric' };
    const indicator = document.getElementById('week-indicator');
    
    if (indicator) {
        indicator.innerText = `Execution timeframe: ${mondayDate.toLocaleDateString('en-CA', options)} - ${sundayDate.toLocaleDateString('en-CA', options)}`;
    }
}
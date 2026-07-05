/* ═══════════════════════════════════════════
   TALENT FLOW — Student Dashboard
   student-dashboard.js
   Reads profile data from localStorage ("tf_student_profile")
   so name and avatar reflect what was entered in
   student-profile.html and saved in settings.html.
═══════════════════════════════════════════ */

// ── Profile bridge ───────────────────────

const PROFILE_KEY = 'tf_student_profile';

function getSavedProfile() {
    try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || {}; }
    catch { return {}; }
}

/**
 * Apply stored profile data to all dynamic name/avatar
 * slots in the dashboard: welcome banner, nav avatar,
 * profile popup header and name.
 */
function applyProfileToUI() {
    const p = getSavedProfile();
    if (!Object.keys(p).length) return; // nothing saved yet — keep defaults

    // Welcome banner name
    const wbName = document.querySelector('.wb-name');
    if (wbName && p.fullName) {
        wbName.textContent = `${p.fullName} 👋`;
        // Keep the STUDENT object in sync for anything else that reads it
        STUDENT.name = p.fullName;
    }

    // Nav avatar (small circle)
    const navAvatar = document.querySelector('.avatar-wrap > img');
    if (navAvatar && p.avatar) navAvatar.src = p.avatar;

    // Profile popup — large avatar
    const popupAvatar = document.querySelector('.pp-header > img');
    if (popupAvatar && p.avatar) popupAvatar.src = p.avatar;

    // Profile popup — name
    const ppName = document.querySelector('.pp-name');
    if (ppName && p.fullName) ppName.textContent = p.fullName;
}

// ── DATA ──────────────────────────────────

const STUDENT = {
    name:   'Alex Johnson', // overwritten by applyProfileToUI if localStorage has data
    streak: 14,
};

const COURSES = [
    {
        title:      'Introduction to Product Design',
        thumb:      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=80&q=70',
        progress:   75,
        lessons:    10,
        completed:  7,
        instructor: 'Dr. Sarah Mensah',
        status:     'published',
    },
    {
        title:      'UI/UX Design Fundamentals',
        thumb:      'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?w=80&q=70',
        progress:   40,
        lessons:    12,
        completed:  5,
        instructor: 'Prof. James Okafor',
        status:     'published',
    },
    {
        title:      'Frontend Development for Designers',
        thumb:      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=80&q=70',
        progress:   20,
        lessons:    9,
        completed:  2,
        instructor: 'Ms. Priya Nair',
        status:     'draft',
    },
    {
        title:      'Data Analysis with Python & SQL',
        thumb:      'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70',
        progress:   55,
        lessons:    9,
        completed:  5,
        instructor: 'Dr. Kofi Asante',
        status:     'published',
    },
];

const ASSIGNMENTS = {
    pending: [
        {
            title:    'Brand Identity Case Study',
            course:   'Introduction to Product Design',
            due:      getRelativeDate(2),
            dueLabel: 'Due in 2 days',
            urgency:  'urgent',
        },
        {
            title:    'Responsive Layout Exercise',
            course:   'Frontend Development for Designers',
            due:      getRelativeDate(5),
            dueLabel: 'Due in 5 days',
            urgency:  'normal',
        },
        {
            title:    'Wireframe Prototype',
            course:   'UI/UX Design Fundamentals',
            due:      getRelativeDate(7),
            dueLabel: 'Due in 7 days',
            urgency:  'normal',
        },
    ],
    submitted: [
        {
            title:    'Color Theory Assignment',
            course:   'UI/UX Design Fundamentals',
            due:      getRelativeDate(-3),
            dueLabel: 'Submitted 3 days ago',
            urgency:  'done',
        },
        {
            title:    'SQL Query Practice',
            course:   'Data Analysis with Python & SQL',
            due:      getRelativeDate(-6),
            dueLabel: 'Submitted 6 days ago',
            urgency:  'done',
        },
    ],
    graded: [
        {
            title:    'Design Principles Quiz',
            course:   'Introduction to Product Design',
            due:      getRelativeDate(-10),
            dueLabel: 'Graded',
            urgency:  'done',
            grade:    '92%',
        },
        {
            title:    'Typography Exploration',
            course:   'UI/UX Design Fundamentals',
            due:      getRelativeDate(-14),
            dueLabel: 'Graded',
            urgency:  'done',
            grade:    '88%',
        },
        {
            title:    'Python Basics Exercise',
            course:   'Data Analysis with Python & SQL',
            due:      getRelativeDate(-18),
            dueLabel: 'Graded',
            urgency:  'done',
            grade:    '79%',
        },
    ],
};

const WEEKLY_HOURS  = [1.5, 3, 2.5, 4, 0, 1, 2];
const DAYS          = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TODAY_IDX     = (new Date().getDay() + 6) % 7; // Mon = 0

const PARTICIPATION = {
    labels: ['Attendance', 'Quizzes', 'Forum', 'Assignments', 'Projects'],
    scores: [90, 78, 65, 85, 72],
    color:  '#2563EB',
};

const DEADLINES = [
    { title: 'Brand Identity Case Study', course: 'Product Design', date: futureDate(2)  },
    { title: 'Wireframe Prototype',        course: 'UI/UX Design',   date: futureDate(5)  },
    { title: 'Responsive Layout Exercise', course: 'Frontend Dev',   date: futureDate(7)  },
    { title: 'Data Cleaning Lab',          course: 'Data Analysis',  date: futureDate(14) },
];

// ── HELPERS ───────────────────────────────

function getRelativeDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

function futureDate(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d;
}

function animateNumber(el, target, suffix = '', duration = 800) {
    const start = performance.now();
    const step  = (now) => {
        const t    = Math.min((now - start) / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        el.textContent = Math.round(target * ease) + suffix;
        if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

function drawSparkline(canvas, points, color = '#2563EB') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    if (points.length < 2) return;

    const min   = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const pad   = 3;
    const xs    = points.map((_, i) => pad + (i / (points.length - 1)) * (W - pad * 2));
    const ys    = points.map(v => H - pad - ((v - min) / range) * (H - pad * 2));

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, color + '55');
    grad.addColorStop(1, color + '00');

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
        const cx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cx, ys[i - 1], cx, ys[i], xs[i], ys[i]);
    }
    ctx.lineTo(xs[xs.length - 1], H);
    ctx.lineTo(xs[0], H);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 1; i < xs.length; i++) {
        const cx = (xs[i - 1] + xs[i]) / 2;
        ctx.bezierCurveTo(cx, ys[i - 1], cx, ys[i], xs[i], ys[i]);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.stroke();
}

// ── INIT ──────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // ► Apply stored profile FIRST so name/avatar show correctly
    applyProfileToUI();

    setGreeting();
    animateStreak();
    initQuickStats();
    renderCourses();
    renderAssignments('pending');
    initAssignTabs();
    renderWeeklyChart();
    renderRadar();
    renderDeadlines();
    initModal();
    initNav();
    initWelcomeDismiss();
});

// ── GREETING ──────────────────────────────

function setGreeting() {
    const h  = new Date().getHours();
    const el = document.getElementById('greeting');
    if (h < 12) el.textContent = 'Good morning,';
    else if (h < 17) el.textContent = 'Good afternoon,';
    else el.textContent = 'Good evening,';
}

// ── STREAK ────────────────────────────────

function animateStreak() {
    const el = document.getElementById('streakCount');
    if (!el) return;
    animateNumber(el, STUDENT.streak, '', 1000);
}

// ── QUICK STATS ───────────────────────────

function initQuickStats() {
    document.querySelectorAll('.qs-card').forEach(card => {
        const valEl  = card.querySelector('.qs-value');
        const target = parseInt(valEl.dataset.target);
        const suffix = valEl.dataset.suffix || '';
        animateNumber(valEl, target, suffix, 900);

        const canvas = card.querySelector('.qs-spark');
        if (canvas) {
            const pts = canvas.dataset.points.split(',').map(Number);
            drawSparkline(canvas, pts, '#2563EB');
        }
    });
}

// ── COURSES ───────────────────────────────

function renderCourses() {
    const list = document.getElementById('coursesList');
    list.innerHTML = COURSES.map((c, i) => `
        <div class="course-row" style="animation-delay:${i * 60}ms">
            <img class="cr-thumb" src="${c.thumb}" alt="${c.title}">
            <div class="cr-info">
                <p class="cr-title">${c.title}</p>
                <p class="cr-meta">${c.instructor} · ${c.completed}/${c.lessons} lessons</p>
                <div class="cr-progress-bar">
                    <div class="cr-progress-fill" data-progress="${c.progress}"></div>
                </div>
            </div>
            <span class="cr-pct">${c.progress}%</span>
        </div>
    `).join('');

    requestAnimationFrame(() => {
        setTimeout(() => {
            document.querySelectorAll('.cr-progress-fill').forEach(bar => {
                bar.style.width = bar.dataset.progress + '%';
            });
        }, 200);
    });
}

// ── ASSIGNMENTS ───────────────────────────

let currentTab = 'pending';

function renderAssignments(tab) {
    const list  = document.getElementById('assignList');
    const items = ASSIGNMENTS[tab];

    if (!items || items.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path stroke-linecap="round" stroke-linejoin="round"
                          d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <p>Nothing here — you're all caught up!</p>
            </div>`;
        return;
    }

    list.innerHTML = items.map((a, i) => {
        const actionBtn = tab === 'pending'
            ? `<button class="ai-action-btn" onclick="openSubmitModal('${a.title}', '${a.course}')">Submit</button>`
            : '';
        const gradeTag = a.grade ? `<span class="ai-grade">${a.grade}</span>` : '';
        return `
            <div class="assign-item" style="animation-delay:${i * 50}ms">
                <div class="ai-status-dot ${tab === 'pending' ? 'pending' : tab === 'submitted' ? 'submitted' : 'graded'}"></div>
                <div class="ai-body">
                    <p class="ai-title">${a.title}</p>
                    <p class="ai-course">${a.course}</p>
                    <div class="ai-footer">
                        <span class="ai-due ${a.urgency}">${a.dueLabel}</span>
                        ${gradeTag}
                        ${actionBtn}
                    </div>
                </div>
            </div>`;
    }).join('');
}

function initAssignTabs() {
    const tabs = document.querySelectorAll('.tab-pill');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.tab;
            renderAssignments(currentTab);
        });
    });
}

// ── WEEKLY CHART ──────────────────────────

function renderWeeklyChart() {
    const barsEl = document.getElementById('weeklyBars');
    const maxH   = 90;
    const maxVal = Math.max(...WEEKLY_HOURS) || 1;

    barsEl.innerHTML = WEEKLY_HOURS.map((h, i) => `
        <div class="wc-bar-wrap">
            <span class="wc-val">${h > 0 ? h + 'h' : ''}</span>
            <div class="wc-bar${i === TODAY_IDX ? ' today' : ''}"
                 data-height="${(h / maxVal) * maxH}"
                 style="height:0px"></div>
        </div>
    `).join('');

    setTimeout(() => {
        barsEl.querySelectorAll('.wc-bar').forEach(bar => {
            bar.style.height = bar.dataset.height + 'px';
        });
    }, 300);

    const total   = WEEKLY_HOURS.reduce((a, b) => a + b, 0);
    const avg     = (total / (WEEKLY_HOURS.filter(h => h > 0).length || 1)).toFixed(1);
    const bestIdx = WEEKLY_HOURS.indexOf(Math.max(...WEEKLY_HOURS));

    const totalEl = document.getElementById('totalHrs');
    const avgEl   = document.getElementById('avgHrs');
    const bestEl  = document.getElementById('bestDay');

    if (totalEl) animateNumber(totalEl, total, 'h', 800);
    if (avgEl)   avgEl.textContent = avg + 'h';
    if (bestEl)  bestEl.textContent = DAYS[bestIdx];
}

// ── PARTICIPATION RADAR ───────────────────

function renderRadar() {
    const canvas = document.getElementById('radarCanvas');
    if (!canvas) return;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const R      = 82;
    const labels = PARTICIPATION.labels;
    const scores = PARTICIPATION.scores.map(s => s / 100);
    const n      = labels.length;
    const color  = PARTICIPATION.color;

    function pt(idx, r) {
        const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }

    ctx.clearRect(0, 0, W, H);

    let frame = 0;
    const totalFrames = 40;

    function drawFrame() {
        const t    = Math.min(frame / totalFrames, 1);
        const ease = 1 - Math.pow(1 - t, 3);

        ctx.clearRect(0, 0, W, H);

        // Grid rings
        [0.25, 0.5, 0.75, 1].forEach(frac => {
            ctx.beginPath();
            for (let i = 0; i < n; i++) {
                const [x, y] = pt(i, R * frac);
                i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.strokeStyle = frac === 1 ? '#E2E8F0' : '#F1F5F9';
            ctx.lineWidth   = 1;
            ctx.stroke();
        });

        // Spokes
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(x, y);
            ctx.strokeStyle = '#E2E8F0';
            ctx.lineWidth   = 1;
            ctx.stroke();
        }

        // Animated polygon
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R * scores[i] * ease);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fillStyle   = color + '22';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 2;
        ctx.stroke();

        // Dots
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R * scores[i] * ease);
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        }

        // Labels
        for (let i = 0; i < n; i++) {
            const [x, y] = pt(i, R + 16);
            ctx.font          = '600 11px Plus Jakarta Sans, sans-serif';
            ctx.fillStyle     = '#64748B';
            ctx.textAlign     = 'center';
            ctx.textBaseline  = 'middle';
            ctx.fillText(labels[i], x, y);
        }

        if (frame < totalFrames) { frame++; requestAnimationFrame(drawFrame); }
    }
    drawFrame();

    // Legend
    const legend = document.getElementById('radarLegend');
    if (legend) {
        const colors = ['#2563EB', '#16A34A', '#EA580C', '#7C3AED', '#0891B2'];
        legend.innerHTML = labels.map((lbl, i) => `
            <div class="rl-item">
                <div class="rl-dot" style="background:${colors[i % colors.length]}"></div>
                <span>${lbl}: ${PARTICIPATION.scores[i]}%</span>
            </div>
        `).join('');
    }
}

// ── DEADLINES ─────────────────────────────

function renderDeadlines() {
    const list  = document.getElementById('deadlineList');
    const badge = document.getElementById('deadlineCount');
    const now   = new Date();
    const sorted = [...DEADLINES].sort((a, b) => a.date - b.date);

    if (badge) badge.textContent = sorted.length;

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    list.innerHTML = sorted.map((d, i) => {
        const daysLeft = Math.ceil((d.date - now) / 86400000);
        const urgency  = daysLeft <= 3 ? 'urgent' : daysLeft <= 7 ? 'soon' : 'normal';
        const label    = daysLeft === 1 ? 'Tomorrow' : daysLeft === 0 ? 'Today!' : `${daysLeft}d left`;
        return `
            <div class="dl-item" style="animation-delay:${i * 60}ms">
                <div class="dl-date-box ${urgency}">
                    <span class="dl-day">${d.date.getDate()}</span>
                    <span class="dl-month">${MONTHS[d.date.getMonth()]}</span>
                </div>
                <div class="dl-info">
                    <p class="dl-title">${d.title}</p>
                    <p class="dl-course">${d.course}</p>
                </div>
                <span class="dl-days-left ${urgency}">${label}</span>
            </div>`;
    }).join('');
}

// ── MODAL ─────────────────────────────────

let currentAssignment = null;

function openSubmitModal(title, course) {
    currentAssignment = { title, course };
    document.getElementById('modalTitle').textContent  = 'Submit: ' + title;
    document.getElementById('modalCourse').textContent = course;
    document.getElementById('filePreview').style.display = 'none';
    document.getElementById('submitNote').value = '';
    document.getElementById('submitModal').classList.add('open');
}

function initModal() {
    const modal      = document.getElementById('submitModal');
    const closeBtn   = document.getElementById('closeModal');
    const confirmBtn = document.getElementById('confirmSubmit');
    const uploadZone = document.getElementById('uploadZone');
    const fileInput  = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');

    closeBtn.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('open'); });

    uploadZone.addEventListener('click', () => fileInput.click());
    uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', e => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) showFilePreview(file);
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) showFilePreview(fileInput.files[0]);
    });

    function showFilePreview(file) {
        filePreview.style.display = 'flex';
        filePreview.innerHTML = `
            <svg width="18" height="18" fill="none" stroke="#2563EB" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1
                      13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25
                      0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125
                      1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"/>
            </svg>
            <span>${file.name}</span>
            <span style="color:#94A3B8;font-size:11px;margin-left:auto">${(file.size / 1024).toFixed(0)} KB</span>
        `;
    }

    confirmBtn.addEventListener('click', () => {
        if (!currentAssignment) return;
        const idx = ASSIGNMENTS.pending.findIndex(a => a.title === currentAssignment.title);
        if (idx !== -1) {
            const [item] = ASSIGNMENTS.pending.splice(idx, 1);
            item.dueLabel = 'Just submitted';
            item.urgency  = 'done';
            ASSIGNMENTS.submitted.unshift(item);
        }
        modal.classList.remove('open');
        showToast('Assignment submitted successfully! ✅');
        if (currentTab === 'pending' || currentTab === 'submitted') renderAssignments(currentTab);
        currentAssignment = null;
    });
}

// ── TOAST ─────────────────────────────────

function showToast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    Object.assign(t.style, {
        position:   'fixed',
        bottom:     '28px',
        right:      '28px',
        background: '#0F172A',
        color:      'white',
        padding:    '12px 22px',
        borderRadius: '12px',
        fontSize:   '14px',
        fontWeight: '600',
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        boxShadow:  '0 8px 24px rgba(0,0,0,0.2)',
        zIndex:     '9999',
        animation:  'toastIn 0.3s ease',
        opacity:    '1',
        transition: 'opacity 0.4s',
    });

    if (!document.getElementById('toast-style')) {
        const s = document.createElement('style');
        s.id = 'toast-style';
        s.textContent = `@keyframes toastIn {
            from { opacity:0; transform:translateY(12px); }
            to   { opacity:1; transform:translateY(0); }
        }`;
        document.head.appendChild(s);
    }

    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 3000);
}

// ── NAV ───────────────────────────────────

function initNav() {
    const avatarBtn = document.getElementById('avatarBtn');
    const popup     = document.getElementById('profilePopup');
    if (avatarBtn && popup) {
        avatarBtn.addEventListener('click', e => {
            e.stopPropagation();
            popup.classList.toggle('open');
        });
        document.addEventListener('click', () => popup.classList.remove('open'));
    }

    const notifBtn = document.getElementById('notifBtn');
    if (notifBtn) notifBtn.addEventListener('click', () => showToast('3 new notifications 🔔'));

    const hamburger = document.getElementById('hamburgerBtn');
    const sidebar   = document.getElementById('sidebar');
    const overlay   = document.getElementById('sidebarOverlay');

    if (hamburger && sidebar && overlay) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.add('mobile-open');
            overlay.style.display = 'block';
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('mobile-open');
            overlay.style.display = 'none';
        });
    }
}

// ── WELCOME BANNER DISMISS ────────────────

function initWelcomeDismiss() {
    const btn    = document.getElementById('dismissBanner');
    const banner = document.getElementById('welcomeBanner');
    if (!btn || !banner) return;
    btn.addEventListener('click', () => {
        banner.style.transition  = 'opacity 0.3s, transform 0.3s, max-height 0.4s, margin 0.4s, padding 0.4s';
        banner.style.opacity     = '0';
        banner.style.transform   = 'translateY(-8px)';
        banner.style.maxHeight   = '0';
        banner.style.marginBottom = '0';
        banner.style.paddingTop  = '0';
        banner.style.paddingBottom = '0';
        setTimeout(() => banner.remove(), 420);
    });
}

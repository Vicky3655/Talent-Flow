/* ============================================================
   TALENT FLOW  |  courses.js
   ------------------------------------------------------------
   Instructors see and create their own courses. Students browse
   the published catalog and enroll. Both read/write the real
   Firestore "courses" and "enrollments" collections via auth.js
   — nothing here is mock data anymore.
   ============================================================ */

/* ── Profile popup toggle (avatar click) ── */

function initProfilePopup() {
    const avatarBtn    = document.getElementById('avatarBtn');
    const profilePopup = document.getElementById('profilePopup');
    if (!avatarBtn || !profilePopup) return;

    avatarBtn.addEventListener('click', e => {
        e.stopPropagation();
        profilePopup.classList.toggle('open');
    });

    document.addEventListener('click', () => profilePopup.classList.remove('open'));
}

// ── STATE ──
let myRole      = '';
let courses     = [];        // whatever this role should see
let enrolledIds = new Set(); // courseIds the signed-in student is already in

let currentFilter = 'all';
let currentSearch = '';
let isSortedAsc   = true;

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
    initProfilePopup();
    initFilters();
    initSearch();
    initSort();
    initMobileMenu();

    const addBtn = document.querySelector('.add-btn');
    if (addBtn) addBtn.style.display = 'none'; // shown again only for instructors, below

    const auth = window.TalentFlowAuth;
    if (!auth) return;

    // Fetched independently rather than relying on app-nav.js's timing —
    // that script runs separately and may not have finished yet.
    const user = await auth.requireAuth();
    let profile = {};
    try {
        profile = (await auth.loadProfile(user.uid)) || {};
    } catch (err) {
        console.error('Firestore profile read failed (using basic account info):', err);
    }
    myRole = profile.role || '';

    if (myRole === 'Instructor') {
        if (addBtn) addBtn.style.display = '';
        initAddModal();
        await loadInstructorCourses();
    } else {
        await loadStudentCourses();
    }
});

// ── LOAD (role-specific) ──
async function loadInstructorCourses() {
    const grid = document.querySelector('.course-grid');
    try {
        courses = await window.TalentFlowAuth.listMyCourses();
    } catch (err) {
        console.error('Could not load your courses:', err);
        courses = [];
        if (grid) grid.innerHTML = '<p class="load-error">Could not load your courses — check your connection and reload.</p>';
        return;
    }
    renderCourses();
}

async function loadStudentCourses() {
    const grid = document.querySelector('.course-grid');
    try {
        courses = await window.TalentFlowAuth.listPublishedCourses();
    } catch (err) {
        console.error('Could not load courses:', err);
        courses = [];
        if (grid) grid.innerHTML = '<p class="load-error">Could not load courses — check your connection and reload.</p>';
        return;
    }
    try {
        const mine = await window.TalentFlowAuth.listMyEnrollments();
        enrolledIds = new Set(mine.map((e) => e.courseId));
    } catch (err) {
        console.error('Could not load your enrollments:', err);
    }
    renderCourses();
}

// ── FILTER ──
function initFilters() {
    const buttons = document.querySelectorAll('.filter-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderCourses();
        });
    });
}

// ── SEARCH ──
function initSearch() {
    const input = document.querySelector('.search-wrap input');
    input.addEventListener('input', (e) => {
        currentSearch = e.target.value.toLowerCase().trim();
        renderCourses();
    });
}

// ── SORT ──
function initSort() {
    const btn = document.querySelector('.sort-btn');
    const arrow = btn.querySelector('svg path');
    btn.addEventListener('click', () => {
        isSortedAsc = !isSortedAsc;
        arrow.style.transform = isSortedAsc ? 'rotate(0deg)' : 'rotate(180deg)';
        renderCourses();
    });
}

// ── RENDER ──
function renderCourses() {
    const grid = document.querySelector('.course-grid');
    let filtered = courses.filter(c => {
        const matchesFilter = currentFilter === 'all' || c.status === currentFilter;
        const matchesSearch = (c.title || '').toLowerCase().includes(currentSearch);
        return matchesFilter && matchesSearch;
    });

    filtered.sort((a, b) => {
        const cmp = (a.title || '').localeCompare(b.title || '');
        return isSortedAsc ? cmp : -cmp;
    });

    if (filtered.length === 0) {
        const message = myRole === 'Instructor'
            ? "You haven't created any courses yet — use the + button above to add one."
            : 'No courses found.';
        grid.innerHTML = `<p class="load-error">${message}</p>`;
        return;
    }

    grid.innerHTML = filtered.map((c, i) => `
        <div class="course-card" style="animation-delay: ${i * 80}ms">
            <div class="course-thumb">
                <img src="${c.thumb}" alt="${c.title}">
            </div>
            <div class="course-info">
                <p class="course-title">${c.title}</p>
                <div class="course-meta">
                    <span class="dot ${c.status}"></span>
                    <span>${capitalize(c.status)} • ${c.lessons} Lessons</span>
                </div>
            </div>
            ${renderCourseAction(c)}
        </div>
    `).join('');

    // Wire up whichever action button this role's cards actually have.
    grid.querySelectorAll('[data-enroll]').forEach((btn) => {
        btn.addEventListener('click', () => handleEnroll(btn.dataset.enroll, btn));
    });
    grid.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => editCourse(btn.dataset.edit));
    });
}

function renderCourseAction(c) {
    if (myRole === 'Instructor') {
        return `
            <button class="arrow-btn" data-edit="${c.title}">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/></svg>
            </button>`;
    }
    const already = enrolledIds.has(c.id);
    return `
        <button class="enroll-btn${already ? ' enrolled' : ''}" data-enroll="${c.id}" ${already ? 'disabled' : ''}>
            ${already ? '✓ Enrolled' : 'Enroll'}
        </button>`;
}

async function handleEnroll(courseId, btn) {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    btn.disabled = true;
    btn.textContent = 'Enrolling…';
    try {
        await window.TalentFlowAuth.enrollInCourse(course);
        enrolledIds.add(courseId);
        btn.textContent = '✓ Enrolled';
        btn.classList.add('enrolled');
    } catch (err) {
        console.error('Enroll failed:', err);
        btn.disabled = false;
        btn.textContent = 'Enroll';
        alert(window.TalentFlowAuth.friendlyError ? window.TalentFlowAuth.friendlyError(err) : 'Could not enroll — please try again.');
    }
}

function capitalize(str) {
    return (str || '').charAt(0).toUpperCase() + (str || '').slice(1);
}

// ── ADD COURSE MODAL (instructor only) ──
function initAddModal() {
    const modal = document.getElementById('add-course-modal');
    if (!modal) return;

    const addBtn = document.querySelector('.add-btn');
    const form = document.getElementById('add-course-form');
    const closeBtn = modal.querySelector('.close-btn');
    const cancelBtn = modal.querySelector('.cancel-btn');

    addBtn.addEventListener('click', () => modal.classList.add('open'));
    closeBtn?.addEventListener('click', () => modal.classList.remove('open'));
    cancelBtn?.addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(form);
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating…';

        try {
            await window.TalentFlowAuth.createCourse({
                title: fd.get('title'),
                status: fd.get('status'),
                lessons: parseInt(fd.get('lessons'), 10) || 0,
                thumb: fd.get('thumb') || undefined,
            });
            await loadInstructorCourses();
            modal.classList.remove('open');
            form.reset();
        } catch (err) {
            console.error('Create course failed:', err);
            alert(window.TalentFlowAuth.friendlyError ? window.TalentFlowAuth.friendlyError(err) : 'Could not create the course — please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Course';
        }
    });
}

function editCourse(title) {
    alert(`Edit course: ${title}\n(Editing existing courses isn't wired up yet — say the word if you want that next.)`);
}

// ── MOBILE MENU ──
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger-btn');
    const overlay = document.querySelector('.sidebar-overlay');
    const sidebar = document.querySelector('.sidebar');
    if (!hamburger || !overlay) return;

    hamburger.addEventListener('click', () => {
        sidebar.classList.add('mobile-open');
        document.body.style.overflow = 'hidden';
    });
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('mobile-open');
        document.body.style.overflow = '';
    });
}

/* ============================================================
   TALENT FLOW  |  profile.js
   ------------------------------------------------------------
   Shared by instructor-profile.html and student-profile.html.
   Which fields it reads/writes is driven entirely by the
   data-profile-page="instructor|student" attribute on <body>,
   so one file can serve both pages' different field sets.
   ============================================================ */

const CONFIG = {
  instructor: {
    tagClass: 'tag-chip',
    linkClass: '',
    coursesUrl: 'courses.html',
    fields: ['fullName', 'title', 'bio', 'expertise', 'experience', 'education', 'linkedin', 'website'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.title || '',
        bio: p.bio || '',
        metaValue: p.experience ? `${p.experience} yr${String(p.experience) === '1' ? '' : 's'}` : '—',
        tags: p.expertise || '',
        educationText: p.education || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.website  ? { label: 'Website',  url: p.website  } : null,
        ].filter(Boolean),
      };
    },
  },
  student: {
    tagClass: 'profile-tag',
    linkClass: 'profile-link',
    coursesUrl: '/project2/courses.html',
    fields: ['fullName', 'email', 'educationLevel', 'fieldOfStudy', 'bio', 'interests', 'goals', 'linkedin', 'github'],
    toView(p) {
      return {
        name: p.fullName || '',
        title: p.educationLevel || '',
        bio: p.bio || '',
        metaValue: p.fieldOfStudy || '—',
        tags: p.interests || '',
        educationText: p.goals || '',
        links: [
          p.linkedin ? { label: 'LinkedIn', url: p.linkedin } : null,
          p.github   ? { label: 'GitHub',   url: p.github   } : null,
        ].filter(Boolean),
      };
    },
  },
};

function renderTags(container, text, tagClass) {
  if (!container) return;
  container.innerHTML = '';
  (text || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((tag) => {
    const span = document.createElement('span');
    span.className = tagClass;
    span.textContent = tag;
    container.appendChild(span);
  });
}

function renderLinks(container, links, linkClass) {
  if (!container) return;
  container.innerHTML = '';
  links.forEach(({ label, url }) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    if (linkClass) a.className = linkClass;
    a.textContent = label;
    container.appendChild(a);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const pageType = document.body.dataset.profilePage; // 'instructor' | 'student'
  const cfg = CONFIG[pageType];
  const auth = window.TalentFlowAuth;
  if (!cfg || !auth) return;

  const user = await auth.requireAuth(); // redirects to login.html if signed out
  let profile = {};
  try {
    profile = (await auth.loadProfile(user.uid)) || {};
  } catch (err) {
    console.error('Firestore profile read failed — showing the blank form instead:', err);
  }

  const viewSection  = document.getElementById('profileView');
  const formSection  = document.getElementById('profileFormSection');
  const form         = document.getElementById('profileForm');
  const avatarPreview = document.getElementById('avatarPreview');
  const avatarInput   = document.getElementById('avatarInput');
  const logoutBtn     = document.getElementById('logoutBtn');
  const editBtn       = document.getElementById('editProfileBtn');

  // Real photo upload/storage isn't wired up yet (that needs Firebase
  // Storage, a separate piece) — for now everyone's shown photo is
  // their Google account photo, or a generated initial.
  const avatarUrl = user.photoURL || auth.initialsAvatar(profile.fullName || user.displayName || user.email);

  function fillForm(p) {
    cfg.fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el && p[id] !== undefined) el.value = p[id];
    });
    const nameEl = document.getElementById('fullName');
    if (nameEl && !nameEl.value) nameEl.value = user.displayName || '';
    const emailEl = document.getElementById('email');
    if (emailEl && !emailEl.value) emailEl.value = user.email || '';
    if (avatarPreview) avatarPreview.src = avatarUrl;
  }

  function showForm() {
    fillForm(profile);
    if (viewSection) viewSection.hidden = true;
    if (formSection) formSection.hidden = false;
  }

  function showView(p) {
    const v = cfg.toView(p);
    document.getElementById('viewAvatar').src = avatarUrl;
    document.getElementById('viewName').textContent = v.name || user.displayName || 'Talent Flow User';
    document.getElementById('viewTitle').textContent = v.title;
    document.getElementById('viewBio').textContent = v.bio;
    document.getElementById('viewExperience').textContent = v.metaValue;
    document.getElementById('viewEmail').textContent = p.email || user.email || '';
    renderTags(document.getElementById('viewExpertise'), v.tags, cfg.tagClass);
    document.getElementById('viewEducation').textContent = v.educationText;
    renderLinks(document.getElementById('viewLinks'), v.links, cfg.linkClass);

    if (formSection) formSection.hidden = true;
    if (viewSection) viewSection.hidden = false;
  }

  if (profile.profileCompleted) showView(profile);
  else showForm();

  editBtn?.addEventListener('click', showForm);

  // Local preview only — see note above on photo storage.
  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files && avatarInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (avatarPreview) avatarPreview.src = reader.result; };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const isFirstCompletion = !profile.profileCompleted;
    const data = { profileCompleted: true };
    cfg.fields.forEach((id) => {
      const el = document.getElementById(id);
      if (el) data[id] = el.value.trim();
    });

    Object.assign(profile, data);

    // Save in the background — don't make the person wait on Firestore
    // (or lose their filled-out form to a timeout) to move forward.
    auth.saveProfile(user.uid, data).catch((err) => {
      console.error('Firestore profile save failed (continuing anyway):', err);
    });

    if (isFirstCompletion) {
      // Just finished onboarding — move straight on instead of making
      // them look at their own profile and click again.
      window.location.href = cfg.coursesUrl;
    } else {
      // Editing an already-complete profile — show what changed and
      // let them continue on their own terms.
      showView(profile);
    }
  });

  logoutBtn?.addEventListener('click', () => auth.logOut());
});

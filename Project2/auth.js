/* ============================================================
   TALENT FLOW  |  auth.js
   ------------------------------------------------------------
   Real accounts via Firebase Authentication + Firestore.
   Exposes window.TalentFlowAuth, which script.js calls into.
   This file owns everything Firebase-related so script.js never
   has to import Firebase directly.
   ============================================================ */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  onAuthStateChanged,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js';

/* ── Paste your Talent Flow project's config here ────────────
   Firebase console → ⚙️ Project settings → General → "Your apps"
   This must be a DIFFERENT project from Mise AI's — separate app,
   separate users. This is the only setup this file needs. ──── */
const firebaseConfig = {
    apiKey: "AIzaSyCW_ZS2R8UxhGoA5bqK4fZ59tagu29HDJk",
    authDomain: "another-b384c.firebaseapp.com",
    projectId: "another-b384c",
    storageBucket: "another-b384c.firebasestorage.app",
    messagingSenderId: "913158897020",
    appId: "1:913158897020:web:ea87eeb222f7a8d8dff8f9",
    measurementId: "G-DY0JVEJG1R"
};

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

/* ── ERROR MESSAGES ──────────────────────────────────────── */
function friendlyError(err) {
  const code = (err && err.code) || '';
  console.error('Auth error:', code, err && err.message);
  const messages = {
    'auth/invalid-email':          'Enter a valid email address',
    'auth/user-not-found':         'Incorrect email or password',
    'auth/wrong-password':         'Incorrect email or password',
    'auth/invalid-credential':     'Incorrect email or password',
    'auth/email-already-in-use':   "That email's already registered — try logging in instead",
    'auth/weak-password':          'Please use at least 8 characters',
    'auth/too-many-requests':      'Too many attempts — please wait a moment and try again',
    'auth/network-request-failed': 'Network error — check your connection and try again',
    'auth/unauthorized-domain':    "This domain isn't authorized in Firebase yet",
    'auth/operation-not-allowed':  "This sign-in method isn't enabled yet in the Firebase console",
  };
  return messages[code] || 'Something went wrong — please try again';
}

/* ── PROFILE STORAGE (Firestore) ─────────────────────────────
   Firebase Auth itself only knows name/email/photo. "Role"
   (Instructor/Student) is app-specific, so it lives in a small
   Firestore doc per user instead. ──────────────────────────── */

// Never let a Firestore call hang forever — if something's silently
// blocking the connection (a strict ad-blocker/extension is the most
// common cause), fail after 6s instead of waiting indefinitely.
function withTimeout(promise, ms = 4000) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore request timed out')), ms)),
  ]);
}

async function saveProfile(uid, data) {
  await withTimeout(setDoc(doc(db, 'users', uid), data, { merge: true }));
  return data;
}

async function loadProfile(uid) {
  const snap = await withTimeout(getDoc(doc(db, 'users', uid)));
  return snap.exists() ? snap.data() : null;
}

/* ── COURSES & ENROLLMENTS (Firestore) ───────────────────────
   Two more collections alongside "users":
     courses/{courseId}      — one doc per course an instructor creates
     enrollments/{studentUid_courseId} — one doc per student+course pair,
       ID built from both uids so a student can't double-enroll and
       "am I enrolled?" is a single doc lookup, not a query. ────── */

async function createCourseDoc(instructorUid, instructorName, data) {
  const ref = await withTimeout(addDoc(collection(db, 'courses'), {
    title: data.title,
    thumb: data.thumb || 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&q=80',
    lessons: data.lessons || 0,
    status: data.status || 'draft',
    instructorUid,
    instructorName,
    createdAt: serverTimestamp(),
  }));
  return ref.id;
}

async function listPublishedCoursesDocs() {
  const q = query(collection(db, 'courses'), where('status', '==', 'published'));
  const snap = await withTimeout(getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listCoursesByInstructorDocs(instructorUid) {
  const q = query(collection(db, 'courses'), where('instructorUid', '==', instructorUid));
  const snap = await withTimeout(getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function enrollInCourseDoc(studentUid, course) {
  const enrollmentId = `${studentUid}_${course.id}`;
  await withTimeout(setDoc(doc(db, 'enrollments', enrollmentId), {
    studentUid,
    courseId: course.id,
    courseTitle: course.title,
    thumb: course.thumb || '',
    lessons: course.lessons || 0,
    instructorName: course.instructorName || '',
    progress: 0,
    completedLessons: 0,
    enrolledAt: serverTimestamp(),
  }));
}

async function isEnrolledDoc(studentUid, courseId) {
  const snap = await withTimeout(getDoc(doc(db, 'enrollments', `${studentUid}_${courseId}`)));
  return snap.exists();
}

async function listMyEnrollmentsDocs(studentUid) {
  const q = query(collection(db, 'enrollments'), where('studentUid', '==', studentUid));
  const snap = await withTimeout(getDocs(q));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* ── SHARED AUTH STATE ────────────────────────────────────────
   One listener for the whole app. Pages that need to know who's
   signed in (profile pages) call TalentFlowAuth.requireAuth()
   instead of each wiring up their own onAuthStateChanged. ──── */
let authReady = false;
let currentUser = null;
const readyCallbacks = [];

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  authReady = true;
  window.TalentFlowUser = user;
  readyCallbacks.splice(0).forEach((cb) => cb(user));
});

function onUserKnown(callback) {
  if (authReady) callback(currentUser);
  else readyCallbacks.push(callback);
}

/* Simple initials avatar (used until real photo upload exists). */
function initialsAvatar(label) {
  const initial = (label || '?').trim().charAt(0).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">`
    + `<rect width="80" height="80" rx="40" fill="#2563eb"/>`
    + `<text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle" `
    + `font-family="Inter, sans-serif" font-size="34" fill="#ffffff" font-weight="700">${initial}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ── PUBLIC INTERFACE ─────────────────────────────────────── */
window.TalentFlowAuth = {
  // Opens Firebase's own Google popup — no separate client ID needed.
  signInWithGoogle() {
    return signInWithPopup(auth, googleProvider).then(async ({ user }) => {
      let role = '';
      try {
        const existing = await loadProfile(user.uid);
        role = existing ? existing.role : '';
        if (!existing) {
          saveProfile(user.uid, {
            name: user.displayName || '',
            email: user.email || '',
            provider: 'google',
            role: '',
          }).catch((err) => console.error('Firestore profile save failed (continuing anyway):', err));
        }
      } catch (err) {
        // Signed in fine, but couldn't reach Firestore in time — don't
        // strand someone who's already authenticated over this.
        console.error('Firestore profile read failed (continuing anyway):', err);
      }
      window.TalentFlowAuth.redirectToRoleProfile(role);
    });
  },

  // Email/password sign-up. Role isn't collected here anymore — it's
  // chosen on choose-role.html right after this. Returns a Promise.
  async register(name, email, password) {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: name });
    saveProfile(user.uid, { name, email, role: '', provider: 'email' }).catch((err) => {
      console.error('Firestore profile save failed (continuing anyway):', err);
    });
    return { user, role: '' };
  },

  // Email/password login. Returns a Promise resolving to { user, role }.
  async login(email, password) {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    let role = '';
    try {
      const profile = await loadProfile(user.uid);
      role = profile ? profile.role : '';
    } catch (err) {
      console.error('Firestore profile read failed (continuing anyway):', err);
    }
    return { user, role };
  },

  // Real reset-link email (replaces the old instant-reveal demo).
  sendResetLink(email) {
    return sendPasswordResetEmail(auth, email);
  },

  // Where to send someone after login/signup, based on role.
  // Blank role (brand-new signup, or a first-time Google sign-in that's
  // never chosen one) goes to choose-role.html to pick one.
  redirectToRoleProfile(role) {
    if (role === 'Instructor') window.location.href = 'instructor-profile.html';
    else if (role === 'Student') window.location.href = 'student-profile.html';
    else window.location.href = 'choose-role.html';
  },

  // choose-role.html calls this once someone picks a card. Sends them
  // straight to the matching profile-setup page immediately, while the
  // save happens quietly in the background — navigation never waits on it.
  setRole(role) {
    const user = window.TalentFlowUser;
    if (!user) { window.location.href = 'login.html'; return; }
    saveProfile(user.uid, { role }).catch((err) => {
      console.error('Firestore role save failed (continuing anyway):', err);
    });
    this.redirectToRoleProfile(role);
  },

  logOut() {
    return signOut(auth).then(() => { window.location.href = 'login.html'; });
  },

  // Protected pages (the profile pages) call this on load. Resolves
  // with the signed-in user, or sends them to login.html if there
  // isn't one.
  requireAuth() {
    return new Promise((resolve) => {
      onUserKnown((user) => {
        if (!user) { window.location.href = 'login.html'; return; }
        resolve(user);
      });
    });
  },

  saveProfile,
  loadProfile,
  initialsAvatar,
  friendlyError,

  // Courses & enrollment
  createCourse(data) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return createCourseDoc(user.uid, user.displayName || 'Instructor', data);
  },
  listPublishedCourses() {
    return listPublishedCoursesDocs();
  },
  listMyCourses() {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return listCoursesByInstructorDocs(user.uid);
  },
  enrollInCourse(course) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return enrollInCourseDoc(user.uid, course);
  },
  isEnrolled(courseId) {
    const user = window.TalentFlowUser;
    if (!user) return Promise.resolve(false);
    return isEnrolledDoc(user.uid, courseId);
  },
  listMyEnrollments() {
    const user = window.TalentFlowUser;
    if (!user) return Promise.reject(new Error('Not signed in'));
    return listMyEnrollmentsDocs(user.uid);
  },
};

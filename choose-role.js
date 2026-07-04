/* ============================================================
   TALENT FLOW  |  choose-role.js
   ------------------------------------------------------------
   Shown right after sign-up or sign-in for anyone who hasn't
   picked Instructor/Student yet. Picking a card immediately
   saves it and sends them to the matching profile-setup page —
   no separate confirm button to click.
   ============================================================ */

// TEMP while we confirm the right files are deployed together: if
// anything on this page throws (e.g. a leftover mismatched file),
// show it instead of failing silently. Safe to delete this block
// once everything's confirmed working.
window.addEventListener('error', (e) => {
  alert('This page hit an error — please send this exact text back:\n\n' + e.message);
});

document.addEventListener('DOMContentLoaded', async () => {
  const auth = window.TalentFlowAuth;
  if (!auth) return;

  await auth.requireAuth(); // redirects to login.html if signed out

  const radios     = document.querySelectorAll('input[name="role"]');
  const status      = document.getElementById('roleStatus');
  const logoutLink  = document.getElementById('logoutLink');

  radios.forEach((radio) => {
    radio.addEventListener('change', async () => {
      // Lock the choice in visually and prevent a second click while saving.
      radios.forEach((r) => { r.disabled = true; });
      if (status) status.hidden = false;

      try {
        await auth.setRole(radio.value); // saves the role and redirects itself
      } catch (err) {
        radios.forEach((r) => { r.disabled = false; });
        if (status) status.hidden = true;
        alert(auth.friendlyError ? auth.friendlyError(err) : 'Something went wrong — please try again.');
      }
    });
  });

  logoutLink?.addEventListener('click', () => auth.logOut());
});

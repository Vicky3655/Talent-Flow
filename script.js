document.addEventListener("DOMContentLoaded", () => {
    const auth = window.TalentFlowAuth;

    const googleBtn = document.getElementById("googleSignInBtn");
    if (googleBtn) {
        googleBtn.addEventListener("click", () => {
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }
            auth.signInWithGoogle().catch((err) => {
                if (err && (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request")) return;
                alert(auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.");
            });
        });
    }

    setupPasswordToggles();

    // 1. Splash Screen Transition (page.html)
    if (document.getElementById("loader")) {
        setTimeout(() => {
            window.location.href = "login.html";
        }, 2000);
    }

    // 2. Handling the "Create Account" button (register.html)
    const createAccountBtn = document.getElementById("createAccountBtn");
    if (createAccountBtn) {
        createAccountBtn.addEventListener("click", async (e) => {
            e.preventDefault(); // Prevents form refresh

            const name = document.getElementById("Name").value.trim();
            const email = document.getElementById("Email").value.trim();
            const password = document.getElementById("password").value;

            if (!name || !email || !password) {
                alert("Please fill in all fields.");
                return;
            }
            if (password.length < 8) {
                alert("Password must be at least 8 characters.");
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            createAccountBtn.disabled = true;
            try {
                const { role } = await auth.register(name, email, password);
                auth.redirectToRoleProfile(role);
            } catch (err) {
                createAccountBtn.disabled = false;
                alert(auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.");
            }
        });
    }

    // 3. Handling the "Login" button (login.html)
    const loginBtn = document.getElementById("loginBtn");
    if (loginBtn) {
        loginBtn.addEventListener("click", async (e) => {
            e.preventDefault();

            const email = document.getElementById("Email").value.trim();
            const password = document.getElementById("password").value;

            if (!email || !password) {
                alert("Please enter your email and password");
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            loginBtn.disabled = true;
            try {
                const { role } = await auth.login(email, password);
                auth.redirectToRoleProfile(role);
            } catch (err) {
                loginBtn.disabled = false;
                alert(auth.friendlyError ? auth.friendlyError(err) : "Incorrect email or password.");
            }
        });
    }

    // 3b. Handling "Send Reset Link" (password.html)
    const sendResetBtn = document.getElementById("sendResetBtn");
    if (sendResetBtn) {
        const resultBox = document.getElementById("resetResult");
        const errorBox = document.getElementById("resetError");

        sendResetBtn.addEventListener("click", async () => {
            const email = document.getElementById("Email").value.trim();
            if (!email) {
                alert("Please enter your email first.");
                return;
            }
            if (!auth) {
                alert("Still starting up — please try again in a moment.");
                return;
            }

            sendResetBtn.disabled = true;
            try {
                await auth.sendResetLink(email);
                errorBox?.setAttribute("hidden", "");
                const emailSpan = document.getElementById("resetSentEmail");
                if (emailSpan) emailSpan.textContent = email;
                resultBox?.removeAttribute("hidden");
            } catch (err) {
                resultBox?.setAttribute("hidden", "");
                if (errorBox) {
                    errorBox.textContent = auth.friendlyError ? auth.friendlyError(err) : "Something went wrong — please try again.";
                    errorBox.removeAttribute("hidden");
                }
            } finally {
                sendResetBtn.disabled = false;
            }
        });
    }

    // 4. Path Selection Logic (courses.html)
    const pathButtons = document.querySelectorAll(".select-btn");
    pathButtons.forEach(button => {
        button.addEventListener("click", () => {
            // Here you can link to specific course pages in the future
            alert("Path Selected: " + button.innerText);
            // window.location.href = "course-details.html"; 
        });
    });
});

// 5. Password show/hide toggle (login.html + register.html)
function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((btn) => {
        btn.addEventListener("click", () => {
            const input = document.getElementById(btn.dataset.target);
            if (!input) return;

            const willShow = input.type === "password";
            input.type = willShow ? "text" : "password";
            btn.classList.toggle("is-visible", willShow);
            btn.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
        });
    });
}

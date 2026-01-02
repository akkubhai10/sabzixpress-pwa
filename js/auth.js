// /js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    // This script assumes 'auth' and 'db' are globally available from firebase.js
    
    // --- Common Auth UI Elements ---
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // --- Signup Specific UI Elements (only on customer.html) ---
    const signupNameInput = document.getElementById('signup-name');
    const signupEmailInput = document.getElementById('signup-email');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupBtn = document.getElementById('signup-btn');
    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');

    // --- Event Listeners ---
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            const email = loginEmailInput.value;
            const password = loginPasswordInput.value;
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    console.log('User logged in:', userCredential.user.uid);
                })
                .catch((error) => {
                    alert(`Login failed: ${error.message}`);
                    console.error('Login error:', error);
                });
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.signOut().then(() => {
                console.log('User logged out');
                // The onAuthStateChanged listener will handle UI changes
                window.location.reload(); // Force a reload to clear state
            }).catch((error) => {
                console.error('Logout error:', error);
            });
        });
    }

    // Signup logic (only for customer page)
    if (signupBtn) {
        signupBtn.addEventListener('click', () => {
            const name = signupNameInput.value;
            const email = signupEmailInput.value;
            const password = signupPasswordInput.value;
            
            if (!name || !email || !password) {
                alert('Please fill in all fields.');
                return;
            }

            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    // Set display name
                    return user.updateProfile({
                        displayName: name
                    }).then(() => {
                        // Store user role in Realtime Database
                        const userRole = {
                            uid: user.uid,
                            email: user.email,
                            displayName: name,
                            role: 'Customer' // Default role
                        };
                        db.ref('users/' + user.uid).set(userRole);
                        console.log('User signed up and role set:', user.uid);
                    });
                })
                .catch((error) => {
                    alert(`Signup failed: ${error.message}`);
                    console.error('Signup error:', error);
                });
        });
    }

    if (showSignupLink && showLoginLink) {
        showSignupLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginView.style.display = 'none';
            signupView.style.display = 'block';
        });

        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            signupView.style.display = 'none';
            loginView.style.display = 'block';
        });
    }
});
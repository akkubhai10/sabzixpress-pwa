// /js/roles.js

/**
 * Checks the role of the currently logged-in user.
 * If the role matches the required role, it executes the callback.
 * Otherwise, it blocks the page and shows an error.
 * @param {string} uid - The user's ID.
 * @param {string} requiredRole - The role required to access the page (e.g., 'Customer', 'Admin').
 * @param {function} callback - The function to execute on successful role check.
 */
async function checkUserRole(uid, requiredRole, callback) {
    const userRef = db.ref('users/' + uid);
    try {
        const snapshot = await userRef.once('value');
        const userData = snapshot.val();

        if (userData && userData.role === requiredRole) {
            console.log(`Role check passed. User is a ${requiredRole}.`);
            callback();
        } else {
            console.error(`Role check failed. User is not a ${requiredRole}.`);
            blockAccess(requiredRole);
        }
    } catch (error) {
        console.error('Error fetching user role:', error);
        blockAccess(requiredRole);
    }
}

/**
 * Blocks UI access and displays an error message.
 * @param {string} requiredRole - The role that was required.
 */
function blockAccess(requiredRole) {
    document.body.innerHTML = `
        <div style="text-align: center; padding: 50px;">
            <h1>Access Denied</h1>
            <p>You do not have permission to view this page. This page is for <strong>${requiredRole}</strong> users only.</p>
            <p>Please log in with the correct account or contact support.</p>
            <button onclick="auth.signOut().then(() => window.location.reload())">Logout</button>
        </div>
    `;
}
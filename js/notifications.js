// /js/notifications.js

/**
 * Initializes Firebase Cloud Messaging and requests user permission for notifications.
 * @param {string} userId - The UID of the current user.
 * @param {string} userRole - The role of the current user.
 */
function setupFCM(userId, userRole) {
    if (!messaging) {
        console.warn("Firebase Messaging is not supported in this browser.");
        return;
    }

    messaging.requestPermission()
        .then(() => {
            console.log('Notification permission granted.');
            return messaging.getToken();
        })
        .then(token => {
            if (token) {
                console.log('FCM Token:', token);
                // Save the token to the user's profile in the database
                saveFCMToken(userId, userRole, token);
            } else {
                console.warn('No Instance ID token available. Request permission to generate one.');
            }
        })
        .catch((err) => {
            console.error('Unable to get permission to notify.', err);
        });
    
    // Handle incoming messages when the app is in the foreground
    messaging.onMessage((payload) => {
        console.log('Message received in foreground.', payload);
        // Show a custom notification or update the UI
        // For simplicity, we'll just log it. A more robust app might show a toast.
        alert(`New Notification: ${payload.notification.title}`);
    });
}

/**
 * Saves the user's FCM device token to the database.
 * @param {string} userId - The UID of the current user.
 * @param {string} role - The role of the user.
 * @param {string} token - The FCM token.
 */
function saveFCMToken(userId, role, token) {
    // We store tokens based on role and user ID for targeted messaging
    const refPath = `${role.toLowerCase()}Tokens/${userId}`;
    db.ref(refPath).set({ token: token, lastUpdated: new Date().toISOString() });
}

/**
 * Sends a notification to the admin.
 * (This is a client-side trigger, but in a real app, this logic should be in a Cloud Function for security)
 * @param {string} message - The notification message.
 */
function notifyAdmin(message) {
    // This is a simplified example. Securely triggering notifications requires a backend (e.g., Firebase Cloud Functions).
    // For this project, we'll log it as an action that would trigger a notification.
    console.log(`[Notification to Admin] ${message}`);
    logAudit(auth.currentUser.uid, 'System', 'ADMIN_NOTIFICATION', message);
}
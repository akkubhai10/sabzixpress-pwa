// /js/alerts.js

const alarmSound = document.getElementById('alarm-sound');

/**
 * Plays a loud, looping alarm for the picker and vibrates the device.
 */
function playAlarm() {
    if (alarmSound) {
        alarmSound.play().catch(e => console.error("Alarm sound could not be played:", e));
    }
    // Vibrate for 1 second, pause for 1 second, repeat
    if ('vibrate' in navigator) {
        navigator.vibrate([1000, 1000, 1000, 1000]);
    }
}

/**
 * Stops the picker's alarm sound and vibration.
 */
function stopAlarm() {
    if (alarmSound) {
        alarmSound.pause();
        alarmSound.currentTime = 0;
    }
    if ('vibrate' in navigator) {
        navigator.vibrate(0); // Stop vibration
    }
}

/**
 * Plays a short, non-looping alert sound for delivery partners.
 */
function playAlert() {
    // You could use a different audio element for a softer alert
    // For now, we'll reuse the alarm sound but not loop it.
    const alertSound = new Audio('https://actions.google.com/sounds/v1/notifications/quick_notice.ogg');
    alertSound.play().catch(e => console.error("Alert sound could not be played:", e));
}
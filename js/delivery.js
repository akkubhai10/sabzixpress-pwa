// /js/delivery.js

/**
 * Sets the delivery partner's shift state in the database.
 * @param {string} deliveryId - The UID of the delivery partner.
 * @param {boolean} isShiftOn - True if starting shift, false otherwise.
 * @returns {Promise}
 */
async function setDeliveryPartnerShiftState(deliveryId, isShiftOn) {
    await logAudit(deliveryId, 'Delivery', 'SHIFT_CHANGE', `Shift turned ${isShiftOn ? 'ON' : 'OFF'}`);
    return db.ref(`deliveryPartners/${deliveryId}/shiftOn`).set(isShiftOn);
}

/**
 * Gets the current shift state of a delivery partner.
 * @param {string} deliveryId - The UID of the delivery partner.
 * @returns {Promise<boolean>} The current shift state.
 */
async function getDeliveryPartnerShiftState(deliveryId) {
    const snapshot = await db.ref(`deliveryPartners/${deliveryId}/shiftOn`).once('value');
    return snapshot.val() || false;
}

/**
 * Listens for trips assigned to a specific delivery partner.
 * @param {string} deliveryId - The UID of the delivery partner.
 * @param {function} callback - Function to execute with the assigned trip data.
 */
function listenForDeliveryTrips(deliveryId, callback) {
    db.ref('trips').orderByChild('deliveryPartnerId').equalTo(deliveryId).on('value', snapshot => {
        let activeTrip = null;
        snapshot.forEach(tripSnapshot => {
            const trip = { tripId: tripSnapshot.key, ...tripSnapshot.val() };
            if (trip.status !== 'CLOSED') {
                activeTrip = trip;
            }
        });
        callback(activeTrip);
    });
}

/**
 * Marks an order's payment as confirmed.
 * @param {string} orderId - The ID of the order.
 * @returns {Promise}
 */
async function confirmOrderPayment(orderId) {
    await logAudit(auth.currentUser.uid, 'Delivery', 'PAYMENT_CONFIRMED', `Payment received for order ${orderId}`);
    return db.ref(`orders/${orderId}/paymentConfirmed`).set(true);
}

/**
 * Checks if all orders in a trip are delivered. If so, updates the trip status.
 * @param {string} tripId - The ID of the trip.
 * @param {string} deliveryId - The UID of the delivery partner.
 */
async function checkTripCompletion(tripId, deliveryId) {
    const tripRef = db.ref(`trips/${tripId}`);
    const tripSnap = await tripRef.once('value');
    const trip = tripSnap.val();

    if (!trip) return;

    const orderPromises = trip.orders.map(order => db.ref(`orders/${order.orderId}/status`).once('value'));
    const orderStatuses = await Promise.all(orderPromises);

    const allDelivered = orderStatuses.every(statusSnap => statusSnap.val() === 'DELIVERED');

    if (allDelivered) {
        console.log(`All orders in trip ${tripId} are delivered. Updating status.`);
        await logAudit(deliveryId, 'Delivery', 'TRIP_COMPLETE', `All deliveries for trip ${tripId} finished.`);
        await tripRef.update({ status: 'TRIP_COMPLETED_PENDING_STORE_CONFIRM' });
    }
}

/**
 * Validates the store return QR code entered by the delivery partner.
 * @param {string} inputCode - The code entered by the user.
 * @returns {Promise<boolean>} True if the code is valid.
 */
async function validateStoreReturnCode(inputCode) {
    const codeSnap = await db.ref('config/storeReturnCode').once('value');
    return codeSnap.val() === inputCode;
}

/**
 * Closes a trip and frees up the delivery partner after store return confirmation.
 * @param {string} tripId - The ID of the trip to close.
 * @param {string} deliveryId - The UID of the delivery partner.
 * @returns {Promise}
 */
async function closeTrip(tripId, deliveryId) {
    await logAudit(deliveryId, 'Delivery', 'STORE_RETURN_CONFIRMED', `Store return confirmed for trip ${tripId}`);
    await db.ref(`trips/${tripId}`).update({ status: 'CLOSED' });
    // Make the delivery partner available again
    await db.ref(`deliveryPartners/${deliveryId}/isBusy`).set(false);
    return;
}
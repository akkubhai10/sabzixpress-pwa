// /js/orders.js

/**
 * Places a new order and saves it to the database.
 * @param {object} orderData - The complete order object.
 * @returns {Promise} A promise that resolves when the order is placed.
 */
async function placeOrder(orderData) {
    const newOrderRef = db.ref('orders').push();
    orderData.orderId = newOrderRef.key;
    
    await logAudit(auth.currentUser.uid, 'Customer', 'ORDER_PLACED', `Order ${orderData.orderId} placed.`);
    
    return newOrderRef.set(orderData);
}

/**
 * Updates the status of a specific order.
 * @param {string} orderId - The ID of the order to update.
 * @param {string} newStatus - The new status string (e.g., 'PACKING').
 * @returns {Promise}
 */
async function updateOrderStatus(orderId, newStatus) {
    await logAudit(auth.currentUser.uid, 'System', 'STATUS_UPDATE', `Order ${orderId} status changed to ${newStatus}.`);
    return db.ref(`orders/${orderId}/status`).set(newStatus);
}

/**
 * Updates an order with fulfilled items (for partial fulfillment).
 * @param {string} orderId - The ID of the order.
 * @param {Array} fulfilledItems - The array of items that were packed.
 * @param {string} reason - The reason for partial fulfillment.
 * @returns {Promise}
 */
async function updateOrderFulfillment(orderId, fulfilledItems, reason) {
    await logAudit(auth.currentUser.uid, 'Picker', 'PARTIAL_FULFILLMENT', `Order ${orderId}: ${reason}`);
    return db.ref(`orders/${orderId}`).update({
        items: fulfilledItems,
        notes: `Partially fulfilled. Reason: ${reason}`
    });
}

/**
 * For a customer, checks for any active (not CLOSED or DELIVERED) order and displays its status.
 * @param {string} customerId - The UID of the customer.
 */
function customerCheckForActiveOrder(customerId) {
    const orderStatusSection = document.getElementById('order-status-section');
    const timelineContainer = document.getElementById('order-timeline');

    db.ref('orders').orderByChild('customerId').equalTo(customerId).on('value', snapshot => {
        let activeOrder = null;
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();
            if (order.status !== 'CLOSED' && order.status !== 'DELIVERED') {
                activeOrder = order;
            }
        });

        if (activeOrder) {
            orderStatusSection.style.display = 'block';
            renderOrderTimeline(timelineContainer, activeOrder.status);
        } else {
            orderStatusSection.style.display = 'none';
        }
    });
}

/**
 * Renders the visual timeline for the customer's order status.
 * @param {HTMLElement} container - The element to render the timeline into.
 * @param {string} currentStatus - The current status of the order.
 */
function renderOrderTimeline(container, currentStatus) {
    const states = ['PLACED', 'PACKING', 'PACKED', 'OUT_FOR_DELIVERY', 'DELIVERED'];
    const currentIndex = states.indexOf(currentStatus);

    container.innerHTML = states.map((state, index) => {
        let className = 'timeline-step';
        if (index < currentIndex) className += ' completed';
        if (index === currentIndex) className += ' active';
        return `<div class="${className}">${state.replace('_', ' ')}</div>`;
    }).join('<div class="timeline-connector"></div>');
}

/**
 * Listens for orders with status 'PLACED' and assigns them to a picker.
 * This is a simplified auto-assignment logic. In a real app, this might be more complex.
 * @param {string} pickerId - The UID of the picker listening for orders.
 * @param {function} callback - Function to call when an order is assigned.
 */
function listenForPickerOrders(pickerId, callback) {
    db.ref('orders').orderByChild('status').equalTo('PLACED').limitToFirst(1).on('child_added', snapshot => {
        const order = { orderId: snapshot.key, ...snapshot.val() };
        // In a real system, you'd check if a picker is free and assign it.
        // Here, we'll just assign it to the listening picker.
        db.ref(`orders/${order.orderId}`).update({
            status: 'WAITING_FOR_PICKER',
            pickerId: pickerId
        }).then(() => {
            console.log(`Order ${order.orderId} assigned to picker ${pickerId}`);
            callback({ ...order, pickerId: pickerId, status: 'WAITING_FOR_PICKER' });
        });
    });
}

/**
 * Logs an audit trail event to the database.
 * @param {string} userId - The UID of the user performing the action.
 * @param {string} role - The role of the user.
 * @param {string} action - The action being performed (e.g., 'ORDER_PLACED').
 * @param {string} reason - Optional reason or detail for the action.
 * @returns {Promise}
 */
async function logAudit(userId, role, action, reason = '') {
    return db.ref('auditLogs').push({
        userId, role, action, reason, timestamp: new Date().toISOString()
    });
}
// /js/orders.js

// ... (placeOrder, updateOrderStatus, updateOrderFulfillment functions remain the same) ...

/**
 * Places a new order and saves it to the database.
 * @param {object} orderData - The complete order object.
 * @returns {Promise} A promise that resolves when the order is placed.
 */
async function placeOrder(orderData) {
    const newOrderRef = db.ref('orders').push();
    orderData.orderId = newOrderRef.key;
    
    // NOW LOGAUDIT IS CALLED FROM HERE
    await logAudit(auth.currentUser.uid, 'Customer', 'ORDER_PLACED', `Order ${orderData.orderId} placed from Pincode: ${orderData.customerPincode}`);
    
    return newOrderRef.set(orderData);
}

// ... (other functions) ...


/**
 * For a customer, checks for any active (not CLOSED or DELIVERED) order and displays its status.
 * @param {string} customerId - The UID of the customer.
 */
function customerCheckForActiveOrder(customerId) {
    const detailsContainer = document.getElementById('active-order-details');
    const timelineContainer = document.getElementById('order-timeline-fancy');
    
    db.ref('orders').orderByChild('customerId').equalTo(customerId).on('value', snapshot => {
        let activeOrder = null;
        snapshot.forEach(childSnapshot => {
            const order = childSnapshot.val();
            // Check only the most recent active order
            if (order.status !== 'CLOSED' && order.status !== 'DELIVERED') {
                activeOrder = order;
            }
        });

        if (activeOrder) {
            detailsContainer.innerHTML = `
                <h4>Order #${activeOrder.orderId.slice(-6)} <span class="status-badge status-${activeOrder.status}">${activeOrder.status.replace('_', ' ')}</span></h4>
                <p>Items: ${activeOrder.items.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                <p>Payment: ${activeOrder.paymentMethod}</p>
                <p>Delivery To: ${activeOrder.customerAddress}</p>
            `;
            renderOrderTimeline(timelineContainer, activeOrder.status);
        } else {
            detailsContainer.innerHTML = '<h4>No Active Orders</h4><p>Your delivery is complete or no order has been placed yet.</p>';
            timelineContainer.innerHTML = '';
        }
    });
}

/**
 * Renders the visual timeline for the customer's order status (FANCY NEW STYLE).
 * @param {HTMLElement} container - The element to render the timeline into.
 * @param {string} currentStatus - The current status of the order.
 */
function renderOrderTimeline(container, currentStatus) {
    // LOCK STATES (excluding intermediate ones like BATCH_ASSIGNED, PENDING_STORE_CONFIRM)
    const states = {
        'PLACED': 'Order Placed',
        'PACKING': 'Being Packed by Picker',
        'PACKED': 'Ready for Delivery',
        'OUT_FOR_DELIVERY': 'Out for Delivery!',
        'DELIVERED': 'Delivered (Thank You!)'
    };
    
    const statusKeys = Object.keys(states);
    const currentIndex = statusKeys.indexOf(currentStatus);
    
    container.innerHTML = statusKeys.map((key, index) => {
        let className = 'timeline-step-fancy';
        if (index <= currentIndex) className += ' active'; // Mark current and previous as active
        
        const timestamp = index <= currentIndex ? '13:00' : '...'; // Mock timestamp for now
        
        return `
            <div class="${className}">
                <p><strong>${states[key]}</strong></p>
                <p style="font-size: 12px; color: var(--text-secondary-color);">${timestamp}</p>
            </div>
        `;
    }).join('');
}


// --- Audit Log Function (Moved here for global access) ---

/**
 * Logs an audit trail event to the database.
 * @param {string} userId - The UID of the user performing the action.
 * @param {string} role - The role of the user.
 * @param {string} action - The action being performed (e.g., 'ORDER_PLACED').
 * @param {string} reason - Optional reason or detail for the action.
 * @returns {Promise}
 */
async function logAudit(userId, role, action, reason = '') {
    // This function will be called by orders.js, delivery.js, and admin.js
    return db.ref('auditLogs').push({
        userId, role, action, reason, timestamp: new Date().toISOString()
    });
}
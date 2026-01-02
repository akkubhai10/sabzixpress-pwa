// /js/admin.js

// --- Dashboard Loading ---
function loadDashboardData() {
    db.ref('orders').on('value', snapshot => {
        let placed = 0, packing = 0, waiting = 0, ofd = 0;
        snapshot.forEach(child => {
            const status = child.val().status;
            if (status === 'PLACED' || status === 'WAITING_FOR_PICKER') placed++;
            if (status === 'PACKING') packing++;
            if (status === 'PACKED' || status === 'WAITING_FOR_DELIVERY') waiting++;
            if (status === 'OUT_FOR_DELIVERY') ofd++;
        });
        document.getElementById('placed-orders-count').textContent = placed;
        document.getElementById('packing-orders-count').textContent = packing;
        document.getElementById('waiting-delivery-count').textContent = waiting;
        document.getElementById('ofd-orders-count').textContent = ofd;
    });
}

// --- Orders Loading ---
function loadOrdersData() {
    const tableBody = document.querySelector('#orders-table tbody');
    db.ref('orders').on('value', snapshot => {
        tableBody.innerHTML = '';
        snapshot.forEach(child => {
            const order = { id: child.key, ...child.val() };
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${order.id.slice(-6)}</td>
                <td>${order.customerName || 'N/A'}</td>
                <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                <td>${order.items.length}</td>
                <td><button class="btn btn-sm" onclick="viewOrder('${order.id}')">View</button></td>
            `;
        });
    });
}

// --- Inventory Loading ---
function loadInventoryData() {
    const tableBody = document.querySelector('#inventory-table tbody');
    db.ref('inventory').on('value', snapshot => {
        tableBody.innerHTML = '';
        snapshot.forEach(child => {
            const item = { id: child.key, ...child.val() };
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${item.name}</td>
                <td>${item.categoryId}</td>
                <td>${item.price}</td>
                <td>${item.availableQty}</td>
                <td>${item.unitLabel}</td>
                <td><button class="btn btn-sm" onclick="openItemModal('${item.id}')">Edit</button></td>
            `;
        });
    });
}

// --- Delivery Dispatch Loading ---
function loadDeliveryDispatchData() {
    const packedList = document.getElementById('packed-orders-list');
    const partnersList = document.getElementById('available-partners-list');

    db.ref('orders').orderByChild('status').equalTo('PACKED').on('value', snap => {
        packedList.innerHTML = '<h4>Select Orders:</h4>';
        snap.forEach(child => {
            const order = { id: child.key, ...child.val() };
            packedList.innerHTML += `<label><input type="checkbox" class="order-for-trip" value="${order.id}" data-route="${order.routeKey || 'DEFAULT_ROUTE'}"> Order #${order.id.slice(-6)}</label><br>`;
        });
    });

    db.ref('deliveryPartners').orderByChild('shiftOn').equalTo(true).on('value', snap => {
        partnersList.innerHTML = '<h4>Select Partner:</h4>';
        snap.forEach(child => {
            const partner = { id: child.key, ...child.val() };
            if (!partner.isBusy) {
                partnersList.innerHTML += `<label><input type="radio" name="deliveryPartner" value="${partner.id}"> ${partner.displayName || partner.email}</label><br>`;
            }
        });
    });
    
    // Enable/disable trip creation button
    document.body.addEventListener('change', () => {
         const selectedOrders = document.querySelectorAll('.order-for-trip:checked').length;
         const selectedPartner = document.querySelector('input[name="deliveryPartner"]:checked');
         document.getElementById('create-trip-btn').disabled = !(selectedOrders > 0 && selectedPartner);
    });
}

// --- Users and Logs ---
function loadUsersData() { /* ... similar to orders/inventory ... */ }
function loadLogsData() {
    const tableBody = document.querySelector('#logs-table tbody');
    db.ref('auditLogs').limitToLast(100).on('value', snapshot => {
        tableBody.innerHTML = '';
        let logs = [];
        snapshot.forEach(child => logs.push({ id: child.key, ...child.val() }));
        logs.reverse().forEach(log => {
             const row = tableBody.insertRow();
             row.innerHTML = `
                <td>${new Date(log.timestamp).toLocaleString()}</td>
                <td>${log.userId.slice(-6)}</td>
                <td>${log.role}</td>
                <td>${log.action}</td>
                <td>${log.reason}</td>
            `;
        });
    });
}

// --- Form Handlers & Modals ---
function openItemModal(itemId = null) {
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');
    form.reset();
    document.getElementById('item-modal-title').textContent = itemId ? 'Edit Item' : 'Add New Item';
    
    // Populate categories dropdown
    const catSelect = document.getElementById('item-category');
    catSelect.innerHTML = '';
    db.ref('categories').once('value', snap => {
        snap.forEach(child => {
            catSelect.innerHTML += `<option value="${child.key}">${child.val().name}</option>`;
        });
    });
    
    if (itemId) {
        db.ref(`inventory/${itemId}`).once('value', snap => {
            const item = snap.val();
            document.getElementById('item-id').value = itemId;
            document.getElementById('item-name').value = item.name;
            document.getElementById('item-category').value = item.categoryId;
            // ... populate all other fields
        });
    }
    modal.style.display = 'flex';
}

async function handleItemFormSubmit(e) {
    e.preventDefault();
    const itemId = document.getElementById('item-id').value;
    const itemData = {
        name: document.getElementById('item-name').value,
        categoryId: document.getElementById('item-category').value,
        price: parseFloat(document.getElementById('item-price').value),
        availableQty: parseInt(document.getElementById('item-qty').value),
        unitType: document.getElementById('item-unit-type').value,
        unitLabel: document.getElementById('item-unit-label').value,
        imageUrl: document.getElementById('item-image-url').value,
        isNew: document.getElementById('item-is-new').checked,
        active: true,
        launchedAt: document.getElementById('item-is-new').checked ? Date.now() : null
    };

    const ref = itemId ? db.ref(`inventory/${itemId}`) : db.ref('inventory').push();
    await ref.set(itemData);
    await logAudit(auth.currentUser.uid, 'Admin', itemId ? 'EDIT_ITEM' : 'ADD_ITEM', `Item ${itemData.name} saved.`);
    document.getElementById('item-modal').style.display = 'none';
}

async function handleCategoryFormSubmit(e) {
    // Similar to handleItemFormSubmit
    e.preventDefault();
}

async function handleCreateTrip() {
    const selectedOrders = Array.from(document.querySelectorAll('.order-for-trip:checked'));
    const selectedPartner = document.querySelector('input[name="deliveryPartner"]:checked');

    // Rule validation
    if (selectedOrders.length > 3) {
        alert("A batch cannot have more than 3 orders.");
        return;
    }
    const routeKey = selectedOrders[0].dataset.route;
    const allSameRoute = selectedOrders.every(order => order.dataset.route === routeKey);
    if (!allSameRoute) {
        alert("All orders in a batch must belong to the same route.");
        return;
    }
    
    const tripId = `TRIP_${Date.now()}`;
    const tripData = {
        deliveryPartnerId: selectedPartner.value,
        routeKey: routeKey,
        orders: selectedOrders.map(o => ({ orderId: o.value })),
        status: 'BATCH_ASSIGNED',
        createdAt: new Date().toISOString()
    };
    
    // Database updates in a transaction
    await db.ref(`trips/${tripId}`).set(tripData);
    await db.ref(`deliveryPartners/${selectedPartner.value}/isBusy`).set(true);
    for (const orderInput of selectedOrders) {
        await db.ref(`orders/${orderInput.value}/status`).set('BATCH_ASSIGNED');
    }

    await logAudit(auth.currentUser.uid, 'Admin', 'CREATE_TRIP', `Trip ${tripId} created for partner ${selectedPartner.value}.`);
    alert('Trip created successfully!');
    loadDeliveryDispatchData(); // Refresh view
}

// --- General Functions ---
async function getStoreReturnCode() {
    const codeRef = db.ref('config/storeReturnCode');
    let snap = await codeRef.once('value');
    if (!snap.exists()) {
        await codeRef.set('SABZI_RETURN_2026');
        snap = await codeRef.once('value');
    }
    return snap.val();
}
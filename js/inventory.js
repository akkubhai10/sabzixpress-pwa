// /js/inventory.js

const ONE_WEEK_IN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Loads and displays promotional banners from the database.
 */
function loadBanners() {
    const bannersContainer = document.getElementById('promo-banners');
    if (!bannersContainer) return;

    db.ref('banners').on('value', snapshot => {
        bannersContainer.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const banner = childSnapshot.val();
            if (banner.active) {
                const img = document.createElement('img');
                img.src = banner.imageUrl;
                img.alt = banner.name;
                img.loading = 'lazy'; // Lazy loading
                img.onerror = (e) => { e.target.src = 'https://placehold.co/600x200?text=Banner'; };
                bannersContainer.appendChild(img);
            }
        });
    });
}

/**
 * Loads and displays product categories.
 */
function loadCategories() {
    const categoriesGrid = document.getElementById('categories-grid');
    if (!categoriesGrid) return;
    
    db.ref('categories').orderByChild('name').on('value', snapshot => {
        categoriesGrid.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const category = childSnapshot.val();
            const card = document.createElement('div');
            card.className = 'category-card';
            
            let statusBadge = '';
            if (category.status === 'COMING_SOON') {
                card.style.opacity = '0.5';
                statusBadge = '<span class="badge coming-soon">Coming Soon</span>';
            }

            card.innerHTML = `
                <img src="${category.imageUrl}" alt="${category.name}" loading="lazy" onerror="this.onerror=null;this.src='https.placehold.co/100x100?text=Category';">
                <p>${category.name}</p>
                ${statusBadge}
            `;
            
            if (category.status !== 'COMING_SOON') {
                card.addEventListener('click', () => filterProducts(null, category.categoryId));
            }
            categoriesGrid.appendChild(card);
        });
    });
}

/**
 * Loads and displays items marked as "newly launched".
 */
function loadNewlyLaunched() {
    const container = document.getElementById('newly-launched-items');
    if (!container) return;

    db.ref('inventory').orderByChild('isNew').equalTo(true).on('value', snapshot => {
        container.innerHTML = '';
        snapshot.forEach(childSnapshot => {
            const item = { itemId: childSnapshot.key, ...childSnapshot.val() };
            if (item.active) {
                container.appendChild(createProductCard(item));
            }
        });
    });
}

/**
 * Loads all active products from the inventory.
 */
function loadAllProducts() {
    db.ref('inventory').orderByChild('name').on('value', snapshot => {
        const productsGrid = document.getElementById('products-grid');
        if (!productsGrid) return;

        productsGrid.innerHTML = ''; // Clear previous items
        window.allProducts = []; // Store all products for filtering

        snapshot.forEach(childSnapshot => {
            const item = { itemId: childSnapshot.key, ...childSnapshot.val() };
            if (item.active) {
                window.allProducts.push(item);
                productsGrid.appendChild(createProductCard(item));
            }
        });
    });
}


/**
 * Creates an HTML element for a single product card.
 * @param {object} item - The product item data.
 * @returns {HTMLElement} The card element.
 */
function createProductCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';

    const isOutOfStock = item.availableQty <= 0;
    
    let badge = '';
    const launchedAt = new Date(item.launchedAt || 0).getTime();
    const isStillNew = (Date.now() - launchedAt) < ONE_WEEK_IN_MS;
    if (item.isNew && isStillNew) {
        badge = '<span class="badge new">🆕 Newly Launched</span>';
    }

    let buttonHtml = '';
    if (isOutOfStock) {
        buttonHtml = '<p class="out-of-stock">Out of Stock</p>';
    } else {
        // Here you would add logic for WEIGHT vs UNIT types. For simplicity, a single "Add" button is shown.
        buttonHtml = `<button class="btn primary btn-sm" onclick="addToCart('${item.itemId}', '${item.name}', ${item.price}, '${item.unitType}', '${item.unitLabel}')">ADD</button>`;
    }

    card.innerHTML = `
        <img src="${item.imageUrl}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='https.placehold.co/150x100?text=Product';">
        ${badge}
        <h4>${item.name}</h4>
        <p class="price">₹${item.price} / ${item.unitLabel}</p>
        ${buttonHtml}
    `;

    return card;
}

/**
 * Filters the displayed products based on a search term or category.
 * @param {string|null} searchTerm - The text to search for.
 * @param {string|null} categoryId - The category to filter by.
 */
function filterProducts(searchTerm = null, categoryId = null) {
    const productsGrid = document.getElementById('products-grid');
    const title = document.getElementById('product-list-title');
    if (!productsGrid || !window.allProducts) return;

    let filteredProducts = window.allProducts;

    if (categoryId) {
        filteredProducts = filteredProducts.filter(p => p.categoryId === categoryId);
        // Find category name to update title
        db.ref(`categories/${categoryId}/name`).once('value', snap => {
            title.textContent = `Products in ${snap.val()}`;
        });
    } else if (searchTerm) {
         filteredProducts = filteredProducts.filter(p => p.name.toLowerCase().includes(searchTerm));
         title.textContent = `Search results for "${searchTerm}"`;
    } else {
        title.textContent = 'All Products';
    }

    productsGrid.innerHTML = '';
    if(filteredProducts.length === 0) {
        productsGrid.innerHTML = '<p>No products found.</p>';
        return;
    }
    filteredProducts.forEach(item => {
        productsGrid.appendChild(createProductCard(item));
    });
}
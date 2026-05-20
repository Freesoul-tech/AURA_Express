(function () {
    const SELLER_PRODUCTS_KEY = 'aura_seller_products';
    const SELLER_PROFILE_KEY = 'aura_seller_profile';
    const USD_TO_MWK_RATE = 1750;

    const DEFAULT_PROFILE = {
        sellerName: 'Marketplace Seller',
        shopName: 'My Union Market Shop',
        email: '',
        phone: ''
    };

    const CATEGORY_OPTIONS = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Gaming'];
    const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    const dashboardFilterState = {
        query: '',
        status: 'all',
        sortBy: 'latest',
        page: 1,
        pageSize: 10
    };

    function parseJSON(value, fallback) {
        try {
            return JSON.parse(value);
        } catch (_error) {
            return fallback;
        }
    }

    function sanitizeText(value) {
        return String(value || '').replace(/[<>"'`]/g, '').trim();
    }

    function isSkuUnique(sku, currentId) {
        if (!sku) return true;
        const normalizedSku = String(sku).trim().toLowerCase();
        return !getSellerProducts().some((item) => String(item.sku || '').trim().toLowerCase() === normalizedSku
            && String(item.id) !== String(currentId || ''));
    }

    function getSellerProfile() {
        const stored = parseJSON(localStorage.getItem(SELLER_PROFILE_KEY), null);
        return { ...DEFAULT_PROFILE, ...(stored || {}) };
    }

    function saveSellerProfile(profilePatch) {
        const next = { ...getSellerProfile(), ...profilePatch };
        localStorage.setItem(SELLER_PROFILE_KEY, JSON.stringify(next));
        return next;
    }

    function getSellerProducts() {
        const items = parseJSON(localStorage.getItem(SELLER_PRODUCTS_KEY), []);
        return Array.isArray(items) ? items : [];
    }

    function saveSellerProducts(items) {
        localStorage.setItem(SELLER_PRODUCTS_KEY, JSON.stringify(items));
    }

    function getMaxKnownProductId() {
        const staticMax = Array.isArray(window.products)
            ? window.products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0)
            : 0;
        const sellerMax = getSellerProducts().reduce((max, p) => Math.max(max, Number(p.id) || 0), 0);
        return Math.max(staticMax, sellerMax, 120);
    }

    function toMwk(amount) {
        return Math.round((Number(amount) || 0) * USD_TO_MWK_RATE);
    }

    function fromMwk(amount) {
        return (Number(amount) || 0) / USD_TO_MWK_RATE;
    }

    function discountFromPrices(price, originalPrice) {
        if (!originalPrice || originalPrice <= price) return 0;
        return Math.round(((originalPrice - price) / originalPrice) * 100);
    }

    function normalizeSellerProduct(raw, existingId) {
        const profile = getSellerProfile();
        const price = Number(raw.price || 0);
        const guessedOriginal = Number(raw.originalPrice || 0) > 0 ? Number(raw.originalPrice) : Number((price * 1.2).toFixed(2));
        const inventory = Number(raw.inventory || 0);
        const safeCategory = CATEGORY_OPTIONS.includes(raw.category) ? raw.category : 'Electronics';

        return {
            id: existingId || getMaxKnownProductId() + 1,
            name: sanitizeText(raw.name),
            description: sanitizeText(raw.description),
            category: safeCategory,
            price,
            originalPrice: Math.max(guessedOriginal, price),
            discount: discountFromPrices(price, Math.max(guessedOriginal, price)),
            image: raw.image || 'https://images.unsplash.com/photo-1581235720704-06d3acfcb36f?w=500&q=80',
            supplier: profile.shopName || profile.sellerName || 'Marketplace Seller',
            rating: Number(raw.rating || 4.5),
            reviews: Number(raw.reviews || 0),
            tag: raw.tag || 'new',
            stock: inventory <= 5 ? 'low-stock' : 'in-stock',
            inventory,
            status: raw.status || 'active',
            sku: sanitizeText(raw.sku) || `SKU-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            shippingDays: Number(raw.shippingDays || 3),
            sellerManaged: true,
            createdAt: raw.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    }

    function addSellerProduct(productInput) {
        const all = getSellerProducts();
        const normalized = normalizeSellerProduct(productInput);
        all.unshift(normalized);
        saveSellerProducts(all);
        return normalized;
    }

    function updateSellerProduct(productId, productInput) {
        const all = getSellerProducts();
        const idx = all.findIndex((item) => String(item.id) === String(productId));
        if (idx < 0) return null;
        const current = all[idx];
        const normalized = normalizeSellerProduct({ ...current, ...productInput, createdAt: current.createdAt }, current.id);
        all[idx] = normalized;
        saveSellerProducts(all);
        return normalized;
    }

    function removeSellerProduct(productId) {
        const all = getSellerProducts();
        const next = all.filter((item) => String(item.id) !== String(productId));
        saveSellerProducts(next);
    }

    function toggleProductStatus(productId) {
        const all = getSellerProducts();
        const item = all.find((entry) => String(entry.id) === String(productId));
        if (!item) return null;
        item.status = item.status === 'active' ? 'paused' : 'active';
        item.updatedAt = new Date().toISOString();
        saveSellerProducts(all);
        return item;
    }

    function getDashboardStats() {
        const items = getSellerProducts();
        const active = items.filter((item) => item.status === 'active');
        const lowStock = active.filter((item) => Number(item.inventory) <= 5);
        const totalValueMwk = active.reduce((sum, item) => sum + toMwk((Number(item.price) || 0) * (Number(item.inventory) || 0)), 0);
        const monthlyEstimateMwk = active.reduce((sum, item) => sum + toMwk((Number(item.price) || 0) * Math.max(1, Math.round((Number(item.reviews) || 0) / 12))), 0);

        return {
            totalListings: items.length,
            activeListings: active.length,
            lowStockCount: lowStock.length,
            inventoryValueMwk: totalValueMwk,
            monthlyEstimateMwk
        };
    }

    function formatMwk(mwk) {
        return new Intl.NumberFormat('en-MW', {
            style: 'currency',
            currency: 'MWK',
            maximumFractionDigits: 0
        }).format(Number(mwk) || 0);
    }

    function getFilteredSellerProducts(items) {
        const query = dashboardFilterState.query.trim().toLowerCase();
        return items.filter((item) => {
            const byStatus = dashboardFilterState.status === 'all'
                || (dashboardFilterState.status === 'low-stock' && Number(item.inventory) <= 5)
                || item.status === dashboardFilterState.status;
            if (!byStatus) return false;

            if (!query) return true;
            const haystack = `${item.name} ${item.sku} ${item.category}`.toLowerCase();
            return haystack.includes(query);
        });
    }

    function sortSellerProducts(items) {
        const sorted = [...items];
        const sortBy = dashboardFilterState.sortBy;
        sorted.sort((a, b) => {
            if (sortBy === 'price-desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
            if (sortBy === 'price-asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
            if (sortBy === 'inventory-desc') return (Number(b.inventory) || 0) - (Number(a.inventory) || 0);
            if (sortBy === 'inventory-asc') return (Number(a.inventory) || 0) - (Number(b.inventory) || 0);
            if (sortBy === 'name-asc') return String(a.name || '').localeCompare(String(b.name || ''));
            if (sortBy === 'name-desc') return String(b.name || '').localeCompare(String(a.name || ''));
            if (sortBy === 'oldest') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
            return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
        return sorted;
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function bootstrapMarketplaceProducts() {
        if (!Array.isArray(window.products)) return;
        const sellerItems = getSellerProducts().filter((item) => item.status === 'active');
        const existingIds = new Set(window.products.map((item) => String(item.id)));

        sellerItems.forEach((item) => {
            if (!existingIds.has(String(item.id))) {
                window.products.push(normalizeSellerProduct(item, item.id));
                existingIds.add(String(item.id));
            }
        });
    }

    function renderDashboard() {
        const stats = getDashboardStats();
        const products = getSellerProducts();
        const filteredProducts = getFilteredSellerProducts(products);
        const sortedProducts = sortSellerProducts(filteredProducts);
        const totalPages = Math.max(1, Math.ceil(sortedProducts.length / dashboardFilterState.pageSize));
        dashboardFilterState.page = Math.min(Math.max(1, dashboardFilterState.page), totalPages);
        const start = (dashboardFilterState.page - 1) * dashboardFilterState.pageSize;
        const paginatedProducts = sortedProducts.slice(start, start + dashboardFilterState.pageSize);

        const statsEl = document.getElementById('seller-stats-grid');
        const productsEl = document.getElementById('seller-products-list');
        const emptyEl = document.getElementById('seller-empty-state');
        const lowStockEl = document.getElementById('seller-low-stock-list');
        const filterSummaryEl = document.getElementById('seller-filter-summary');
        const paginationSummaryEl = document.getElementById('seller-pagination-summary');
        const pageIndicatorEl = document.getElementById('seller-page-indicator');
        const prevBtn = document.getElementById('seller-prev-page-btn');
        const nextBtn = document.getElementById('seller-next-page-btn');
        const paginationControls = document.getElementById('seller-pagination-controls');

        if (statsEl) {
            statsEl.innerHTML = `
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Total Listings</p>
                    <p class="text-3xl font-black text-gray-900 dark:text-white mt-2">${stats.totalListings}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Active Listings</p>
                    <p class="text-3xl font-black text-green-600 mt-2">${stats.activeListings}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                    <p class="text-xs uppercase tracking-wider text-gray-400 font-bold">Low Stock Alerts</p>
                    <p class="text-3xl font-black text-orange-500 mt-2">${stats.lowStockCount}</p>
                </article>
                <article class="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-orange-100 dark:border-orange-900/50">
                    <p class="text-xs uppercase tracking-wider text-[#FF6A00] font-bold">Inventory Value</p>
                    <p class="text-2xl font-black text-[#FF6A00] mt-2">${formatMwk(stats.inventoryValueMwk)}</p>
                    <p class="text-xs text-gray-500 mt-1">Monthly estimate: ${formatMwk(stats.monthlyEstimateMwk)}</p>
                </article>
            `;
        }

        if (lowStockEl) {
            const lowStockItems = products.filter((item) => item.status === 'active' && Number(item.inventory) <= 5).slice(0, 6);
            if (lowStockItems.length === 0) {
                lowStockEl.innerHTML = '<p class="text-sm text-gray-500">No low-stock products right now.</p>';
            } else {
                lowStockEl.innerHTML = lowStockItems.map((item) => `
                    <li class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0">
                        <span class="text-sm text-gray-700 dark:text-gray-300 truncate pr-3">${escapeHtml(item.name)}</span>
                        <span class="text-xs font-bold text-orange-500">${Number(item.inventory)} left</span>
                    </li>
                `).join('');
            }
        }

        if (filterSummaryEl) {
            filterSummaryEl.textContent = `Showing ${paginatedProducts.length} on this page (${filteredProducts.length} filtered of ${products.length} total)`;
        }

        if (paginationSummaryEl) {
            paginationSummaryEl.textContent = `Page ${dashboardFilterState.page} of ${totalPages}`;
        }
        if (pageIndicatorEl) {
            pageIndicatorEl.textContent = `Page ${dashboardFilterState.page} / ${totalPages}`;
        }
        if (prevBtn) {
            prevBtn.disabled = dashboardFilterState.page <= 1;
            prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
            prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
        }
        if (nextBtn) {
            nextBtn.disabled = dashboardFilterState.page >= totalPages;
            nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
            nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
        }
        if (paginationControls) {
            paginationControls.classList.toggle('hidden', filteredProducts.length === 0);
        }

        if (!productsEl || !emptyEl) return;

        if (products.length === 0 || filteredProducts.length === 0) {
            productsEl.innerHTML = '';
            emptyEl.classList.remove('hidden');
            if (products.length > 0 && filteredProducts.length === 0) {
                emptyEl.textContent = 'No listings match your filters. Try a different search or status.';
            } else {
                emptyEl.textContent = 'No listings yet. Add your first product above.';
            }
            return;
        }

        emptyEl.classList.add('hidden');
        productsEl.innerHTML = paginatedProducts.map((item) => {
            const statusClass = item.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300';

            return `
                <article class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 md:p-5">
                    <div class="flex flex-col md:flex-row md:items-center gap-4">
                        <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" class="w-full md:w-28 h-28 object-cover rounded-xl border border-gray-100 dark:border-gray-800">
                        <div class="flex-grow min-w-0">
                            <div class="flex flex-wrap items-center gap-2 mb-2">
                                <h3 class="text-base font-bold text-gray-900 dark:text-white truncate">${escapeHtml(item.name)}</h3>
                                <span class="text-[11px] px-2 py-1 rounded-full font-bold ${statusClass}">${item.status.toUpperCase()}</span>
                            </div>
                            <p class="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">${escapeHtml(item.description || 'No description')}</p>
                            <div class="mt-3 flex flex-wrap items-center gap-4 text-sm">
                                <span class="font-bold text-[#FF6A00]">${formatMwk(toMwk(item.price))}</span>
                                <span class="text-gray-500">Inventory: ${Number(item.inventory)}</span>
                                <span class="text-gray-500">SKU: ${escapeHtml(item.sku)}</span>
                            </div>
                        </div>
                        <div class="flex flex-wrap gap-2 md:flex-col md:w-32">
                            <button data-seller-action="edit" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-colors">Edit</button>
                            <button data-seller-action="toggle" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-[#FF6A00] text-white text-xs font-bold hover:bg-[#e65f00] transition-colors">${item.status === 'active' ? 'Pause' : 'Activate'}</button>
                            <button data-seller-action="restock" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors">+10 Stock</button>
                            <button data-seller-action="duplicate" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition-colors">Duplicate</button>
                            <button data-seller-action="delete" data-product-id="${item.id}" class="flex-1 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold hover:bg-red-100 transition-colors">Delete</button>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function readImageAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error('Could not read image file.'));
            reader.readAsDataURL(file);
        });
    }

    function loadImage(source) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Could not load image.'));
            img.src = source;
        });
    }

    async function createImageVariantsFromFile(file) {
        const originalDataUrl = await readImageAsDataURL(file);
        const img = await loadImage(originalDataUrl);
        const variants = [
            { key: 'thumb', width: 240, quality: 0.75 },
            { key: 'medium', width: 520, quality: 0.82 },
            { key: 'large', width: 920, quality: 0.86 }
        ];
        const result = {};

        variants.forEach((variant) => {
            const ratio = img.height / img.width;
            const width = Math.min(variant.width, img.width);
            const height = Math.max(1, Math.round(width * ratio));
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.drawImage(img, 0, 0, width, height);
            result[variant.key] = canvas.toDataURL('image/webp', variant.quality);
        });

        result.original = result.large || originalDataUrl;
        result.srcset = [result.thumb, result.medium, result.large]
            .filter(Boolean)
            .map((value, index) => `${value} ${[240, 520, 920][index]}w`)
            .join(', ');

        return result;
    }

    function setImagePreview(source) {
        const preview = document.getElementById('seller-image-preview');
        if (!preview) return;
        if (!source) {
            preview.src = '';
            preview.classList.add('hidden');
            return;
        }
        preview.src = source;
        preview.classList.remove('hidden');
    }

    function fillFormWithProduct(product) {
        const form = document.getElementById('seller-product-form');
        if (!form || !product) return;

        form.dataset.editId = String(product.id);
        form.elements.name.value = product.name || '';
        form.elements.description.value = product.description || '';
        form.elements.category.value = product.category || 'Electronics';
        form.elements.price.value = product.price ? Math.round(toMwk(product.price)) : '';
        form.elements.originalPrice.value = product.originalPrice ? Math.round(toMwk(product.originalPrice)) : '';
        form.elements.inventory.value = product.inventory || 1;
        form.elements.shippingDays.value = product.shippingDays || 3;
        form.elements.sku.value = product.sku || '';

        if (product.image) setImagePreview(product.image);

        const submitLabel = document.getElementById('seller-submit-label');
        if (submitLabel) submitLabel.textContent = 'Update Product';

        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function resetProductForm() {
        const form = document.getElementById('seller-product-form');
        if (!form) return;
        form.reset();
        delete form.dataset.editId;

        setImagePreview('');

        const submitLabel = document.getElementById('seller-submit-label');
        if (submitLabel) submitLabel.textContent = 'Publish Product';
    }

    async function handleProductSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const editId = form.dataset.editId;

        const payload = {
            name: sanitizeText(form.elements.name.value),
            description: sanitizeText(form.elements.description.value),
            category: form.elements.category.value,
            price: Number(fromMwk(form.elements.price.value).toFixed(2)),
            originalPrice: Number(fromMwk(form.elements.originalPrice.value || 0).toFixed(2)),
            inventory: Number(form.elements.inventory.value),
            shippingDays: Number(form.elements.shippingDays.value || 3),
            sku: sanitizeText(form.elements.sku.value),
            status: 'active'
        };

        if (payload.name.length < 3) {
            if (typeof showToast === 'function') showToast('Product name must be at least 3 characters.', 'error');
            return;
        }
        if (payload.description.length < 10) {
            if (typeof showToast === 'function') showToast('Description should be at least 10 characters.', 'error');
            return;
        }
        if (!isSkuUnique(payload.sku, editId)) {
            if (typeof showToast === 'function') showToast('SKU already exists. Please use a unique SKU.', 'error');
            return;
        }
        if (payload.price <= 0 || payload.inventory < 0) {
            if (typeof showToast === 'function') showToast('Fill in valid price and inventory values.', 'error');
            return;
        }

        const file = form.elements.image.files[0];
        if (!editId && !file) {
            if (typeof showToast === 'function') showToast('Please upload a product image.', 'error');
            return;
        }

        if (file) {
            if (!ALLOWED_IMAGE_TYPES.includes(String(file.type || '').toLowerCase())) {
                if (typeof showToast === 'function') showToast('Use JPG, PNG, or WEBP image format.', 'error');
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                if (typeof showToast === 'function') showToast('Image too large. Max size is 4MB.', 'error');
                return;
            }
            const optimized = await createImageVariantsFromFile(file);
            payload.image = optimized.medium || optimized.original;
            payload.imageThumbnail = optimized.thumb || optimized.medium || optimized.original;
            payload.imageLarge = optimized.large || optimized.original;
            payload.imageSrcSet = optimized.srcset || '';
        }

        if (editId) {
            updateSellerProduct(editId, payload);
            if (typeof showToast === 'function') showToast('Product updated.', 'success');
            if (typeof trackEvent === 'function') trackEvent('seller_product_updated', { productId: editId, sku: payload.sku });
        } else {
            addSellerProduct(payload);
            if (typeof showToast === 'function') showToast('Product published.', 'success');
            if (typeof trackEvent === 'function') trackEvent('seller_product_created', { sku: payload.sku, category: payload.category });
        }

        resetProductForm();
        renderDashboard();
    }

    function handleDashboardActions(event) {
        const button = event.target.closest('[data-seller-action]');
        if (!button) return;

        const action = button.getAttribute('data-seller-action');
        const productId = button.getAttribute('data-product-id');
        const products = getSellerProducts();
        const product = products.find((item) => String(item.id) === String(productId));
        if (!product) return;

        if (action === 'edit') {
            fillFormWithProduct(product);
            return;
        }

        if (action === 'toggle') {
            const toggled = toggleProductStatus(productId);
            if (toggled && typeof showToast === 'function') {
                showToast(toggled.status === 'active' ? 'Listing activated.' : 'Listing paused.', 'success');
            }
            renderDashboard();
            return;
        }

        if (action === 'restock') {
            const nextInventory = Number(product.inventory || 0) + 10;
            updateSellerProduct(productId, { inventory: nextInventory, stock: nextInventory <= 5 ? 'low-stock' : 'in-stock' });
            if (typeof showToast === 'function') showToast(`${product.name} stock increased to ${nextInventory}.`, 'success');
            renderDashboard();
            return;
        }

        if (action === 'duplicate') {
            const duplicated = {
                ...product,
                name: `${product.name} (Copy)`,
                sku: `${product.sku}-COPY`,
                status: 'paused'
            };
            delete duplicated.id;
            delete duplicated.createdAt;
            delete duplicated.updatedAt;
            addSellerProduct(duplicated);
            if (typeof showToast === 'function') showToast('Listing duplicated as paused copy.', 'success');
            renderDashboard();
            return;
        }

        if (action === 'delete') {
            const ok = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
            if (!ok) return;
            removeSellerProduct(productId);
            if (typeof showToast === 'function') showToast('Listing deleted.', 'success');
            renderDashboard();
        }
    }

    function hydrateProfileForm() {
        const form = document.getElementById('seller-profile-form');
        if (!form) return;
        const profile = getSellerProfile();
        form.elements.sellerName.value = profile.sellerName || '';
        form.elements.shopName.value = profile.shopName || '';
        form.elements.email.value = profile.email || '';
        form.elements.phone.value = profile.phone || '';
    }

    async function handleProfileSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const profilePatch = {
            sellerName: form.elements.sellerName.value.trim(),
            shopName: form.elements.shopName.value.trim(),
            email: form.elements.email.value.trim(),
            phone: form.elements.phone.value.trim()
        };

        const fileInput = form.elements.idDocument;
        const file = fileInput?.files?.[0];
        if (file) {
            profilePatch.idDocument = file.name;
        }

        saveSellerProfile(profilePatch);

        const file = fileInput?.files?.[0];

        if (file && typeof backendRequest === 'function') {
            const formData = new FormData();
            formData.append('sellerName', profilePatch.sellerName);
            formData.append('shopName', profilePatch.shopName);
            formData.append('email', profilePatch.email);
            formData.append('phone', profilePatch.phone);
            formData.append('idDocument', file);

            const response = await backendRequest('/api/seller/profile', {
                method: 'POST',
                body: formData
            });

            if (response.ok && response.json?.success) {
                if (typeof showToast === 'function') showToast('Seller profile saved and verification document uploaded.', 'success');
                renderDashboard();
                return;
            }
            if (response.status !== 0) {
                if (typeof showToast === 'function') showToast('Profile saved locally but verification upload failed.', 'error');
                renderDashboard();
                return;
            }
        }

        if (typeof showToast === 'function') showToast('Seller profile saved locally.', 'success');
        renderDashboard();
    }

    function exportListingsJSON() {
        const products = sortSellerProducts(getFilteredSellerProducts(getSellerProducts()));
        const blob = new Blob([JSON.stringify(products, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `seller-listings-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('Listings exported.', 'success');
    }

    function exportListingsCSV() {
        const products = sortSellerProducts(getFilteredSellerProducts(getSellerProducts()));
        const headers = ['id', 'name', 'category', 'sku', 'status', 'price_mwk', 'inventory', 'shipping_days', 'created_at', 'updated_at'];
        const escapeCsv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = products.map((item) => ([
            item.id,
            item.name,
            item.category,
            item.sku,
            item.status,
            Math.round(toMwk(item.price)),
            item.inventory,
            item.shippingDays,
            item.createdAt,
            item.updatedAt
        ].map(escapeCsv).join(',')));
        const csv = [headers.join(','), ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `seller-listings-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        if (typeof showToast === 'function') showToast('CSV exported.', 'success');
    }

    function renderAuthPanel() {
        const loginBtn = document.getElementById('seller-login-btn');
        const profileBtn = document.getElementById('seller-profile-btn');
        const profileName = document.getElementById('seller-profile-name');
        const profileAvatar = document.getElementById('seller-profile-avatar');
        if (!loginBtn || !profileBtn) return;

        const isLoggedIn = localStorage.getItem('aura_user_logged_in') === 'true';
        if (isLoggedIn) {
            const user = parseJSON(localStorage.getItem('aura_current_user'), null);
            const name = (user && user.name) || localStorage.getItem('userName') || 'Profile';
            loginBtn.classList.add('hidden');
            profileBtn.classList.remove('hidden');
            profileBtn.classList.add('inline-flex');
            if (profileName) profileName.textContent = name;
            if (profileAvatar) profileAvatar.textContent = String(name).charAt(0).toUpperCase();
        } else {
            loginBtn.classList.remove('hidden');
            profileBtn.classList.add('hidden');
            profileBtn.classList.remove('inline-flex');
        }
    }

    function initSellerDashboard() {
        const form = document.getElementById('seller-product-form');
        if (!form) return;

        hydrateProfileForm();
        renderAuthPanel();
        renderDashboard();

        form.addEventListener('submit', (event) => {
            handleProductSubmit(event).catch(() => {
                if (typeof showToast === 'function') showToast('Image upload failed. Try another image.', 'error');
            });
        });

        document.getElementById('seller-products-list')?.addEventListener('click', handleDashboardActions);
        document.getElementById('seller-profile-form')?.addEventListener('submit', handleProfileSubmit);
        document.getElementById('seller-reset-btn')?.addEventListener('click', resetProductForm);
        document.getElementById('seller-export-btn')?.addEventListener('click', exportListingsJSON);
        document.getElementById('seller-export-csv-btn')?.addEventListener('click', exportListingsCSV);
        document.getElementById('seller-clear-filters-btn')?.addEventListener('click', () => {
            dashboardFilterState.query = '';
            dashboardFilterState.status = 'all';
            dashboardFilterState.sortBy = 'latest';
            dashboardFilterState.page = 1;
            dashboardFilterState.pageSize = 10;
            const searchInput = document.getElementById('seller-listing-search');
            const statusSelect = document.getElementById('seller-status-filter');
            const sortSelect = document.getElementById('seller-sort-by');
            const pageSizeSelect = document.getElementById('seller-page-size');
            if (searchInput) searchInput.value = '';
            if (statusSelect) statusSelect.value = 'all';
            if (sortSelect) sortSelect.value = 'latest';
            if (pageSizeSelect) pageSizeSelect.value = '10';
            renderDashboard();
        });

        document.getElementById('seller-listing-search')?.addEventListener('input', (event) => {
            dashboardFilterState.query = event.target.value || '';
            dashboardFilterState.page = 1;
            renderDashboard();
        });

        document.getElementById('seller-status-filter')?.addEventListener('change', (event) => {
            dashboardFilterState.status = event.target.value || 'all';
            dashboardFilterState.page = 1;
            renderDashboard();
        });

        document.getElementById('seller-sort-by')?.addEventListener('change', (event) => {
            dashboardFilterState.sortBy = event.target.value || 'latest';
            dashboardFilterState.page = 1;
            renderDashboard();
        });

        document.getElementById('seller-page-size')?.addEventListener('change', (event) => {
            const parsed = Number(event.target.value);
            dashboardFilterState.pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 10;
            dashboardFilterState.page = 1;
            renderDashboard();
        });

        document.getElementById('seller-prev-page-btn')?.addEventListener('click', () => {
            dashboardFilterState.page = Math.max(1, dashboardFilterState.page - 1);
            renderDashboard();
        });

        document.getElementById('seller-next-page-btn')?.addEventListener('click', () => {
            dashboardFilterState.page += 1;
            renderDashboard();
        });

        document.getElementById('seller-image-input')?.addEventListener('change', async (event) => {
            const file = event.target.files[0];
            if (!file) {
                setImagePreview('');
                return;
            }
            if (!String(file.type || '').startsWith('image/')) {
                setImagePreview('');
                if (typeof showToast === 'function') showToast('Please select a valid image file.', 'error');
                event.target.value = '';
                return;
            }
            if (file.size > MAX_IMAGE_SIZE_BYTES) {
                setImagePreview('');
                if (typeof showToast === 'function') showToast('Image too large. Max size is 4MB.', 'error');
                event.target.value = '';
                return;
            }
            try {
                const dataUrl = await readImageAsDataURL(file);
                setImagePreview(dataUrl);
            } catch (_error) {
                if (typeof showToast === 'function') showToast('Could not preview that image.', 'error');
                setImagePreview('');
            }
        });
    }

    window.SellerMarketplace = {
        getSellerProfile,
        saveSellerProfile,
        getSellerProducts,
        addSellerProduct,
        updateSellerProduct,
        removeSellerProduct,
        toggleProductStatus,
        getDashboardStats,
        initSellerDashboard,
        bootstrapMarketplaceProducts
    };

    // Make seller listings visible inside storefront product arrays.
    bootstrapMarketplaceProducts();

    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('seller-product-form')) {
            initSellerDashboard();
        }
    });
})();

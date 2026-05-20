// ============ UNION MARKET - COMPREHENSIVE JAVASCRIPT ============
// All JavaScript code consolidated from across all pages

// ============ 1. GLOBAL STATE & CONFIGURATION ============
let currentSlide = 0;
let currentCat = 'all';
let currentCategory = 'All';
let currentSortVal = 'Newest arrivals';
let currentSortOrder = 'Newest arrivals';
let currentConversation = null;
let currentProduct = null;
let currentView = 'grid';
let itemsLimit = 20;
const itemsIncrement = 20;
const totalSlides = 3;
const USD_TO_MWK_RATE = 1750;
const FREE_SHIPPING_THRESHOLD_USD = 50;
const FALLBACK_IMAGE_BY_CATEGORY = {
    Electronics: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=75',
    Fashion: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=900&q=75',
    'Home & Garden': 'https://images.unsplash.com/photo-1484101403633-562f891dc89a?w=900&q=75',
    Sports: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900&q=75',
    Beauty: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=75',
    Gaming: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=900&q=75',
    default: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=900&q=75'
};

const mwkFormatter = new Intl.NumberFormat('en-MW', {
    style: 'currency',
    currency: 'MWK',
    maximumFractionDigits: 0
});

function toMwk(amount) {
    return amount * USD_TO_MWK_RATE;
}

function formatPrice(amount) {
    return mwkFormatter.format(toMwk(amount));
}

function sanitizeText(value) {
    return String(value || '').replace(/[<>"'`]/g, '').trim();
}

function trackEvent(eventName, payload = {}) {
    const events = JSON.parse(localStorage.getItem('aura_analytics_events') || '[]');
    events.unshift({
        eventName,
        payload,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('aura_analytics_events', JSON.stringify(events.slice(0, 500)));
}

function getCurrentUserRole() {
    const fromDirect = (localStorage.getItem('aura_user_role') || '').toLowerCase();
    if (fromDirect) return fromDirect;
    try {
        const user = JSON.parse(localStorage.getItem('aura_current_user') || 'null');
        return String(user?.role || 'buyer').toLowerCase();
    } catch (_error) {
        return 'buyer';
    }
}

function enforceRoleGuards() {
    const page = window.location.pathname.split('/').pop();
    const role = getCurrentUserRole();
    const isLoggedIn = localStorage.getItem('aura_user_logged_in') === 'true';
    if (page === 'seller-dashboard.html' && (!isLoggedIn || !['seller', 'admin'].includes(role))) {
        showToast('Seller access required. Redirecting to sign in...', 'error');
        setTimeout(() => {
            window.location.href = 'signin.html';
        }, 600);
    }
}

function getOptimizedImageURL(imageURL, width = 500, quality = 70) {
    if (!imageURL || typeof imageURL !== 'string') return imageURL;
    // Only transform network images. Keep local/base64 uploads unchanged.
    if (!imageURL.startsWith('http')) return imageURL;

    try {
        const url = new URL(imageURL);
        // Unsplash supports server-side resizing and compression parameters.
        if (url.hostname.includes('images.unsplash.com')) {
            url.searchParams.set('auto', 'format');
            url.searchParams.set('fit', 'crop');
            url.searchParams.set('w', String(width));
            url.searchParams.set('q', String(quality));
            return url.toString();
        }
        return imageURL;
    } catch (_error) {
        return imageURL;
    }
}

function getFallbackImageByCategory(category) {
    return FALLBACK_IMAGE_BY_CATEGORY[category] || FALLBACK_IMAGE_BY_CATEGORY.default;
}

window.handleImageLoadError = function handleImageLoadError(imgEl) {
    if (!imgEl || imgEl.dataset.fallbackApplied === 'true') return;
    const category = imgEl.dataset.category || 'default';
    const fallback = getOptimizedImageURL(getFallbackImageByCategory(category), 720, 75);
    imgEl.dataset.fallbackApplied = 'true';
    imgEl.src = fallback;
};

// ============ UTILITY FUNCTIONS ============
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

async function backendRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        const json = await response.json().catch(() => null);
        return { ok: response.ok, status: response.status, json };
    } catch (error) {
        return { ok: false, status: 0, error };
    }
}

function highlightMatch(text, terms) {
    if (!terms || terms.length === 0 || !text) return text;
    // Filter out very short terms to prevent excessive highlighting (e.g., single letters)
    const validTerms = terms.filter(t => t.length > 1);
    if (validTerms.length === 0) return text;

    const pattern = validTerms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'gi');
    return text.replace(regex, '<mark class="bg-orange-200 dark:bg-orange-500/30 text-[#FF6A00] dark:text-orange-400 p-0 rounded">$1</mark>');
}

// Global notification sound
const SUCCESS_SOUND = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-24 right-8 px-6 py-3 rounded-xl shadow-2xl z-[1000] transform transition-all duration-300 translate-x-full font-bold flex items-center gap-3 ${
        type === 'success' ? 'bg-green-500 text-white' : 
        type === 'error' ? 'bg-red-500 text-white' : 
        'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
    }`;
    toast.innerHTML = `
        ${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}
        <span>${message}</span>
    `;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-live', type === 'error' ? 'assertive' : 'polite');
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => toast.classList.remove('translate-x-full'), 10);
    // Animate out
    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// All Products Data (120 products across 6 categories)
const products = [
    // ============ ELECTRONICS - 20 Products ============
    { id: 1, name: 'Customizable Premium Wireless Bluetooth Headphones', price: 25.00, originalPrice: 45.00, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', supplier: 'CN Electronics Ltd.', rating: 4.5, reviews: 1250, discount: 44, category: 'Electronics', tag: 'bestseller', description: 'Experience industry-leading audio with active noise cancellation and 40-hour battery life. Perfect for travel or long office hours.' },
    { id: 2, name: 'Portable USB-C Fast Charging Cable', price: 8.50, originalPrice: 15.00, image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', supplier: 'Tech Supplies Inc.', rating: 4.7, reviews: 890, discount: 43, category: 'Electronics', tag: 'new', description: 'High-speed charging and data sync with a durable braided nylon jacket. Reinforced joints prevent fraying under heavy daily use.' },
    { id: 3, name: 'Wireless Mouse and Keyboard Combo', price: 32.00, originalPrice: 59.99, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&q=80', supplier: 'Computer Gear Ltd.', rating: 4.6, reviews: 720, discount: 47, category: 'Electronics', tag: 'bestseller', description: 'A sleek, ergonomic duo featuring quiet keys and precision tracking. Designed to increase productivity and reduce desk clutter.' },
    { id: 4, name: '4K Action Camera Pro', price: 89.99, originalPrice: 179.99, image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80', supplier: 'Video Tech', rating: 4.8, reviews: 850, discount: 50, category: 'Electronics', tag: 'flash' },
    { id: 5, name: 'Professional Webcam 1080p HD', price: 35.99, originalPrice: 69.99, image: 'https://images.unsplash.com/photo-1598286366235-94ef88a3e269?w=500&q=80', supplier: 'Stream Gear', rating: 4.4, reviews: 640, discount: 49, category: 'Electronics', tag: 'hot', description: 'Crystal clear 1080p video for professional streaming and video calls. Built-in noise-reducing microphone ensures you sound as good as you look.' },
    { id: 6, name: 'Smart Thermostat Control System', price: 65.00, originalPrice: 129.99, image: 'https://images.unsplash.com/photo-1545932261-9a25269f4937?w=500&q=80', supplier: 'Smart Home Solutions', rating: 4.8, reviews: 980, discount: 50, category: 'Electronics', tag: 'hot' },
    { id: 7, name: 'Portable Power Bank 20000mAh', price: 22.00, originalPrice: 42.00, image: 'https://images.unsplash.com/photo-1609042231485-b5e6d8a10232?w=500&q=80', supplier: 'Mobile Accessories', rating: 4.5, reviews: 1100, discount: 48, category: 'Electronics', tag: 'new' },
    { id: 8, name: 'Premium Wireless Speaker System', price: 55.00, originalPrice: 99.99, image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd219f90?w=500&q=80', supplier: 'Audio Electronics', rating: 4.6, reviews: 670, discount: 45, category: 'Electronics', tag: 'bestseller' },
    { id: 9, name: 'Digital Drawing Tablet 2024', price: 78.00, originalPrice: 149.99, image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&q=80', supplier: 'Creative Tools Inc.', rating: 4.7, reviews: 430, discount: 48, category: 'Electronics', tag: 'new' },
    { id: 10, name: 'Noise Canceling In-Ear Earbuds', price: 42.00, originalPrice: 84.99, image: 'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&q=80', supplier: 'Audio Pro', rating: 4.6, reviews: 1320, discount: 51, category: 'Electronics' },
    { id: 11, name: 'USB Hub Splitter 7 Port', price: 18.99, originalPrice: 35.99, image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', supplier: 'Tech Gear', rating: 4.3, reviews: 425, discount: 47, category: 'Electronics' },
    { id: 12, name: 'Portable SSD 1TB External Hard Drive', price: 65.50, originalPrice: 129.99, image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', supplier: 'Storage Pro', rating: 4.7, reviews: 780, discount: 50, category: 'Electronics' },
    { id: 13, name: 'Mini Wireless Keyboard with Touchpad', price: 28.00, originalPrice: 55.99, image: 'https://images.unsplash.com/photo-1587829191301-4ec2b8b27a0e?w=500&q=80', supplier: 'Input Devices Ltd.', rating: 4.5, reviews: 560, discount: 50, category: 'Electronics' },
    { id: 14, name: 'LED Ring Light 10 inch for Photography', price: 31.50, originalPrice: 62.99, image: 'https://images.unsplash.com/photo-1585147038297-99b3d2e96c87?w=500&q=80', supplier: 'Lighting Solutions', rating: 4.6, reviews: 890, discount: 50, category: 'Electronics' },
    { id: 15, name: 'USB-C Hub 7 in 1 Multiport Adapter', price: 33.99, originalPrice: 67.99, image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&q=80', supplier: 'Connect Tech', rating: 4.4, reviews: 620, discount: 50, category: 'Electronics' },
    { id: 16, name: 'Mirrorless Camera Tripod Stand', price: 42.50, originalPrice: 85.00, image: 'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=500&q=80', supplier: 'Camera Support', rating: 4.7, reviews: 710, discount: 50, category: 'Electronics' },
    { id: 17, name: 'Wireless Charging Pad 15W Fast', price: 19.99, originalPrice: 39.99, image: 'https://images.unsplash.com/photo-1621785159468-efefe4fe1e1e?w=500&q=80', supplier: 'Charge Pro', rating: 4.5, reviews: 950, discount: 50, category: 'Electronics' },
    { id: 18, name: 'Screen Protector Tempered Glass Pack of 3', price: 12.50, originalPrice: 24.99, image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=500&q=80', supplier: 'Display Guard', rating: 4.3, reviews: 1100, discount: 50, category: 'Electronics' },
    { id: 19, name: 'Phone Stand Adjustable Desktop Holder', price: 14.99, originalPrice: 29.99, image: 'https://images.unsplash.com/photo-1587829191301-4ec2b8b27a0e?w=500&q=80', supplier: 'Mobile Stands', rating: 4.4, reviews: 780, discount: 50, category: 'Electronics' },
    { id: 20, name: 'Bluetooth Speaker Portable Waterproof', price: 38.00, originalPrice: 75.99, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=500&q=80', supplier: 'Sound Waves', rating: 4.6, reviews: 1250, discount: 50, category: 'Electronics' },
    
    // ============ FASHION - 20 Products ============
    { id: 21, name: 'Premium Cotton T-Shirt Pack of 3', price: 22.00, originalPrice: 44.00, image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&q=80', supplier: 'Fashion Hub', rating: 4.5, reviews: 890, discount: 50, category: 'Fashion', tag: 'bestseller', description: 'Classic fit t-shirts made from 100% premium organic cotton. Durable, soft-touch fabric that maintains shape and color after repeated washing.' },
    { id: 22, name: 'Slim Fit Denim Jeans Blue', price: 35.00, originalPrice: 69.99, image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=500&q=80', supplier: 'Denim Masters', rating: 4.6, reviews: 720, discount: 50, category: 'Fashion', description: 'Modern slim-fit jeans with a comfortable stretch blend. Hand-finished blue wash provides a versatile look for both casual and semi-formal wear.' },
    { id: 23, name: 'Casual Hoodie Sweatshirt Unisex', price: 28.50, originalPrice: 57.00, image: 'https://images.unsplash.com/photo-1556821552-7f41c5d440db?w=500&q=80', supplier: 'Comfort Wear', rating: 4.4, reviews: 560, discount: 50, category: 'Fashion', tag: 'new', description: 'Heavyweight fleece hoodie with a soft brushed interior. Features a double-layered hood and reinforced stitching for maximum warmth.' },
    { id: 24, name: 'Leather Jacket Motorcycle Style', price: 89.00, originalPrice: 178.00, image: 'https://images.unsplash.com/photo-1551028719-00167b16ebc5?w=500&q=80', supplier: 'Leather Pro', rating: 4.7, reviews: 450, discount: 50, category: 'Fashion' },
    { id: 25, name: 'Chinos Pants Slim Fit Multiple Colors', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1624371414361-e6e8ea01f116?w=500&q=80', supplier: 'Pants World', rating: 4.5, reviews: 680, discount: 50, category: 'Fashion' },
    { id: 26, name: 'Polo Shirt Business Casual', price: 24.99, originalPrice: 49.99, image: 'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=500&q=80', supplier: 'Business Fashion', rating: 4.4, reviews: 540, discount: 50, category: 'Fashion' },
    { id: 27, name: 'Summer Linen Shirt White', price: 26.50, originalPrice: 53.00, image: 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500&q=80', supplier: 'Summer Collection', rating: 4.5, reviews: 420, discount: 50, category: 'Fashion', description: 'Breathable white linen shirt perfect for hot weather. Features a relaxed collar and sustainable wood-look buttons for a premium aesthetic.' },
    { id: 28, name: 'Athletic Sports Shorts Breathable', price: 19.99, originalPrice: 39.99, image: 'https://images.unsplash.com/photo-1506529082632-401ba39ef4b0?w=500&q=80', supplier: 'Sports Fashion', rating: 4.6, reviews: 780, discount: 50, category: 'Fashion' },
    { id: 29, name: 'Fleece Pullover Cozy Warm', price: 31.00, originalPrice: 62.00, image: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=500&q=80', supplier: 'Cozy Wear', rating: 4.5, reviews: 620, discount: 50, category: 'Fashion' },
    { id: 30, name: 'Cargo Pants with Pockets', price: 38.00, originalPrice: 76.00, image: 'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=500&q=80', supplier: 'Utility Fashion', rating: 4.4, reviews: 510, discount: 50, category: 'Fashion' },
    { id: 31, name: 'Oversized Blazer Jacket', price: 55.00, originalPrice: 110.00, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80', supplier: 'Formal Wear', rating: 4.6, reviews: 680, discount: 50, category: 'Fashion', tag: 'hot' },
    { id: 32, name: 'Striped Long Sleeve Shirt', price: 25.00, originalPrice: 50.00, image: 'https://images.unsplash.com/photo-1598033129183-c4f50c7176c8?w=500&q=80', supplier: 'Classic Fashion', rating: 4.5, reviews: 670, discount: 50, category: 'Fashion' },
    { id: 33, name: 'Windbreaker Jacket Lightweight', price: 42.00, originalPrice: 84.00, image: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=500&q=80', supplier: 'Outdoor Wear', rating: 4.7, reviews: 740, discount: 50, category: 'Fashion' },
    { id: 34, name: 'Henley Shirt Casual Comfort', price: 20.50, originalPrice: 41.00, image: 'https://images.unsplash.com/photo-1620012253295-c05717e093d2?w=500&q=80', supplier: 'Casual Wear', rating: 4.3, reviews: 550, discount: 50, category: 'Fashion' },
    { id: 35, name: 'Swim Shorts Board Shorts', price: 28.00, originalPrice: 56.00, image: 'https://images.unsplash.com/photo-1506529082632-401ba39ef4b0?w=500&q=80', supplier: 'Beach Wear', rating: 4.5, reviews: 480, discount: 50, category: 'Fashion' },
    { id: 36, name: 'Turtleneck Sweater Long Sleeve', price: 34.00, originalPrice: 68.00, image: 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=500&q=80', supplier: 'Winter Fashion', rating: 4.6, reviews: 620, discount: 50, category: 'Fashion' },
    { id: 37, name: 'Vest Sleeveless Casual', price: 23.00, originalPrice: 46.00, image: 'https://images.unsplash.com/photo-1514521131522-32ae531c67e6?w=500&q=80', supplier: 'Layering Fashion', rating: 4.4, reviews: 390, discount: 50, category: 'Fashion' },
    { id: 38, name: 'Corduroy Shirt Button Up', price: 32.50, originalPrice: 65.00, image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?w=500&q=80', supplier: 'texture Fashion', rating: 4.5, reviews: 510, discount: 50, category: 'Fashion' },
    { id: 39, name: 'Thermal Base Layer Shirt', price: 27.00, originalPrice: 54.00, image: 'https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=500&q=80', supplier: 'Active Wear', rating: 4.6, reviews: 640, discount: 50, category: 'Fashion' },
    { id: 40, name: 'Traffic Shirt Vintage Style', price: 29.00, originalPrice: 58.00, image: 'https://images.unsplash.com/photo-1548126328-c9fa89d128fa?w=500&q=80', supplier: 'Vintage Fashion', rating: 4.5, reviews: 720, discount: 50, category: 'Fashion' },

    // ============ HOME & GARDEN - 20 Products ============
    { id: 41, name: 'Premium Air Purifier with HEPA Filter', price: 45.00, originalPrice: 89.99, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', supplier: 'Home Care Co.', rating: 4.3, reviews: 450, discount: 50, category: 'Home & Garden', tag: 'flash', description: 'Advanced HEPA filtration captures 99.9% of dust and allergens. Ultra-quiet operation makes it ideal for bedrooms and nurseries.' },
    { id: 42, name: 'Ultra Bright LED Desk Lamp', price: 28.00, originalPrice: 55.00, image: 'https://images.unsplash.com/photo-1565636192335-14c46fa1120d?w=500&q=80', supplier: 'Lighting Pro', rating: 4.4, reviews: 560, discount: 49, category: 'Home & Garden', description: 'Eye-care LED technology with adjustable brightness levels and color modes. Modern design fits any office or study space.' },
    { id: 43, name: 'Smart WiFi Door Lock System', price: 72.00, originalPrice: 144.00, image: 'https://images.unsplash.com/photo-1563054786-32f70a6d7881?w=500&q=80', supplier: 'Security Solutions', rating: 4.7, reviews: 890, discount: 50, category: 'Home & Garden', description: 'Keyless entry with fingerprint recognition and remote app control. Enhance your home security with encrypted access logs.' },
    { id: 44, name: 'Robot Vacuum Cleaner Auto Clean', price: 198.00, originalPrice: 396.00, image: 'https://images.unsplash.com/photo-1600618528551-5e41903a3430?w=500&q=80', supplier: 'Smart Home', rating: 4.6, reviews: 1220, discount: 50, category: 'Home & Garden' },
    { id: 45, name: 'Humidifier Ultrasonic Cool Mist', price: 35.50, originalPrice: 71.00, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', supplier: 'Air Quality', rating: 4.5, reviews: 680, discount: 50, category: 'Home & Garden' },
    { id: 46, name: 'Smart LED Light Bulbs Wifi 4pcs', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1565636192335-14c46fa1120d?w=500&q=80', supplier: 'Smart Lighting', rating: 4.6, reviews: 920, discount: 50, category: 'Home & Garden', tag: 'hot' },
    { id: 47, name: 'Electric Kettle Temperature Control', price: 28.50, originalPrice: 57.00, image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&q=80', supplier: 'Kitchen Appliances', rating: 4.4, reviews: 540, discount: 50, category: 'Home & Garden' },
    { id: 48, name: 'Mini Portable Vacuum Cleaner Cordless', price: 42.00, originalPrice: 84.00, image: 'https://images.unsplash.com/photo-1600618528551-5e41903a3430?w=500&q=80', supplier: 'Cleaning Solutions', rating: 4.5, reviews: 710, discount: 50, category: 'Home & Garden' },
    { id: 49, name: 'Smart Plug Outlet WiFi Remote Control', price: 18.99, originalPrice: 37.98, image: 'https://images.unsplash.com/photo-1621905251787-48416bd8575a?w=500&q=80', supplier: 'Smart Devices', rating: 4.3, reviews: 850, discount: 50, category: 'Home & Garden' },
    { id: 50, name: 'Shower Head Rain Water Saving', price: 24.00, originalPrice: 48.00, image: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=500&q=80', supplier: 'Bathroom Fixtures', rating: 4.5, reviews: 620, discount: 50, category: 'Home & Garden' },
    { id: 51, name: 'Blackout Curtains Thermal Insulated', price: 38.00, originalPrice: 76.00, image: 'https://images.unsplash.com/photo-1549887534-f3b11d9b7ddb?w=500&q=80', supplier: 'Home Decor', rating: 4.4, reviews: 480, discount: 50, category: 'Home & Garden' },
    { id: 52, name: 'Coffee Maker Programmable 12 Cup', price: 45.00, originalPrice: 90.00, image: 'https://images.unsplash.com/photo-1517668808822-9ebb02ae2a0e?w=500&q=80', supplier: 'Kitchen Gadgets', rating: 4.6, reviews: 890, discount: 50, category: 'Home & Garden' },
    { id: 53, name: 'Food Storage Containers Set 20pcs', price: 22.50, originalPrice: 45.00, image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&q=80', supplier: 'Kitchen Organizers', rating: 4.5, reviews: 710, discount: 50, category: 'Home & Garden' },
    { id: 54, name: 'Bed Sheet Set 100% Cotton 4pcs', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1540932239986-310128078ceb?w=500&q=80', supplier: 'Bedding Co.', rating: 4.6, reviews: 1050, discount: 50, category: 'Home & Garden' },
    { id: 55, name: 'Pillow Memory Foam Ergonomic', price: 29.99, originalPrice: 59.98, image: 'https://images.unsplash.com/photo-1584359830113-9f9e5b5de7ae?w=500&q=80', supplier: 'Sleep Comfort', rating: 4.7, reviews: 920, discount: 50, category: 'Home & Garden' },
    { id: 56, name: 'Area Rug Soft Plush Non Slip', price: 45.00, originalPrice: 90.00, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80', supplier: 'Floor Decor', rating: 4.4, reviews: 580, discount: 50, category: 'Home & Garden' },
    { id: 57, name: 'Picture Frame Set 6pcs Assorted', price: 19.50, originalPrice: 39.00, image: 'https://images.unsplash.com/photo-1578149102327-432bedf4ea36?w=500&q=80', supplier: 'Wall Decor', rating: 4.3, reviews: 420, discount: 50, category: 'Home & Garden' },
    { id: 58, name: 'Under Bed Storage Box Organizer', price: 25.00, originalPrice: 50.00, image: 'https://images.unsplash.com/photo-1578500494198-246f612d03b3?w=500&q=80', supplier: 'Storage Solutions', rating: 4.5, reviews: 650, discount: 50, category: 'Home & Garden' },
    { id: 59, name: 'Wall Mounted Shelves Floating', price: 35.50, originalPrice: 71.00, image: 'https://images.unsplash.com/photo-1586368917701-42f8b146468b?w=500&q=80', supplier: 'Shelving Systems', rating: 4.6, reviews: 740, discount: 50, category: 'Home & Garden' },
    { id: 60, name: 'Laundry Hamper Collapsible Fabric', price: 18.50, originalPrice: 37.00, image: 'https://images.unsplash.com/photo-1545821552-7f41c5d440db?w=500&q=80', supplier: 'Laundry Solutions', rating: 4.4, reviews: 580, discount: 50, category: 'Home & Garden' },

    // ============ SPORTS - 20 Products ============
    { id: 61, name: 'Ergonomic Gaming Chair', price: 120.00, originalPrice: 249.99, image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=500&q=80', supplier: 'Furniture Pro', rating: 4.5, reviews: 520, discount: 52, category: 'Sports' },
    { id: 62, name: 'Professional Yoga Mat 6mm Thick', price: 28.00, originalPrice: 56.00, image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=500&q=80', supplier: 'Yoga Gear', rating: 4.6, reviews: 780, discount: 50, category: 'Sports', tag: 'bestseller' },
    { id: 63, name: 'Dumbbell Set Adjustable 5-50lbs', price: 78.00, originalPrice: 156.00, image: 'https://images.unsplash.com/photo-1597280826055-dda5ba28139c?w=500&q=80', supplier: 'Fitness Equipment', rating: 4.7, reviews: 650, discount: 50, category: 'Sports' },
    { id: 64, name: 'Running Shoes Lightweight Breathable', price: 65.00, originalPrice: 130.00, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', supplier: 'Athletic Wear', rating: 4.6, reviews: 920, discount: 50, category: 'Sports' },
    { id: 65, name: 'Resistance Bands Set of 5', price: 18.50, originalPrice: 37.00, image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&q=80', supplier: 'Fitness Gear', rating: 4.5, reviews: 850, discount: 50, category: 'Sports', tag: 'new' },
    { id: 66, name: 'Basketball Official Size Regulation', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1546872286-23f9a747fc58?w=500&q=80', supplier: 'Sports Pro', rating: 4.4, reviews: 420, discount: 50, category: 'Sports' },
    { id: 67, name: 'Soccer Ball Professional Match', price: 28.50, originalPrice: 57.00, image: 'https://images.unsplash.com/photo-1548877528-ab40c5cd8be4?w=500&q=80', supplier: 'Ball Sports', rating: 4.5, reviews: 540, discount: 50, category: 'Sports' },
    { id: 68, name: 'Bike Helmet Safety Certified', price: 42.00, originalPrice: 84.00, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', supplier: 'Safety Gear', rating: 4.7, reviews: 680, discount: 50, category: 'Sports' },
    { id: 69, name: 'Fitness Tracker Smartwatch', price: 55.00, originalPrice: 110.00, image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&q=80', supplier: 'Wearable Tech', rating: 4.6, reviews: 1100, discount: 50, category: 'Sports', tag: 'hot' },
    { id: 70, name: 'Tennis Racket Lightweight Carbon', price: 68.00, originalPrice: 136.00, image: 'https://images.unsplash.com/photo-1554068865-24cecd4e34c8?w=500&q=80', supplier: 'Tennis Gear', rating: 4.5, reviews: 380, discount: 50, category: 'Sports' },
    { id: 71, name: 'Jump Rope Adjustable Speed Cable', price: 14.99, originalPrice: 29.98, image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&q=80', supplier: 'Cardio Gear', rating: 4.3, reviews: 720, discount: 50, category: 'Sports' },
    { id: 72, name: 'Push Up Bars Handles Stand', price: 22.00, originalPrice: 44.00, image: 'https://images.unsplash.com/photo-1597280826055-dda5ba28139c?w=500&q=80', supplier: 'Body Weight', rating: 4.4, reviews: 580, discount: 50, category: 'Sports' },
    { id: 73, name: 'Kettlebell Weight Iron Cast', price: 35.00, originalPrice: 70.00, image: 'https://images.unsplash.com/photo-1597280826055-dda5ba28139c?w=500&q=80', supplier: 'Strength Training', rating: 4.6, reviews: 650, discount: 50, category: 'Sports' },
    { id: 74, name: 'Skateboard Complete Ready to Ride', price: 52.00, originalPrice: 104.00, image: 'https://images.unsplash.com/photo-1564982752979-3f937ebc1e55?w=500&q=80', supplier: 'Board Sports', rating: 4.5, reviews: 420, discount: 50, category: 'Sports' },
    { id: 75, name: 'Swimming Goggles UV Protection', price: 16.50, originalPrice: 33.00, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80', supplier: 'Water Sports', rating: 4.4, reviews: 610, discount: 50, category: 'Sports' },
    { id: 76, name: 'Camping Sleeping Bag Waterproof', price: 48.00, originalPrice: 96.00, image: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=500&q=80', supplier: 'Outdoor Gear', rating: 4.6, reviews: 740, discount: 50, category: 'Sports' },
    { id: 77, name: 'Backpack Travel 40L Durable', price: 42.50, originalPrice: 85.00, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80', supplier: 'Adventure Gear', rating: 4.5, reviews: 870, discount: 50, category: 'Sports' },
    { id: 78, name: 'Gym Duffel Bag Sports Equipment', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80', supplier: 'Bags Co.', rating: 4.4, reviews: 520, discount: 50, category: 'Sports' },
    { id: 79, name: 'Compression Socks Athletic Recovery', price: 25.00, originalPrice: 50.00, image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=80', supplier: 'Sports Medicine', rating: 4.6, reviews: 680, discount: 50, category: 'Sports' },
    { id: 80, name: 'Water Bottle Stainless Steel 32oz', price: 20.00, originalPrice: 40.00, image: 'https://images.unsplash.com/photo-1602143407151-7e406dc6999d?w=500&q=80', supplier: 'Hydration Gear', rating: 4.5, reviews: 950, discount: 50, category: 'Sports' },

    // ============ BEAUTY - 20 Products ============
    { id: 81, name: 'Facial Moisturizer Cream Daily Use', price: 18.50, originalPrice: 37.00, image: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=500&q=80', supplier: 'Beauty Care', rating: 4.5, reviews: 1120, discount: 50, category: 'Beauty', tag: 'bestseller', description: 'Dermatologist-tested formula that provides 24-hour hydration. Enriched with botanical extracts for a natural, healthy glow.' },
    { id: 82, name: 'Sunscreen SPF 50 Protection', price: 16.00, originalPrice: 32.00, image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=500&q=80', supplier: 'Sun Protection', rating: 4.6, reviews: 840, discount: 50, category: 'Beauty', description: 'Broad-spectrum SPF 50 protection that is water-resistant and non-greasy. Perfect for daily wear under makeup or during outdoor sports.' },
    { id: 83, name: 'Face Serum Vitamin C Brightening', price: 22.00, originalPrice: 44.00, image: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=500&q=80', supplier: 'Skincare Plus', rating: 4.7, reviews: 960, discount: 50, category: 'Beauty', tag: 'new', description: 'Potent Vitamin C formula that visibly brightens skin tone and reduces the appearance of dark spots and fine lines.' },
    { id: 84, name: 'Sheet Masks Beauty Pack of 10', price: 14.50, originalPrice: 29.00, image: 'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=500&q=80', supplier: 'Mask Masters', rating: 4.4, reviews: 720, discount: 50, category: 'Beauty' },
    { id: 85, name: 'Lip Balm Organic Pack of 3', price: 12.00, originalPrice: 24.00, image: 'https://images.unsplash.com/photo-1600840434239-2697b7f23149?w=500&q=80', supplier: 'Lip Care', rating: 4.3, reviews: 580, discount: 50, category: 'Beauty' },
    { id: 86, name: 'Foundation Full Coverage Makeup', price: 20.00, originalPrice: 40.00, image: 'https://images.unsplash.com/photo-1599599810694-b3fa981175aa?w=500&q=80', supplier: 'Makeup Pro', rating: 4.6, reviews: 890, discount: 50, category: 'Beauty' },
    { id: 87, name: 'Concealer Stick Full Coverage', price: 16.50, originalPrice: 33.00, image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&q=80', supplier: 'Makeup Studio', rating: 4.5, reviews: 710, discount: 50, category: 'Beauty' },
    { id: 88, name: 'Eyeshadow Palette 12 Colors', price: 18.00, originalPrice: 36.00, image: 'https://images.unsplash.com/photo-1583241475879-da9856511394?w=500&q=80', supplier: 'Eye Makeup', rating: 4.7, reviews: 1050, discount: 50, category: 'Beauty', tag: 'hot' },
    { id: 89, name: 'Mascara Volumizing Lengthening', price: 17.00, originalPrice: 34.00, image: 'https://images.unsplash.com/photo-1591360236630-449db4b370df?w=500&q=80', supplier: 'Lash Beauty', rating: 4.5, reviews: 820, discount: 50, category: 'Beauty' },
    { id: 90, name: 'Eyeliner Liquid Precision', price: 14.00, originalPrice: 28.00, image: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=500&q=80', supplier: 'Eye Liner Co.', rating: 4.4, reviews: 640, discount: 50, category: 'Beauty' },
    { id: 91, name: 'Blush Powder Rosy Glow', price: 15.50, originalPrice: 31.00, image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=500&q=80', supplier: 'Blush Masters', rating: 4.6, reviews: 750, discount: 50, category: 'Beauty' },
    { id: 92, name: 'Lipstick Range 12 Shades', price: 19.00, originalPrice: 38.00, image: 'https://images.unsplash.com/photo-1600840434239-2697b7f23149?w=500&q=80', supplier: 'Lip Color', rating: 4.5, reviews: 920, discount: 50, category: 'Beauty' },
    { id: 93, name: 'Hair Shampoo Volumizing', price: 12.50, originalPrice: 25.00, image: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=500&q=80', supplier: 'Hair Care Pro', rating: 4.4, reviews: 1100, discount: 50, category: 'Beauty' },
    { id: 94, name: 'Hair Conditioner Moisturizing', price: 13.00, originalPrice: 26.00, image: 'https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500&q=80', supplier: 'Hair Solutions', rating: 4.5, reviews: 950, discount: 50, category: 'Beauty' },
    { id: 95, name: 'Hair Mask Deep Conditioning', price: 15.50, originalPrice: 31.00, image: 'https://images.unsplash.com/photo-1522337094846-8a8101f4ead7?w=500&q=80', supplier: 'Hair Spa', rating: 4.6, reviews: 820, discount: 50, category: 'Beauty' },
    { id: 96, name: 'Body Lotion Hydrating Nourishing', price: 14.50, originalPrice: 29.00, image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?w=500&q=80', supplier: 'Body Care', rating: 4.5, reviews: 780, discount: 50, category: 'Beauty' },
    { id: 97, name: 'Body Scrub Exfoliating Natural', price: 16.00, originalPrice: 32.00, image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=500&q=80', supplier: 'Exfoliants Plus', rating: 4.4, reviews: 620, discount: 50, category: 'Beauty' },
    { id: 98, name: 'Nail Polish Set 20 Colors', price: 18.50, originalPrice: 37.00, image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=500&q=80', supplier: 'Nail Studio', rating: 4.6, reviews: 910, discount: 50, category: 'Beauty' },
    { id: 99, name: 'Face Wash Gentle Cleanser', price: 11.50, originalPrice: 23.00, image: 'https://images.unsplash.com/photo-1556227834-09f1de7a7d74?w=500&q=80', supplier: 'Clean Face', rating: 4.5, reviews: 1200, discount: 50, category: 'Beauty' },
    { id: 100, name: 'Anti-Aging Eye Cream', price: 24.00, originalPrice: 48.00, image: 'https://images.unsplash.com/photo-1552046122-03184de85e08?w=500&q=80', supplier: 'Anti-Age Care', rating: 4.7, reviews: 1050, discount: 50, category: 'Beauty' },

    // ============ GAMING - 20 Products ============
    { id: 101, name: 'Gaming Headset RGB Wireless', price: 65.00, originalPrice: 130.00, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', supplier: 'Gaming Gear', rating: 4.7, reviews: 1150, discount: 50, category: 'Gaming', tag: 'hot', description: 'Crystal-clear surround sound and a noise-canceling mic. RGB lighting adds a professional aesthetic to your gaming setup.' },
    { id: 102, name: 'Mechanical Gaming Keyboard RGB', price: 78.00, originalPrice: 156.00, image: 'https://images.unsplash.com/photo-1587829191301-4ec2b8b27a0e?w=500&q=80', supplier: 'Keyboard Pro', rating: 4.6, reviews: 940, discount: 50, category: 'Gaming', tag: 'new', description: 'Tactile mechanical switches for fast response times. Fully customizable RGB backlighting per key.' },
    { id: 103, name: 'Gaming Mouse 16000 DPI', price: 45.00, originalPrice: 90.00, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&q=80', supplier: 'Mouse Masters', rating: 4.6, reviews: 850, discount: 50, category: 'Gaming', description: 'Precision gaming sensor with up to 16000 DPI. Lightweight design and ultra-smooth glides for effortless control.' },
    { id: 104, name: 'Gaming Monitor 144Hz 27 inch', price: 245.00, originalPrice: 490.00, image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500&q=80', supplier: 'Display Pro', rating: 4.8, reviews: 720, discount: 50, category: 'Gaming' },
    { id: 105, name: 'Gaming Mousepad XL Size', price: 28.50, originalPrice: 57.00, image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80', supplier: 'Pad Station', rating: 4.5, reviews: 680, discount: 50, category: 'Gaming' },
    { id: 106, name: 'Gaming Chair Pro Series', price: 180.00, originalPrice: 360.00, image: 'https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?w=500&q=80', supplier: 'Chair Masters', rating: 4.7, reviews: 890, discount: 50, category: 'Gaming', tag: 'hot' },
    { id: 107, name: 'Game Controller Wireless', price: 38.00, originalPrice: 76.00, image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500&q=80', supplier: 'Controller Hub', rating: 4.5, reviews: 1020, discount: 50, category: 'Gaming' },
    { id: 108, name: 'Gaming Desk RGB LED', price: 125.00, originalPrice: 250.00, image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80', supplier: 'Desk Company', rating: 4.6, reviews: 650, discount: 50, category: 'Gaming' },
    { id: 109, name: 'PC Fan RGB Cooling System', price: 35.00, originalPrice: 70.00, image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', supplier: 'Cooling Pros', rating: 4.4, reviews: 580, discount: 50, category: 'Gaming' },
    { id: 110, name: 'Webcam 1080p HD Streaming', price: 42.00, originalPrice: 84.00, image: 'https://images.unsplash.com/photo-1598286366235-94ef88a3e269?w=500&q=80', supplier: 'Stream Tech', rating: 4.5, reviews: 920, discount: 50, category: 'Gaming' },
    { id: 111, name: 'Microphone USB Condenser Studio', price: 48.00, originalPrice: 96.00, image: 'https://images.unsplash.com/photo-1621905251787-48416bd8575a?w=500&q=80', supplier: 'Audio Pro', rating: 4.6, reviews: 810, discount: 50, category: 'Gaming' },
    { id: 112, name: 'Game Capture Card 4K', price: 88.00, originalPrice: 176.00, image: 'https://images.unsplash.com/photo-1556656793-08538906a9f8?w=500&q=80', supplier: 'Capture Gear', rating: 4.7, reviews: 720, discount: 50, category: 'Gaming' },
    { id: 113, name: 'Gaming Backpack Tech Bag', price: 55.00, originalPrice: 110.00, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&q=80', supplier: 'Bag Pro', rating: 4.5, reviews: 640, discount: 50, category: 'Gaming' },
    { id: 114, name: 'Laptop Cooling Pad Gaming', price: 32.00, originalPrice: 64.00, image: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=500&q=80', supplier: 'Tech Solutions', rating: 4.4, reviews: 770, discount: 50, category: 'Gaming' },
    { id: 115, name: 'USB Hub Gaming 7 Port', price: 24.50, originalPrice: 49.00, image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', supplier: 'Hub Station', rating: 4.3, reviews: 520, discount: 50, category: 'Gaming' },
    { id: 116, name: 'Headphone Stand RGB', price: 28.00, originalPrice: 56.00, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80', supplier: 'Stand Masters', rating: 4.5, reviews: 680, discount: 50, category: 'Gaming' },
    { id: 117, name: 'Cable Organizer Management Kit', price: 18.50, originalPrice: 37.00, image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', supplier: 'Organizers Plus', rating: 4.4, reviews: 590, discount: 50, category: 'Gaming' },
    { id: 118, name: 'Gaming Lite HDMI Cable 6ft', price: 12.00, originalPrice: 24.00, image: 'https://images.unsplash.com/photo-1625948515291-69613efd103f?w=500&q=80', supplier: 'Cable Pros', rating: 4.3, reviews: 450, discount: 50, category: 'Gaming' },
    { id: 119, name: 'Surge Protector Power Strip 8 Outlet', price: 22.00, originalPrice: 44.00, image: 'https://images.unsplash.com/photo-1621785159468-efefe4fe1e1e?w=500&q=80', supplier: 'Power Solutions', rating: 4.5, reviews: 920, discount: 50, category: 'Gaming' },
    { id: 120, name: 'Monitor Stand Riser Wooden', price: 35.00, originalPrice: 70.00, image: 'https://images.unsplash.com/photo-1527814050087-3793815479db?w=500&q=80', supplier: 'Desk Accessories', rating: 4.6, reviews: 750, discount: 50, category: 'Gaming' }
];

// ============ 2. DARK MODE FUNCTIONALITY ============
function applyThemeState(isDarkMode) {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    htmlElement.classList.toggle('dark', Boolean(isDarkMode));
    if (bodyElement) bodyElement.classList.toggle('dark-mode', Boolean(isDarkMode));
    htmlElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light');
}

function toggleDarkMode() {
    const isDarkMode = !document.documentElement.classList.contains('dark');
    applyThemeState(isDarkMode);
    localStorage.setItem('darkMode', isDarkMode ? 'true' : 'false');
    updateDarkModeIcon();
    showThemeToast(isDarkMode ? 'Dark Mode' : 'Light Mode');
}

function updateDarkModeIcon() {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    const isDark = document.documentElement.classList.contains('dark');
    if (sunIcon) sunIcon.classList.toggle('hidden', !isDark);
    if (moonIcon) moonIcon.classList.toggle('hidden', isDark);
}

function showThemeToast(message) {
    const toast = document.getElementById('theme-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2000);
}

function initializeDarkMode() {
    const storedTheme = localStorage.getItem('darkMode');
    const hasStoredPreference = storedTheme === 'true' || storedTheme === 'false';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = hasStoredPreference ? storedTheme === 'true' : prefersDark;
    applyThemeState(shouldUseDark);
    updateDarkModeIcon();
}

// ============ 3. SHOPPING CART MANAGEMENT ============
function addToCart(product, btn = null) {
    if (!product) return;

    let originalHTML = '';
    if (btn) {
        originalHTML = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
            </div>
        `;
    }

    // Simulate network delay for the loading effect
    setTimeout(() => {
        const available = Number(product.inventory || 9999);
        const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
        const existingItem = cartItems.find(item => item.id === product.id);
        if (existingItem) {
            const nextQuantity = (existingItem.quantity || 1) + 1;
            if (nextQuantity > available) {
                showToast(`Only ${available} in stock for ${product.name}.`, 'error');
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
                return;
            }
            existingItem.quantity = nextQuantity;
        } else {
            if (available < 1) {
                showToast(`${product.name} is currently out of stock.`, 'error');
                if (btn) {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }
                return;
            }
            cartItems.push({ ...product, quantity: 1 });
        }
        localStorage.setItem('cart', JSON.stringify(cartItems));
        updateCartCount();
        updateCartUI();
        renderCartSummary();
        
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
        showToast('Added to cart!', 'success');
        trackEvent('add_to_cart', { productId: product.id, category: product.category, source: 'script' });
    }, 600);
}

function initSignupValidation() {
    const emailInput = document.getElementById('signup-email');
    const feedback = document.getElementById('email-feedback');
    
    if (!emailInput || !feedback) return;

    emailInput.addEventListener('input', () => {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email === '') {
            feedback.classList.add('hidden');
            emailInput.classList.remove('border-red-500', 'border-green-500', 'dark:border-red-500', 'dark:border-green-500');
        } else if (emailRegex.test(email)) {
            feedback.textContent = '✓ Email format is valid';
            feedback.classList.remove('hidden', 'text-red-500');
            feedback.classList.add('text-green-500');
            emailInput.classList.remove('border-red-500', 'dark:border-red-500');
            emailInput.classList.add('border-green-500', 'dark:border-green-500');
        } else {
            feedback.textContent = '✗ Please enter a valid email address';
            feedback.classList.remove('hidden', 'text-green-500');
            feedback.classList.add('text-red-500');
            emailInput.classList.remove('border-green-500', 'dark:border-green-500');
            emailInput.classList.add('border-red-500', 'dark:border-red-500');
        }
    });
}

function initSigninValidation() {
    const emailInput = document.getElementById('signin-email');
    const feedback = document.getElementById('email-feedback');
    
    if (!emailInput || !feedback) return;

    emailInput.addEventListener('input', () => {
        const email = emailInput.value;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (email === '') {
            feedback.classList.add('hidden');
            emailInput.classList.remove('border-red-500', 'border-green-500', 'dark:border-red-500', 'dark:border-green-500');
        } else if (emailRegex.test(email)) {
            feedback.textContent = '✓ Email format is valid';
            feedback.classList.remove('hidden', 'text-red-500');
            feedback.classList.add('text-green-500');
            emailInput.classList.remove('border-red-500', 'dark:border-red-500');
            emailInput.classList.add('border-green-500', 'dark:border-green-500');
        } else {
            feedback.textContent = '✗ Please enter a valid email address';
            feedback.classList.remove('hidden', 'text-green-500');
            feedback.classList.add('text-red-500');
            emailInput.classList.remove('border-green-500', 'dark:border-green-500');
            emailInput.classList.add('border-red-500', 'dark:border-red-500');
        }
    });
}

function createOrSignInWithSocial(provider, mode = 'signin') {
    const normalizedProvider = (provider || '').toLowerCase();
    const providerLabels = {
        google: 'Google',
        facebook: 'Facebook',
        x: 'X'
    };
    const label = providerLabels[normalizedProvider] || 'Social';
    const socialAccounts = JSON.parse(localStorage.getItem('aura_social_accounts')) || [];
    let account = socialAccounts.find(acc => acc.provider === normalizedProvider);

    if (!account) {
        account = {
            provider: normalizedProvider,
            name: `${label} User`,
            email: `${normalizedProvider}.user@auraexpress.social`,
            createdAt: new Date().toISOString()
        };
        socialAccounts.push(account);
        localStorage.setItem('aura_social_accounts', JSON.stringify(socialAccounts));
    }

    localStorage.setItem('aura_user_logged_in', 'true');
    localStorage.setItem('userName', account.name);
    localStorage.setItem('aura_auth_provider', label);
    localStorage.setItem('aura_current_user', JSON.stringify(account));

    const actionText = mode === 'signup' ? 'account created' : 'signed in';
    showToast(`${label} ${actionText} successfully!`, 'success');
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1200);
}

function initSocialAuthButtons() {
    const socialButtons = document.querySelectorAll('[data-social-auth]');
    if (!socialButtons.length) return;

    socialButtons.forEach(button => {
        if (button.dataset.socialBound === 'true') return;

        button.addEventListener('click', () => {
            const provider = button.dataset.socialProvider;
            const mode = button.dataset.socialMode || 'signin';
            createOrSignInWithSocial(provider, mode);
        });

        button.dataset.socialBound = 'true';
    });
}

function togglePassword(inputId, btn) {
    const input = document.getElementById(inputId);
    const eyeIcon = btn.querySelector('.eye-icon');
    const eyeOffIcon = btn.querySelector('.eye-off-icon');
    
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    eyeIcon.classList.toggle('hidden', isPassword);
    eyeOffIcon.classList.toggle('hidden', !isPassword);
}

function removeFromCart(productId) {
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    const filtered = cartItems.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(filtered));
    trackEvent('cart_remove_item', { productId });
    updateCartCount();
    updateCartUI();
    renderCartSummary();
}

function changeCartQuantity(productId, delta) {
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    const item = cartItems.find(cartItem => cartItem.id === productId);
    if (!item) return;

    const nextQuantity = Math.max(1, (item.quantity || 1) + delta);
    const sourceProduct = (Array.isArray(products) ? products.find(p => Number(p.id) === Number(productId)) : null) || item;
    const maxInventory = Number(sourceProduct.inventory || 9999);
    if (nextQuantity > maxInventory) {
        showToast(`Only ${maxInventory} units available in stock.`, 'error');
        return;
    }

    item.quantity = nextQuantity;
    localStorage.setItem('cart', JSON.stringify(cartItems));
    trackEvent('cart_change_quantity', { productId, quantity: item.quantity });
    updateCartCount();
    updateCartUI();
    renderCartSummary();
}

function getCartItems() {
    return JSON.parse(localStorage.getItem('cart')) || [];
}

function updateCartCount() {
    const cartItems = getCartItems();
    const totalItems = cartItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.querySelectorAll('#cart-count, #cart-count-mobile').forEach(el => {
        if (el) el.textContent = totalItems;
    });
}

function updateCartUI() {
    const items = getCartItems();
    const cartGrid = document.getElementById('cart-items-grid');
    if (cartGrid) {
        cartGrid.innerHTML = items.map(item => `
            <div class="bg-white rounded-lg shadow p-3">
                <img src="${item.image}" alt="${item.name}" class="w-full h-32 object-cover rounded mb-2">
                <h3 class="font-bold text-sm">${item.name}</h3>
                <p class="text-[#FF6A00] font-bold">${formatPrice(item.price)}</p>
                <button onclick="removeFromCart(${item.id})" class="bg-red-500 text-white px-2 py-1 rounded text-sm mt-2">Remove</button>
            </div>
        `).join('');
    }

    const cartList = document.getElementById('cart-items');
    if (cartList) {
        if (items.length === 0) {
            cartList.innerHTML = `
                <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-10 text-center">
                    <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Your cart is empty</h2>
                    <p class="text-gray-600 dark:text-gray-400 mb-6">Add some products to see them here.</p>
                    <a href="products.html" class="inline-flex items-center justify-center bg-[#FF6A00] text-white font-bold px-6 py-3 rounded-xl hover:bg-[#e65f00] transition-colors">Start Shopping</a>
                </div>
            `;
            return;
        }

        cartList.innerHTML = items.map(item => `
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 md:p-6 shadow-sm">
                <div class="flex flex-col md:flex-row gap-4 md:items-center">
                    <img src="${item.image}" alt="${item.name}" class="w-full md:w-28 h-40 md:h-28 object-cover rounded-xl">
                    <div class="flex-grow min-w-0">
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">${item.name}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400 mb-2">${item.supplier || 'Union Market'}</p>
                        <p class="text-lg font-bold text-[#FF6A00]">${formatPrice(item.price)}</p>
                    </div>
                    <div class="flex items-center justify-between md:justify-end gap-4">
                        <div class="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                            <button onclick="changeCartQuantity(${item.id}, -1)" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">-</button>
                            <span class="px-4 py-2 text-sm font-semibold text-gray-900 dark:text-white">${item.quantity || 1}</span>
                            <button onclick="changeCartQuantity(${item.id}, 1)" class="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">+</button>
                        </div>
                        <div class="text-right min-w-[96px]">
                            <p class="text-sm text-gray-500 dark:text-gray-400">Total</p>
                            <p class="font-bold text-gray-900 dark:text-white">${formatPrice((item.quantity || 1) * item.price)}</p>
                        </div>
                        <button onclick="removeFromCart(${item.id})" class="text-red-500 hover:text-red-600 font-semibold text-sm transition-colors">Remove</button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

function getPromoConfig(code) {
    const promos = {
        WELCOME10: { type: 'percent', value: 10, minSubtotal: 20 },
        SAVE10: { type: 'percent', value: 10, minSubtotal: 25 },
        UNION15: { type: 'percent', value: 15, minSubtotal: 40 }
    };

    return promos[code] || null;
}

function getCartTotals() {
    const cartItems = getCartItems();
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * (item.quantity || 1), 0);
    const promoCode = (localStorage.getItem('cartPromoCode') || '').toUpperCase();
    const promo = getPromoConfig(promoCode);
    const discount = promo ? subtotal * (promo.value / 100) : 0;
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const shipping = discountedSubtotal === 0 ? 0 : discountedSubtotal >= FREE_SHIPPING_THRESHOLD_USD ? 0 : 7.99;
    const tax = discountedSubtotal * 0.1;
    const total = discountedSubtotal + shipping + tax;

    return {
        subtotal,
        discount,
        shipping,
        tax,
        total,
        promoCode
    };
}

function renderCartSummary() {
    const subtotalEl = document.getElementById('subtotal');
    const discountRow = document.getElementById('discount-row');
    const discountAmountEl = document.getElementById('discount-amount');
    const shippingEl = document.getElementById('shipping');
    const taxEl = document.getElementById('tax');
    const totalEl = document.getElementById('total');
    const progressText = document.getElementById('shipping-progress-text');
    const progressBar = document.getElementById('shipping-progress-bar');
    const shippingMessage = document.getElementById('shipping-message');

    if (!subtotalEl && !totalEl) return;

    const totals = getCartTotals();
    const progress = Math.min((totals.subtotal / FREE_SHIPPING_THRESHOLD_USD) * 100, 100);
    const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD_USD - totals.subtotal);

    if (subtotalEl) subtotalEl.textContent = formatPrice(totals.subtotal);
    if (shippingEl) shippingEl.textContent = totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping);
    if (taxEl) taxEl.textContent = formatPrice(totals.tax);
    if (totalEl) totalEl.textContent = formatPrice(totals.total);

    if (discountRow && discountAmountEl) {
        discountRow.classList.toggle('hidden', totals.discount === 0);
        discountAmountEl.textContent = `-${formatPrice(totals.discount)}`;
    }

    if (progressText) progressText.textContent = `${formatPrice(totals.subtotal)} / ${formatPrice(FREE_SHIPPING_THRESHOLD_USD)}`;
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (shippingMessage) {
        shippingMessage.textContent = totals.subtotal === 0
            ? `Add ${formatPrice(FREE_SHIPPING_THRESHOLD_USD)} more for free shipping!`
            : remaining > 0
                ? `Add ${formatPrice(remaining)} more for free shipping!`
                : 'You qualify for free shipping!';
    }
}

function applyPromoCode() {
    const promoInput = document.getElementById('promo-code-input');
    if (!promoInput) return;

    const code = promoInput.value.trim().toUpperCase();
    if (!code) {
        showToast('Enter a promo code first');
        return;
    }

    const promo = getPromoConfig(code);
    if (!promo) {
        localStorage.removeItem('cartPromoCode');
        renderCartSummary();
        showToast('Invalid promo code');
        return;
    }

    const totals = getCartTotals();
    if (totals.subtotal < (promo.minSubtotal || 0)) {
        showToast(`Code ${code} requires minimum cart of ${formatPrice(promo.minSubtotal)}.`, 'error');
        return;
    }

    localStorage.setItem('cartPromoCode', code);
    renderCartSummary();
    showToast(`${code} applied!`, 'success');
    trackEvent('cart_apply_promo', { code });
}

function openCheckoutModal() {
    const totals = getCartTotals();
    if (totals.subtotal === 0) {
        showToast('Your cart is empty!', 'error');
        return;
    }

    const outOfStock = getCartItems().find((item) => {
        const sourceProduct = Array.isArray(products) ? products.find(p => Number(p.id) === Number(item.id)) : null;
        const inventory = Number(sourceProduct?.inventory || item.inventory || 9999);
        return Number(item.quantity || 1) > inventory;
    });
    if (outOfStock) {
        showToast(`Insufficient stock for ${outOfStock.name}. Please reduce quantity.`, 'error');
        return;
    }

    let modal = document.getElementById('checkout-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 w-full max-w-lg rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto m-4 border border-gray-200 dark:border-gray-800 animate-scale-in">
            <div class="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h2 class="text-xl font-bold text-gray-900 dark:text-white">Checkout Payment</h2>
                <button onclick="closeCheckoutModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div class="p-6">
                <div class="bg-orange-50 dark:bg-orange-900/10 rounded-xl p-6 mb-6 text-center border border-orange-100 dark:border-orange-900/30">
                    <p class="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total to Pay</p>
                    <p class="font-black text-[#FF6A00] text-4xl">${formatPrice(totals.total)}</p>
                </div>
                
                <h3 class="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg class="w-5 h-5 text-[#FF6A00]" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"></path></svg>
                    Select Payment Method
                </h3>
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <label class="relative flex flex-col items-center p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#FF6A00]/50 transition-all has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-900/10 group">
                        <input type="radio" name="payment" value="airtel" class="absolute opacity-0" checked onchange="updatePaymentInputLabel(this.value)">
                        <img src="icons/airtel_money.png" alt="Airtel Money" class="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform">
                        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Airtel Money</span>
                    </label>
                    <label class="relative flex flex-col items-center p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#FF6A00]/50 transition-all has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-900/10 group">
                        <input type="radio" name="payment" value="paychangu" class="absolute opacity-0" onchange="updatePaymentInputLabel(this.value)">
                        <img src="icons/airtel_money.png" alt="PayChangu" class="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform">
                        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">PayChangu</span>
                    </label>
                    <label class="relative flex flex-col items-center p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#FF6A00]/50 transition-all has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-900/10 group">
                        <input type="radio" name="payment" value="mpamba" class="absolute opacity-0" onchange="updatePaymentInputLabel(this.value)">
                        <img src="icons/tnm_mpamba.png" alt="Mpamba" class="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform">
                        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Mpamba</span>
                    </label>
                    <label class="relative flex flex-col items-center p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#FF6A00]/50 transition-all has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-900/10 group">
                        <input type="radio" name="payment" value="nationalbank" class="absolute opacity-0" onchange="updatePaymentInputLabel(this.value)">
                        <img src="icons/national_bank.png" alt="National Bank" class="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform">
                        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">National Bank</span>
                    </label>
                    <label class="relative flex flex-col items-center p-4 border-2 border-gray-100 dark:border-gray-800 rounded-xl cursor-pointer hover:border-[#FF6A00]/50 transition-all has-[:checked]:border-[#FF6A00] has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-900/10 group">
                        <input type="radio" name="payment" value="standardbank" class="absolute opacity-0" onchange="updatePaymentInputLabel(this.value)">
                        <img src="icons/standard_bank.png" alt="Standard Bank" class="w-12 h-12 object-contain mb-2 group-hover:scale-110 transition-transform">
                        <span class="text-xs font-bold text-gray-700 dark:text-gray-300">Standard Bank</span>
                    </label>
                </div>

                <div class="space-y-4">
                    <div>
                        <label id="payment-input-label" class="block text-xs font-bold text-gray-500 uppercase mb-2">Phone Number</label>
                        <input type="tel" id="checkout-phone" placeholder="099... or 088..." class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF6A00] transition-all">
                        <p id="checkout-phone-error" class="text-red-500 text-[10px] mt-1 hidden font-bold"></p>
                    </div>
                    <button onclick="processCheckoutPayment()" class="w-full bg-[#FF6A00] text-white font-bold py-4 rounded-xl hover:bg-[#e65f00] transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-orange-500/20">
                        Complete Payment
                    </button>
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.classList.add('hidden');
}

function updatePaymentInputLabel(method) {
    const label = document.getElementById('payment-input-label');
    const input = document.getElementById('checkout-phone');
    const error = document.getElementById('checkout-phone-error');
    if (!label || !input) return;

    // Reset error state on change
    error?.classList.add('hidden');
    input.classList.remove('border-red-500');

    if (method === 'nationalbank' || method === 'standardbank') {
        label.textContent = 'Account Number';
        input.placeholder = 'Enter your account number';
    } else {
        label.textContent = 'Phone Number';
        input.placeholder = '099... or 088...';
    }
}

function processCheckoutPayment() {
    const phoneInput = document.getElementById('checkout-phone');
    const phoneError = document.getElementById('checkout-phone-error');
    const phoneValue = sanitizeText(phoneInput.value);
    const selectedPaymentMethod = document.querySelector('input[name="payment"]:checked')?.value;
    
    let isValid = true;
    if (selectedPaymentMethod === 'nationalbank' || selectedPaymentMethod === 'standardbank') {
        // Basic account number validation (e.g., 10-13 digits)
        if (!/^\d{10,13}$/.test(phoneValue)) {
            phoneError.textContent = 'Please enter a valid 10-13 digit account number.';
            isValid = false;
        }
    } else {
        // Regex for Malawian formats: 01/088/098/099 followed by 7 digits, or starting with +265
        const mwPhoneRegex = /^(0|\+265)(1|88|98|99)\d{7}$/;
        if (!mwPhoneRegex.test(phoneValue)) {
            phoneError.textContent = 'Please enter a valid Malawian phone number (e.g., 099xxxxxxx or 088xxxxxxx).';
            isValid = false;
        }
    }

    if (!isValid) {
        phoneError.classList.remove('hidden');
        phoneInput.classList.add('border-red-500');
        return;
    }

    phoneError.classList.add('hidden');
    phoneInput.classList.remove('border-red-500');

    const cartItems = getCartItems();
    const totals = getCartTotals();
    const transactionId = 'UNION-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    
    let methodTitle = '';
    switch (selectedPaymentMethod) {
        case 'airtel': methodTitle = 'Airtel Money'; break;
        case 'paychangu': methodTitle = 'PayChangu'; break;
        case 'mpamba': methodTitle = 'Mpamba'; break;
        case 'nationalbank': methodTitle = 'National Bank'; break;
        case 'standardbank': methodTitle = 'Standard Bank'; break;
    }

    const transaction = {
        id: transactionId,
        date: new Date().toLocaleString(),
        items: cartItems,
        total: totals.total,
        method: methodTitle,
        account: phoneValue,
        status: 'Pending'
    };

    const userEmail = (JSON.parse(localStorage.getItem('aura_current_user') || 'null')?.email || '').toLowerCase();
    const backendResponse = await backendRequest('/api/checkout', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            userEmail,
            items: cartItems,
            total: totals.total,
            method: methodTitle,
            account: phoneValue
        })
    });

    if (backendResponse.ok && backendResponse.json?.success) {
        transaction.id = backendResponse.json.transaction?.id || transaction.id;
        transaction.status = backendResponse.json.transaction?.status || transaction.status;
        if (typeof showToast === 'function') showToast('Payment recorded with backend tracking.', 'success');
    } else if (backendResponse.status !== 0) {
        if (typeof showToast === 'function') showToast('Payment saved locally but backend tracking was unavailable.', 'error');
    }

    // Save to history
    const history = JSON.parse(localStorage.getItem('aura_transactions')) || [];
    history.unshift(transaction);
    localStorage.setItem('aura_transactions', JSON.stringify(history));
    trackEvent('checkout_submit', {
        transactionId,
        method: methodTitle,
        total: totals.total,
        items: cartItems.length
    });

    showToast('Processing payment...', 'success');
    
    setTimeout(() => {
        showReceipt(transaction);
        localStorage.removeItem('cart');
        localStorage.removeItem('cartPromoCode');
    }, 2000);
}

function showReceipt(transaction) {
    const modal = document.getElementById('checkout-modal');
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden m-4 border border-green-500 animate-scale-in">
            <div class="p-8 text-center">
                <div class="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
                    <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 class="text-2xl font-black text-gray-900 dark:text-white mb-1">Payment Successful!</h2>
                <p class="text-gray-500 text-sm mb-6">Transaction ID: ${transaction.id}</p>
                
                <div class="border-t border-b border-dashed border-gray-200 dark:border-gray-700 py-4 mb-6 text-left space-y-2">
                    <div class="flex justify-between text-sm"><span class="text-gray-500">Method:</span> <span class="font-bold dark:text-white">${transaction.method}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-500">Account:</span> <span class="font-bold dark:text-white">${transaction.account}</span></div>
                    <div class="flex justify-between text-sm"><span class="text-gray-500">Date:</span> <span class="font-bold dark:text-white">${transaction.date}</span></div>
                    <div class="flex justify-between text-lg pt-2 border-t border-gray-100 dark:border-gray-800"><span class="font-bold dark:text-white">Amount Paid:</span> <span class="font-black text-[#FF6A00]">${formatPrice(transaction.total)}</span></div>
                </div>

                <div class="space-y-3">
                    <button onclick="window.location.href='profile.html'" class="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3 rounded-xl hover:opacity-90 transition-all">
                        View Order History
                    </button>
                    <button onclick="window.location.href='index.html'" class="w-full text-[#FF6A00] font-bold py-2">
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    `;
}

function updateAuthUI() {
    const isLoggedIn = localStorage.getItem('aura_user_logged_in') === 'true';
    const authLinks = document.querySelectorAll('[data-auth-link]');
    const authTexts = document.querySelectorAll('[data-auth-text]');
    
    authLinks.forEach(link => {
        link.href = isLoggedIn ? 'profile.html' : 'signin.html';
    });

    authTexts.forEach(textEl => {
        textEl.textContent = isLoggedIn ? 'Profile' : 'Login';
    });
}

function updateCartDisplay() {
    updateCartUI();
    renderCartSummary();
}

// ============ 4. WISHLIST MANAGEMENT ============
function addToWishlist(product) {
    if (!product) return false;
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const exists = wishlist.some(item => item.id === product.id);
    if (exists) {
        const filtered = wishlist.filter(item => item.id !== product.id);
        localStorage.setItem('wishlist', JSON.stringify(filtered));
        updateWishlistBadge();
        return false;
    } else {
        wishlist.push(product);
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        updateWishlistBadge();
        showToast('Added to wishlist!', 'success');
        return true;
    }
}

function getWishlist() {
    return JSON.parse(localStorage.getItem('wishlist')) || [];
}

function removeFromWishlist(productId) {
    const wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];
    const filtered = wishlist.filter(item => item.id !== productId);
    localStorage.setItem('wishlist', JSON.stringify(filtered));
    updateWishlistBadge();
    renderWishlist();
}

function renderWishlist() {
    const wishlistGrid = document.getElementById('wishlist-grid');
    const wishlistTotal = document.getElementById('wishlist-total');
    const emptyWishlist = document.getElementById('empty-wishlist');
    if (!wishlistGrid) return;
    const items = getWishlist();
    if (wishlistTotal) wishlistTotal.textContent = `${items.length} item${items.length === 1 ? '' : 's'}`;

    if (items.length === 0) {
        wishlistGrid.innerHTML = '';
        if (emptyWishlist) emptyWishlist.classList.remove('hidden');
        return;
    }
    if (emptyWishlist) emptyWishlist.classList.add('hidden');

    wishlistGrid.innerHTML = items.map(item => `
        <div onclick="viewProduct(${item.id})" class="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden cursor-pointer border border-gray-200 dark:border-gray-800 hover:shadow-xl transition-all">
            <img src="${getOptimizedImageURL(item.image, 480, 70)}" alt="${item.name}" loading="lazy" decoding="async" fetchpriority="low" class="w-full h-40 object-cover">
            <div class="p-4">
                <h3 class="font-bold text-sm line-clamp-2 text-gray-900 dark:text-white">${item.name}</h3>
                <p class="text-[#FF6A00] font-bold">${formatPrice(item.price)}</p>
                <button onclick="event.stopPropagation(); removeFromWishlist(${item.id})" class="w-full bg-red-500 text-white py-1 rounded mt-2 text-sm">Remove</button>
            </div>
        </div>
    `).join('');
}

// ============ 5. PRODUCT CARD RENDERING ============
function createProductCard(product) {
    const isWishlisted = getWishlist().some(item => item.id === product.id);
    const isComparing = (JSON.parse(localStorage.getItem('compareList')) || []).some(item => item.id === product.id);
    const tagEmoji = product.tag === 'bestseller' ? 'BESTSELLER' : product.tag === 'new' ? 'NEW' : product.tag === 'flash' ? 'FLASH' : product.tag === 'hot' ? 'HOT' : '';
    const stock = Math.floor(Math.random() * 50) + 5;
    const stockStatus = stock > 20 ? 'In Stock' : stock > 10 ? 'Limited Stock' : 'Only Few Left';
    const stockColor = stock > 20 ? 'text-green-600' : stock > 10 ? 'text-orange-500' : 'text-red-500';
    
    // Search Highlighting Logic
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('search') || document.getElementById('product-search')?.value || '';
    const searchWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    
    const displayName = searchWords.length > 0 ? highlightMatch(product.name, searchWords) : product.name;

    const cardImageURL = getOptimizedImageURL(product.image, 420, 70);
    const cardThumbURL = getOptimizedImageURL(product.imageThumbnail || product.image, 240, 65);
    const cardLargeURL = getOptimizedImageURL(product.imageLarge || product.image, 920, 80);
    const cardSrcSet = product.imageSrcSet || `${cardThumbURL} 240w, ${cardImageURL} 420w, ${cardLargeURL} 920w`;
    return `
        <div onclick="viewProduct(${product.id})" class="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 group border border-gray-100 dark:border-gray-800 cursor-pointer relative">
            <div class="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden relative">
                <img src="${cardImageURL}" srcset="${cardSrcSet}" sizes="(max-width: 768px) 50vw, 25vw" alt="${sanitizeText(product.name)}" loading="lazy" decoding="async" fetchpriority="low" data-category="${sanitizeText(product.category)}" onerror="window.handleImageLoadError(this)" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                ${product.discount ? `<span class="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">-${product.discount}%</span>` : ''}
                ${product.tag ? `<span class="absolute top-2 left-2 bg-[#FF6A00] text-white px-2 py-1 rounded-full text-xs font-bold">${tagEmoji}</span>` : ''}
                <span class="absolute bottom-12 left-2 bg-white/95 ${stockColor} px-2 py-1 rounded text-xs font-semibold">${stockStatus}</span>
                <button onclick="openQuickView(event, ${product.id})" class="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] font-bold px-3 py-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                    Quick View
                </button>
                <button onclick="event.stopPropagation(); addToWishlist(products.find(p => p.id === ${product.id})); updateWishlistBadge(); event.currentTarget.classList.toggle('text-red-500')" class="absolute bottom-3 right-3 bg-white/90 rounded-full p-2 ${isWishlisted ? 'text-red-500' : 'text-gray-400'} opacity-0 group-hover:opacity-100 transition-all">
                    <svg class="w-5 h-5" fill="${isWishlisted ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"></path></svg>
                </button>
            </div>
            <div class="p-4">
                <h3 class="text-sm font-bold text-gray-900 dark:text-white line-clamp-2 mb-2 group-hover:text-[#FF6A00]">${displayName}</h3>
                <div class="flex items-center gap-1 mb-2">
                    ${[...Array(5)].map((_, i) => `<span class="${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}">★</span>`).join('')}
                    <span class="text-xs text-gray-600 dark:text-gray-400">${product.rating} (${product.reviews})</span>
                </div>
                <div class="flex items-center gap-2 mb-3">
                    <span class="text-lg font-bold text-[#FF6A00]">${formatPrice(product.price)}</span>
                    <span class="text-xs line-through text-gray-400">${formatPrice(product.originalPrice)}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">${product.supplier}</p>
                <label class="flex items-center gap-2 mb-3 cursor-pointer" onclick="event.stopPropagation()">
                    <input type="checkbox" class="compare-checkbox w-4 h-4 rounded text-[#FF6A00]" onchange="handleCompareToggle(event, ${product.id})" ${isComparing ? 'checked' : ''}>
                    <span class="text-xs text-gray-600 dark:text-gray-400">Compare</span>
                </label>
                <button onclick="event.stopPropagation(); addToCart(products.find(p => p.id === ${product.id}), this)" class="w-full bg-[#FF6A00] text-white font-bold py-2 rounded-lg hover:bg-[#e65f00] transition-all transform hover:scale-105 active:scale-95 hover:shadow-lg">
                    Add to Cart
                </button>
            </div>
        </div>
    `;
}

// ============ 6. PRODUCT RENDERING ============
function renderProducts(categoryFilter = 'all') {
    const grid = document.getElementById('products-grid');
    if (!grid) return;
    
    let filtered = categoryFilter === 'all' ? products : products.filter(p => p.category === categoryFilter);
    if (currentSortVal === 'Price: Low to High') filtered.sort((a, b) => a.price - b.price);
    else if (currentSortVal === 'Price: High to Low') filtered.sort((a, b) => b.price - a.price);
    
    const visibleItems = filtered.slice(0, itemsLimit);
    grid.innerHTML = visibleItems.map(createProductCard).join('');

    // Handle Load More button visibility
    const loadMoreBtn = document.getElementById('load-more-container');
    if (loadMoreBtn) {
        loadMoreBtn.classList.toggle('hidden', itemsLimit >= filtered.length);
    }
    
    // Update results count if it exists
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `Showing ${visibleItems.length} of ${filtered.length} products`;
}

function renderNewArrivals() {
    const grid = document.getElementById('new-arrivals-grid');
    if (!grid) return;
    
    const newProducts = products.filter(p => p.tag === 'new').slice(0, 10);
    grid.innerHTML = newProducts.map(createProductCard).join('');
}

function renderBestSellers() {
    const grid = document.getElementById('bestsellers-grid');
    if (!grid) return;
    
    const bestSellers = products.filter(p => p.tag === 'bestseller').slice(0, 10);
    grid.innerHTML = bestSellers.map(createProductCard).join('');
}

function renderCategoryCards() {
    const grid = document.getElementById('category-cards-grid');
    if (!grid) return;
    
    const categories = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Beauty', 'Gaming'];
    const categoryColors = [
        'from-blue-600/90 to-blue-800/90', 
        'from-pink-600/90 to-pink-800/90', 
        'from-green-600/90 to-green-800/90', 
        'from-orange-600/90 to-orange-800/90', 
        'from-purple-600/90 to-purple-800/90', 
        'from-red-600/90 to-red-800/90'
    ];
    
    const categoryIcons = [
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"></path></svg>`,
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15.546c-.523 0-1.046.151-1.5.454a2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.704 2.704 0 00-3 0 2.704 2.704 0 01-3 0 2.701 2.701 0 00-1.5-.454M9 6v2m3-2v2m3-2v2M9 3h.01M12 3h.01M15 3h.01M21 21v-7a2 2 0 00-2-2H5a2 2 0 00-2 2v7h18zm-3-9V9a2 2 0 00-2-2H8a2 2 0 00-2 2v3h12z"></path></svg>`,
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>`,
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>`,
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`,
        `<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 14H7v-2h2v2zm2-2h2v2h-2v-2zm4 2h2v-2h-2v2"></path></svg>`
    ];
    
    grid.innerHTML = categories.map((cat, idx) => {
        const catProducts = products.filter(p => p.category === cat);
        const image = catProducts[0]?.image || '';
        return `
            <div onclick="filterHomeProducts('${cat}')" class="group relative overflow-hidden rounded-2xl cursor-pointer min-h-[250px] shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
                <div class="absolute inset-0 z-0">
                    <img src="${image}" alt="${cat}" data-category="${cat}" onerror="window.handleImageLoadError(this)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2">
                    <div class="absolute inset-0 bg-gradient-to-br ${categoryColors[idx]} opacity-80 group-hover:opacity-90 transition-opacity"></div>
                </div>
                <div class="relative z-10 p-8 h-full flex flex-col justify-end text-white">
                    <div class="transform transition-transform duration-500 group-hover:-translate-y-2">
                        <div class="bg-white/20 backdrop-blur-md p-3 rounded-xl w-fit mb-4">
                            ${categoryIcons[idx]}
                        </div>
                        <h3 class="text-2xl font-bold mb-1">${cat}</h3>
                        <p class="text-sm opacity-90">${catProducts.length} items</p>
                    </div>
                    <div class="overflow-hidden h-0 group-hover:h-8 transition-all duration-300">
                        <span class="text-sm font-bold flex items-center gap-2">
                            Explore Collection 
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTrendingNow() {
    const grid = document.getElementById('trending-grid');
    if (!grid) return;
    
    const trending = products.filter(p => p.tag === 'hot' || p.tag === 'flash').sort(() => Math.random() - 0.5).slice(0, 10);
    grid.innerHTML = trending.map(createProductCard).join('');
}

function renderFrequentlyBoughtTogether() {
    const grid = document.getElementById('bought-together-grid');
    if (!grid) return;
    
    const bundled = products.sort(() => Math.random() - 0.5).slice(0, 4);
    const totalPrice = bundled.reduce((sum, p) => sum + p.price, 0);
    const savingPrice = bundled.reduce((sum, p) => sum + (p.originalPrice - p.price), 0);
    
    grid.innerHTML = `
        <div class="lg:col-span-3 space-y-4">
            ${bundled.map((p, idx) => `
                <div class="flex items-center gap-4 p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-100 dark:border-gray-800 hover:border-[#FF6A00]/50 transition-all">
                    <input type="checkbox" checked class="w-5 h-5 text-[#FF6A00] rounded">
                    <img src="${p.image}" alt="${p.name}" data-category="${p.category || 'default'}" onerror="window.handleImageLoadError(this)" class="w-16 h-16 object-cover rounded">
                    <div class="flex-grow">
                        <p class="font-semibold text-gray-900 dark:text-white text-sm line-clamp-1">${p.name}</p>
                        <p class="text-xs text-gray-500">by ${p.supplier}</p>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-[#FF6A00]">${formatPrice(p.price)}</p>
                        <p class="text-xs line-through text-gray-400">${formatPrice(p.originalPrice)}</p>
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="lg:col-span-1 bg-orange-50 dark:bg-orange-900/20 rounded-lg p-6 border border-orange-200 dark:border-orange-800/50 h-fit">
            <p class="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">Bundle Savings</p>
            <div class="space-y-2 mb-4">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-700 dark:text-gray-300">Subtotal:</span>
                    <span class="font-semibold text-gray-900 dark:text-white">${formatPrice(totalPrice)}</span>
                </div>
                <div class="flex justify-between text-sm text-green-600 font-bold">
                    <span>You Save:</span>
                    <span>${formatPrice(savingPrice)}</span>
                </div>
            </div>
            <button onclick="addBundleToCart()" class="w-full bg-[#FF6A00] text-white font-bold py-3 rounded-lg hover:bg-[#e65f00] transition-all transform hover:scale-105 active:scale-95">
                Add Bundle to Cart
            </button>
        </div>
    `;
}

function addBundleToCart() {
    showToast('Bundle added to cart!', 'success');
    updateCartCount();
}

function startFlashSaleTimer() {
    const timerEl = document.getElementById('flash-sale-timer');
    if (!timerEl) return;
    
    let timeRemaining = 4 * 60 * 60; // 4 hours in seconds
    
    const updateTimer = () => {
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        const seconds = timeRemaining % 60;
        
        timerEl.innerHTML = `
            <div class="flex gap-4 text-center">
                <div><span class="text-3xl font-bold text-white">${String(hours).padStart(2, '0')}</span><p class="text-xs text-white/80 mt-1">Hours</p></div>
                <div><span class="text-3xl font-bold text-white">:</span></div>
                <div><span class="text-3xl font-bold text-white">${String(minutes).padStart(2, '0')}</span><p class="text-xs text-white/80 mt-1">Mins</p></div>
                <div><span class="text-3xl font-bold text-white">:</span></div>
                <div><span class="text-3xl font-bold text-white">${String(seconds).padStart(2, '0')}</span><p class="text-xs text-white/80 mt-1">Secs</p></div>
            </div>
        `;
        
        if (timeRemaining > 0) {
            timeRemaining--;
            setTimeout(updateTimer, 1000);
        } else {
            timerEl.innerHTML = '<p class="text-white font-bold text-lg">Flash Sale Ended!</p>';
        }
    };
    
    updateTimer();
}

function renderSocialProof() {
    const proofEl = document.getElementById('social-proof');
    if (!proofEl) return;
    
    proofEl.innerHTML = `
        <div class="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            <div class="text-center">
                <p class="text-3xl md:text-4xl font-bold text-[#FF6A00]">50,000+</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Happy Customers</p>
            </div>
            <div class="text-center">
                <p class="text-3xl md:text-4xl font-bold text-[#FF6A00]">15M+</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Products Sold</p>
            </div>
            <div class="text-center">
                <p class="text-3xl md:text-4xl font-bold text-[#FF6A00]">20K+</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Trusted Sellers</p>
            </div>
            <div class="text-center">
                <p class="text-3xl md:text-4xl font-bold text-[#FF6A00]">4.8★</p>
                <p class="text-gray-600 dark:text-gray-400 text-sm font-medium">Avg Rating</p>
            </div>
        </div>
    `;
}

function filterByCategory(category) {
    itemsLimit = 20; // Reset limit on filter change
    currentCat = category;
    currentCategory = category === 'All' ? 'All' : category;
    
    // Update active button styling on products page
    const categoryTabs = document.querySelectorAll('.category-tab');
    categoryTabs.forEach(tab => {
        const tabCategory = tab.getAttribute('data-category');
        if (tabCategory === category) {
            // Active state
            tab.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-800', 'dark:text-white', 'border', 'border-gray-200', 'dark:border-gray-800');
            tab.classList.add('bg-[#FF6A00]', 'text-white');
            tab.style.boxShadow = '0 4px 12px rgba(255, 106, 0, 0.3)';
        } else {
            // Inactive state
            tab.classList.remove('bg-[#FF6A00]', 'text-white');
            tab.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-800', 'dark:text-white', 'border', 'border-gray-200', 'dark:border-gray-800');
            tab.style.boxShadow = '';
        }
    });
    
    // Update page title
    const pageTitleEl = document.getElementById('page-title');
    if (pageTitleEl) {
        pageTitleEl.textContent = category === 'All' ? 'Shop All Products' : category + ' Products';
    }
    
    // Toggle clear filter button
    const clearBtn = document.getElementById('clear-filter');
    if (clearBtn && category !== 'All') {
        clearBtn.classList.remove('hidden');
    } else if (clearBtn) {
        clearBtn.classList.add('hidden');
    }
    
    renderProducts(category);
}

function handleLoadMore() {
    if (typeof applyAllFilters === 'function' && typeof currentFilters !== 'undefined') {
        currentFilters.viewPerPage += itemsIncrement;
        const itemsSelect = document.getElementById('items-per-page');
        if (itemsSelect) {
            const nextOption = Array.from(itemsSelect.options).find(option => parseInt(option.value, 10) >= currentFilters.viewPerPage);
            if (nextOption) itemsSelect.value = nextOption.value;
        }
        applyAllFilters();
        return;
    }

    itemsLimit += itemsIncrement;
    renderProducts(currentCat);
}

// ============ 8B. GLOBAL COMPARE MANAGEMENT ============

function getCompareList() {
    return JSON.parse(localStorage.getItem('compareList')) || [];
}

function handleCompareToggle(event, productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    let list = getCompareList();
    const index = list.findIndex(p => p.id === productId);
    
    if (event.target.checked) {
        if (list.length >= 4) {
            showToast('You can compare up to 4 products', 'error');
            event.target.checked = false;
            return;
        }
        if (index === -1) list.push(product);
    } else {
        if (index !== -1) list.splice(index, 1);
    }
    
    localStorage.setItem('compareList', JSON.stringify(list));
    updateCompareUI();
}

function updateCompareUI() {
    const list = getCompareList();
    let container = document.getElementById('compare-container');
    
    if (!container && list.length > 0) {
        container = document.createElement('div');
        container.id = 'compare-container';
        container.className = 'fixed bottom-24 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-72 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xl p-3 z-40 animate-slide-in';
        container.innerHTML = `
            <div class="flex items-center justify-between gap-3">
                <div class="flex flex-col min-w-0">
                    <span class="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider truncate">Comparison Tool</span>
                    <span class="text-xs font-bold text-gray-900 dark:text-white truncate"><span id="compare-count">0</span> items selected</span>
                </div>
                <div class="flex gap-2 shrink-0">
                    <button onclick="clearCompare()" class="text-[10px] font-bold text-gray-500 hover:text-red-500 transition-colors px-1">Clear</button>
                    <button onclick="compareProducts()" class="bg-[#FF6A00] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-[#e65f00] transition-all shadow-lg shadow-orange-500/20">Compare</button>
                </div>
            </div>
        `;
        document.body.appendChild(container);
    }
    
    if (!container) return;
    
    const countEl = document.getElementById('compare-count');
    if (list.length > 0) {
        container.classList.remove('hidden');
        if (countEl) countEl.textContent = list.length;
    } else {
        container.classList.add('hidden');
    }
}

function compareProducts() {
    const list = getCompareList();
    if (list.length === 0) return;
    
    let modal = document.getElementById('compare-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'compare-modal';
        modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm hidden';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-900 w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl relative m-4">
            <div class="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex justify-between items-center z-10">
                <div class="flex items-center gap-4">
                    <h2 class="text-2xl font-bold text-gray-900 dark:text-white">Compare Products</h2>
                    <button onclick="addAllCompareToCart()" class="hidden md:block bg-[#FF6A00] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#e65f00] transition-all shadow-lg shadow-orange-500/20">Add All to Cart</button>
                    <button onclick="saveCompareAsPDF()" class="hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all">Save as PDF</button>
                </div>
                <div class="flex items-center gap-3">
                    <button onclick="saveCompareAsPDF()" class="md:hidden p-2 text-gray-500 hover:text-[#FF6A00]" title="Print Comparison">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
                    </button>
                    <button onclick="addAllCompareToCart()" class="md:hidden bg-[#FF6A00] text-white px-3 py-1.5 rounded-lg text-[10px] font-bold">Add All</button>
                    <button onclick="document.getElementById('compare-modal').classList.add('hidden')" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
            <div class="p-6">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse min-w-[600px]">
                        <thead>
                            <tr class="border-b border-gray-200 dark:border-gray-800">
                                <th class="py-4 px-4 font-bold text-gray-500 dark:text-gray-400">Features</th>
                                ${list.map(p => `
                                    <th class="py-4 px-4 min-w-[150px]">
                                        <div class="flex flex-col items-center text-center">
                                            <img src="${p.image}" data-category="${p.category || 'default'}" onerror="window.handleImageLoadError(this)" class="w-20 h-20 object-cover rounded-lg mb-2">
                                            <p class="font-bold text-xs text-gray-900 dark:text-white line-clamp-1">${p.name}</p>
                                            <button onclick="removeFromCompare(${p.id})" class="text-[10px] text-red-500 mt-1 hover:underline">Remove</button>
                                        </div>
                                    </th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody class="text-sm">
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                                <td class="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Price</td>
                                ${list.map(p => `<td class="py-4 px-4 font-bold text-[#FF6A00]">${formatPrice(p.price)}</td>`).join('')}
                            </tr>
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                                <td class="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Category</td>
                                ${list.map(p => `<td class="py-4 px-4 text-gray-600 dark:text-gray-400 capitalize">${p.category}</td>`).join('')}
                            </tr>
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                                <td class="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Supplier</td>
                                ${list.map(p => `<td class="py-4 px-4 text-gray-600 dark:text-gray-400">${p.supplier}</td>`).join('')}
                            </tr>
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                                <td class="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Rating</td>
                                ${list.map(p => `<td class="py-4 px-4 text-gray-900 dark:text-white">${p.rating} ★ <span class="text-xs text-gray-500">(${p.reviews})</span></td>`).join('')}
                            </tr>
                            <tr class="border-b border-gray-100 dark:border-gray-800/50">
                                <td class="py-4 px-4 font-semibold text-gray-700 dark:text-gray-300">Description</td>
                                ${list.map(p => `<td class="py-4 px-4 text-xs text-gray-500 dark:text-gray-400 min-w-[200px] leading-relaxed">${p.description || 'Professional grade product selected for quality and durability.'}</td>`).join('')}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    modal.classList.remove('hidden');
}

function removeFromCompare(productId) {
    let list = getCompareList();
    list = list.filter(p => p.id !== productId);
    localStorage.setItem('compareList', JSON.stringify(list));
    updateCompareUI();
    if (list.length === 0) {
        document.getElementById('compare-modal')?.classList.add('hidden');
    } else {
        compareProducts();
    }
    document.querySelectorAll('.compare-checkbox').forEach(cb => {
        const onchangeAttr = cb.getAttribute('onchange');
        if (onchangeAttr && onchangeAttr.includes(productId)) cb.checked = false;
    });
}

function clearCompare() {
    localStorage.removeItem('compareList');
    updateCompareUI();
    document.querySelectorAll('.compare-checkbox').forEach(cb => cb.checked = false);
    document.getElementById('compare-modal')?.classList.add('hidden');
}

function addAllCompareToCart() {
    const list = getCompareList();
    if (list.length === 0) return;
    
    const cartItems = JSON.parse(localStorage.getItem('cart')) || [];
    
    list.forEach(product => {
        const existingItem = cartItems.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
            cartItems.push({ ...product, quantity: 1 });
        }
    });
    
    localStorage.setItem('cart', JSON.stringify(cartItems));
    updateCartCount();
    updateCartUI();
    renderCartSummary();
    showToast(`Added ${list.length} items to cart!`, 'success');
}

function saveCompareAsPDF() {
    const modal = document.getElementById('compare-modal');
    if (!modal) return;

    // Create print-specific styles to ensure the PDF looks professional
    const style = document.createElement('style');
    style.id = 'print-styles';
    style.innerHTML = `
        @media print {
            body > *:not(#compare-modal) { display: none !important; }
            #compare-modal { position: absolute !important; inset: 0 !important; background: white !important; display: block !important; overflow: visible !important; }
            #compare-modal > div { border: none !important; box-shadow: none !important; max-height: none !important; margin: 0 !important; width: 100% !important; max-width: none !important; overflow: visible !important; }
            .sticky { position: relative !important; }
            button, .compare-checkbox { display: none !important; }
            table { border-collapse: collapse !important; width: 100% !important; table-layout: fixed !important; }
            th, td { border: 1px solid #e5e7eb !important; word-wrap: break-word !important; }
            img { max-width: 100px !important; }
            .dark { background-color: white !important; color: black !important; }
        }
    `;
    document.head.appendChild(style);

    window.print();

    // Cleanup after print dialog opens
    setTimeout(() => {
        document.getElementById('print-styles')?.remove();
    }, 500);
}

function filterHomeProducts(category) {
    const pageTitle = document.title;
    if (pageTitle.includes('Products')) {
        // Already on products page
        filterByCategory(category);
    } else {
        // Navigate to products page with category filter as URL parameter
        window.location.href = 'products.html?category=' + encodeURIComponent(category);
    }
}

function viewProduct(productId) {
    addRecentlyViewed(productId);
    localStorage.setItem('selectedProduct', JSON.stringify(products.find(p => p.id === productId)));
    window.location.href = `product-detail.html?id=${productId}`;
}

function openQuickView(event, productId) {
    if (event) event.stopPropagation();
    const modal = document.getElementById('quick-view-modal');
    const content = document.getElementById('quick-view-content');
    const product = products.find(p => p.id === productId);
    if (!modal || !content || !product) return;

    const quickViewImageURL = getOptimizedImageURL(product.image, 720, 75);
    content.innerHTML = `
        <div class="grid md:grid-cols-2 gap-6">
            <div class="bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden">
                <img src="${quickViewImageURL}" alt="${product.name}" loading="eager" decoding="async" fetchpriority="high" class="w-full h-full object-cover min-h-[280px]">
            </div>
            <div>
                <div class="flex items-center justify-between gap-3 mb-2">
                    <span class="text-xs font-bold px-2 py-1 rounded-full bg-orange-100 text-[#FF6A00]">${product.category}</span>
                    <span class="text-xs text-gray-500">${product.reviews} reviews</span>
                </div>
                <h3 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">${product.name}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">${product.description || 'Premium quality product from a verified supplier.'}</p>
                <div class="flex items-center gap-1 mb-4">
                    ${[...Array(5)].map((_, i) => `<span class="${i < Math.floor(product.rating) ? 'text-yellow-400' : 'text-gray-300'}">★</span>`).join('')}
                    <span class="text-sm text-gray-600 dark:text-gray-400 ml-1">${product.rating}</span>
                </div>
                <div class="flex items-end gap-2 mb-5">
                    <span class="text-2xl font-black text-[#FF6A00]">${formatPrice(product.price)}</span>
                    <span class="text-sm line-through text-gray-400">${formatPrice(product.originalPrice)}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-5">Supplier: ${product.supplier}</p>
                <div class="flex gap-3">
                    <button onclick="addToCart(products.find(p => p.id === ${product.id}), this)" class="flex-1 bg-[#FF6A00] text-white font-bold py-3 rounded-lg hover:bg-[#e65f00] transition-all">Add to Cart</button>
                    <button onclick="addToWishlist(products.find(p => p.id === ${product.id})); updateWishlistBadge();" class="flex-1 border border-[#FF6A00] text-[#FF6A00] font-bold py-3 rounded-lg hover:bg-orange-50 transition-all">Wishlist</button>
                </div>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
}

function closeQuickView() {
    const modal = document.getElementById('quick-view-modal');
    if (modal) modal.classList.add('hidden');
}

// ============ 7. SEARCH FUNCTIONALITY ============
const trendingSearches = ['Wireless Headphones', 'Gaming Monitor', 'Smart Watch', 'USB-C Cable', 'Yoga Mat', 'Coffee Maker'];

function performSearch(searchTerm) {
    const searchInputIds = ['search-input', 'mobile-search', 'product-search', 'product-search-mobile', 'mobile-search-modal-input'];
    let term = searchTerm;

    if (!term) {
        for (const id of searchInputIds) {
            const el = document.getElementById(id);
            if (el && el.value.trim()) {
                term = el.value.trim();
                break;
            }
        }
    }

    if (!term.trim()) {
        return;
    }
    
    saveSearchToHistory(term.trim());
    window.location.href = `products.html?search=${encodeURIComponent(term.trim())}`;
}

function saveSearchToHistory(term) {
    if (!term) return;
    let history = JSON.parse(localStorage.getItem('aura_search_history')) || [];
    // Add new term to start, remove duplicates, and keep last 5
    history = [term, ...history.filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 5);
    localStorage.setItem('aura_search_history', JSON.stringify(history));
}

function showSearchHistory(event) {
    const input = event.target;
    const autocompleteContainer = document.getElementById('search-autocomplete');
    if (!input || !autocompleteContainer || input.value.trim() !== '') return;

    const history = JSON.parse(localStorage.getItem('aura_search_history')) || [];
    if (history.length === 0) {
        autocompleteContainer.classList.add('hidden');
        return;
    }

    autocompleteContainer.innerHTML = `
        <div class="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent Searches</span>
            <button onclick="clearSearchHistory()" class="text-[10px] font-bold text-[#FF6A00] hover:underline">Clear All</button>
        </div>
        ${history.map(term => `
            <div onclick="performSearch('${term}')" class="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors group">
                <svg class="w-4 h-4 text-gray-400 group-hover:text-[#FF6A00]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white font-medium">${term}</span>
            </div>
        `).join('')}
    `;
    autocompleteContainer.classList.remove('hidden');
}

function clearSearchHistory() {
    localStorage.removeItem('aura_search_history');
    const autocompleteContainer = document.getElementById('search-autocomplete');
    if (autocompleteContainer) autocompleteContainer.classList.add('hidden');
}

function clearSearchInput() {
    const input = document.getElementById('search-input');
    const clearBtn = document.getElementById('clear-search');
    if (!input) return;
    
    input.value = '';
    if (clearBtn) {
        clearBtn.classList.add('opacity-0', 'scale-95', 'pointer-events-none');
        clearBtn.classList.remove('opacity-100', 'scale-100');
    }
    input.focus();
    
    // Manually trigger history view
    showSearchHistory({ target: input });
}

function initSearchAutocomplete() {
    const searchInputIds = ['search-input', 'mobile-search', 'product-search', 'product-search-mobile', 'mobile-search-modal-input'];
    const autocompleteContainer = document.getElementById('search-autocomplete');
    
    if (!autocompleteContainer) return;

    searchInputIds.forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;

        input.addEventListener('focus', showSearchHistory);
        input.addEventListener('click', showSearchHistory);

        const debouncedAutocomplete = debounce((val) => {
            if (val.length < 2) {
                autocompleteContainer.classList.add('hidden');
                return;
            }

            const searchWords = val.split(/\s+/).filter(word => word.length > 0);
            const matches = products.filter(p => {
                const searchableText = `${p.name} ${p.category} ${p.description || ''}`.toLowerCase();
                return searchWords.every(word => searchableText.includes(word));
            }).slice(0, 8);

            if (matches.length > 0) {
                autocompleteContainer.innerHTML = matches.map(p => `
                    <div onclick="viewProduct(${p.id})" class="p-3 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 last:border-0 transition-colors">
                        <img src="${p.image}" data-category="${p.category || 'default'}" onerror="window.handleImageLoadError(this)" class="w-10 h-10 object-cover rounded shadow-sm">
                        <div class="flex-grow">
                        <p class="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">${highlightMatch(p.name, searchWords)}</p>
                        <p class="text-[10px] text-[#FF6A00] font-bold uppercase tracking-wider">${highlightMatch(p.category, searchWords)}</p>
                        </div>
                        <svg class="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                    </div>
                `).join('');
                autocompleteContainer.classList.remove('hidden');
            } else {
                autocompleteContainer.classList.add('hidden');
            }
        }, 300);

        input.addEventListener('input', (e) => {
            const value = e.target.value.toLowerCase().trim();
            const clearBtn = document.getElementById('clear-search');
            
            if (clearBtn && id === 'search-input') {
                const hasValue = e.target.value !== '';
                clearBtn.classList.toggle('opacity-100', hasValue);
                clearBtn.classList.toggle('scale-100', hasValue);
                clearBtn.classList.toggle('opacity-0', !hasValue);
                clearBtn.classList.toggle('scale-95', !hasValue);
                clearBtn.classList.toggle('pointer-events-none', !hasValue);
            }

            if (value === '') {
                showSearchHistory(e);
                return;
            }

            debouncedAutocomplete(value);
        });
    });

    // Close autocomplete when clicking outside
    document.addEventListener('click', (e) => {
        const isSearchInput = searchInputIds.some(id => document.getElementById(id)?.contains(e.target));
        if (!isSearchInput && !autocompleteContainer.contains(e.target)) {
            autocompleteContainer.classList.add('hidden');
        }
    });
}

function searchFor(term) {
    performSearch(term);
}

function subscribeNewsletter() {
    const email = document.getElementById('newsletter-email')?.value || '';
    if (!email) {
        showToast('Please enter your email');
        return;
    }
    if (!email.includes('@')) {
        showToast('Invalid email address');
        return;
    }
    const subscribers = JSON.parse(localStorage.getItem('newsletter-subscribers')) || [];
    if (subscribers.includes(email)) {
        showToast('Already subscribed!');
        return;
    }
    subscribers.push(email);
    localStorage.setItem('newsletter-subscribers', JSON.stringify(subscribers));
    document.getElementById('newsletter-email').value = '';
    showToast('Thank you for subscribing!', 'success');
}

// ============ 8. HERO CAROUSEL ============
let heroCarouselIndex = 0;

function renderHeroCarousel() {
    const carousel = document.getElementById('hero-carousel');
    if (!carousel) return;
    
    const slides = [
        {
            title: 'Flash Sale',
            subtitle: 'Up to 70% OFF on Electronics',
            icon: `<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M13 2h-2v6h2V2zm-6 9H1v2h6v-2zm18 0h-6v2h6v-2zM8.59 16.59L4.5 20.68 6.09 22.27l4.09-4.09-1.49-1.49zM16.41 16.59l-1.49 1.49 4.09 4.09 1.59-1.59-4.19-4.19zM12 20h-2v6h2v-6z"></path></svg>`,
            colors: 'from-[#FF6A00] to-[#F85800]',
            textColorClass: 'text-[#FF6A00]',
            categories: ['Electronics']
        },
        {
            title: 'New Arrivals',
            subtitle: 'Trending Fashion & Lifestyle',
            icon: `<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
            colors: 'from-[#667eea] to-[#764ba2]',
            textColorClass: 'text-[#667eea]',
            categories: ['Fashion', 'Beauty']
        },
        {
            title: 'Summer Collection',
            subtitle: 'Fresh deals on Home & Beauty',
            icon: `<svg class="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16z"></path></svg>`,
            colors: 'from-[#f093fb] to-[#f5576c]',
            textColorClass: 'text-[#f5576c]',
            categories: ['Home & Garden', 'Beauty', 'Sports']
        }
    ];
    
    carousel.innerHTML = slides.map((slide) => {
        const categoryProducts = products.filter(p => slide.categories.includes(p.category));
        const randomProduct = categoryProducts[Math.floor(Math.random() * categoryProducts.length)];
        const backgroundImage = randomProduct?.image || '';
        
        return `
            <div class="min-w-full h-full bg-gradient-to-r ${slide.colors} flex items-center justify-between px-16 relative overflow-hidden">
                <div class="absolute inset-0 z-0">
                    <img src="${backgroundImage}" alt="${slide.title}" class="w-full h-full object-cover opacity-40">
                    <div class="absolute inset-0 bg-gradient-to-r ${slide.colors} opacity-70"></div>
                </div>
                <div class="absolute inset-0 opacity-10">
                    <div class="absolute top-10 right-20 w-96 h-96 bg-white rounded-full blur-3xl"></div>
                </div>
                <div class="relative z-10">
                    <h2 class="text-5xl font-bold text-white mb-4 flex items-center gap-2">
                        ${slide.title} 
                        ${slide.icon}
                    </h2>
                    <p class="text-2xl text-white mb-6">${slide.subtitle}</p>
                    <button onclick="window.location.href='products.html'" class="bg-white ${slide.textColorClass} px-8 py-3 rounded-full font-bold hover:shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95">
                        Shop Now
                    </button>
                </div>
                <div class="relative z-10 flex-shrink-0">
                    <div class="w-64 h-64 rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 backdrop-blur-md">
                        <img src="${backgroundImage}" alt="${slide.title}" class="w-full h-full object-cover transition-transform duration-700 hover:scale-110">
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function heroCarouselNext() {
    heroCarouselIndex = (heroCarouselIndex + 1) % totalSlides;
    updateCarouselPosition();
}

function heroCarouselPrev() {
    heroCarouselIndex = (heroCarouselIndex - 1 + totalSlides) % totalSlides;
    updateCarouselPosition();
}

function heroCarouselGo(index) {
    heroCarouselIndex = index;
    updateCarouselPosition();
}

function updateCarouselPosition() {
    const carousel = document.getElementById('hero-carousel');
    if (carousel) carousel.style.transform = `translateX(-${heroCarouselIndex * 100}%)`;
}

// ============ 9. SCROLL REVEAL ANIMATIONS ============
function initScrollReveal() {
    const revealElements = document.querySelectorAll('.scroll-reveal');
    
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '0';
                entry.target.style.transform = 'translateY(20px)';
                entry.target.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
                
                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, 50);
                
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    revealElements.forEach(element => observer.observe(element));
}

// ============ 9B. PREMIUM FEATURES RENDERING ============

function renderDealOfDay() {
    // Select a featured deal product (use a premium product)
    const deal = products.find(p => p.tag === 'bestseller') || products[Math.floor(Math.random() * 20)];
    const discount = Math.round(((deal.originalPrice - deal.price) / deal.originalPrice) * 100);
    
    document.getElementById('deal-image').src = deal.image;
    document.getElementById('deal-name').textContent = deal.name;
    document.getElementById('deal-price').textContent = formatPrice(deal.price);
    document.getElementById('deal-original').textContent = formatPrice(deal.originalPrice);
    document.getElementById('deal-discount').textContent = `-${discount}%`;
    document.getElementById('deal-description').textContent = deal.description || deal.supplier;
    document.getElementById('deal-rating').textContent = `${deal.rating} (${Math.floor(deal.reviews)} reviews)`;
    
    // Timer countdown for deal
    const timerEl = document.getElementById('deal-timer');
    if (timerEl) {
        let timeRemaining = 24 * 60 * 60; // 24 hours
        const updateDealTimer = () => {
            const hours = Math.floor(timeRemaining / 3600);
            const minutes = Math.floor((timeRemaining % 3600) / 60);
            const seconds = timeRemaining % 60;
            timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            if (timeRemaining > 0) {
                timeRemaining--;
                setTimeout(updateDealTimer, 1000);
            }
        };
        updateDealTimer();
    }
}

function renderFeaturedSellers() {
    const grid = document.getElementById('featured-sellers-grid');
    if (!grid) return;
    
    // Get unique suppliers
    const sellers = [...new Set(products.map(p => p.supplier))].slice(0, 6);
    const sellerData = sellers.map(seller => {
        const sellerProducts = products.filter(p => p.supplier === seller);
        const avgRating = (sellerProducts.reduce((sum, p) => sum + p.rating, 0) / sellerProducts.length).toFixed(1);
        return {
            name: seller,
            products: sellerProducts.length,
            rating: avgRating,
            image: sellerProducts[0]?.image
        };
    });
    
    grid.innerHTML = sellerData.map(seller => `
        <div class="group relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-[#FF6A00]/20 to-orange-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div class="relative bg-white dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-800 hover:border-[#FF6A00]/50 transition-all duration-300 h-full flex flex-col">
                <img src="${seller.image}" alt="${seller.name}" class="w-full h-40 object-cover rounded-xl mb-4">
                <h3 class="font-bold text-gray-900 dark:text-white text-lg mb-2 line-clamp-1">${seller.name}</h3>
                <div class="flex items-center gap-1 mb-3">
                    <span class="text-yellow-400">★${seller.rating}</span>
                    <span class="text-xs text-gray-500">${seller.products} products</span>
                </div>
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-4 flex-grow">Premium seller with quality products</p>
                <button onclick="window.location.href='products.html'" class="w-full bg-gradient-to-r from-[#FF6A00] to-orange-600 text-white py-2 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 active:scale-95">
                    View Store
                </button>
            </div>
        </div>
    `).join('');
}

function renderRecentlyViewed() {
    const grid = document.getElementById('recently-viewed-grid');
    if (!grid) return;
    
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    if (recentlyViewed.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-center text-gray-500 py-8">No recently viewed products. Start shopping to see them here!</p>';
        return;
    }
    
    const viewed = recentlyViewed.slice(0, 8).map(productId => products.find(p => p.id == productId)).filter(p => p);
    grid.innerHTML = viewed.map(p => createProductCard(p)).join('');
}

function renderSeasonalCollections() {
    const grid = document.getElementById('seasonal-grid');
    if (!grid) return;
    
    const collections = [
        { name: 'Summer Essentials', category: 'Beauty', season: 'Summer', color: 'from-yellow-500/80 to-orange-600/80', image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=1200&q=80', icon: '☀' },
        { name: 'Winter Collection', category: 'Home & Garden', season: 'Winter', color: 'from-blue-600/80 to-cyan-700/80', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1200&q=80', icon: '❄' },
        { name: 'Spring Fashion', category: 'Fashion', season: 'Spring', color: 'from-pink-600/80 to-rose-700/80', image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80', icon: '✿' },
        { name: 'Fall Deals', category: 'Sports', season: 'Fall', color: 'from-orange-700/80 to-red-700/80', image: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1200&q=80', icon: '❋' }
    ];
    
    grid.innerHTML = collections.map((col) => {
        const relatedCount = products.filter((item) => item.category === col.category).length;
        const image = col.image || products[0]?.image || '';
        const optimizedImage = getOptimizedImageURL(image, 720, 75);
        return `
        <div class="group relative overflow-hidden rounded-2xl cursor-pointer min-h-[250px] shadow-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-1" onclick="window.location.href='products.html?search=${encodeURIComponent(col.category)}'">
            <div class="absolute inset-0 z-0">
                <img src="${optimizedImage}" alt="${col.name}" loading="lazy" decoding="async" fetchpriority="low" data-category="${col.category}" onerror="window.handleImageLoadError(this)" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 group-hover:translate-x-2">
                <div class="absolute inset-0 bg-gradient-to-br ${col.color} opacity-85 group-hover:opacity-90 transition-opacity"></div>
            </div>
            <div class="relative z-10 p-7 h-full flex flex-col justify-end text-white">
                <div class="transform transition-transform duration-500 group-hover:-translate-y-2">
                    <div class="bg-white/20 backdrop-blur-md p-3 rounded-xl w-fit mb-4">
                        <span class="text-2xl font-bold">${col.icon}</span>
                    </div>
                    <p class="text-[11px] font-semibold uppercase tracking-wider opacity-90 mb-1">${col.season}</p>
                    <h3 class="text-2xl font-bold leading-tight mb-1">${col.name}</h3>
                    <p class="text-sm opacity-90">${relatedCount} items</p>
                </div>
                <div class="overflow-hidden h-0 group-hover:h-8 transition-all duration-300">
                    <span class="text-sm font-bold flex items-center gap-2">
                        Explore Collection
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
                    </span>
                </div>
            </div>
        </div>
    `;
    }).join('');
}

function renderPaymentMethods() {
    const container = document.getElementById('payment-methods-container');
    if (!container) return;
    
    const methods = [
        { name: 'Airtel Money', icon: 'icons/airtel_money.png' },
        { name: 'PayChangu', icon: 'icons/airtel_money.png' },
        { name: 'Mpamba', icon: 'icons/tnm_mpamba.png' },
        { name: 'National Bank', icon: 'icons/national_bank.png' },
        { name: 'Standard Bank', icon: 'icons/standard_bank.png' }
    ];
    
    container.innerHTML = methods.map(m => `
        <div class="flex items-center justify-center w-20 h-20 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all hover:scale-110 group" title="${m.name}">
            <img src="${m.icon}" alt="${m.name}" class="w-14 h-14 object-contain group-hover:brightness-110 transition-all">
        </div>
    `).join('');
}

function renderFreeShippingBanner() {
    const banner = document.getElementById('free-shipping-banner');
    if (!banner) return;
    
    const cartTotal = JSON.parse(localStorage.getItem('cart') || '[]').reduce((sum, item) => {
        const product = products.find(p => p.id == item.id);
        return sum + (product?.price || 0) * item.quantity;
    }, 0);
    
    const threshold = FREE_SHIPPING_THRESHOLD_USD;
    const percentage = Math.min((cartTotal / threshold) * 100, 100);
    
    banner.innerHTML = `
        <div class="flex items-center justify-between mb-4">
            <h3 class="font-bold text-gray-900 dark:text-white">Free Shipping Progress</h3>
            <span class="text-sm font-semibold text-[#FF6A00]">${formatPrice(cartTotal)} / ${formatPrice(threshold)}</span>
        </div>
        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div class="bg-gradient-to-r from-[#FF6A00] to-orange-600 h-full rounded-full transition-all duration-500" style="width: ${percentage}%"></div>
        </div>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-3">
            ${percentage === 100 ? 'You qualify for free shipping!' : `Add ${formatPrice(threshold - cartTotal)} more to qualify for free shipping`}
        </p>
    `;
}

function renderBlogSection() {
    const grid = document.getElementById('blog-grid');
    if (!grid) return;
    
    const blogPosts = [
        { title: '10 Shopping Tips to Save Big', date: 'Dec 15, 2024', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561341?w=400&q=80' },
        { title: 'How to Choose Quality Products', date: 'Dec 10, 2024', image: 'https://images.unsplash.com/photo-1460456521480-2bfb50fac279?w=400&q=80' },
        { title: 'Seasonal Fashion Trends 2025', date: 'Dec 5, 2024', image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80' }
    ];
    
    grid.innerHTML = blogPosts.map(post => `
        <div class="group cursor-pointer">
            <div class="relative overflow-hidden rounded-xl mb-4 h-48">
                <img src="${post.image}" alt="${post.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300">
                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors"></div>
            </div>
            <h3 class="font-bold text-gray-900 dark:text-white text-lg mb-2 group-hover:text-[#FF6A00] transition-colors">${post.title}</h3>
            <p class="text-sm text-gray-500">${post.date}</p>
        </div>
    `).join('');
}

function renderFAQ() {
    const container = document.getElementById('faq-grid');
    if (!container) return;
    
    const faqs = [
        { q: 'What is your return policy?', a: 'We offer 30-day returns on most items in original condition with receipt.' },
        { q: 'How long does shipping take?', a: 'Standard shipping takes 5-7 business days. Express options available.' },
        { q: 'Do you offer warranty?', a: 'Yes, all electronics come with a 12-month manufacturer warranty.' },
        { q: 'How can I track my order?', a: 'You will receive a tracking number via email. Use it to track in real-time.' }
    ];
    
    container.innerHTML = faqs.map((faq, idx) => `
        <div class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden hover:border-[#FF6A00]/50 transition-all">
            <button onclick="toggleFAQ(${idx})" class="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <span class="font-semibold text-gray-900 dark:text-white">${faq.q}</span>
                <svg class="w-5 h-5 text-[#FF6A00] transform transition-transform duration-300" id="faq-icon-${idx}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
            </button>
            <div id="faq-answer-${idx}" class="hidden px-6 pb-6 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50">
                ${faq.a}
            </div>
        </div>
    `).join('');
}

function toggleFAQ(idx) {
    const answer = document.getElementById(`faq-answer-${idx}`);
    const icon = document.getElementById(`faq-icon-${idx}`);
    if (answer) {
        answer.classList.toggle('hidden');
        icon.style.transform = answer.classList.contains('hidden') ? 'rotate(0)' : 'rotate(180deg)';
    }
}

function renderGiftCards() {
    const grid = document.getElementById('gift-cards-grid');
    if (!grid) return;
    
    const cards = [
        { amount: 25, price: formatPrice(25) },
        { amount: 50, price: formatPrice(50) },
        { amount: 100, price: formatPrice(100) },
        { amount: 250, price: formatPrice(250) }
    ];
    
    grid.innerHTML = cards.map(card => `
        <div class="bg-gradient-to-br from-[#FF6A00]/20 to-orange-400/20 rounded-2xl p-6 border border-[#FF6A00]/30 text-center hover:border-[#FF6A00]/60 transition-all cursor-pointer group transform hover:scale-105 duration-300">
            <svg class="w-12 h-12 text-[#FF6A00] mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20 8H4V6h16m0 12H4v-2h16m0-6H4c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-8c0-1.1-.9-2-2-2z"></path></svg>
            <h3 class="text-2xl font-bold text-[#FF6A00] mb-2">${card.price}</h3>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Perfect gift for any occasion</p>
            <button class="w-full bg-gradient-to-r from-[#FF6A00] to-orange-600 text-white font-bold py-2 rounded-lg hover:shadow-lg transition-all">
                Send as Gift
            </button>
        </div>
    `).join('');
}

function renderReferralProgram() {
    const container = document.getElementById('referral-program');
    if (!container) return;
    
    container.innerHTML = `
        <div class="text-center">
            <h2 class="text-3xl font-bold text-white mb-4">Earn & Share</h2>
            <p class="text-white/90 mb-8">Invite friends and earn ${formatPrice(10)} credit for each successful referral!</p>
            <div class="flex items-center justify-center gap-4">
                <input type="text" value="MYUNION2024" readonly class="bg-white/20 text-white px-6 py-3 rounded-lg font-mono font-bold border border-white/30 w-48">
                <button class="bg-white text-[#FF6A00] px-6 py-3 rounded-lg font-bold hover:bg-gray-100 transition-all transform hover:scale-105">
                    Copy Code
                </button>
            </div>
        </div>
    `;
}

// ============ 8. PRODUCTS PAGE - ADVANCED FILTERING & VIEW ============
function switchView(viewType) {
    currentView = viewType;
    const gridBtn = document.getElementById('grid-view-btn');
    const listBtn = document.getElementById('list-view-btn');
    const productsGrid = document.getElementById('products-grid');
    
    if (gridBtn && listBtn) {
        if (viewType === 'grid') {
            gridBtn.classList.add('bg-[#FF6A00]', 'text-white');
            gridBtn.classList.remove('bg-gray-200', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
            listBtn.classList.remove('bg-[#FF6A00]', 'text-white');
            listBtn.classList.add('bg-gray-200', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
        } else {
            listBtn.classList.add('bg-[#FF6A00]', 'text-white');
            listBtn.classList.remove('bg-gray-200', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
            gridBtn.classList.remove('bg-[#FF6A00]', 'text-white');
            gridBtn.classList.add('bg-gray-200', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
        }
    }
    
    if (productsGrid) {
        productsGrid.classList.toggle('grid-cols-2', viewType === 'grid');
        productsGrid.classList.toggle('md:grid-cols-3', viewType === 'grid');
        productsGrid.classList.toggle('lg:grid-cols-4', viewType === 'grid');
        productsGrid.classList.toggle('xl:grid-cols-5', viewType === 'grid');
        productsGrid.classList.toggle('flex', viewType === 'list');
        productsGrid.classList.toggle('flex-col', viewType === 'list');
    }
}

function renderProductComparison() {
    const container = document.getElementById('product-comparison');
    if (!container) return;
    container.innerHTML = '<p class="text-gray-600 dark:text-gray-400 text-center py-8">Select products to compare side-by-side</p>';
}

function renderPersonalization() {
    const container = document.getElementById('personalization-banner');
    if (!container) return;
    
    const userName = localStorage.getItem('userName') || null;
    if (userName) {
        const safeName = document.createElement('span');
        safeName.className = 'font-bold';
        safeName.textContent = userName;
        container.innerHTML = `<p class="text-white text-lg">Welcome back, ${safeName.outerHTML}! 👋 Here are your personalized recommendations.</p>`;
    } else {
        container.innerHTML = '';
    }
}

function renderSizeGuide() {
    const container = document.getElementById('size-guide');
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid md:grid-cols-3 gap-6">
            <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4">Shirts & Tops</h3>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>XS: 6-8</p><p>S: 8-10</p><p>M: 12-14</p><p>L: 14-16</p><p>XL: 16-18</p>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4">Pants</h3>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>24: 30" waist</p><p>26: 32" waist</p><p>28: 34" waist</p><p>30: 36" waist</p><p>32: 38" waist</p>
                </div>
            </div>
            <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4">Shoes</h3>
                <div class="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <p>5: Smaller fit</p><p>6-7: Narrow fit</p><p>8-9: Regular fit</p><p>10-11: Wide fit</p><p>12+: Extra wide</p>
                </div>
            </div>
        </div>
    `;
}

// ============ 9C. NEW ENHANCEMENT FEATURES ============

function renderTrustBadges() {
    const container = document.getElementById('trust-badges-container');
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div class="flex flex-col items-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center hover:border-[#FF6A00]/30 transition-all">
                <svg class="w-8 h-8 text-[#FF6A00] mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg>
                <span class="text-xs font-bold text-gray-900 dark:text-white">SSL Secure</span>
                <span class="text-xs text-gray-500">Encrypted</span>
            </div>
            <div class="flex flex-col items-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center hover:border-[#FF6A00]/30 transition-all">
                <svg class="w-8 h-8 text-[#FF6A00] mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
                <span class="text-xs font-bold text-gray-900 dark:text-white">Verified Sellers</span>
                <span class="text-xs text-gray-500">Trusted</span>
            </div>
            <div class="flex flex-col items-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center hover:border-[#FF6A00]/30 transition-all">
                <svg class="w-8 h-8 text-[#FF6A00] mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
                <span class="text-xs font-bold text-gray-900 dark:text-white">30-Day Returns</span>
                <span class="text-xs text-gray-500">Money Back</span>
            </div>
            <div class="flex flex-col items-center p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 text-center hover:border-[#FF6A00]/30 transition-all">
                <svg class="w-8 h-8 text-[#FF6A00] mb-2" fill="currentColor" viewBox="0 0 24 24"><path d="M9 17H7v2h2v-2zm3 0h-2v2h2v-2zm3 0h-2v2h2v-2zm3-5v4c0 1-1 2-2 2h-1v2h-2v-2h-2v2H8v-2H7c-1 0-2-1-2-2v-4h14zM3 5h18v2H3z"/></svg>
                <span class="text-xs font-bold text-gray-900 dark:text-white">Fast Shipping</span>
                <span class="text-xs text-gray-500">2-7 Days</span>
            </div>
        </div>
    `;
}

function renderMostWishedFor() {
    const container = document.getElementById('most-wished-grid');
    if (!container) return;
    
    // Get most reviewed/rated products (popularity proxy)
    const topWished = products.sort((a, b) => b.reviews - a.reviews).slice(0, 8);
    container.innerHTML = topWished.map(p => createProductCard(p)).join('');
}

function renderPriceDropAlerts() {
    const container = document.getElementById('price-drops-grid');
    if (!container) return;
    
    // Show products with 45%+ discount (simulating price drops)
    const drops = products.filter(p => p.discount && p.discount >= 45).slice(0, 6);
    container.innerHTML = drops.map(p => `
        <div class="group relative">
            <div class="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-orange-400/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
            <div class="relative bg-white dark:bg-gray-900 rounded-xl overflow-hidden border border-red-200 dark:border-red-900/50 hover:border-red-400 transition-all">
                <div class="relative h-48 bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <img src="${p.image}" alt="${p.name}" data-category="${p.category || 'default'}" onerror="window.handleImageLoadError(this)" class="w-full h-full object-cover group-hover:scale-110 transition-transform">
                    <div class="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        PRICE DROP
                    </div>
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                        <div class="text-white">
                            <span class="font-bold text-lg">${formatPrice(p.price)}</span>
                            <span class="line-through text-sm ml-2 opacity-80">${formatPrice(p.originalPrice)}</span>
                        </div>
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-2">${p.name}</h3>
                    <button onclick="addToCart(products.find(pr => pr.id === ${p.id}))" class="w-full text-sm bg-red-50 text-white py-2 rounded-lg hover:bg-red-600 transition-all transform hover:scale-105 active:scale-95 hover:shadow-lg">
                        Buy Now - Save ${formatPrice(p.originalPrice - p.price)}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderCompleteTheLook() {
    const container = document.getElementById('complete-look-grid');
    if (!container) return;
    
    const outfits = [
        { name: 'Summer Casual', items: products.filter(p => p.category === 'Fashion').slice(0, 4) },
        { name: 'Tech Enthusiast', items: products.filter(p => p.category === 'Electronics').slice(0, 4) },
        { name: 'Home Comfort', items: products.filter(p => p.category === 'Home & Garden').slice(0, 4) },
        { name: 'Fitness Bundle', items: products.filter(p => p.category === 'Sports').slice(0, 4) }
    ];
    
    container.innerHTML = outfits.map(outfit => `
        <div class="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 hover:border-[#FF6A00]/50 transition-all">
            <h3 class="font-bold text-gray-900 dark:text-white mb-4">${outfit.name}</h3>
            <div class="space-y-3 mb-4">
                ${outfit.items.map(item => `
                    <div class="flex items-center gap-3">
                        <img src="${item.image}" alt="${item.name}" class="w-12 h-12 rounded object-cover">
                        <div class="flex-grow">
                            <p class="text-xs font-semibold text-gray-900 dark:text-white line-clamp-1">${item.name}</p>
                            <p class="text-xs text-[#FF6A00] font-bold">${formatPrice(item.price)}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div class="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg mb-4">
                <p class="text-sm font-bold text-[#FF6A00]">Complete Set: ${formatPrice(outfit.items.reduce((sum, item) => sum + item.price, 0))}</p>
            </div>
            <button onclick="window.location.href='products.html'" class="w-full bg-[#FF6A00] text-white py-2 rounded-lg hover:bg-[#e65f00] transition-all text-sm font-bold">
                View Bundle
            </button>
        </div>
    `).join('');
}

function renderTrendingKeywords() {
    const container = document.getElementById('trending-keywords-container');
    if (!container) return;
    
    container.innerHTML = trendingSearches.map((term, idx) => `
        <button onclick="performSearch('${term}')" class="px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-[#FF6A00] hover:text-[#FF6A00] transition-all transform hover:scale-105">
            ${term}
            <svg class="w-4 h-4 inline ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </button>
    `).join('');
}

function renderPersonalizedRecs() {
    const container = document.getElementById('personalized-recs-grid');
    if (!container) return;
    
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    if (recentlyViewed.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">Start browsing to see personalized recommendations</div>';
        return;
    }
    
    // Get category of last viewed product
    const lastViewedId = recentlyViewed[recentlyViewed.length - 1];
    const lastProduct = products.find(p => p.id == lastViewedId);
    if (!lastProduct) return;
    
    const recs = products.filter(p => p.category === lastProduct.category && p.id !== lastViewedId).slice(0, 8);
    container.innerHTML = recs.map(p => createProductCard(p)).join('');
}

function initializeRecentlyViewed() {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    if (viewed.length === 0) {
        // Initialize with random sample products for demo
        const sample = products.slice(0, 7).map(p => p.id);
        localStorage.setItem('recentlyViewed', JSON.stringify(sample));
    }
}

function addRecentlyViewed(productId) {
    const viewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    if (!viewed.includes(productId)) viewed.push(productId);
    if (viewed.length > 15) viewed.shift();
    localStorage.setItem('recentlyViewed', JSON.stringify(viewed));
}

function renderSubscriptionProgram() {
    const container = document.getElementById('subscription-program-cta');
    if (!container) return;
    
    container.innerHTML = `
        <div class="grid md:grid-cols-2 gap-8 items-center">
            <div>
                <h2 class="text-4xl font-bold text-gray-900 dark:text-white mb-4">Join Union Market Premium</h2>
                <p class="text-lg text-gray-600 dark:text-gray-400 mb-6">Unlock exclusive benefits and save more on every purchase</p>
                <div class="space-y-3 mb-8">
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-[#FF6A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
                        <span class="text-gray-700 dark:text-gray-300">15% OFF on all purchases</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-[#FF6A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
                        <span class="text-gray-700 dark:text-gray-300">Free shipping on all orders</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-[#FF6A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
                        <span class="text-gray-700 dark:text-gray-300">Priority customer support</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <svg class="w-5 h-5 text-[#FF6A00]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
                        <span class="text-gray-700 dark:text-gray-300">Early access to flash sales</span>
                    </div>
                </div>
                <button class="bg-[#FF6A00] text-white px-8 py-3 rounded-full font-bold hover:bg-[#e65f00] transition-all transform hover:scale-105">
                    Start Free Trial
                </button>
                <p class="text-xs text-gray-500 mt-4">First 7 days free. Cancel anytime.</p>
            </div>
            <div class="bg-gradient-to-br from-[#FF6A00]/10 to-orange-400/10 rounded-2xl p-8 border border-[#FF6A00]/20 text-center">
                <div class="text-6xl font-bold text-[#FF6A00] mb-4">${formatPrice(9.99)}</div>
                <p class="text-gray-600 dark:text-gray-400 mb-4">per month after trial</p>
                <p class="text-sm text-gray-500">Billed monthly. Over 1000+ premium members saving money daily!</p>
            </div>
        </div>
    `;
}

function showLivePurchaseNotification(productName, buyerName = 'Someone') {
    const notification = document.createElement('div');
    notification.className = 'fixed top-6 right-6 bg-white dark:bg-gray-900 rounded-lg shadow-2xl p-4 z-[999] max-w-xs animate-slide-in border border-gray-200 dark:border-gray-800';
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12m-1.4 1.4L9 19 21 7"/></svg>
            <div>
                <p class="text-sm font-bold text-gray-900 dark:text-white">${buyerName} just purchased</p>
                <p class="text-xs text-gray-600 dark:text-gray-400">${productName}</p>
            </div>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slide-out 0.3s ease-in forwards';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

function getWishlistCount() {
    return getWishlist().length;
}

function updateWishlistBadge() {
    const badge = document.getElementById('wishlist-count-badge');
    if (badge) {
        const count = getWishlistCount();
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

function updateProductViewCounter() {
    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed')) || [];
    const counter = document.getElementById('products-viewed-counter');
    if (counter) {
        counter.textContent = recentlyViewed.length;
    }
}

function showNewsletterExitIntent() {
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeNewsletterModal() {
    const modal = document.getElementById('newsletter-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function makeBackToTopAutoHide() {
    const backToTop = document.getElementById('back-to-top');
    if (!backToTop) return;
    
    window.addEventListener('scroll', () => {
        if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
            backToTop.classList.remove('hidden');
        } else {
            backToTop.classList.add('hidden');
        }
    });
}

function initBreadcrumbs() {
    const breadcrumb = document.getElementById('breadcrumb-nav');
    if (breadcrumb) {
        breadcrumb.innerHTML = `
            <nav class="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <a href="index.html" class="hover:text-[#FF6A00] transition-colors">Home</a>
                <svg class="w-4 h-4 mx-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
                <span class="text-gray-900 dark:text-white font-medium">Shop</span>
            </nav>
        `;
    }
}

// ============ 10. LIVE CHAT FUNCTIONALITY ============
function toggleChat() {
    const messageBox = document.getElementById('chat-message-box');
    if (messageBox) {
        messageBox.classList.toggle('hidden');
    }
}

function sendChatMessage(message) {
    if (typeof showToast === 'function') {
        showToast(`Thank you for your message: "${message}". Our support team will respond shortly! 👋`, 'success');
    }
    toggleChat();
}

// Show back-to-top button on scroll
window.addEventListener('scroll', () => {
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        backToTopBtn.classList.toggle('hidden', window.scrollY < 300);
    }
});

// ============ 12. PAGE INITIALIZATION ============
document.addEventListener('DOMContentLoaded', () => {
    enforceRoleGuards();
    initializeDarkMode();
    updateCartCount();
    initializeRecentlyViewed();
    updateWishlistBadge();
    updateProductViewCounter();
    initBreadcrumbs();
    updateCompareUI();
    makeBackToTopAutoHide();
    updateAuthUI();
    initSocialAuthButtons();
    initSearchAutocomplete();
    
    const pageTitle = document.title;
    
    // Render products and sections if on home page
    if (pageTitle.includes('Home')) {
        renderHeroCarousel();
        renderProducts();
        renderNewArrivals();
        renderBestSellers();
        renderCategoryCards();
        renderDealOfDay();
        renderFeaturedSellers();
        renderRecentlyViewed();
        renderSeasonalCollections();
        renderTrendingNow();
        renderFrequentlyBoughtTogether();
        renderSocialProof();
        renderBlogSection();
        renderFAQ();
        renderGiftCards();
        renderReferralProgram();
        renderPaymentMethods();
        renderFreeShippingBanner();
        renderSizeGuide();
        // New enhancement features
        renderTrustBadges();
        renderMostWishedFor();
        renderPriceDropAlerts();
        renderCompleteTheLook();
        renderTrendingKeywords();
        renderPersonalizedRecs();
        renderSubscriptionProgram();
        // Live notifications (sample)
        setTimeout(() => {
            const buyers = ['Alex', 'Sam', 'Jordan', 'Casey'];
            const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
            const randomProduct = products[Math.floor(Math.random() * 30)];
            showLivePurchaseNotification(randomProduct.name, randomBuyer);
        }, 3000);
        // Show notification every 8 seconds
        setInterval(() => {
            const buyers = ['Alex', 'Sam', 'Jordan', 'Casey', 'Morgan'];
            const randomBuyer = buyers[Math.floor(Math.random() * buyers.length)];
            const randomProduct = products[Math.floor(Math.random() * 30)];
            showLivePurchaseNotification(randomProduct.name, randomBuyer);
        }, 8000);
        startFlashSaleTimer();
        setInterval(() => heroCarouselNext(), 5000);
        // Initialize scroll reveal animations for sleek transitions
        setTimeout(initScrollReveal, 100);
    }
    
    if (pageTitle.includes('Products')) {
        // products.html has its own controller (products-advanced.js). Avoid double-binding/render races.
        if (window.__advancedProductsActive) return;

        const urlParams = new URLSearchParams(window.location.search);
        const categoryParam = urlParams.get('category');
        const searchParam = urlParams.get('search');

        if (typeof applyAllFilters === 'function' && typeof currentFilters !== 'undefined') {
            if (categoryParam && categoryParam !== 'All') {
                currentFilters.categories = [decodeURIComponent(categoryParam)];
                document.querySelectorAll('.category-filter').forEach(checkbox => {
                    checkbox.checked = checkbox.value === decodeURIComponent(categoryParam);
                });
            }

            if (searchParam) {
                const decodedSearch = decodeURIComponent(searchParam);
                currentFilters.search = decodedSearch.toLowerCase();
                const desktopSearch = document.getElementById('product-search');
                const mobileSearch = document.getElementById('product-search-mobile');
                if (desktopSearch) desktopSearch.value = decodedSearch;
                if (mobileSearch) mobileSearch.value = decodedSearch;
            }

            applyAllFilters();
        } else if (categoryParam) {
            filterByCategory(decodeURIComponent(categoryParam));
        } else {
            renderProducts();
        }
    }
    
    if (pageTitle.includes('Cart')) {
        updateCartDisplay();
    }
    
    if (pageTitle.includes('Wishlist')) {
        renderWishlist();
    }

    if (pageTitle.includes('Sign Up')) {
        initSignupValidation();
    }

    if (pageTitle.includes('Sign In')) {
        initSigninValidation();
    }
});

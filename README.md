# Union Market

## 🚀 Quick Start

1. **Serve the static site locally:**

   ```bash
   python3 -m http.server 8000 --bind 0.0.0.0
   ```

   Open [http://localhost:8000](http://localhost:8000) or share your local IP:8000 for network access.

2. **Run the backend server** (optional, provides ID upload and transaction tracking):

   ```bash
   cd AURA_Express
   npm install
   npm start
   ```

   Then open [http://localhost:3000](http://localhost:3000).

3. **Homepage loads automatically** (no directory listing - `index.html` serves first).

## 🌐 Features

### **Core Pages** (All Fully Functional)

| Page                    | Description     | Key Features                                                                                  |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------------- |
| **index.html**          | Homepage        | Hero banner, featured products, categories, testimonials                                      |
| **products.html**       | Shop            | 40+ products, advanced filters (category/price/rating/stock), search, sorting, grid/list view |
| **product-detail.html** | Product Details | Full specs, supplier info, reviews, add to cart/wishlist                                      |
| **cart.html**           | Shopping Cart   | Quantity update, real-time totals, free shipping threshold, localStorage sync                 |
| **signin.html**         | Login           | Email/password, Google/Facebook social login, password toggle                                 |
| **signup.html**         | Registration    | Form validation, password strength meter, terms modal, social signup                          |
| **profile.html**        | User Dashboard  | Order history, stats (orders/wishlist/spent), edit profile                                    |
| **wishlist.html**       | Saved Items     | Add/remove items, empty state, browse shop CTA                                                |
| **messages.html**       | Chat System     | Conversations, real-time messaging, auto-replies, filters (unread/starred)                    |
| **help.html**           | Help Center     | FAQ categories (ordering/shipping/returns/account), contact support                           |

### **Interactive Features**

- ✅ **LocalStorage Sync**: Cart, wishlist, user data persist across sessions
- ✅ **Mobile Responsive**: Perfect on all devices with bottom nav
- ✅ **Real-time Cart Counter**: Updates site-wide
- ✅ **Advanced Search & Filters**: Category, price range, rating, stock status
- ✅ **Product Comparison**: Select + compare modal
- ✅ **Form Validation**: Real-time feedback + strength meters
- ✅ **Animations**: Smooth hover effects, loading states, transitions

## 🛒 Shopping Flow

```
Homepage → Products → Product Detail → Add to Cart → Cart → Checkout
                          ↓
                     Wishlist / Messages / Profile
```

## 📱 Mobile Navigation

```
🏠 Home    🛍️ Shop    🛒 Cart    ❤️ Wishlist    👤 Account
```

## 🎨 Tech Stack

- **HTML5** + **Tailwind CSS** (CDN)
- **Vanilla JavaScript** (no frameworks)
- **localStorage** for state management
- **Responsive Design** (mobile-first)

## 🔧 Customization

Edit `script.js` & `products-advanced.js` for:

- Product catalog (add/edit items)
- Pricing logic
- Checkout flow
- User authentication

## 📈 Performance

- **Zero Dependencies** (except Tailwind CDN)
- **Instant Load** (<100ms)
- **Offline Capable** (localStorage)
- **SEO Ready** (semantic HTML)

**© 2026 Union Market**

let products = [];
let cart = JSON.parse(localStorage.getItem("sumka_cart") || "[]");

let favorites =
    JSON.parse(localStorage.getItem("sumka_favorites")) || [];

let modalImages = [];
let modalCurrentIndex = 0;


// =========================
// ТОВАРЫ
// =========================

async function loadProducts() {
    try {
        const response = await fetch("/api/products");

        if (!response.ok) {
            throw new Error("Ошибка загрузки товаров");
        }

        const data = await response.json();

        products = Array.isArray(data)
            ? data
            : data.products || data.data || [];

        displayProducts(products);

    } catch (error) {
        console.error(error);

        const container = document.getElementById("products");

        if (container) {
            container.innerHTML = `
                <p>❌ Не удалось загрузить товары</p>
            `;
        }
    }
}


function getImagePath(image) {
    if (!image) return "/bag1.jpg";

    if (
        image.startsWith("http://") ||
        image.startsWith("https://") ||
        image.startsWith("/")
    ) {
        return image;
    }

    return "/" + image;
}


function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function getCategoryName(category) {
    if (category === "bag") return "👜 Сумка";
    if (category === "backpack") return "🎒 Рюкзак";
    if (category === "accessory") return "👛 Аксессуар";

    return "Товар";
}


function getProductImages(product) {
    let images = [];

    if (Array.isArray(product.images)) {
        images = product.images
            .filter(Boolean)
            .slice(0, 4);
    }

    if (images.length === 0 && product.image) {
        images = [product.image];
    }

    return images.length ? images : ["bag1.jpg"];
}


function displayProducts(list = products) {

    const container = document.getElementById("products");

    if (!container) return;

    container.innerHTML = "";

    if (!list || list.length === 0) {
        container.innerHTML = `
            <div class="empty-products">
                Товаров пока нет
            </div>
        `;
        return;
    }

    list.forEach(product => {

        const images = getProductImages(product);

        const isFavorite = favorites.some(
            item => Number(item.id) === Number(product.id)
        );

        const price = Number(product.price) || 0;

        /*
        Если в базе есть oldPrice — используем его.
        Если нет — старая цена будет рассчитана автоматически.
        */

        const oldPrice =
            Number(product.oldPrice) ||
            Math.round(price * 1.2);

        const discount =
            Math.round(
                ((oldPrice - price) / oldPrice) * 100
            );

        const rating =
            Number(product.rating) || 5;

        const reviews =
            Number(product.reviews) || 0;


        const card =
            document.createElement("article");

        card.className = "product";


        card.onclick = () => {
            openProductModal(product.id);
        };


        card.innerHTML = `

            <div class="product-image">

                <img
                    src="${getImagePath(images[0])}"
                    alt="${escapeHtml(product.name)}"
                    onerror="this.src='/bag1.jpg'"
                >


                <button
                    class="
                        favorite-button
                        ${isFavorite ? "active" : ""}
                    "
                    onclick="
                        event.stopPropagation();
                        toggleFavorite(${product.id});
                    "
                >
                    ${isFavorite ? "❤️" : "♡"}
                </button>


                ${
                    discount > 0
                    ? `
                        <span class="discount-badge">
                            -${discount}%
                        </span>
                    `
                    : ""
                }


                ${
                    images.length > 1
                    ? `
                        <span class="product-images-count">
                            📷 ${images.length}
                        </span>
                    `
                    : ""
                }

            </div>


            <div class="product-info">


                <div class="product-rating">

                    <span class="stars">
                        ⭐ ${rating.toFixed(1)}
                    </span>

                    <span class="reviews">
                        ${reviews > 0 ? `${reviews} отзывов` : "Новый товар"}
                    </span>

                </div>


                <h3>
                    ${escapeHtml(product.name)}
                </h3>


                <div class="product-price">

                    <strong>
                        ${price.toLocaleString("ru-RU")}
                        сомони
                    </strong>

                    ${
                        oldPrice > price
                        ? `
                            <del>
                                ${oldPrice.toLocaleString("ru-RU")}
                            </del>
                        `
                        : ""
                    }

                </div>


                <div class="delivery-info">

                    🚚 Доставка по Таджикистану

                </div>


                <button
                    class="add-button"
                    onclick="
                        event.stopPropagation();
                        addToCart(${product.id});
                    "
                >

                    🛒 В корзину

                </button>


            </div>

        `;


        container.appendChild(card);

    });

}


// =========================
// ФИЛЬТРЫ
// =========================

function filterProducts(category) {
    if (category === "all") {
        displayProducts(products);
        return;
    }

    displayProducts(
        products.filter(
            product =>
                product.category === category
        )
    );
}


function setCategory(category, button) {

    document
        .querySelectorAll(".category-filter")
        .forEach(btn =>
            btn.classList.remove("active")
        );

    if (button) {
        button.classList.add("active");
    }

    filterProducts(category);
}


function searchProducts() {

    const input =
        document.getElementById("search-input");

    if (!input) return;

    const search =
        input.value.toLowerCase().trim();

    displayProducts(
        products.filter(product =>
            product.name
                .toLowerCase()
                .includes(search)
        )
    );
}


function clearSearch() {

    const input =
        document.getElementById("search-input");

    if (input) {
        input.value = "";
    }

    displayProducts(products);
}


function applyFilters() {

    let result = [...products];

    const min =
        Number(
            document.getElementById("min-price")?.value
        ) || null;

    const max =
        Number(
            document.getElementById("max-price")?.value
        ) || null;

    const search =
        document
            .getElementById("search-input")
            ?.value
            .toLowerCase()
            .trim() || "";

    if (search) {
        result = result.filter(product =>
            product.name
                .toLowerCase()
                .includes(search)
        );
    }

    if (min !== null) {
        result = result.filter(
            product =>
                Number(product.price) >= min
        );
    }

    if (max !== null) {
        result = result.filter(
            product =>
                Number(product.price) <= max
        );
    }

    const sort =
        document.getElementById("sort-select")?.value;

    if (sort === "cheap") {
        result.sort(
            (a, b) =>
                Number(a.price) -
                Number(b.price)
        );
    }

    if (sort === "expensive") {
        result.sort(
            (a, b) =>
                Number(b.price) -
                Number(a.price)
        );
    }

    displayProducts(result);
}


function resetFilters() {

    document.getElementById("search-input").value = "";
    document.getElementById("min-price").value = "";
    document.getElementById("max-price").value = "";
    document.getElementById("sort-select").value = "default";

    document
        .querySelectorAll(".category-filter")
        .forEach(button =>
            button.classList.remove("active")
        );

    document
        .querySelector(".category-filter")
        ?.classList.add("active");

    displayProducts(products);
}


// =========================
// КОРЗИНА
// =========================

function addToCart(id) {

    const product =
        products.find(
            product =>
                Number(product.id) === Number(id)
        );

    if (!product) return;

    const existing =
        cart.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (existing) {
        existing.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    localStorage.setItem("sumka_cart", JSON.stringify(cart));
    updateCart();
    animateCart();

    showToast(
        "✅ Товар добавлен в корзину"
    );
}


function updateCart() {

    const quantity =
        cart.reduce(
            (sum, item) =>
                sum + item.quantity,
            0
        );

    const count =
        document.getElementById("cart-count");

    const mobileCount =
        document.getElementById("mobile-cart-count");

    if (count) {
        count.textContent = quantity;
    }

    if (mobileCount) {
        mobileCount.textContent = quantity;
    }

    const items =
        document.getElementById("cart-items");

    const total =
        document.getElementById("total-price");

    if (!items || !total) return;

    if (cart.length === 0) {

        items.innerHTML = `
            <p class="empty-cart">
                Корзина пока пустая
            </p>
        `;

        total.textContent = "0";

        return;
    }

    let totalPrice = 0;

    items.innerHTML = "";

    cart.forEach((product, index) => {

        totalPrice +=
            Number(product.price) *
            product.quantity;

        items.innerHTML += `

            <div class="cart-item">

                <strong>
                    ${escapeHtml(product.name)}
                </strong>

                <p>
                    ${product.price} сомони
                </p>

                <div class="cart-controls">

                    <button
                        onclick="decreaseQuantity(${index})"
                    >
                        −
                    </button>

                    <span>
                        ${product.quantity}
                    </span>

                    <button
                        onclick="increaseQuantity(${index})"
                    >
                        +
                    </button>

                    <button
                        onclick="removeFromCart(${index})"
                    >
                        🗑️
                    </button>

                </div>

            </div>

        `;
    });

    total.textContent =
        totalPrice.toLocaleString("ru-RU");
}


function increaseQuantity(index) {
    if (!cart[index]) return;

    cart[index].quantity++;

    localStorage.setItem("sumka_cart", JSON.stringify(cart));
    updateCart();
}


function decreaseQuantity(index) {

    if (!cart[index]) return;

    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }

    localStorage.setItem("sumka_cart", JSON.stringify(cart));
    updateCart();
}


function removeFromCart(index) {

    cart.splice(index, 1);

    localStorage.setItem("sumka_cart", JSON.stringify(cart));
    updateCart();
}


function animateCart() {

    const buttons = [
        document.querySelector(".cart-button"),
        document.querySelector(".mobile-cart-button")
    ];

    buttons.forEach(button => {

        if (!button) return;

        button.classList.remove("cart-bounce");

        void button.offsetWidth;

        button.classList.add("cart-bounce");

        setTimeout(() => {
            button.classList.remove("cart-bounce");
        }, 600);
    });
}


function openCart() {

    document
        .getElementById("cart-overlay")
        ?.classList.add("active");

    const savedProfile =
        localStorage.getItem("sumka_profile");

    if (!savedProfile) return;

    try {

        const profile =
            JSON.parse(savedProfile);

        document.getElementById("customer-name").value =
            profile.name || "";

        document.getElementById("customer-phone").value =
            profile.phone || "";

        document.getElementById("customer-address").value =
            profile.address || "";

    } catch (error) {
        console.error(error);
    }
}


function closeCart() {

    document
        .getElementById("cart-overlay")
        ?.classList.remove("active");
}


// =========================
// ПРОФИЛЬ
// =========================

function openProfile() {

    document
        .getElementById("profile-overlay")
        ?.classList.add("active");

    loadProfile();
    loadOrders();
}


function closeProfile() {

    document
        .getElementById("profile-overlay")
        ?.classList.remove("active");
}


function saveProfile() {

    const profile = {

        name:
            document
                .getElementById("profile-name")
                .value
                .trim(),

        phone:
            document
                .getElementById("profile-phone")
                .value
                .trim(),

        address:
            document
                .getElementById("profile-address")
                .value
                .trim()

    };

    localStorage.setItem(
        "sumka_profile",
        JSON.stringify(profile)
    );

    loadProfile();

    showToast(
        "✅ Данные профиля сохранены"
    );
}


function loadProfile() {

    const data =
        localStorage.getItem("sumka_profile");

    const name =
        document.getElementById("profile-name");

    const phone =
        document.getElementById("profile-phone");

    const address =
        document.getElementById("profile-address");

    const saveButton =
        document.getElementById("save-profile-button");

    const editButton =
        document.getElementById("edit-profile-button");

    if (!name || !phone || !address) return;

    if (!data) {

        name.disabled = false;
        phone.disabled = false;
        address.disabled = false;

        if (saveButton) {
            saveButton.style.display = "block";
        }

        return;
    }

    const profile =
        JSON.parse(data);

    name.value =
        profile.name || "";

    phone.value =
        profile.phone || "";

    address.value =
        profile.address || "";

    name.disabled = true;
    phone.disabled = true;
    address.disabled = true;

    if (saveButton) {
        saveButton.style.display = "none";
    }

    if (editButton) {
        editButton.textContent =
            "✏️ Изменить данные";
    }
}


function toggleProfileEdit() {

    const inputs = [
        document.getElementById("profile-name"),
        document.getElementById("profile-phone"),
        document.getElementById("profile-address")
    ];

    const editButton =
        document.getElementById("edit-profile-button");

    const isEditing =
        !inputs[0].disabled;

    if (isEditing) {

        saveProfile();

        return;
    }

    inputs.forEach(input => {
        input.disabled = false;
    });

    document
        .getElementById("save-profile-button")
        .style.display = "block";

    editButton.textContent =
        "💾 Сохранить изменения";
}


// =========================
// ИЗБРАННОЕ
// =========================

function toggleFavorite(id) {

    const product =
        products.find(
            item =>
                Number(item.id) === Number(id)
        );

    if (!product) return;

    const index =
        favorites.findIndex(
            item =>
                Number(item.id) === Number(id)
        );

    if (index !== -1) {

        favorites.splice(index, 1);

        showToast(
            "💔 Товар удалён из избранного"
        );

    } else {

        favorites.push(product);

        showToast(
            "❤️ Товар добавлен в избранное"
        );
    }

    localStorage.setItem(
        "sumka_favorites",
        JSON.stringify(favorites)
    );

    displayProducts();
}


function showFavorites() {

    closeProfile();

    document
        .getElementById("catalog")
        ?.scrollIntoView({
            behavior: "smooth"
        });

    displayProducts(
        favorites
    );
}


function loadFavorites() {

    try {

        const saved =
            localStorage.getItem(
                "sumka_favorites"
            );

        favorites =
            saved
                ? JSON.parse(saved)
                : [];

        if (!Array.isArray(favorites)) {
            favorites = [];
        }

    } catch {
        favorites = [];
    }
}


// =========================
// ГАЛЕРЕЯ ТОВАРА
// =========================

function openProductModal(id) {
    const product = products.find(item => Number(item.id) === Number(id));
    if (!product) return;

    const modal = document.getElementById("product-modal");
    if (!modal) return;

    const images = getProductImages(product);
    modalImages = images;
    modalCurrentIndex = 0;

    const name = document.getElementById("modal-product-name");
    const category = document.getElementById("modal-product-category");
    const rating = document.getElementById("modal-product-rating");
    const description = document.getElementById("modal-product-description");
    const price = document.getElementById("modal-product-price");
    const addButton = document.getElementById("modal-add-button");
    const buyButton = document.getElementById("modal-buy-button");

    if (name) name.textContent = product.name || "Товар";
    if (category) category.textContent = getCategoryName(product.category);
    if (description) {
        description.textContent =
            product.description ||
            "Стильный и качественный товар для каждого дня.";
    }

    const productRating = Number(product.rating) || 5;
    const reviews = Number(product.reviews) || 0;

    if (rating) {
        rating.innerHTML = `
            <span>⭐ ${productRating.toFixed(1)}</span>
            <span>${reviews ? `${reviews} отзывов` : "Новый товар"}</span>
        `;
    }

    if (price) {
        price.textContent =
            Number(product.price).toLocaleString("ru-RU") + " сомони";
    }

    if (addButton) {
        addButton.onclick = () => {
            addToCart(product.id);
            showToast("🛒 Товар добавлен в корзину");
        };
    }

    if (buyButton) {
        buyButton.onclick = () => {
            addToCart(product.id);
            closeProductModal();
            openCart();
        };
    }

    const history = JSON.parse(localStorage.getItem("sumka_history") || "[]")
        .filter(item => Number(item.id) !== Number(product.id));

    history.unshift(product);
    localStorage.setItem("sumka_history", JSON.stringify(history.slice(0, 8)));

    createModalGallery();
    updateModalImage();

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function createModalGallery() {
    const content = document.querySelector(".product-modal-content");
    if (!content) return;

    let gallery = document.getElementById("modal-gallery");

    if (!gallery) {
        gallery = document.createElement("div");
        gallery.id = "modal-gallery";
        gallery.className = "modal-gallery";

        const wrapper = document.querySelector(".modal-main-image-wrapper");
        if (wrapper) {
            wrapper.parentNode.appendChild(gallery);
        }
    }

    gallery.innerHTML = "";

    modalImages.forEach((img, index) => {
        const thumbnail = document.createElement("img");
        thumbnail.src = getImagePath(img);
        thumbnail.alt = `Фото ${index + 1}`;
        thumbnail.className = "modal-thumbnail";
        if (index === 0) thumbnail.classList.add("active");

        thumbnail.onclick = () => {
            modalCurrentIndex = index;
            updateModalImage();
        };

        gallery.appendChild(thumbnail);
    });
}

function updateModalImage() {
    const image = document.getElementById("modal-product-image");
    if (!image || !modalImages.length) return;

    image.classList.remove("change", "zoomed");
    void image.offsetWidth;
    image.classList.add("change");

    image.src = getImagePath(modalImages[modalCurrentIndex]);

    document.querySelectorAll(".modal-thumbnail").forEach((thumbnail, index) => {
        thumbnail.classList.toggle("active", index === modalCurrentIndex);
    });

    createModalControls();
}

function createModalControls() {
    const image = document.getElementById("modal-product-image");
    if (!image) return;

    const wrapper = image.parentElement;

    wrapper.querySelectorAll(".modal-arrow, .modal-dots").forEach(element => {
        element.remove();
    });

    image.onclick = () => image.classList.toggle("zoomed");

    if (modalImages.length <= 1) return;

    const previous = document.createElement("button");
    previous.className = "modal-arrow modal-arrow-left";
    previous.innerHTML = "‹";
    previous.setAttribute("aria-label", "Предыдущее фото");
    previous.onclick = event => {
        event.stopPropagation();
        modalCurrentIndex =
            modalCurrentIndex > 0
                ? modalCurrentIndex - 1
                : modalImages.length - 1;
        updateModalImage();
    };

    const next = document.createElement("button");
    next.className = "modal-arrow modal-arrow-right";
    next.innerHTML = "›";
    next.setAttribute("aria-label", "Следующее фото");
    next.onclick = event => {
        event.stopPropagation();
        modalCurrentIndex =
            modalCurrentIndex < modalImages.length - 1
                ? modalCurrentIndex + 1
                : 0;
        updateModalImage();
    };

    wrapper.appendChild(previous);
    wrapper.appendChild(next);

    const dots = document.createElement("div");
    dots.className = "modal-dots";

    modalImages.forEach((_, index) => {
        const dot = document.createElement("button");
        dot.className = "modal-dot";
        if (index === modalCurrentIndex) dot.classList.add("active");

        dot.onclick = event => {
            event.stopPropagation();
            modalCurrentIndex = index;
            updateModalImage();
        };

        dots.appendChild(dot);
    });

    wrapper.appendChild(dots);
    enableSwipe(wrapper);
}

function enableSwipe(element) {
    let startX = 0;

    element.ontouchstart = event => {
        startX = event.touches[0].clientX;
    };

    element.ontouchend = event => {
        const endX = event.changedTouches[0].clientX;
        const difference = startX - endX;

        if (Math.abs(difference) < 50 || modalImages.length <= 1) return;

        modalCurrentIndex =
            difference > 0
                ? (modalCurrentIndex + 1) % modalImages.length
                : (modalCurrentIndex - 1 + modalImages.length) % modalImages.length;

        updateModalImage();
    };
}

function closeProductModal() {
    const modal = document.getElementById("product-modal");

    if (modal) {
        modal.classList.remove("active");
        modal.setAttribute("aria-hidden", "true");
    }

    document.body.style.overflow = "";
}

// =========================
// ЗАКАЗ
// =========================

async function makeOrder() {

    if (!cart.length) {

        alert("Корзина пустая!");

        return;
    }

    const nameInput =
        document.getElementById("customer-name");

    const phoneInput =
        document.getElementById("customer-phone");

    const addressInput =
        document.getElementById(
            "customer-address"
        );

    const name =
        nameInput.value.trim();

    const phone =
        phoneInput.value.trim();

    const address =
        addressInput.value.trim();

    if (!name || !phone || !address) {

        alert("Заполните все поля!");

        return;
    }

    try {

        const response =
            await fetch(
                "/api/orders",
                {

                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            name,
                            phone,
                            address,
                            products: cart
                        })
                }
            );

        const result =
            await response.json();

        if (!response.ok) {
            throw new Error(
                result.message ||
                "Ошибка сервера"
            );
        }

        showToast(
            "✅ Заказ успешно отправлен!"
        );

        cart = [];
        localStorage.removeItem("sumka_cart");

        updateCart();

        nameInput.value = "";
        phoneInput.value = "";
        addressInput.value = "";

        closeCart();

    } catch (error) {

        alert(
            "❌ Ошибка: " +
            error.message
        );
    }
}


// =========================
// УВЕДОМЛЕНИЯ
// =========================

function showToast(
    message,
    type = "success"
) {

    const container =
        document.getElementById(
            "toast-container"
        );

    if (!container) return;

    const toast =
        document.createElement("div");

    toast.className =
        "toast " + type;

    toast.textContent =
        message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3200);
}


// =========================
// ЗАКАЗЫ
// =========================

async function loadOrders() {

    const history =
        document.getElementById(
            "orders-history"
        );

    if (!history) return;

    history.innerHTML = `
        <p class="empty-orders">
            У вас пока нет заказов
        </p>
    `;
}


// =========================
// ЗАПУСК
// =========================

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeProductModal();
        closeCart();
        closeProfile();
    }
});

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadFavorites();

        loadProducts();

        updateCart();

        loadProfile();

    }
);
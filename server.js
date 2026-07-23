console.log("ЗАПУЩЕН НОВЫЙ SERVER.JS");

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

// =========================
// ADMIN AUTHENTICATION
// =========================
const ADMIN_USER = process.env.ADMIN_USER || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "sumka-tj-change-this-secret";
const ADMIN_COOKIE = "sumka_admin";

function createAdminToken() {
    const payload = `${ADMIN_USER}:${Date.now()}`;
    const signature = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
    return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

function isAdminAuthenticated(req) {
    const token = req.headers.cookie?.split(";").map(v => v.trim()).find(v => v.startsWith(`${ADMIN_COOKIE}=`))?.split("=").slice(1).join("=");
    if (!token) return false;
    try {
        const decoded = Buffer.from(token, "base64url").toString("utf8");
        const [user, timestamp, signature] = decoded.split(":");
        if (!user || !timestamp || !signature || user !== ADMIN_USER) return false;
        if (Date.now() - Number(timestamp) > 1000 * 60 * 60 * 24 * 7) return false;
        const payload = `${user}:${timestamp}`;
        const expected = crypto.createHmac("sha256", ADMIN_SECRET).update(payload).digest("hex");
        return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
        return false;
    }
}

function requireAdmin(req, res, next) {
    if (!isAdminAuthenticated(req)) {
        return res.status(401).json({ success: false, message: "Требуется вход администратора" });
    }
    next();
}


// =========================
// ПАПКИ
// =========================

const publicPath = path.join(__dirname, "public");
const uploadsPath = path.join(publicPath, "uploads");

if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
}


// =========================
// MIDDLEWARE
// =========================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

// Never expose the admin HTML directly without authentication.
app.use((req, res, next) => {
    if (req.path === "/admin.html") {
        return res.redirect("/admin");
    }
    next();
});

app.use(express.static(publicPath));

app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body || {};
    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
        return res.status(401).json({ success: false, message: "Неверный логин или пароль" });
    }
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=${createAdminToken()}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${secure}`);
    res.json({ success: true });
});

app.post("/api/admin/logout", (req, res) => {
    res.setHeader("Set-Cookie", `${ADMIN_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
    res.json({ success: true });
});

app.get("/api/admin/me", (req, res) => {
    res.json({ authenticated: isAdminAuthenticated(req) });
});


// =========================
// MULTER
// =========================

const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        cb(null, uploadsPath);

    },

    filename: function (req, file, cb) {

        const extension =
            path.extname(file.originalname);

        const filename =
            Date.now() +
            "-" +
            Math.round(
                Math.random() * 1000000000
            ) +
            extension;

        cb(null, filename);

    }

});


// ДО 4 ФОТО
const upload = multer({

    storage: storage,

    limits: {

        files: 4,

        fileSize: 10 * 1024 * 1024

    }

});


// =========================
// JSON ФАЙЛЫ
// =========================

const productsFile =
    path.join(__dirname, "products.json");

const ordersFile =
    path.join(__dirname, "orders.json");


// =========================
// СОЗДАНИЕ PRODUCTS.JSON
// =========================

if (!fs.existsSync(productsFile)) {

    fs.writeFileSync(

        productsFile,

        JSON.stringify(

            [],

            null,

            2

        )

    );

}


// =========================
// СОЗДАНИЕ ORDERS.JSON
// =========================

if (!fs.existsSync(ordersFile)) {

    fs.writeFileSync(

        ordersFile,

        JSON.stringify(

            [],

            null,

            2

        )

    );

}


// =========================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================

function readProducts() {

    try {

        const data =
            fs.readFileSync(
                productsFile,
                "utf8"
            );

        if (!data.trim()) {

            return [];

        }

        const products =
            JSON.parse(data);

        return Array.isArray(products)
            ? products
            : [];

    }

    catch (error) {

        console.error(
            "Ошибка чтения products.json:",
            error
        );

        return [];

    }

}


function saveProducts(products) {

    fs.writeFileSync(

        productsFile,

        JSON.stringify(

            products,

            null,

            2

        )

    );

}


function readOrders() {

    try {

        const data =
            fs.readFileSync(
                ordersFile,
                "utf8"
            );

        if (!data.trim()) {

            return [];

        }

        const orders =
            JSON.parse(data);

        return Array.isArray(orders)
            ? orders
            : [];

    }

    catch (error) {

        console.error(
            "Ошибка чтения orders.json:",
            error
        );

        return [];

    }

}


function saveOrders(orders) {

    fs.writeFileSync(

        ordersFile,

        JSON.stringify(

            orders,

            null,

            2

        )

    );

}


// =========================
// СТРАНИЦЫ
// =========================

app.get("/", (req, res) => {

    res.sendFile(

        path.join(

            publicPath,

            "index.html"

        )

    );

});


app.get("/admin", (req, res) => {

    res.sendFile(

        path.join(

            publicPath,

            "admin.html"

        )

    );

});


// ==================================================
// PRODUCTS
// ==================================================


// =========================
// ПОЛУЧИТЬ ТОВАРЫ
// =========================

app.get(

    "/api/products",

    (req, res) => {

        try {

            const products =
                readProducts();

            res.json(products);

        }

        catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Ошибка загрузки товаров"

            });

        }

    }

);


// =========================
// ДОБАВИТЬ ТОВАР
// ДО 4 ФОТО
// =========================

app.post(

    "/api/products",

    requireAdmin,

    upload.array("images", 4),

    (req, res) => {

        try {

            const body =
                req.body || {};


            const name =
                String(
                    body.name || ""
                ).trim();


            const price =
                Number(
                    body.price
                );


            const category =
                String(
                    body.category || ""
                ).trim();


            const description =
                String(
                    body.description || ""
                ).trim();


            if (

                !name ||

                !price ||

                !category

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Заполните название, цену и категорию"

                });

            }


            const products =
                readProducts();


            let images = [];


            if (

                req.files &&

                req.files.length

            ) {

                images =
                    req.files.map(

                        file =>

                            "uploads/" +
                            file.filename

                    );

            }


            const newProduct = {

                id:
                    Date.now(),

                name:

                    name,

                price:

                    price,

                category:

                    category,

                images:

                    images,

                // Для совместимости
                // со старым кодом

                image:

                    images[0] || "",

                description:

                    description ||

                    "Стильный и качественный товар."

            };


            products.push(

                newProduct

            );


            saveProducts(

                products

            );


            console.log(

                "Товар добавлен:",

                newProduct

            );


            res.json({

                success: true,

                message:
                    "Товар успешно добавлен",

                product:
                    newProduct

            });

        }

        catch (error) {

            console.error(

                "Ошибка добавления товара:",

                error

            );


            res.status(500).json({

                success: false,

                message:
                    error.message

            });

        }

    }

);


// =========================
// УДАЛИТЬ ТОВАР
// =========================

app.delete(

    "/api/products/:id",

    requireAdmin,

    (req, res) => {

        try {

            const id =
                String(
                    req.params.id
                );


            const products =
                readProducts();


            const product =
                products.find(

                    item =>

                        String(
                            item.id
                        ) === id

                );


            if (!product) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Товар не найден"

                });

            }


            // Удаляем фотографии товара

            let images = [];


            if (

                Array.isArray(
                    product.images
                )

            ) {

                images =
                    product.images;

            }

            else if (

                product.image

            ) {

                images = [

                    product.image

                ];

            }


            images.forEach(

                image => {

                    const filePath =
                        path.join(

                            publicPath,

                            image

                        );


                    if (

                        fs.existsSync(
                            filePath
                        )

                    ) {

                        fs.unlinkSync(
                            filePath

                        );

                    }

                }

            );


            const newProducts =
                products.filter(

                    item =>

                        String(
                            item.id
                        ) !== id

                );


            saveProducts(

                newProducts

            );


            res.json({

                success: true,

                message:
                    "Товар удалён"

            });

        }

        catch (error) {

            console.error(

                "Ошибка удаления товара:",

                error

            );


            res.status(500).json({

                success: false,

                message:
                    "Ошибка удаления товара"

            });

        }

    }

);

// =========================
// РЕДАКТИРОВАТЬ ТОВАР
// =========================

app.put(
    "/api/products/:id",
    requireAdmin,
    upload.array("images", 4),
    (req, res) => {

        try {

            const id = String(req.params.id);

            const products = readProducts();

            const product = products.find(
                item => String(item.id) === id
            );

            if (!product) {

                return res.status(404).json({

                    success: false,

                    message: "Товар не найден"

                });

            }


            const body = req.body || {};


            if (body.name !== undefined) {

                product.name =
                    String(body.name).trim();

            }


            if (body.price !== undefined) {

                product.price =
                    Number(body.price);

            }


            if (body.category !== undefined) {

                product.category =
                    String(body.category).trim();

            }


            if (body.description !== undefined) {

                product.description =
                    String(body.description).trim();

            }


            // Если загружены новые фотографии
            if (
                req.files &&
                req.files.length > 0
            ) {

                const oldImages =
                    Array.isArray(product.images)
                        ? product.images
                        : product.image
                            ? [product.image]
                            : [];


                // Удаляем старые фотографии
                oldImages.forEach(image => {

                    const filePath =
                        path.join(
                            publicPath,
                            image
                        );

                    if (
                        fs.existsSync(filePath)
                    ) {

                        fs.unlinkSync(filePath);

                    }

                });


                const newImages =
                    req.files.map(
                        file =>
                            "uploads/" +
                            file.filename
                    );


                product.images =
                    newImages;


                product.image =
                    newImages[0] || "";

            }


            saveProducts(products);


            console.log(
                "Товар изменён:",
                product
            );


            res.json({

                success: true,

                message:
                    "Товар успешно изменён",

                product

            });

        }

        catch (error) {

            console.error(
                "Ошибка редактирования товара:",
                error
            );


            res.status(500).json({

                success: false,

                message:
                    "Ошибка редактирования товара"

            });

        }

    }

);

// ==================================================
// ORDERS
// ==================================================


// =========================
// ПОЛУЧИТЬ ЗАКАЗЫ
// =========================

app.get(

    "/api/orders",

    requireAdmin,

    (req, res) => {

        try {

            const orders =
                readOrders();


            res.json(

                orders

            );

        }

        catch (error) {

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Ошибка загрузки заказов"

            });

        }

    }

);


// =========================
// СОЗДАТЬ ЗАКАЗ
// =========================

app.post(

    "/api/orders",

    (req, res) => {

        try {

            const body =
                req.body || {};


            const name =
                body.name;


            const phone =
                body.phone;


            const address =
                body.address;


            const products =
                body.products;


            if (

                !name ||

                !phone ||

                !address ||

                !Array.isArray(
                    products
                ) ||

                products.length === 0

            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Заполните все данные заказа"

                });

            }


            const orders =
                readOrders();


            const newOrder = {

                id:
                    Date.now(),

                name:
                    name,

                phone:
                    phone,

                address:
                    address,

                products:
                    products,

                date:

                    new Date()
                        .toLocaleString(
                            "ru-RU"
                        ),

                status:
                    "Новый"

            };


            orders.push(

                newOrder

            );


            saveOrders(

                orders

            );


            console.log(

                "Новый заказ:",

                newOrder

            );


            res.json({

                success: true,

                message:
                    "Заказ сохранён",

                order:
                    newOrder

            });

        }

        catch (error) {

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Ошибка создания заказа"

            });

        }

    }

);


// =========================
// ИЗМЕНИТЬ СТАТУС
// =========================

app.put(

    "/api/orders/:id",

    requireAdmin,

    (req, res) => {

        try {

            const id =
                String(
                    req.params.id
                );


            const orders =
                readOrders();


            const order =
                orders.find(

                    item =>

                        String(
                            item.id
                        ) === id

                );


            if (!order) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Заказ не найден"

                });

            }


            order.status =
                req.body.status ||
                "Новый";


            saveOrders(

                orders

            );


            res.json({

                success: true,

                message:
                    "Статус изменён"

            });

        }

        catch (error) {

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Ошибка изменения статуса"

            });

        }

    }

);


// =========================
// УДАЛИТЬ ЗАКАЗ
// =========================

app.delete(

    "/api/orders/:id",

    requireAdmin,

    (req, res) => {

        try {

            const id =
                String(
                    req.params.id
                );


            const orders =
                readOrders();


            const newOrders =
                orders.filter(

                    order =>

                        String(
                            order.id
                        ) !== id

                );


            if (

                newOrders.length ===
                orders.length

            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Заказ не найден"

                });

            }


            saveOrders(

                newOrders

            );


            res.json({

                success: true,

                message:
                    "Заказ удалён"

            });

        }

        catch (error) {

            console.error(error);


            res.status(500).json({

                success: false,

                message:
                    "Ошибка удаления заказа"

            });

        }

    }

);


// =========================
// ЗАПУСК
// =========================

app.listen(

    PORT,

    "0.0.0.0",

    () => {

        console.log("");

        console.log(
            "================================"
        );

        console.log(
            "       SUMKA.TJ ЗАПУЩЕН"
        );

        console.log(
            "================================"
        );

        console.log(
            "Магазин:"
        );

        console.log(
            "http://localhost:3000"
        );

        console.log("");

        console.log(
            "Админка:"
        );

        console.log(
            "http://localhost:3000/admin"
        );

        console.log("");

    }

);
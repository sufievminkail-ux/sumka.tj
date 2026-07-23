function openAddProduct() {
    const modal = document.getElementById("add-product-modal");

    if (modal) {
        modal.classList.add("active");
    }
}

function closeModal() {
    const modal = document.getElementById("add-product-modal");

    if (modal) {
        modal.classList.remove("active");
    }
}

function showSection(sectionId) {
    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active-section");
    });

    const section = document.getElementById(sectionId);

    if (section) {
        section.classList.add("active-section");
    }
}
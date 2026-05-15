// admin.js

// Delete confirmation modal 
function confirmDelete(id, name) {
  document.getElementById("modal-product-name").textContent = name;
  document.getElementById("delete-form").action = `/admin/products/${id}?_method=DELETE`;
  document.getElementById("delete-modal").style.display = "flex";
}

function closeModal() {
  document.getElementById("delete-modal").style.display = "none";
}

// Close modal on overlay click
const overlay = document.getElementById("delete-modal");
if (overlay) {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal();
  });
}

// Close modal on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// ── Image preview on file select ──
const imageInput = document.getElementById("image-input");
const imagePreview = document.getElementById("image-preview");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const uploadArea = document.getElementById("upload-area");

if (imageInput) {
  imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      imagePreview.src = evt.target.result;
      imagePreview.style.display = "block";
      if (uploadPlaceholder) uploadPlaceholder.style.display = "none";
    };
    reader.readAsDataURL(file);
  });
}

//  Drag & drop styling 
if (uploadArea) {
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });
  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });
  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    const file = e.dataTransfer.files[0];
    if (file && imageInput) {
      const dt = new DataTransfer();
      dt.items.add(file);
      imageInput.files = dt.files;
      imageInput.dispatchEvent(new Event("change"));
    }
  });
}

//  Client-side form validation 
const productForm = document.getElementById("product-form");
if (productForm) {
  productForm.addEventListener("submit", (e) => {
    const name     = productForm.querySelector("#name")?.value.trim();
    const category = productForm.querySelector("#category")?.value.trim();
    const price    = productForm.querySelector("#price")?.value;
    const stock    = productForm.querySelector("#stock")?.value;

    const errs = [];
    if (!name)              errs.push("Product name is required.");
    if (!category)          errs.push("Category is required.");
    if (!price || price < 0) errs.push("A valid price is required.");
    if (stock === "" || stock < 0) errs.push("A valid stock quantity is required.");

    if (errs.length > 0) {
      e.preventDefault();
      // Show inline error
      let errBox = productForm.querySelector(".client-errors");
      if (!errBox) {
        errBox = document.createElement("div");
        errBox.className = "alert alert-error client-errors";
        errBox.style.marginBottom = "16px";
        productForm.prepend(errBox);
      }
      errBox.innerHTML = `<span class="material-symbols-outlined">error</span><ul style="margin:0;padding-left:16px;">${errs.map(e=>`<li>${e}</li>`).join("")}</ul>`;
      errBox.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}
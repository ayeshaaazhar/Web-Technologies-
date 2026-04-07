
const hamburger = document.querySelector("#hamburger");
const nav = document.querySelector("#nav-menu");

hamburger.addEventListener("click", () => nav.classList.toggle("open"));

$(document).ready(function () {

  $.ajax({
    url: "https://fakestoreapi.com/products?limit=4",
    method: "GET",
    success: function (data) {

      const container = $("#featured-container");
      container.empty(); 

      data.forEach(product => {

        const card = `
          <div class="images">
            <img src="${product.image}" class="img">
            <h2>${product.title.substring(0, 20)}${product.title.length > 20 ? "..." : ""}</h2>
            <h3 class="sale-price">$${product.price}</h3>
            <button class="quick-btn" 
              data-title="${product.title}"
              data-desc="${product.description}"
              data-rating="${product.rating.rate}">
              Quick View
            </button>
          </div>
        `;

        container.append(card);
      });
    }
  });

  const modal = $("#modal");

  $(document).on("click", ".quick-btn", function () {
    $("#modal-title").text($(this).data("title"));
    $("#modal-desc").text($(this).data("desc"));
    $("#modal-rating").text("Rating: " + $(this).data("rating"));

    modal.show();
  });

  $("#close").click(function () {
    modal.hide();
  });

  $(window).click(function (e) {
    if (e.target.id === "modal") {
      modal.hide();
    }
  });

});
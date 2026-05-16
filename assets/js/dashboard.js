// ========== DYNAMIC PANE ==========
document.addEventListener("DOMContentLoaded", () => {
  // Grab all the navigation links and the content panels
  const sidebarItems = document.querySelectorAll(".sidebar-item");
  const tabPanels = document.querySelectorAll(".tab-panel");

  if (sidebarItems.length > 0 && tabPanels.length > 0) {
    sidebarItems.forEach((item) => {
      item.addEventListener("click", (event) => {
        event.preventDefault();

        const targetTab = item.getAttribute("data-tab");

        sidebarItems.forEach((nav) => nav.classList.remove("active"));
        tabPanels.forEach((panel) => panel.classList.remove("active"));

        item.classList.add("active");

        const targetPanel = document.getElementById(targetTab);
        if (targetPanel) {
          targetPanel.classList.add("active");
        }
      });
    });
  }
});

// ========== DYNAMIC TIME ==========

function setDashboardDate() {
  const dateElement = document.getElementById("date");
  if (!dateElement) return;

  const now = new Date();

  // Get day and calculate the correct ordinal suffix (st, nd, rd, th)
  const day = now.getDate();
  const suffix = ["th", "st", "nd", "rd"][
    day % 10 > 3 ? 0 : (((day % 100) - (day % 10) != 10) * day) % 10
  ];

  // Format the month and year
  const month = now.toLocaleDateString("en-GB", { month: "long" });
  const year = now.getFullYear();

  // Combine into "13th May, 2026"
  const formattedDate = `${day}${suffix} ${month}, ${year}`;

  dateElement.textContent = formattedDate;

  dateElement.setAttribute("datetime", now.toISOString().split("T")[0]);
}

// Initialize the date on load
setDashboardDate();

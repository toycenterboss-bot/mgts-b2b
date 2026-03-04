const enableMediaSelection = () => {
  const dialogs = document.querySelectorAll('[role="dialog"]');
  dialogs.forEach((dialog) => {
    const heading = dialog.querySelector("h2");
    const title = heading ? String(heading.textContent || "").trim().toLowerCase() : "";
    if (!title.includes("add new assets")) return;
    const checkboxes = dialog.querySelectorAll(
      'input[type="checkbox"][disabled][aria-label^="Select"]'
    );
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = false;
      checkbox.removeAttribute("aria-disabled");
    });
  });
};

const observeMediaSelection = () => {
  enableMediaSelection();
  const observer = new MutationObserver(() => {
    enableMediaSelection();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled"],
  });
};

export default {
  register() {},
  bootstrap() {
    if (typeof window === "undefined") return;
    if (!document?.body) return;
    observeMediaSelection();
  },
};

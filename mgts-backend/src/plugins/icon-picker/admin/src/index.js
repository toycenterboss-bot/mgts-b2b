import pluginId from "./pluginId";
const ensureMaterialSymbols = () => {
  if (typeof document === "undefined") return;
  const fontId = "mgts-material-symbols-font";
  if (!document.getElementById(fontId)) {
    const link = document.createElement("link");
    link.id = fontId;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0";
    document.head.appendChild(link);
  }
  const styleId = "mgts-material-symbols-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .material-symbols-outlined {
        font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
    `;
    document.head.appendChild(style);
  }
};

export default {
  register(app) {
    const IconPickerInput = async () => import("./components/IconPickerInput");
    app.customFields.register({
      name: "icon",
      pluginId,
      type: "string",
      intlLabel: {
        id: `${pluginId}.icon.label`,
        defaultMessage: "Icon",
      },
      intlDescription: {
        id: `${pluginId}.icon.description`,
        defaultMessage: "Pick an icon from the MGTS library.",
      },
      components: {
        Input: IconPickerInput,
      },
    });
  },
  bootstrap() {
    ensureMaterialSymbols();
  },
};

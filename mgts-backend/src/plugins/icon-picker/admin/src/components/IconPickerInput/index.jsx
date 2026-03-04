import React from "react";
import {
  Box,
  Button,
  Field,
  Flex,
  Typography,
} from "@strapi/design-system";

const API_URL = "/api/icons?sort=createdAt:desc&populate=preview";
const PAGE_SIZE = 100;

const resolvePreviewUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${window.location.origin}${url}`;
};

const normalizeSvgText = (text) => {
  if (!text || typeof text !== "string") return "";
  let svg = text.trim();
  if (!svg.startsWith("<svg")) {
    const idx = svg.indexOf("<svg");
    if (idx >= 0) svg = svg.slice(idx);
  }
  if (!svg.startsWith("<svg")) return "";
  if (!/xmlns=/.test(svg)) {
    svg = svg.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  svg = svg.replace(/viewbox=/g, "viewBox=");
  if (!/width=/.test(svg) && /viewBox=/.test(svg)) {
    svg = svg.replace("<svg", '<svg width="48" height="48"');
  }
  // Normalize white fills/strokes to currentColor for visibility.
  svg = svg.replace(/fill=\"\\s*#(?:fff|ffffff)\\s*\"/gi, 'fill="currentColor"');
  svg = svg.replace(/stroke=\"\\s*#(?:fff|ffffff)\\s*\"/gi, 'stroke="currentColor"');
  svg = svg.replace(/fill:\\s*#(?:fff|ffffff)/gi, "fill:currentColor");
  svg = svg.replace(/stroke:\\s*#(?:fff|ffffff)/gi, "stroke:currentColor");
  if (!/style=/.test(svg)) {
    svg = svg.replace("<svg", '<svg style="color:#0f172a"');
  } else if (!/color:\\s*#|color:\\s*rgb|color:\\s*currentColor/i.test(svg)) {
    svg = svg.replace(/style=\"([^\"]*)\"/, 'style="$1; color:#0f172a"');
  }
  return svg;
};

const toSvgDataUrl = (svgText) =>
  svgText ? `data:image/svg+xml;utf8,${encodeURIComponent(svgText)}` : "";

const fetchSvgDataUrl = async (url) => {
  if (!url) return "";
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("svg fetch failed");
  const text = await res.text();
  const normalized = normalizeSvgText(text);
  return toSvgDataUrl(normalized);
};

const isCustomIconName = (name) => {
  const n = String(name || "").toLowerCase();
  if (!n) return false;
  return (
    n.includes("svgviewer_") ||
    n.startsWith("inline_svg_") ||
    n.startsWith("nav_") ||
    n.startsWith("norm_") ||
    n.startsWith("mgts_") ||
    n.startsWith("media_")
  );
};

const SVG_DATA_CACHE = new Map();
const SVG_DATA_INFLIGHT = new Map();

const getSvgDataUrl = async (url) => {
  if (!url) return "";
  if (SVG_DATA_CACHE.has(url)) return SVG_DATA_CACHE.get(url) || "";
  if (SVG_DATA_INFLIGHT.has(url)) return SVG_DATA_INFLIGHT.get(url);
  const req = fetchSvgDataUrl(url)
    .then((dataUrl) => {
      SVG_DATA_CACHE.set(url, dataUrl || "");
      return dataUrl || "";
    })
    .catch(() => {
      SVG_DATA_CACHE.set(url, "");
      return "";
    })
    .finally(() => {
      SVG_DATA_INFLIGHT.delete(url);
    });
  SVG_DATA_INFLIGHT.set(url, req);
  return req;
};

class IconPreview extends React.PureComponent {
  _mounted = false;
  rawUrl = "";
  state = { src: "", mode: "none" }; // mode: none | url | data

  componentDidMount() {
    this._mounted = true;
    this.resolve();
  }

  componentDidUpdate(prevProps) {
    const prevUrl = prevProps?.icon?.previewUrl || "";
    const nextUrl = this.props?.icon?.previewUrl || "";
    const prevName = prevProps?.icon?.name || "";
    const nextName = this.props?.icon?.name || "";
    if (prevUrl !== nextUrl || prevName !== nextName) {
      this.resolve();
    }
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  resolve() {
    const icon = this.props?.icon;
    if (!icon) {
      this.setState({ src: "", mode: "none" });
      return;
    }
    const url = resolvePreviewUrl(icon.previewUrl);
    this.rawUrl = url || "";
    if (!url) {
      this.setState({ src: "", mode: "none" });
      return;
    }
    const custom = isCustomIconName(icon.name);
    if (!custom) {
      this.setState({ src: url, mode: "url" });
      return;
    }
    getSvgDataUrl(url).then((dataUrl) => {
      if (!this._mounted) return;
      if (dataUrl) {
        this.setState({ src: dataUrl, mode: "data" });
      } else {
        this.setState({ src: url, mode: "url" });
      }
    });
  }

  handleError = () => {
    if (!this._mounted) return;
    if (this.state.mode === "data" && this.rawUrl) {
      this.setState({ src: this.rawUrl, mode: "url" });
      return;
    }
    this.setState({ src: "", mode: "none" });
  };

  render() {
    const icon = this.props?.icon;
    if (!icon) return null;
    const custom = isCustomIconName(icon.name);
    const wrapperStyle = {
      width: 36,
      height: 36,
      display: "grid",
      placeItems: "center",
      borderRadius: 6,
      border: "1px solid #cbd5e1",
      background: "#f8fafc",
      boxShadow: "inset 0 0 0 1px #e2e8f0",
      overflow: "hidden",
    };
    const overlayStyle = { gridArea: "1 / 1" };
    if (this.state.src) {
      return (
        <span style={wrapperStyle}>
          <img
            src={this.state.src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              display: "block",
              ...overlayStyle,
            }}
            onError={this.handleError}
          />
        </span>
      );
    }
    return (
      <span style={wrapperStyle}>
        <span
          className="material-symbols-outlined"
          style={{
            fontSize: 22,
            lineHeight: 1,
            color: "#0f172a",
            ...overlayStyle,
            pointerEvents: "none",
          }}
        >
          {custom ? "image" : icon.name || "star"}
        </span>
      </span>
    );
  }
}

class IconPickerInputInner extends React.Component {
  scrollRef = React.createRef();
  _scrollHandler = null;
  _loadingMore = false;

  state = {
    query: "",
    icons: [],
    loading: false,
    open: false,
    page: 0,
    pageCount: 1,
    loadingMore: false,
  };

  componentDidMount() {
    this.loadIcons({ reset: true });
    this._scrollHandler = (e) => this.handleScroll(e);
    if (this.scrollRef?.current) {
      this.scrollRef.current.addEventListener("scroll", this._scrollHandler);
    }
  }

  componentWillUnmount() {
    if (this.scrollRef?.current && this._scrollHandler) {
      this.scrollRef.current.removeEventListener("scroll", this._scrollHandler);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (!this._scrollHandler) return;
    const el = this.scrollRef?.current;
    if (!el) return;
    if (prevState.open !== this.state.open) {
      el.removeEventListener("scroll", this._scrollHandler);
      el.addEventListener("scroll", this._scrollHandler);
    }
  }

  loadIcons = async ({ reset = false } = {}) => {
    if (this.state.loading || this.state.loadingMore) return;
    const nextPage = reset ? 1 : this.state.page + 1;
    if (!reset && this.state.page >= this.state.pageCount) return;

    if (reset) {
      this.setState({ icons: [], page: 0, pageCount: 1 });
    }
    this.setState({ loading: reset, loadingMore: !reset });
    try {
      const url = `${API_URL}&pagination[page]=${nextPage}&pagination[pageSize]=${PAGE_SIZE}`;
      const res = await fetch(url, { credentials: "include" });
      const json = await res.json();
      const list = Array.isArray(json?.data) ? json.data : [];
      const normalized = list
        .map((icon) => {
          if (!icon) return null;
          const name =
            icon.name ||
            icon.key ||
            (icon.attributes && (icon.attributes.name || icon.attributes.key)) ||
            "";
          if (!name) return null;
          const label =
            icon.label ||
            (icon.attributes && icon.attributes.label) ||
            name.replace(/_/g, " ");
          const preview =
            icon.preview ||
            (icon.attributes && icon.attributes.preview) ||
            (icon.data && icon.data.preview) ||
            null;
          const previewUrl =
            (preview && preview.url) ||
            (preview && preview.data && preview.data.attributes && preview.data.attributes.url) ||
            "";
          return {
            id: icon.id,
            name,
            label,
            previewUrl,
          };
        })
        .filter(Boolean);
      const pageCount = json?.meta?.pagination?.pageCount || nextPage;
      this.setState((prev) => {
        const merged = reset ? normalized : prev.icons.concat(normalized);
        const seen = new Set();
        const deduped = merged.filter((item) => {
          const key = item?.name || item?.id;
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return {
          icons: deduped,
          page: nextPage,
          pageCount,
        };
      });
    } catch (err) {
      console.warn("[icon-picker] Failed to load icons:", err);
    } finally {
      this.setState({ loading: false, loadingMore: false });
    }
  };

  handlePick = (iconName) => {
    const { disabled, name, onChange } = this.props || {};
    if (disabled || !onChange) return;
    onChange({ target: { name, value: iconName || "", type: "string" } });
  };

  handleClear = () => {
    const { disabled, name, onChange } = this.props || {};
    if (disabled || !onChange) return;
    onChange({ target: { name, value: "", type: "string" } });
  };

  handleToggleOpen = () => {
    this.setState(
      (prev) => ({
        open: !prev.open,
      }),
      () => {
        if (this.state.open && this.state.icons.length === 0) {
          this.loadIcons({ reset: true });
        }
      }
    );
  };

  handleQueryChange = (e) => {
    this.setState({ query: e.target.value });
  };

  getFilteredIcons() {
    const { query, icons } = this.state;
    const q = String(query || "").trim().toLowerCase();
    if (!q) return icons;
    return icons.filter((icon) => {
      const name = String(icon?.name || "").toLowerCase();
      const labelText = String(icon?.label || "").toLowerCase();
      return name.includes(q) || labelText.includes(q);
    });
  }

  handleLoadMore = () => {
    this.loadIcons();
  };

  handleScroll = (e) => {
    const { open, loading, loadingMore, page, pageCount } = this.state;
    if (!open || loading || loadingMore) return;
    if (page >= pageCount) return;
    const el = e?.currentTarget || this.scrollRef?.current;
    if (!el) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
    if (!nearBottom) return;
    if (this._loadingMore) return;
    this._loadingMore = true;
    this.loadIcons().finally(() => {
      this._loadingMore = false;
    });
  };

  render() {
    const { name, value, label, description, error, required, disabled } = this.props || {};
    const fieldName = name || "icon";
    const { query, loading, icons, open, page, pageCount, loadingMore } = this.state;
    const filtered = this.getFilteredIcons();
    const selected = icons.find((i) => i.name === value) || null;
    const visibleIcons = open ? filtered : [];
    const hasMore = open && page < pageCount;

    return (
      <Field.Root name={fieldName} error={error} hint={description} required={required}>
        <Flex direction="column" gap={2} alignItems="stretch">
          <Field.Label>{label || "Icon"}</Field.Label>
        <Flex gap={3} alignItems="center" justifyContent="space-between">
          <Flex gap={2} alignItems="center" style={{ minWidth: 0, flex: 1 }}>
            <Box
              background="neutral100"
              padding={2}
              borderRadius="6px"
              borderColor="neutral200"
              style={{ width: 44, height: 44, display: "grid", placeItems: "center" }}
            >
              <IconPreview icon={selected} />
            </Box>
            <Box style={{ minWidth: 0 }}>
              <Typography
                variant="pi"
                fontWeight="bold"
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {selected?.label || selected?.name || "Иконка не выбрана"}
              </Typography>
              <Typography
                variant="pi"
                textColor="neutral600"
                style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {selected?.name || value || ""}
              </Typography>
            </Box>
          </Flex>
          <Flex gap={2}>
            <Button variant="secondary" size="S" onClick={this.handleToggleOpen} disabled={disabled}>
              {open ? "Свернуть" : "Выбрать"}
            </Button>
            <Button variant="tertiary" size="S" onClick={this.handleClear} disabled={disabled}>
              Очистить
            </Button>
          </Flex>
        </Flex>

        {open && (
          <input
            type="text"
            placeholder="Поиск иконки..."
            value={query}
            onChange={this.handleQueryChange}
            disabled={disabled}
            style={{
              width: "100%",
              height: 40,
              borderRadius: 6,
              border: "1px solid #d0d4d8",
              padding: "0 12px",
              fontSize: 14,
              outline: "none",
            }}
          />
        )}

        {open && (
          <Box
            padding={2}
            background="neutral0"
            borderColor="neutral200"
            borderStyle="solid"
            borderWidth="1px"
            borderRadius="8px"
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 8,
            }}
            ref={this.scrollRef}
          >
            {loading && (
              <Box padding={3}>
                <Typography variant="pi">Загрузка иконок…</Typography>
              </Box>
            )}
            {!loading && filtered.length === 0 && (
              <Box padding={3}>
                <Typography variant="pi">Иконки не найдены</Typography>
              </Box>
            )}
            {!loading &&
              visibleIcons.map((icon) => {
                const isActive = icon.name === value;
                return (
                  <button
                    key={icon.id || icon.name}
                    type="button"
                    onClick={() => this.handlePick(icon.name)}
                    disabled={disabled}
                    style={{
                      border: isActive ? "2px solid #2563eb" : "1px solid #e2e8f0",
                      borderRadius: 8,
                      padding: "8px 6px",
                      background: isActive ? "#eff6ff" : "#ffffff",
                      cursor: disabled ? "not-allowed" : "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 4,
                      minHeight: 92,
                      textAlign: "center",
                      overflow: "hidden",
                    }}
                  >
                    <IconPreview icon={icon} />
                    <Typography
                      variant="pi"
                      style={{
                        textAlign: "center",
                        fontSize: 11,
                        lineHeight: 1.2,
                        maxWidth: "100%",
                        wordBreak: "break-word",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                        minHeight: "2.4em",
                      }}
                    >
                      {icon.label || icon.name}
                    </Typography>
                  </button>
                );
              })}
          </Box>
        )}

        {open && hasMore && (
          <Button
            variant="secondary"
            size="S"
            onClick={this.handleLoadMore}
            disabled={disabled || loadingMore}
          >
            {loadingMore ? "Загрузка…" : "Показать еще"}
          </Button>
        )}

        <Field.Hint />
        <Field.Error />
      </Flex>
      </Field.Root>
    );
  }
}

const IconPickerInput = (props) => <IconPickerInputInner {...(props || {})} />;

export default IconPickerInput;

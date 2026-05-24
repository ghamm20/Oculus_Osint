var y = globalThis.__WWV_HOST__.React, { useState: w, useEffect: _, useRef: k, useMemo: I, useCallback: R, useContext: L, useReducer: P, useLayoutEffect: D, StrictMode: T, Suspense: U, createContext: V, createElement: l, cloneElement: W, isValidElement: B, Fragment: $, Children: F, Component: A, PureComponent: M, createRef: K, forwardRef: o, memo: N, lazy: j, startTransition: z, useTransition: O, useDeferredValue: H, useId: q, useSyncExternalStore: Z, useInsertionEffect: J } = y, f = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), s = (...e) => e.filter((t, i, n) => !!t && t.trim() !== "" && n.indexOf(t) === i).join(" ").trim(), h = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, p = o(({ color: e = "currentColor", size: t = 24, strokeWidth: i = 2, absoluteStrokeWidth: n, className: a = "", children: r, iconNode: c, ...u }, v) => l("svg", {
  ref: v,
  ...h,
  width: t,
  height: t,
  stroke: e,
  strokeWidth: n ? Number(i) * 24 / Number(t) : i,
  className: s("lucide", a),
  ...u
}, [...c.map(([d, g]) => l(d, g)), ...Array.isArray(r) ? r : [r]])), m = (e, t) => {
  const i = o(({ className: n, ...a }, r) => l(p, {
    ref: r,
    iconNode: t,
    className: s(`lucide-${f(e)}`, n),
    ...a
  }));
  return i.displayName = `${e}`, i;
}, b = [
  ["circle", {
    cx: "12",
    cy: "12",
    r: "10",
    key: "1mglay"
  }],
  ["line", {
    x1: "22",
    x2: "18",
    y1: "12",
    y2: "12",
    key: "l9bcsi"
  }],
  ["line", {
    x1: "6",
    x2: "2",
    y1: "12",
    y2: "12",
    key: "13hhkx"
  }],
  ["line", {
    x1: "12",
    x2: "12",
    y1: "6",
    y2: "2",
    key: "10w3f3"
  }],
  ["line", {
    x1: "12",
    x2: "12",
    y1: "22",
    y2: "18",
    key: "15g9kq"
  }]
], x = m("Crosshair", b), C = globalThis.__WWV_HOST__.WWVPluginSDK, { WorldPlugin: G, PluginManifest: Q, createSvgIconUrl: S, DEFAULT_ICON_SIZE: X } = C, E = class {
  context = null;
  iconUrls = {};
  defaultLayerColor = "#ef4444";
  clusterDistance = 40;
  async initialize(e) {
    this.context = e;
  }
  destroy() {
    this.context = null;
  }
  getEntityIcon(e) {
    return this.icon;
  }
  getPollingInterval() {
    return 0;
  }
  getLayerConfig() {
    return {
      color: this.defaultLayerColor,
      clusterEnabled: !0,
      clusterDistance: this.clusterDistance
    };
  }
  renderEntity(e) {
    const t = this.getSeverityValue(e), i = this.getSeverityColor(t), n = this.getSeveritySize(t), a = this.getEntityIcon(e), r = `${a?.displayName || a?.name || "default"}-${i}`;
    return this.iconUrls[r] || (this.iconUrls[r] = S(a, { color: i })), {
      type: "billboard",
      iconUrl: this.iconUrls[r],
      color: i,
      size: n,
      outlineColor: "#000000",
      outlineWidth: 1,
      labelText: e.label || void 0,
      labelFont: "11px JetBrains Mono, monospace"
    };
  }
}, Y = class extends E {
  constructor(...e) {
    super(...e), this.id = "conflict-events", this.name = "Conflict Events", this.description = "Recent conflict events and violence mapping", this.icon = x, this.category = "conflict", this.version = "1.0.1", this.defaultLayerColor = "#ef4444", this.clusterDistance = 50, this.data = [];
  }
  getSeverityValue(e) {
    return e.properties?.fatalities || 0;
  }
  getSeverityColor(e) {
    return e > 10 ? "#ef4444" : e > 0 ? "#f97316" : "#facc15";
  }
  getSeveritySize(e) {
    return e > 10 ? 20 : e > 0 ? 15 : 10;
  }
  getServerConfig() {
    return {
      streamUrl: "wss://dataenginev2.worldwideview.dev/stream",
      apiBasePath: "/api/conflict-events",
      pollingIntervalMs: 3600 * 24 * 1e3,
      requiresAuth: !1,
      historyEnabled: !1,
      availabilityEnabled: !0
    };
  }
  async fetch(e) {
    let t = this.context?.getEngineUrl() || "https://dataengine.worldwideview.dev";
    t = t.replace(/\/$/, "");
    const i = await (await fetch(`${t}/api/conflict-events`)).json();
    return i.data ? (this.data = i.data, this.data) : [];
  }
  getPollingInterval() {
    return 3600 * 24 * 1e3;
  }
  getFilterDefinitions() {
    return [{
      id: "type",
      label: "Event Type",
      propertyKey: "type",
      type: "select",
      options: [
        {
          value: "Battles",
          label: "Battles"
        },
        {
          value: "Explosions/Remote violence",
          label: "Explosions/Remote violence"
        },
        {
          value: "Violence against civilians",
          label: "Violence against civilians"
        },
        {
          value: "Protests",
          label: "Protests"
        },
        {
          value: "Riots",
          label: "Riots"
        },
        {
          value: "Strategic developments",
          label: "Strategic developments"
        }
      ]
    }];
  }
  getLegend() {
    return [
      {
        label: "High Fatalities (>10)",
        color: "#ef4444"
      },
      {
        label: "Medium Fatalities (1-10)",
        color: "#f97316"
      },
      {
        label: "Low Fatalities / Remote",
        color: "#facc15"
      }
    ];
  }
};
export {
  Y as ConflictEventsPlugin
};

var f = globalThis.__WWV_HOST__.React, { useState: m, useEffect: k, useRef: E, useMemo: S, useCallback: L, useContext: R, useReducer: T, useLayoutEffect: x, StrictMode: D, Suspense: P, createContext: $, createElement: s, cloneElement: I, isValidElement: M, Fragment: V, Children: _, Component: A, PureComponent: N, createRef: U, forwardRef: i, memo: z, lazy: B, startTransition: W, useTransition: j, useDeferredValue: H, useId: F, useSyncExternalStore: K, useInsertionEffect: O } = f, y = (a) => a.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), l = (...a) => a.filter((t, r, e) => !!t && t.trim() !== "" && e.indexOf(t) === r).join(" ").trim(), g = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, b = i(({ color: a = "currentColor", size: t = 24, strokeWidth: r = 2, absoluteStrokeWidth: e, className: o = "", children: n, iconNode: c, ...u }, d) => s("svg", {
  ref: d,
  ...g,
  width: t,
  height: t,
  stroke: a,
  strokeWidth: e ? Number(r) * 24 / Number(t) : r,
  className: l("lucide", o),
  ...u
}, [...c.map(([p, v]) => s(p, v)), ...Array.isArray(n) ? n : [n]])), h = (a, t) => {
  const r = i(({ className: e, ...o }, n) => s(b, {
    ref: n,
    iconNode: t,
    className: l(`lucide-${y(a)}`, e),
    ...o
  }));
  return r.displayName = `${a}`, r;
}, C = [
  ["path", {
    d: "M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2",
    key: "1fvzgz"
  }],
  ["path", {
    d: "M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2",
    key: "1kc0my"
  }],
  ["path", {
    d: "M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8",
    key: "10h0bg"
  }],
  ["path", {
    d: "M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15",
    key: "1s1gnw"
  }]
], w = h("Hand", C), Z = class {
  constructor() {
    this.id = "civil-unrest", this.name = "Civil Unrest", this.description = "Tracks global protests, riots, and civil disturbances via GDELT.", this.icon = w, this.category = "conflict", this.version = "1.1.0";
  }
  async initialize(a) {
    this.context = a, console.log("[CivilUnrestPlugin] Initialized.");
  }
  destroy() {
  }
  getPollingInterval() {
    return 9e5;
  }
  getLayerConfig() {
    return {
      color: "#eab308",
      clusterEnabled: !0,
      clusterDistance: 50,
      minZoomLevel: 3
    };
  }
  getServerConfig() {
    return {
      streamUrl: "wss://dataenginev2.worldwideview.dev/stream",
      apiBasePath: "/api/civil-unrest",
      pollingIntervalMs: 432e5,
      historyEnabled: !1,
      availabilityEnabled: !1
    };
  }
  async fetch(a) {
    let t = this.context?.getEngineUrl() || "https://dataengine.worldwideview.dev";
    t = t.replace(/\/$/, "");
    const r = (await (await fetch(`${t}/api/civil-unrest`)).json()).data;
    return r ? (Array.isArray(r) ? r : r.items || []).map((e) => {
      const o = e.date ? new Date(e.date).getTime() : void 0;
      return {
        id: e.id,
        latitude: e.lat,
        longitude: e.lon,
        timestamp: Number.isNaN(o) ? void 0 : o,
        name: `${e.type}: ${e.location || "Unknown"}`,
        properties: {
          type: e.type,
          subType: e.subType,
          actor1: e.actor1,
          actor2: e.actor2,
          fatalities: e.fatalities,
          country: e.country,
          location: e.location,
          date: e.date,
          source: e.source,
          notes: e.notes,
          reportCount: e.reportCount
        }
      };
    }) : [];
  }
  getFilterDefinitions() {
    return [{
      id: "type",
      label: "Event Type",
      type: "select",
      propertyKey: "type",
      options: [
        {
          value: "Protests",
          label: "Protests"
        },
        {
          value: "Riots",
          label: "Riots"
        },
        {
          value: "Demonstrations",
          label: "Demonstrations"
        },
        {
          value: "Strikes",
          label: "Labor Strikes"
        }
      ]
    }];
  }
  getLegend() {
    return [
      {
        label: "Riots/Violent",
        color: "#ef4444"
      },
      {
        label: "Demonstrations",
        color: "#f97316"
      },
      {
        label: "Peaceful Protests",
        color: "#eab308"
      },
      {
        label: "Strikes",
        color: "#3b82f6"
      }
    ];
  }
  renderEntity(a) {
    const t = a.properties?.type || "", r = a.properties?.reportCount || 1;
    let e = "#eab308";
    t.includes("Riots") || t.includes("clash") ? e = "#ef4444" : t.includes("Demonstration") ? e = "#f97316" : t.includes("Strike") && (e = "#3b82f6");
    let o = 8;
    return r > 50 ? o = 16 : r > 15 && (o = 12), {
      type: "point",
      color: e,
      size: o,
      outlineColor: "#000000",
      outlineWidth: 2
    };
  }
};
export {
  Z as CivilUnrestPlugin
};

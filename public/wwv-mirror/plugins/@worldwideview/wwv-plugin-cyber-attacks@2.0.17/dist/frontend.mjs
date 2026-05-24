var f = globalThis.__WWV_HOST__.React, { useState: D, useEffect: _, useRef: $, useMemo: I, useCallback: P, useContext: R, useReducer: U, useLayoutEffect: z, StrictMode: B, Suspense: L, createContext: F, createElement: c, cloneElement: H, isValidElement: V, Fragment: W, Children: K, Component: N, PureComponent: q, createRef: Z, forwardRef: b, memo: X, lazy: G, startTransition: J, useTransition: Q, useDeferredValue: Y, useId: ee, useSyncExternalStore: te, useInsertionEffect: re } = f, w = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, C = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), i = (t, r) => {
  const a = b(({ color: n = "currentColor", size: e = 24, strokeWidth: o = 2, absoluteStrokeWidth: p, className: d = "", children: l, ...u }, k) => c("svg", {
    ref: k,
    ...w,
    width: e,
    height: e,
    stroke: n,
    strokeWidth: p ? Number(o) * 24 / Number(e) : o,
    className: [
      "lucide",
      `lucide-${C(t)}`,
      d
    ].join(" "),
    ...u
  }, [...r.map(([g, v]) => c(g, v)), ...Array.isArray(l) ? l : [l]]));
  return a.displayName = `${t}`, a;
}, M = i("Bug", [
  ["path", {
    d: "m8 2 1.88 1.88",
    key: "fmnt4t"
  }],
  ["path", {
    d: "M14.12 3.88 16 2",
    key: "qol33r"
  }],
  ["path", {
    d: "M9 7.13v-1a3.003 3.003 0 1 1 6 0v1",
    key: "d7y7pr"
  }],
  ["path", {
    d: "M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6",
    key: "xs1cw7"
  }],
  ["path", {
    d: "M12 20v-9",
    key: "1qisl0"
  }],
  ["path", {
    d: "M6.53 9C4.6 8.8 3 7.1 3 5",
    key: "32zzws"
  }],
  ["path", {
    d: "M6 13H2",
    key: "82j7cp"
  }],
  ["path", {
    d: "M3 21c0-2.1 1.7-3.9 3.8-4",
    key: "4p0ekp"
  }],
  ["path", {
    d: "M20.97 5c0 2.1-1.6 3.8-3.5 4",
    key: "18gb23"
  }],
  ["path", {
    d: "M22 13h-4",
    key: "1jl80f"
  }],
  ["path", {
    d: "M17.2 17c2.1.1 3.8 1.9 3.8 4",
    key: "k3fwyw"
  }]
]), T = i("CircleHelp", [
  ["circle", {
    cx: "12",
    cy: "12",
    r: "10",
    key: "1mglay"
  }],
  ["path", {
    d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
    key: "1u773s"
  }],
  ["path", {
    d: "M12 17h.01",
    key: "p32p05"
  }]
]), m = i("Fish", [
  ["path", {
    d: "M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z",
    key: "15baut"
  }],
  ["path", {
    d: "M18 12v.5",
    key: "18hhni"
  }],
  ["path", {
    d: "M16 17.93a9.77 9.77 0 0 1 0-11.86",
    key: "16dt7o"
  }],
  ["path", {
    d: "M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33",
    key: "l9di03"
  }],
  ["path", {
    d: "M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4",
    key: "1kjonw"
  }],
  ["path", {
    d: "m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98",
    key: "1zlm23"
  }]
]), x = i("Radio", [
  ["path", {
    d: "M4.9 19.1C1 15.2 1 8.8 4.9 4.9",
    key: "1vaf9d"
  }],
  ["path", {
    d: "M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5",
    key: "u1ii0m"
  }],
  ["circle", {
    cx: "12",
    cy: "12",
    r: "2",
    key: "1c9p78"
  }],
  ["path", {
    d: "M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5",
    key: "1j5fej"
  }],
  ["path", {
    d: "M19.1 4.9C23 8.8 23 15.1 19.1 19",
    key: "10b0cb"
  }]
]), S = i("Server", [
  ["rect", {
    width: "20",
    height: "8",
    x: "2",
    y: "2",
    rx: "2",
    ry: "2",
    key: "ngkwjq"
  }],
  ["rect", {
    width: "20",
    height: "8",
    x: "2",
    y: "14",
    rx: "2",
    ry: "2",
    key: "iecqi9"
  }],
  ["line", {
    x1: "6",
    x2: "6.01",
    y1: "6",
    y2: "6",
    key: "16zg32"
  }],
  ["line", {
    x1: "6",
    x2: "6.01",
    y1: "18",
    y2: "18",
    key: "nzw8ys"
  }]
]), h = i("ShieldAlert", [
  ["path", {
    d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
    key: "oel41y"
  }],
  ["path", {
    d: "M12 8v4",
    key: "1got3b"
  }],
  ["path", {
    d: "M12 16h.01",
    key: "1drbdi"
  }]
]), A = i("Skull", [
  ["circle", {
    cx: "9",
    cy: "12",
    r: "1",
    key: "1vctgf"
  }],
  ["circle", {
    cx: "15",
    cy: "12",
    r: "1",
    key: "1tmaij"
  }],
  ["path", {
    d: "M8 20v2h8v-2",
    key: "ded4og"
  }],
  ["path", {
    d: "m12.5 17-.5-1-.5 1h1z",
    key: "3me087"
  }],
  ["path", {
    d: "M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20",
    key: "xq9p5u"
  }]
]), E = i("Zap", [["path", {
  d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
  key: "1xq2db"
}]]), O = globalThis.__WWV_HOST__.WWVPluginSDK, { WorldPlugin: ae, PluginManifest: ie, createSvgIconUrl: j, DEFAULT_ICON_SIZE: ne } = O, s = {
  APT: "#dc2626",
  Ransomware: "#f97316",
  Botnet: "#a855f7",
  Phishing: "#eab308",
  DDoS: "#3b82f6",
  Malware: "#ef4444",
  "C2 Server": "#14b8a6",
  Other: "#6b7280"
}, y = {
  APT: A,
  Ransomware: E,
  Botnet: x,
  Phishing: m,
  DDoS: h,
  Malware: M,
  "C2 Server": S,
  Other: T
}, se = class {
  constructor() {
    this.id = "cyber-attacks", this.name = "Cyber Threats (OTX)", this.description = "Active threat campaigns from AlienVault Open Threat Exchange", this.icon = h, this.category = "cyber", this.version = "2.0.0", this.context = null, this.iconUrls = {};
  }
  async initialize(t) {
    this.context = t;
  }
  destroy() {
    this.context = null;
  }
  async fetch(t) {
    try {
      let r = this.context?.getEngineUrl() || "https://dataengine.worldwideview.dev";
      r = r.replace(/\/$/, "");
      const a = t ? `${r}/api/cyber-attacks/history?start=${t.start.getTime()}&end=${t.end.getTime()}` : `${r}/api/cyber-attacks`, n = await globalThis.fetch(a);
      if (!n.ok) throw new Error(`Cyber API returned ${n.status}`);
      return ((await n.json()).items || []).map((e) => ({
        id: e.id,
        pluginId: "cyber-attacks",
        latitude: e.lat,
        longitude: e.lon,
        timestamp: new Date(e.pulseModified || Date.now()),
        label: `${e.threatType}: ${e.ip}`,
        properties: {
          ip: e.ip,
          country: e.country,
          city: e.city,
          threatType: e.threatType,
          adversary: e.adversary,
          pulseName: e.pulseName,
          pulseDescription: e.pulseDescription,
          malwareFamilies: (e.malwareFamilies || []).join(", "),
          tags: (e.tags || []).join(", "),
          targetedCountries: (e.targetedCountries || []).join(", "),
          pulseUrl: `https://otx.alienvault.com/pulse/${e.pulseId}`
        }
      }));
    } catch (r) {
      return console.error("[CyberAttacksPlugin] Fetch error:", r), [];
    }
  }
  getPollingInterval() {
    return 0;
  }
  getServerConfig() {
    return {
      streamUrl: "wss://dataenginev2.worldwideview.dev/stream",
      apiBasePath: "/api/cyber-attacks",
      pollingIntervalMs: 0,
      historyEnabled: !0
    };
  }
  getLayerConfig() {
    return {
      color: "#ef4444",
      clusterEnabled: !0,
      clusterDistance: 35,
      maxEntities: 5e3
    };
  }
  renderEntity(t) {
    const r = t.properties.threatType || "Other", a = s[r] || s.Other, n = y[r] || y.Other, e = `${r}-${a}`;
    return this.iconUrls[e] || (this.iconUrls[e] = j(n, { color: a })), {
      type: "billboard",
      iconUrl: this.iconUrls[e],
      color: a,
      iconScale: 0.7
    };
  }
  getSelectionBehavior(t) {
    return {
      showTrail: !1,
      flyToOffsetMultiplier: 2,
      flyToBaseDistance: 8e5
    };
  }
  getFilterDefinitions() {
    return [
      {
        id: "threatType",
        label: "Threat Type",
        type: "select",
        propertyKey: "threatType",
        options: Object.keys(s).map((t) => ({
          value: t,
          label: t
        }))
      },
      {
        id: "country",
        label: "Country",
        type: "text",
        propertyKey: "country"
      },
      {
        id: "adversary",
        label: "Threat Actor",
        type: "text",
        propertyKey: "adversary"
      }
    ];
  }
  getLegend() {
    return Object.entries(s).map(([t, r]) => ({
      label: t,
      color: r,
      filterId: "threatType",
      filterValue: t
    }));
  }
};
export {
  se as CyberAttacksPlugin
};

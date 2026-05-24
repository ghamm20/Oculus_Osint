var v = globalThis.__WWV_HOST__.React, { useState: C, useEffect: w, useRef: V, useMemo: S, useCallback: $, useContext: A, useReducer: j, useLayoutEffect: W, StrictMode: H, Suspense: O, createContext: B, createElement: g, cloneElement: F, isValidElement: J, Fragment: N, Children: Z, Component: z, PureComponent: K, createRef: U, forwardRef: b, memo: q, lazy: Q, startTransition: X, useTransition: Y, useDeferredValue: ee, useId: te, useSyncExternalStore: ie, useInsertionEffect: re } = v, E = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, _ = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), x = (e, r) => {
  const t = b(({ color: u = "currentColor", size: i = 24, strokeWidth: o = 2, absoluteStrokeWidth: n, className: s = "", children: a, ...l }, c) => g("svg", {
    ref: c,
    ...E,
    width: i,
    height: i,
    stroke: u,
    strokeWidth: n ? Number(o) * 24 / Number(i) : o,
    className: [
      "lucide",
      `lucide-${_(e)}`,
      s
    ].join(" "),
    ...l
  }, [...r.map(([h, p]) => g(h, p)), ...Array.isArray(a) ? a : [a]]));
  return t.displayName = `${e}`, t;
}, P = x("Scale", [
  ["path", {
    d: "m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",
    key: "7g6ntu"
  }],
  ["path", {
    d: "m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z",
    key: "ijws7r"
  }],
  ["path", {
    d: "M7 21h10",
    key: "1b0cd5"
  }],
  ["path", {
    d: "M12 3v18",
    key: "108xh3"
  }],
  ["path", {
    d: "M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2",
    key: "3gwbw2"
  }]
]), T = globalThis.__WWV_HOST__.Cesium, { Viewer: oe, Entity: ne, Cartesian3: ae, Cartesian2: se, Color: y, CallbackProperty: le, DistanceDisplayCondition: ce, NearFarScalar: ue, HeightReference: he, Resource: de, Rectangle: pe, PolygonHierarchy: me, ClassificationType: fe, ArcType: ge, Math: ye, JulianDate: D, TimeInterval: ve, TimeIntervalCollection: Ce, SampledPositionProperty: we, GeoJsonDataSource: G, PinBuilder: Se, CustomDataSource: be, ConstantProperty: Ee, ColorMaterialProperty: _e, Cartographic: xe } = T, M = globalThis.__WWV_HOST__.Resium, { Entity: R, PointGraphics: Pe, BillboardGraphics: Te, CustomDataSource: De, Camera: Ge, PolygonGraphics: k, PolylineGraphics: Me, EllipseGraphics: Re, LabelGraphics: ke, ModelGraphics: Ie, PathGraphics: Le, BoxGraphics: Ve, GeoJsonDataSource: $e, ScreenSpaceEventHandler: Ae, ScreenSpaceEvent: je } = M, f = globalThis.__WWV_HOST__.jsxRuntime, m = f.jsx, We = f.jsxs, I = f.Fragment, d = {
  low: "#facc15",
  medium: "#f97316",
  high: "#ef4444"
};
function L(e, r) {
  const t = e?.cesiumElement;
  t && !t._wwvEntity && (t._wwvEntity = r);
}
var He = class {
  constructor() {
    this.id = "international-sanctions", this.name = "International Sanctions", this.description = "Countries facing significant international US OFAC sanctions", this.icon = P, this.category = "economic", this.version = "1.0.0", this.context = null, this.data = [], this.GlobeComp = ({ enabled: e }) => {
      const [r, t] = C({});
      w(() => {
        if (!e) return;
        let i = !0;
        async function o() {
          try {
            const n = new G("border-shapes");
            if (await n.load("/borders.geojson"), !i) return;
            const s = D.now(), a = {};
            for (const l of n.entities.values) {
              const c = (l.properties ? l.properties.getValue(s) : void 0)?.iso_a2;
              if (!c) continue;
              let h;
              l.polygon && (h = l.polygon.hierarchy?.getValue(s)), h && (a[c] || (a[c] = []), a[c].push(h));
            }
            t(a);
          } catch (n) {
            console.error("Failed to load borders for sanctions", n);
          }
        }
        return o(), () => {
          i = !1;
        };
      }, [e]);
      const u = S(() => {
        if (!e || Object.keys(r).length === 0 || this.data.length === 0) return [];
        const i = [];
        for (const o of this.data) {
          const n = o.properties.countryCode, s = o.properties.level || "low", a = d[s] || d.low, l = y.fromCssColorString(a).withAlpha(0.65), c = y.fromCssColorString(a).withAlpha(1), h = s === "high" ? 25e4 : s === "medium" ? 15e4 : 75e3, p = r[n];
          p && i.push({
            id: o.id,
            name: `Sanctioned Country: ${n}`,
            geoEntity: o,
            color: l,
            outlineColor: c,
            height: h,
            hierarchies: p
          });
        }
        return i;
      }, [
        e,
        this.data,
        r
      ]);
      return u.length === 0 ? null : /* @__PURE__ */ m(I, { children: u.flatMap((i) => i.hierarchies.map((o, n) => /* @__PURE__ */ m(R, {
        name: i.name,
        ref: (s) => L(s, i.geoEntity),
        children: /* @__PURE__ */ m(k, {
          hierarchy: o,
          extrudedHeight: i.height,
          height: 0,
          material: i.color,
          outline: !0,
          outlineColor: i.outlineColor,
          closeTop: !0,
          closeBottom: !1
        })
      }, `${i.id}-${n}`))) });
    };
  }
  async initialize(e) {
    this.context = e;
  }
  destroy() {
    this.context = null;
  }
  async fetch(e) {
    return this.data;
  }
  getPollingInterval() {
    return 0;
  }
  mapWebsocketPayload(e) {
    const r = (Array.isArray(e) ? e : e.items || [e]).map((t) => ({
      id: t.id || `sanction-${t.countryCode || Math.random()}`,
      pluginId: this.id,
      latitude: t.latitude || 0,
      longitude: t.longitude || 0,
      altitude: 0,
      timestamp: new Date(t.timestamp || Date.now()),
      properties: { ...t }
    }));
    if (e.type === "full_sync" || Array.isArray(e)) this.data = r;
    else for (const t of r) {
      const u = this.data.findIndex((i) => i.id === t.id);
      u >= 0 ? this.data[u] = t : this.data.push(t);
    }
    return r;
  }
  getLayerConfig() {
    return {
      color: "#ef4444",
      clusterEnabled: !1,
      clusterDistance: 0,
      disableDefaultRendering: !0,
      maxEntities: 5e3
    };
  }
  renderEntity(e) {
    return {
      type: "point",
      size: 0,
      color: "transparent"
    };
  }
  getSelectionBehavior(e) {
    return {
      showTrail: !1,
      flyToOffsetMultiplier: 2,
      flyToBaseDistance: 5e6
    };
  }
  getFilterDefinitions() {
    return [{
      id: "level",
      label: "Sanction Level",
      type: "select",
      propertyKey: "level",
      options: [
        {
          value: "low",
          label: "Low (< 50)"
        },
        {
          value: "medium",
          label: "Medium (50 - 500)"
        },
        {
          value: "high",
          label: "High (> 500)"
        }
      ]
    }];
  }
  getLegend() {
    return [
      {
        label: "High (> 500)",
        color: d.high,
        filterId: "level",
        filterValue: "high"
      },
      {
        label: "Medium (50 - 500)",
        color: d.medium,
        filterId: "level",
        filterValue: "medium"
      },
      {
        label: "Low (< 50)",
        color: d.low,
        filterId: "level",
        filterValue: "low"
      }
    ];
  }
  getServerConfig() {
    return {
      streamUrl: "wss://dataenginev2.worldwideview.dev/stream",
      apiBasePath: "/api/sanctions",
      pollingIntervalMs: 0,
      historyEnabled: !1
    };
  }
  getGlobeComponent() {
    return this.GlobeComp;
  }
};
export {
  He as InternationalSanctionsPlugin
};

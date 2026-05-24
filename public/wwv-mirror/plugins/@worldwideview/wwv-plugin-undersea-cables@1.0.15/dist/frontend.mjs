var V = globalThis.__WWV_HOST__.React, { useState: q, useEffect: D, useRef: R, useMemo: Q, useCallback: X, useContext: T, useReducer: Y, useLayoutEffect: ee, StrictMode: te, Suspense: re, createContext: W, createElement: S, cloneElement: ae, isValidElement: oe, Fragment: ne, Children: se, Component: ie, PureComponent: le, createRef: ce, forwardRef: w, memo: ue, lazy: de, startTransition: pe, useTransition: he, useDeferredValue: ye, useId: Ce, useSyncExternalStore: fe, useInsertionEffect: me } = V, E = (...e) => e.filter((t, r, n) => !!t && t.trim() !== "" && n.indexOf(t) === r).join(" ").trim(), L = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), I = (e) => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (t, r, n) => n ? n.toUpperCase() : r.toLowerCase()), _ = (e) => {
  const t = I(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, v = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, U = (e) => {
  for (const t in e) if (t.startsWith("aria-") || t === "role" || t === "title") return !0;
  return !1;
}, $ = W({}), z = () => T($), H = w(({ color: e, size: t, strokeWidth: r, absoluteStrokeWidth: n, className: c = "", children: a, iconNode: f, ...l }, u) => {
  const { size: d = 24, strokeWidth: s = 2, absoluteStrokeWidth: m = !1, color: y = "currentColor", className: g = "" } = z() ?? {}, o = n ?? m ? Number(r ?? s) * 24 / Number(t ?? d) : r ?? s;
  return S("svg", {
    ref: u,
    ...v,
    width: t ?? d ?? v.width,
    height: t ?? d ?? v.height,
    stroke: e ?? y,
    strokeWidth: o,
    className: E("lucide", g, c),
    ...!a && !U(l) && { "aria-hidden": "true" },
    ...l
  }, [...f.map(([p, h]) => S(p, h)), ...Array.isArray(a) ? a : [a]]);
}), N = (e, t) => {
  const r = w(({ className: n, ...c }, a) => S(H, {
    ref: a,
    iconNode: t,
    className: E(`lucide-${L(_(e))}`, `lucide-${e}`, n),
    ...c
  }));
  return r.displayName = _(e), r;
}, B = [
  ["path", {
    d: "M17 19a1 1 0 0 1-1-1v-2a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2a1 1 0 0 1-1 1z",
    key: "trhst0"
  }],
  ["path", {
    d: "M17 21v-2",
    key: "ds4u3f"
  }],
  ["path", {
    d: "M19 14V6.5a1 1 0 0 0-7 0v11a1 1 0 0 1-7 0V10",
    key: "1mo9zo"
  }],
  ["path", {
    d: "M21 21v-2",
    key: "eo0ou"
  }],
  ["path", {
    d: "M3 5V3",
    key: "1k5hjh"
  }],
  ["path", {
    d: "M4 10a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2a2 2 0 0 1-2 2z",
    key: "1dd30t"
  }],
  ["path", {
    d: "M7 5V3",
    key: "1t1388"
  }]
], F = N("cable", B), O = globalThis.__WWV_HOST__.Cesium, { Viewer: ge, Entity: be, Cartesian3: ve, Cartesian2: Se, Color: j, CallbackProperty: ke, DistanceDisplayCondition: _e, NearFarScalar: xe, HeightReference: Pe, Resource: we, Rectangle: Ee, PolygonHierarchy: Ae, ClassificationType: Me, ArcType: Ve, Math: De, JulianDate: x, TimeInterval: Re, TimeIntervalCollection: Te, SampledPositionProperty: We, GeoJsonDataSource: G, PinBuilder: Le, CustomDataSource: Z, ConstantProperty: C, ColorMaterialProperty: J, Cartographic: P } = O, K = ({ viewer: e, enabled: t }) => {
  const r = R(null);
  return D(() => {
    if (!e || !t) {
      e && !e.isDestroyed() && e.dataSources && r.current && (e.dataSources.remove(r.current), r.current = null);
      return;
    }
    let n = !1;
    async function c() {
      if (e)
        try {
          let y = function() {
            if (n || !e) return;
            a.entities.suspendEvents();
            const g = Math.min(s + m, u.length);
            for (; s < g; s++) {
              const o = u[s];
              if (l.entities.remove(o), o.polyline) {
                o.polyline.width = new C(2), o.polyline.material = new J(d), o.polyline.clampToGround = new C(!1);
                const i = o.polyline.positions;
                if (i) {
                  const b = typeof i.getValue == "function" ? i.getValue(x.now()) : i;
                  if (b && Array.isArray(b)) {
                    const A = b.map((M) => {
                      const k = P.fromCartesian(M);
                      return k.height += 2500, P.toCartesian(k);
                    });
                    o.polyline.positions = new C(A);
                  }
                }
              }
              const p = o.properties ? o.properties.getValue(x.now()) : {};
              let h = '<table class="cesium-infoBox-defaultTable"><tbody>';
              for (const i in p) p.hasOwnProperty(i) && (h += `<tr><th>${i}</th><td>${p[i]}</td></tr>`);
              h += "</tbody></table>", o.description = new C(h), a.entities.add(o);
            }
            a.entities.resumeEvents(), s < u.length && requestAnimationFrame(y);
          };
          const a = new Z("undersea-cables");
          e.dataSources.add(a), r.current = a;
          const f = "/api/undersea-cables", l = new G("temp-parse");
          if (await l.load(f), n) return;
          const u = [...l.entities.values], d = j.fromCssColorString("#0ea5e9").withAlpha(0.6);
          let s = 0;
          const m = 50;
          y();
        } catch (a) {
          console.error("[UnderseaCablesPlugin] Failed to load data", a);
        }
    }
    return c(), () => {
      n = !0, e && !e.isDestroyed() && e.dataSources && r.current && (e.dataSources.remove(r.current), r.current = null);
    };
  }, [e, t]), null;
}, Ie = class {
  constructor() {
    this.id = "undersea-cables", this.name = "Undersea Cables", this.description = "Displays the global network of submarine telecommunication cables.", this.icon = F, this.category = "infrastructure", this.version = "1.0.0";
  }
  async initialize(e) {
  }
  destroy() {
  }
  async fetch(e) {
    return [];
  }
  getPollingInterval() {
    return 0;
  }
  getLayerConfig() {
    return {
      color: "#0ea5e9",
      clusterEnabled: !1,
      clusterDistance: 0
    };
  }
  renderEntity(e) {
    return { type: "polyline" };
  }
  getGlobeComponent() {
    return K;
  }
};
export {
  Ie as UnderseaCablesPlugin
};

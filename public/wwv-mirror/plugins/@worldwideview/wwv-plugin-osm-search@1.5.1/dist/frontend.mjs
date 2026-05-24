var M = globalThis.__WWV_HOST__.React, { useState: v, useEffect: Z, useRef: Re, useMemo: X, useCallback: Ee, useContext: ee, useReducer: Oe, useLayoutEffect: $e, StrictMode: Le, Suspense: De, createContext: te, createElement: O, cloneElement: Ie, isValidElement: ze, Fragment: Ae, Children: Pe, Component: We, PureComponent: je, createRef: Ge, forwardRef: N, memo: Me, lazy: Ne, startTransition: Ve, useTransition: Fe, useDeferredValue: He, useId: Ue, useSyncExternalStore: Qe, useInsertionEffect: Je } = M, V = (...t) => t.filter((e, a, d) => !!e && e.trim() !== "" && d.indexOf(e) === a).join(" ").trim(), re = (t) => t.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), ae = (t) => t.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, a, d) => d ? d.toUpperCase() : a.toLowerCase()), P = (t) => {
  const e = ae(t);
  return e.charAt(0).toUpperCase() + e.slice(1);
}, E = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, oe = (t) => {
  for (const e in t) if (e.startsWith("aria-") || e === "role" || e === "title") return !0;
  return !1;
}, ne = te({}), ie = () => ee(ne), se = N(({ color: t, size: e, strokeWidth: a, absoluteStrokeWidth: d, className: y = "", children: b, iconNode: m, ...n }, l) => {
  const { size: u = 24, strokeWidth: f = 2, absoluteStrokeWidth: w = !1, color: i = "currentColor", className: S = "" } = ie() ?? {}, c = d ?? w ? Number(a ?? f) * 24 / Number(e ?? u) : a ?? f;
  return O("svg", {
    ref: l,
    ...E,
    width: e ?? u ?? E.width,
    height: e ?? u ?? E.height,
    stroke: t ?? i,
    strokeWidth: c,
    className: V("lucide", S, y),
    ...!b && !oe(n) && { "aria-hidden": "true" },
    ...n
  }, [...m.map(([R, C]) => O(R, C)), ...Array.isArray(b) ? b : [b]]);
}), $ = (t, e) => {
  const a = N(({ className: d, ...y }, b) => O(se, {
    ref: b,
    iconNode: e,
    className: V(`lucide-${re(P(t))}`, `lucide-${t}`, d),
    ...y
  }));
  return a.displayName = P(t), a;
}, le = [
  ["path", {
    d: "M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",
    key: "ct8e1f"
  }],
  ["path", {
    d: "M14.084 14.158a3 3 0 0 1-4.242-4.242",
    key: "151rxh"
  }],
  ["path", {
    d: "M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",
    key: "13bj9a"
  }],
  ["path", {
    d: "m2 2 20 20",
    key: "1ooewy"
  }]
], ce = $("eye-off", le), de = [["path", {
  d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
  key: "1nclc0"
}], ["circle", {
  cx: "12",
  cy: "12",
  r: "3",
  key: "1v7zrd"
}]], ue = $("eye", de), pe = [["path", {
  d: "m21 21-4.34-4.34",
  key: "14j7rj"
}], ["circle", {
  cx: "11",
  cy: "11",
  r: "8",
  key: "4ej97u"
}]], he = $("search", pe), be = globalThis.__WWV_HOST__.Cesium, { Viewer: qe, Entity: Ye, Cartesian3: ye, Cartesian2: Ke, Color: W, CallbackProperty: Ze, DistanceDisplayCondition: Xe, NearFarScalar: et, HeightReference: tt, Resource: rt, Rectangle: xe, PolygonHierarchy: ge, ClassificationType: me, ArcType: j, Math: B, JulianDate: at, TimeInterval: ot, TimeIntervalCollection: nt, SampledPositionProperty: it, GeoJsonDataSource: st, PinBuilder: lt, CustomDataSource: ct, ConstantProperty: dt, ColorMaterialProperty: ut, Cartographic: pt } = be, fe = globalThis.__WWV_HOST__.Resium, { Entity: ve, PointGraphics: ht, BillboardGraphics: bt, CustomDataSource: Se, Camera: yt, PolygonGraphics: we, PolylineGraphics: Ce, EllipseGraphics: xt, LabelGraphics: gt, ModelGraphics: mt, PathGraphics: ft, BoxGraphics: vt, GeoJsonDataSource: St, ScreenSpaceEventHandler: wt, ScreenSpaceEvent: Ct } = fe;
globalThis.__WWV_HOST__.zustand || console.warn("zustand was not found on WWV_HOST");
var ke = globalThis.__WWV_HOST__.zustand || {}, { create: Te, createStore: kt, useStore: Tt } = ke, F = Te((t) => ({
  bboxLocked: !1,
  showBbox: !0,
  currentBbox: null,
  lockedBbox: null,
  setBboxLocked: (e) => t({ bboxLocked: e }),
  setShowBbox: (e) => t({ showBbox: e }),
  setCurrentBbox: (e) => t({ currentBbox: e }),
  setLockedBbox: (e) => t({ lockedBbox: e })
})), L = globalThis.__WWV_HOST__.jsxRuntime, o = L.jsx, h = L.jsxs, _t = L.Fragment;
function _e({ viewer: t, enabled: e }) {
  const { bboxLocked: a, showBbox: d, lockedBbox: y, currentBbox: b, setCurrentBbox: m } = F();
  Z(() => {
    if (!t || !e) return;
    const u = () => {
      if (a) return;
      const i = t.camera.computeViewRectangle(t.scene.globe.ellipsoid);
      if (i) {
        const S = (i.north - i.south) * 0.15, c = (i.east - i.west) * 0.15;
        m(new xe(i.west + c, i.south + S, i.east - c, i.north - S));
      }
    };
    t.camera.changed.addEventListener(u), t.camera.moveEnd.addEventListener(u), u();
    const f = setInterval(u, 100), w = setTimeout(() => clearInterval(f), 2e3);
    return () => {
      clearInterval(f), clearTimeout(w), t && !t.isDestroyed() && (t.camera.changed.removeEventListener(u), t.camera.moveEnd.removeEventListener(u));
    };
  }, [
    t,
    e,
    a,
    m
  ]);
  const n = a ? y : b, l = X(() => n ? ye.fromRadiansArray([
    n.west,
    n.south,
    n.east,
    n.south,
    n.east,
    n.north,
    n.west,
    n.north,
    n.west,
    n.south
  ]) : [], [n]);
  return !e || !n || !d ? null : /* @__PURE__ */ o(Se, {
    name: "OSMSearchBBox",
    children: /* @__PURE__ */ h(ve, { children: [/* @__PURE__ */ o(we, {
      hierarchy: new ge(l),
      fill: !0,
      material: W.RED.withAlpha(0.25),
      classificationType: me.BOTH,
      arcType: j.GEODESIC,
      height: 0
    }), /* @__PURE__ */ o(Ce, {
      positions: l,
      width: 3,
      material: W.RED,
      clampToGround: !0,
      arcType: j.GEODESIC
    })] })
  });
}
var G = [
  "military=base",
  "military=bunker",
  "amenity=police",
  "amenity=prison",
  "aeroway=aerodrome",
  "aeroway=helipad",
  "aeroway=hangar",
  "man_made=pier",
  "harbour=yes",
  "power=plant",
  "power=substation",
  "telecom=antenna",
  "man_made=communications_tower",
  "man_made=water_tower",
  "highway=bus_stop",
  "railway=station",
  "amenity=fuel",
  "amenity=parking",
  "amenity=hospital",
  "amenity=fire_station",
  "amenity=clinic",
  "shop=supermarket",
  "tourism=hotel",
  "industrial=factory",
  "landuse=industrial",
  "amenity=school",
  "amenity=university",
  "amenity=cafe",
  "building=house"
];
function Be({ plugin: t }) {
  const { bboxLocked: e, showBbox: a, setShowBbox: d, setBboxLocked: y, currentBbox: b, setLockedBbox: m, lockedBbox: n } = F(), [l, u] = v("bellingcat"), [f, w] = v(`[out:json];
node[amenity=cafe]({{bbox}});
out center;`), [i, S] = v(""), [c, R] = v([]), [C, H] = v(500), [T, D] = v(!1), [U, I] = v([]), [Q, z] = v(!1);
  M.useEffect(() => {
    if (i.length < 3) {
      I([]);
      return;
    }
    const r = setTimeout(async () => {
      z(!0);
      try {
        const p = await (await fetch(`https://taginfo.openstreetmap.org/api/4/search/by_keyword?query=${encodeURIComponent(i)}`)).json();
        p && p.data && I(p.data.filter((s) => s.key && s.value).map((s) => `${s.key}=${s.value}`).slice(0, 15));
      } catch (p) {
        console.error("Taginfo fetch failed", p);
      } finally {
        z(!1);
      }
    }, 500);
    return () => clearTimeout(r);
  }, [i]);
  const J = () => {
    e ? (y(!1), m(null)) : (m(b), y(!0));
  }, q = async () => {
    e || (m(b), y(!0));
    const r = n || b;
    if (!r) {
      alert("Please wait for map viewport to initialize");
      return;
    }
    const p = `${B.toDegrees(r.south).toFixed(6)},${B.toDegrees(r.west).toFixed(6)},${B.toDegrees(r.north).toFixed(6)},${B.toDegrees(r.east).toFixed(6)}`;
    let s = "";
    if (l === "turbo") s = f.replace(/{{bbox}}/g, p);
    else if (c.length === 1) {
      const [x, g] = c[0].split("=");
      s = `[out:json][timeout:25];
nwr["${x}"="${g}"](${p});
out center;`;
    } else c.length > 1 && (s = `[out:json][timeout:25];
`, c.forEach((x, g) => {
      const [_, A] = x.split("=");
      g === 0 ? s += `nwr["${_}"="${A}"](${p})->.t0;
` : s += `nwr["${_}"="${A}"](around.t${g - 1}:${C})->.t${g};
`;
    }), s += `.t${c.length - 1} out center;`);
    D(!0);
    try {
      const x = await fetch("/api/plugins/osm-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: s })
      }), g = await x.json();
      if (!x.ok) throw new Error(g.error || "Search failed");
      if (t?.pushResults && t?.mapOverpassToEntities) {
        const _ = t.mapOverpassToEntities(g.data || []);
        t.pushResults(_);
      } else console.warn("Plugin bridge not available in OSMSidebar", g.data);
    } catch (x) {
      console.error(x), alert("Search failed: " + x.message);
    } finally {
      D(!1);
    }
  }, Y = i ? G.filter((r) => r.toLowerCase().includes(i.toLowerCase())) : G, K = Array.from(/* @__PURE__ */ new Set([...Y, ...U]));
  return /* @__PURE__ */ h("div", {
    style: {
      display: "flex",
      flexDirection: "column",
      gap: "10px"
    },
    children: [
      /* @__PURE__ */ h("div", {
        style: {
          background: "rgba(255,255,255,0.05)",
          padding: "10px",
          borderRadius: "6px",
          border: "1px solid rgba(255,255,255,0.1)"
        },
        children: [/* @__PURE__ */ h("div", {
          style: {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "8px"
          },
          children: [/* @__PURE__ */ o("span", {
            style: {
              fontSize: "12px",
              color: "var(--text-secondary)"
            },
            children: "Viewport Bounding Box"
          }), /* @__PURE__ */ h("div", {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "8px"
            },
            children: [/* @__PURE__ */ o("button", {
              onClick: () => d(!a),
              title: a ? "Hide Box" : "Show Box",
              style: {
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "2px"
              },
              children: a ? /* @__PURE__ */ o(ue, { size: 14 }) : /* @__PURE__ */ o(ce, { size: 14 })
            }), /* @__PURE__ */ o("span", {
              style: {
                fontSize: "10px",
                padding: "2px 6px",
                borderRadius: "10px",
                background: e ? "#ef444422" : "#22c55e22",
                color: e ? "#ef4444" : "#22c55e",
                border: `1px solid ${e ? "#ef444444" : "#22c55e44"}`
              },
              children: e ? "LOCKED" : "FOLLOWING"
            })]
          })]
        }), /* @__PURE__ */ o("button", {
          onClick: J,
          style: {
            width: "100%",
            padding: "6px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "4px",
            color: "var(--text-primary)",
            fontSize: "12px",
            cursor: "pointer"
          },
          children: e ? "Unlock Viewport" : "Lock Selection Box"
        })]
      }),
      /* @__PURE__ */ h("div", {
        style: {
          display: "flex",
          gap: "4px",
          background: "rgba(0,0,0,0.2)",
          padding: "2px",
          borderRadius: "6px"
        },
        children: [/* @__PURE__ */ o("button", {
          style: {
            flex: 1,
            padding: "6px",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            backgroundColor: l === "bellingcat" ? "var(--bg-tertiary)" : "transparent",
            color: l === "bellingcat" ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer"
          },
          onClick: () => u("bellingcat"),
          children: "Quick Presets"
        }), /* @__PURE__ */ o("button", {
          style: {
            flex: 1,
            padding: "6px",
            border: "none",
            borderRadius: "4px",
            fontSize: "12px",
            backgroundColor: l === "turbo" ? "var(--bg-tertiary)" : "transparent",
            color: l === "turbo" ? "var(--text-primary)" : "var(--text-muted)",
            cursor: "pointer"
          },
          onClick: () => u("turbo"),
          children: "Overpass QL"
        })]
      }),
      l === "bellingcat" && /* @__PURE__ */ h("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        },
        children: [
          c.length > 1 && /* @__PURE__ */ h("div", {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0,0,0,0.2)",
              padding: "8px",
              borderRadius: "4px"
            },
            children: [/* @__PURE__ */ h("label", {
              style: {
                fontSize: "11px",
                color: "var(--text-muted)"
              },
              children: ["Intersection Radius: ", /* @__PURE__ */ h("strong", { children: [C, "m"] })]
            }), /* @__PURE__ */ o("input", {
              type: "range",
              min: "50",
              max: "2000",
              step: "50",
              value: C,
              onChange: (r) => H(Number(r.target.value)),
              style: {
                width: "100px",
                accentColor: "var(--accent-blue)"
              }
            })]
          }),
          /* @__PURE__ */ h("div", {
            style: { position: "relative" },
            children: [/* @__PURE__ */ o("input", {
              style: {
                width: "100%",
                padding: "8px",
                paddingRight: "24px",
                backgroundColor: "rgba(0,0,0,0.3)",
                color: "#fff",
                border: "1px solid var(--border-subtle)",
                borderRadius: "4px",
                fontSize: "13px"
              },
              placeholder: "Filter or search OSM for tags...",
              value: i,
              onChange: (r) => S(r.target.value)
            }), Q && /* @__PURE__ */ o("span", {
              style: {
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "10px",
                color: "var(--text-muted)"
              },
              children: "⏳"
            })]
          }),
          /* @__PURE__ */ o("div", {
            style: {
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              maxHeight: "150px",
              overflowY: "auto",
              padding: "4px"
            },
            children: K.map((r) => {
              const p = c.includes(r);
              return /* @__PURE__ */ o("button", {
                style: {
                  background: p ? "var(--accent-blue)" : "rgba(255,255,255,0.05)",
                  color: p ? "#fff" : "var(--text-secondary)",
                  padding: "4px 10px",
                  borderRadius: "14px",
                  border: `1px solid ${p ? "transparent" : "rgba(255,255,255,0.1)"}`,
                  fontSize: "11px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                },
                onClick: () => R((s) => s.includes(r) ? s.filter((x) => x !== r) : [...s, r]),
                children: r.replace("=", ": ")
              }, r);
            })
          })
        ]
      }),
      l === "turbo" && /* @__PURE__ */ h("div", {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        },
        children: [
          /* @__PURE__ */ o("label", {
            style: {
              fontSize: "11px",
              color: "var(--text-muted)"
            },
            children: "Raw Overpass Query"
          }),
          /* @__PURE__ */ o("textarea", {
            style: {
              backgroundColor: "rgba(0,0,0,0.3)",
              color: "#fff",
              border: "1px solid var(--border-subtle)",
              padding: "8px",
              width: "100%",
              borderRadius: "4px",
              fontSize: "12px",
              fontFamily: "monospace",
              resize: "vertical"
            },
            value: f,
            onChange: (r) => w(r.target.value),
            rows: 6
          }),
          /* @__PURE__ */ h("span", {
            style: {
              fontSize: "10px",
              color: "var(--text-muted)"
            },
            children: [
              "Use ",
              "{{bbox}}",
              " as placeholder"
            ]
          })
        ]
      }),
      /* @__PURE__ */ o("button", {
        onClick: q,
        disabled: T || l === "bellingcat" && c.length === 0,
        style: {
          padding: "10px",
          background: T ? "var(--bg-tertiary)" : "var(--accent-blue)",
          color: "white",
          marginTop: "4px",
          border: "none",
          borderRadius: "4px",
          fontWeight: 600,
          cursor: T ? "not-allowed" : "pointer",
          opacity: l === "bellingcat" && c.length === 0 ? 0.5 : 1
        },
        children: T ? "SCANNING OVERPASS..." : `SCAN AREA (${l === "turbo" ? "TURBO" : c.length + " TAGS"})`
      })
    ]
  });
}
var k = {
  id: "osm-search",
  name: "OSM Search",
  version: "1.0.0",
  description: "Configurable Overpass API search. Includes Bellingcat-style proximity search and Overpass Turbo raw QL.",
  type: "data-layer",
  format: "bundle",
  trust: "built-in",
  capabilities: [
    "data:own",
    "ui:sidebar",
    "globe:overlay"
  ],
  category: "custom"
}, Bt = class {
  constructor() {
    this.id = k.id, this.name = k.name, this.description = k.description, this.icon = he, this.category = k.category, this.version = k.version;
  }
  async initialize(t) {
    this.ctx = t;
  }
  destroy() {
  }
  async fetch(t) {
    return [];
  }
  getPollingInterval() {
    return 999999999;
  }
  getLayerConfig() {
    return {
      color: "#ff0000",
      clusterEnabled: !0,
      clusterDistance: 50
    };
  }
  renderEntity(t) {
    return {
      type: "point",
      color: "#ff0000",
      size: 8,
      disableDepthTestDistance: Number.POSITIVE_INFINITY
    };
  }
  getSelectionBehavior(t) {
    return {
      flyToBaseDistance: 500,
      showTrail: !1
    };
  }
  getSidebarComponent() {
    return Be;
  }
  getGlobeComponent() {
    return _e;
  }
  pushResults(t) {
    this.ctx && this.ctx.onDataUpdate(t);
  }
  mapOverpassToEntities(t) {
    return t.filter((e) => e.lat && e.lon || e.center).map((e) => {
      const a = e.lat || e.center?.lat, d = e.lon || e.center?.lon, y = e.tags?.name || e.tags?.amenity || e.tags?.shop || e.tags?.highway || `OSM ${e.type} ${e.id}`;
      return {
        id: `osm-${e.type}-${e.id}`,
        pluginId: this.id,
        latitude: a,
        longitude: d,
        timestamp: /* @__PURE__ */ new Date(),
        label: y,
        properties: {
          osm_id: e.id,
          osm_type: e.type,
          ...e.tags
        }
      };
    });
  }
};
export {
  Bt as OSMSearchPlugin,
  k as manifest
};

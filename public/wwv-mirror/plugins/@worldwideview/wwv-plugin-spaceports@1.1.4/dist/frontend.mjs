var { useState: e, useEffect: t, useRef: n, useMemo: r, useCallback: i, useContext: a, useReducer: o, useLayoutEffect: s, StrictMode: c, Suspense: l, createContext: u, createElement: d, cloneElement: f, isValidElement: p, Fragment: m, Children: h, Component: g, PureComponent: _, createRef: v, forwardRef: y, memo: b, lazy: x, startTransition: S, useTransition: C, useDeferredValue: w, useId: T, useSyncExternalStore: E, useInsertionEffect: D } = globalThis.__WWV_HOST__.React, O = (...e) => e.filter((e, t, n) => !!e && e.trim() !== "" && n.indexOf(e) === t).join(" ").trim(), k = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), A = (e) => e.replace(/^([A-Z])|[\s-_]+(\w)/g, (e, t, n) => n ? n.toUpperCase() : t.toLowerCase()), j = (e) => {
	let t = A(e);
	return t.charAt(0).toUpperCase() + t.slice(1);
}, M = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round"
}, N = (e) => {
	for (let t in e) if (t.startsWith("aria-") || t === "role" || t === "title") return !0;
	return !1;
}, P = u({}), F = () => a(P), I = y(({ color: e, size: t, strokeWidth: n, absoluteStrokeWidth: r, className: i = "", children: a, iconNode: o, ...s }, c) => {
	let { size: l = 24, strokeWidth: u = 2, absoluteStrokeWidth: f = !1, color: p = "currentColor", className: m = "" } = F() ?? {}, h = r ?? f ? Number(n ?? u) * 24 / Number(t ?? l) : n ?? u;
	return d("svg", {
		ref: c,
		...M,
		width: t ?? l ?? M.width,
		height: t ?? l ?? M.height,
		stroke: e ?? p,
		strokeWidth: h,
		className: O("lucide", m, i),
		...!a && !N(s) && { "aria-hidden": "true" },
		...s
	}, [...o.map(([e, t]) => d(e, t)), ...Array.isArray(a) ? a : [a]]);
}), L = ((e, t) => {
	let n = y(({ className: n, ...r }, i) => d(I, {
		ref: i,
		iconNode: t,
		className: O(`lucide-${k(j(e))}`, `lucide-${e}`, n),
		...r
	}));
	return n.displayName = j(e), n;
})("rocket", [
	["path", {
		d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
		key: "qeys4"
	}],
	["path", {
		d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09",
		key: "u4xsad"
	}],
	["path", {
		d: "M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z",
		key: "676m9"
	}],
	["path", {
		d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05",
		key: "92ym6u"
	}]
]), { WorldPlugin: R, PluginManifest: z, createSvgIconUrl: B, DEFAULT_ICON_SIZE: V } = globalThis.__WWV_HOST__.WWVPluginSDK, H = "{\"type\":\"FeatureCollection\",\"features\":[{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-82.4157717,42.9999133]},\"properties\":{\"name\":\"Fenced in area with hockey net at one end for taking shots\",\"osm_id\":13186768563}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[111.6071123,38.8502656]},\"properties\":{\"name\":\"σñ¬σÄƒσì½µÿƒσÅæσ░äΣ╕¡σ┐â\",\"osm_id\":157586944}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[102.0287849,28.2458155]},\"properties\":{\"name\":\"ΦÑ┐µÿîσì½µÿƒσÅæσ░äΣ╕¡σ┐â\",\"osm_id\":219156708}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[21.1050713,67.8947802]},\"properties\":{\"name\":\"Esrange Space Center\",\"osm_id\":219685342}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.2863897,40.964555]},\"properties\":{\"name\":\"ΘàÆµ│ëσì½µÿƒσÅæσ░äΣ╕¡σ┐â\",\"osm_id\":225234211}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[110.9486818,19.6285721]},\"properties\":{\"name\":\"Σ╕¡σ¢╜µûçµÿîΦê¬σñ⌐σÅæσ░äσ£║\",\"osm_id\":316967069}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[127.5261912,34.4380426]},\"properties\":{\"name\":\"δéÿδí£∞Ü░∞ú╝∞ä╝φä░\",\"osm_id\":350089066}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[177.865842,-39.2607972]},\"properties\":{\"name\":\"Rocket Lab Launch Complex 1\",\"osm_id\":449478881}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[128.3277018,51.8438218]},\"properties\":{\"name\":\"╨Ü╨╛╤ü╨╝╨╛╨┤╤Ç╨╛╨╝ ╨Æ╨╛╤ü╤é╨╛╤ç╨╜╤ï╨╣\",\"osm_id\":553920105}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[16.0250777,69.294652]},\"properties\":{\"name\":\"And├╕ya Space\",\"osm_id\":569433118}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[131.0814109,31.2538658]},\"properties\":{\"name\":\"σåàΣ╣ïµ╡ªσ«çσ«Öτ⌐║ΘûôΦª│µ╕¼µëÇ\",\"osm_id\":569435240}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[130.9618229,30.3938136]},\"properties\":{\"name\":\"τ¿«σ¡Éσ│╢σ«çσ«Öπé╗πâ│πé┐πâ╝\",\"osm_id\":661867549}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[120.8894045,22.2620155]},\"properties\":{\"name\":\"σìùτö░σñ¬τ⌐║µ╕»τÖ╝σ░äσá┤\",\"osm_id\":758308904}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-152.3581088,57.4428247]},\"properties\":{\"name\":\"Pacific Spaceport Complex Alaska\",\"osm_id\":777859484}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.3146812,41.3073435]},\"properties\":{\"name\":\"ΘàÆµ│ëσì½µÿƒσÅæσ░äΣ╕¡σ┐âµùºσ¥Ç\",\"osm_id\":974439170}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[135.6424184,-34.9339296]},\"properties\":{\"name\":\"Whalers Way Orbital Launch Complex\",\"osm_id\":983490725}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[136.7964581,-12.3881495]},\"properties\":{\"name\":\"Arnhem Space Centre\",\"osm_id\":1068154267}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.2455906,40.9162118]},\"properties\":{\"name\":\"96A/Bσ╖ÑΣ╜ì\",\"osm_id\":1238321170}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[78.0157892,8.3611936]},\"properties\":{\"name\":\"SSLV Launch Complex\",\"osm_id\":1257155117}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[148.1137202,-19.9590692]},\"properties\":{\"name\":\"Bowen Orbital Spaceport\",\"osm_id\":1258088219}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[55.3038725,36.2199204]},\"properties\":{\"name\":\"┘╛╪º█î┌»╪º┘ç ┘ü╪╢╪º█î█î ╪┤╪º┘ç╪▒┘ê╪»\",\"osm_id\":1329473816}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[110.9306428,19.5968665]},\"properties\":{\"name\":\"µ╡╖σìùσòåµÑ¡Φê¬σñ⌐τÖ╝σ░äσá┤\",\"osm_id\":1360047736}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[142.2951638,-12.4739487]},\"properties\":{\"name\":\"Atakani Space Centre\",\"osm_id\":1410214033}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-117.6263077,34.8790853]},\"properties\":{\"name\":\"Unknown\",\"osm_id\":1424849970}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-117.6289,34.8807334]},\"properties\":{\"name\":\"Unknown\",\"osm_id\":1424849971}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-117.6264256,34.8759943]},\"properties\":{\"name\":\"Unknown\",\"osm_id\":1424849973}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-117.6186419,34.874773]},\"properties\":{\"name\":\"Unknown\",\"osm_id\":1424850108}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.2189868,40.8188634]},\"properties\":{\"name\":\"140σ╖ÑΣ╜ì\",\"osm_id\":1450617275}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.2236678,40.8186932]},\"properties\":{\"name\":\"130σ╖ÑΣ╜ì\",\"osm_id\":1450617276}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[100.1997415,40.8552385]},\"properties\":{\"name\":\"120σ╖ÑΣ╜ì\",\"osm_id\":1450617277}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[9.4524141,39.6520219]},\"properties\":{\"name\":\"SPTF AVIO\",\"osm_id\":1467861877}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-120.5452425,34.7087315]},\"properties\":{\"name\":\"Vandenberg Space Force Base\",\"osm_id\":317711}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[40.6603164,62.922049]},\"properties\":{\"name\":\"╨ƒ╨╗╨╡╤ü╨╡╤å╨║ ╨║╨╛╤ü╨╝╨╛╨┤╤Ç╨╛╨╝\",\"osm_id\":6721734}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[63.4547958,45.9559145]},\"properties\":{\"name\":\"╨æ╨░╨╣╥¢╨╛╥ú╤ï╤Ç ╥ô╨░╤Ç╤ï╤ê ╨░╨╣╨╗╨░╥ô╤ï\",\"osm_id\":6725906}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-80.5674948,28.4982423]},\"properties\":{\"name\":\"Cape Canaveral Space Force Station\",\"osm_id\":7384620}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-80.6501243,28.5757727]},\"properties\":{\"name\":\"John F. Kennedy Space Center\",\"osm_id\":8013130}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-52.7606896,5.2355317]},\"properties\":{\"name\":\"Centre Spatial Guyanais\",\"osm_id\":8090912}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-75.4765369,37.8384517]},\"properties\":{\"name\":\"Mid-Atlantic Regional Spaceport\",\"osm_id\":8099409}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[80.238331,13.6283559]},\"properties\":{\"name\":\"Sriharikota\",\"osm_id\":8706040}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-44.4062769,-2.3363037]},\"properties\":{\"name\":\"Centro de Lan├ºamento de Alc├óntara\",\"osm_id\":9194325}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-61.7112364,-38.9623086]},\"properties\":{\"name\":\"Centro Espacial Manuel Belgrano\",\"osm_id\":9854510}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-75.471264,37.9351142]},\"properties\":{\"name\":\"Wallops Flight Facility\",\"osm_id\":12346098}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-97.1560229,25.9969002]},\"properties\":{\"name\":\"Starbase Launch Site\",\"osm_id\":12733792}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-57.1802665,-35.5188829]},\"properties\":{\"name\":\"Centro Espacial Punta Indio\",\"osm_id\":15518676}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[-0.7721865,60.8173101]},\"properties\":{\"name\":\"SaxaVord Spaceport\",\"osm_id\":16174821}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[53.9247198,35.2391866]},\"properties\":{\"name\":\"┘╛╪º█î┌»╪º┘ç ┘ü╪╢╪º█î█î ╪│┘à┘å╪º┘å\",\"osm_id\":16842264}},{\"type\":\"Feature\",\"geometry\":{\"type\":\"Point\",\"coordinates\":[124.7102512,39.6611856]},\"properties\":{\"name\":\"δÅÖ∞░╜δª¼δ»╕∞ï╕∞¥╝δ░£∞é¼∞₧Ñ\",\"osm_id\":18022920}}]}\r\n";
//#endregion
//#region src/index.ts
function U(e) {
	if (!e) return {
		lat: 0,
		lon: 0
	};
	switch (e.type) {
		case "Point": return {
			lat: e.coordinates[1],
			lon: e.coordinates[0],
			alt: e.coordinates[2]
		};
		case "MultiPoint":
		case "LineString": return {
			lat: e.coordinates[0][1],
			lon: e.coordinates[0][0]
		};
		case "Polygon":
		case "MultiLineString": return {
			lat: e.coordinates[0][0][1],
			lon: e.coordinates[0][0][0]
		};
		case "MultiPolygon": return {
			lat: e.coordinates[0][0][0][1],
			lon: e.coordinates[0][0][0][0]
		};
		default: return {
			lat: 0,
			lon: 0
		};
	}
}
var W = class {
	constructor() {
		this.id = "spaceports", this.name = "Spaceports", this.description = "Space launch sites worldwide from OSM", this.icon = L, this.category = "Space", this.version = "1.0.0", this._context = null, this._entities = [];
	}
	async initialize(e) {
		this._context = e;
		let t = null;
		try {
			t = JSON.parse(H);
		} catch (e) {
			console.error("Failed to parse data for spaceports", e);
		}
		t && Array.isArray(t.features) && (this._entities = t.features.map((e, t) => {
			let n = U(e.geometry);
			return {
				id: "spaceports-" + (e.id ?? t),
				pluginId: "spaceports",
				latitude: n.lat,
				longitude: n.lon,
				altitude: n.alt,
				timestamp: /* @__PURE__ */ new Date(),
				label: e.properties?.name ?? void 0,
				properties: {
					...e.properties,
					_geometryType: e.geometry?.type
				}
			};
		}));
	}
	destroy() {
		this._context = null, this._entities = [];
	}
	async fetch(e) {
		return this._entities;
	}
	getPollingInterval() {
		return 0;
	}
	getLayerConfig() {
		return {
			color: "#ffffff",
			clusterEnabled: !0,
			clusterDistance: 50,
			maxEntities: 5e3
		};
	}
	renderEntity(e) {
		return this._iconUrl ||= B(L, { color: "#ffffff" }), {
			type: "billboard",
			iconUrl: this._iconUrl,
			color: "#ffffff"
		};
	}
};
//#endregion
export { W as default };

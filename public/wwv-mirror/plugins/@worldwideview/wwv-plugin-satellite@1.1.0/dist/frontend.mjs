"use client";
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/shared/src/utils/mergeClasses.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var mergeClasses = (...classes) => classes.filter((className, index, array) => {
	return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
}).join(" ").trim();
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/shared/src/utils/toKebabCase.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/shared/src/utils/toCamelCase.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toCamelCase = (string) => string.replace(/^([A-Z])|[\s-_]+(\w)/g, (match, p1, p2) => p2 ? p2.toUpperCase() : p1.toLowerCase());
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/shared/src/utils/toPascalCase.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var toPascalCase = (string) => {
	const camelCase = toCamelCase(string);
	return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
};
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/defaultAttributes.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var defaultAttributes = {
	xmlns: "http://www.w3.org/2000/svg",
	width: 24,
	height: 24,
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	strokeWidth: 2,
	strokeLinecap: "round",
	strokeLinejoin: "round"
};
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/shared/src/utils/hasA11yProp.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var hasA11yProp = (props) => {
	for (const prop in props) if (prop.startsWith("aria-") || prop === "role" || prop === "title") return true;
	return false;
};
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/context.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var LucideContext = globalThis.__WWV_HOST__.React.createContext({});
var useLucideContext = () => globalThis.__WWV_HOST__.React.useContext(LucideContext);
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/Icon.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Icon = globalThis.__WWV_HOST__.React.forwardRef(({ color, size, strokeWidth, absoluteStrokeWidth, className = "", children, iconNode, ...rest }, ref) => {
	const { size: contextSize = 24, strokeWidth: contextStrokeWidth = 2, absoluteStrokeWidth: contextAbsoluteStrokeWidth = false, color: contextColor = "currentColor", className: contextClass = "" } = useLucideContext() ?? {};
	const calculatedStrokeWidth = absoluteStrokeWidth ?? contextAbsoluteStrokeWidth ? Number(strokeWidth ?? contextStrokeWidth) * 24 / Number(size ?? contextSize) : strokeWidth ?? contextStrokeWidth;
	return globalThis.__WWV_HOST__.React.createElement("svg", {
		ref,
		...defaultAttributes,
		width: size ?? contextSize ?? defaultAttributes.width,
		height: size ?? contextSize ?? defaultAttributes.height,
		stroke: color ?? contextColor,
		strokeWidth: calculatedStrokeWidth,
		className: mergeClasses("lucide", contextClass, className),
		...!children && !hasA11yProp(rest) && { "aria-hidden": "true" },
		...rest
	}, [...iconNode.map(([tag, attrs]) => globalThis.__WWV_HOST__.React.createElement(tag, attrs)), ...Array.isArray(children) ? children : [children]]);
});
//#endregion
//#region node_modules/.pnpm/lucide-react@1.16.0_react@19.2.6/node_modules/lucide-react/dist/esm/createLucideIcon.mjs
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var createLucideIcon = (iconName, iconNode) => {
	const Component = globalThis.__WWV_HOST__.React.forwardRef(({ className, ...props }, ref) => globalThis.__WWV_HOST__.React.createElement(Icon, {
		ref,
		iconNode,
		className: mergeClasses(`lucide-${toKebabCase(toPascalCase(iconName))}`, `lucide-${iconName}`, className),
		...props
	}));
	Component.displayName = toPascalCase(iconName);
	return Component;
};
/**
* @license lucide-react v1.16.0 - ISC
*
* This source code is licensed under the ISC license.
* See the LICENSE file in the root directory of this source tree.
*/
var Satellite = createLucideIcon("satellite", [
	["path", {
		d: "m13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5",
		key: "dzhfyz"
	}],
	["path", {
		d: "M16.5 7.5 19 5",
		key: "1ltcjm"
	}],
	["path", {
		d: "m17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5",
		key: "nfoymv"
	}],
	["path", {
		d: "M9 21a6 6 0 0 0-6-6",
		key: "1iajcf"
	}],
	["path", {
		d: "M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z",
		key: "nv9zqy"
	}]
]);
//#endregion
//#region local-plugins/wwv-plugin-satellite/src/index.ts
/** Color map by CelesTrak group. */
var GROUP_COLORS = {
	stations: "#00fff7",
	visual: "#f0abfc",
	weather: "#a78bfa",
	"gps-ops": "#22c55e",
	resource: "#f97316",
	starlink: "#ffffff",
	military: "#3b82f6"
};
function groupColor(group) {
	return GROUP_COLORS[group] ?? "#94a3b8";
}
var SatellitePlugin = class {
	id = "satellite";
	name = "Satellites";
	description = "Real-time satellite tracking (ISS, GPS, weather, military)";
	icon = Satellite;
	category = "infrastructure";
	version = "1.1.0";
	context = null;
	iconUrls = {};
	async initialize(ctx) {
		this.context = ctx;
	}
	destroy() {
		this.context = null;
	}
	mapPayloadToEntities(payloadData) {
		let satelliteItems = [];
		if (Array.isArray(payloadData)) satelliteItems = payloadData;
		else if (payloadData && typeof payloadData === "object") {
			const obj = payloadData;
			if (Array.isArray(obj.satellites)) satelliteItems = obj.satellites;
			else if (Array.isArray(obj.items)) satelliteItems = obj.items;
			else satelliteItems = Object.values(obj);
		}
		if (!satelliteItems || !Array.isArray(satelliteItems)) return [];
		return satelliteItems.map((sat) => ({
			id: `satellite-${sat.noradId}`,
			pluginId: "satellite",
			latitude: sat.latitude,
			longitude: sat.longitude,
			altitude: sat.altitude * 1e3,
			heading: sat.heading,
			speed: sat.speed,
			timestamp: /* @__PURE__ */ new Date(),
			label: sat.name,
			properties: {
				noradId: sat.noradId,
				name: sat.name,
				group: sat.group,
				country: sat.country,
				objectType: sat.objectType,
				altitudeKm: sat.altitude,
				period: sat.period
			}
		}));
	}
	async fetch(_timeRange) {
		return [];
	}
	mapWebsocketPayload(payload) {
		return this.mapPayloadToEntities(payload);
	}
	getPollingInterval() {
		return 0;
	}
	getLayerConfig() {
		return {
			color: "#00fff7",
			clusterEnabled: false,
			clusterDistance: 0,
			maxEntities: 1e3
		};
	}
	renderEntity(entity) {
		const group = entity.properties.group || "";
		const isStation = group === "stations";
		const color = groupColor(group);
		if (!this.iconUrls[color]) this.iconUrls[color] = globalThis.__WWV_HOST__.WWVPluginSDK.createSvgIconUrl(Satellite, { color });
		return {
			type: "billboard",
			iconUrl: this.iconUrls[color],
			color,
			iconScale: isStation ? .9 : .7,
			labelText: isStation ? entity.label : void 0,
			labelFont: "12px sans-serif",
			disableManualHorizonCulling: true,
			disableDepthTestDistance: 0
		};
	}
	getSelectionBehavior(_entity) {
		return {
			showTrail: true,
			trailDurationSec: 300,
			trailStepSec: 10,
			trailColor: "#00fff7",
			flyToOffsetMultiplier: 4,
			flyToBaseDistance: 2e6
		};
	}
	getFilterDefinitions() {
		return [{
			id: "group",
			label: "Satellite Group",
			type: "select",
			propertyKey: "group",
			options: [
				{
					value: "stations",
					label: "Space Stations"
				},
				{
					value: "visual",
					label: "Brightest Satellites"
				},
				{
					value: "weather",
					label: "Weather"
				},
				{
					value: "gps-ops",
					label: "GPS"
				},
				{
					value: "resource",
					label: "Earth Observation"
				}
			]
		}];
	}
	getLegend() {
		return [
			{
				label: "Space Stations",
				color: groupColor("stations"),
				filterId: "group",
				filterValue: "stations"
			},
			{
				label: "Brightest Satellites",
				color: groupColor("visual"),
				filterId: "group",
				filterValue: "visual"
			},
			{
				label: "Weather",
				color: groupColor("weather"),
				filterId: "group",
				filterValue: "weather"
			},
			{
				label: "GPS",
				color: groupColor("gps-ops"),
				filterId: "group",
				filterValue: "gps-ops"
			},
			{
				label: "Earth Observation",
				color: groupColor("resource"),
				filterId: "group",
				filterValue: "resource"
			},
			{
				label: "Starlink",
				color: groupColor("starlink"),
				filterId: "group",
				filterValue: "starlink"
			},
			{
				label: "Military",
				color: groupColor("military"),
				filterId: "group",
				filterValue: "military"
			},
			{
				label: "Other",
				color: groupColor("other"),
				filterId: "group",
				filterValue: "other"
			}
		];
	}
	getServerConfig() {
		return {
			streamUrl: "wss://dataenginev2.worldwideview.dev/stream",
			apiBasePath: "/api/satellite",
			pollingIntervalMs: 0,
			historyEnabled: true
		};
	}
};
//#endregion
export { SatellitePlugin };

//# sourceMappingURL=frontend.mjs.map
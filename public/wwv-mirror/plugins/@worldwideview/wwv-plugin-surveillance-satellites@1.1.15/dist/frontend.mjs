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
var Radar = createLucideIcon("radar", [
	["path", {
		d: "M19.07 4.93A10 10 0 0 0 6.99 3.34",
		key: "z3du51"
	}],
	["path", {
		d: "M4 6h.01",
		key: "oypzma"
	}],
	["path", {
		d: "M2.29 9.62A10 10 0 1 0 21.31 8.35",
		key: "qzzz0"
	}],
	["path", {
		d: "M16.24 7.76A6 6 0 1 0 8.23 16.67",
		key: "1yjesh"
	}],
	["path", {
		d: "M12 18h.01",
		key: "mhygvu"
	}],
	["path", {
		d: "M17.99 11.66A6 6 0 0 1 15.77 16.67",
		key: "1u2y91"
	}],
	["circle", {
		cx: "12",
		cy: "12",
		r: "2",
		key: "1c9p78"
	}],
	["path", {
		d: "m13.41 10.59 5.66-5.66",
		key: "mhq4k0"
	}]
]);
//#endregion
//#region local-plugins/wwv-plugin-surveillance-satellites/src/index.tsx
var SurveillanceSatellitesPlugin = class {
	constructor() {
		this.id = "surveillance-satellites";
		this.name = "Surveillance Satellites";
		this.description = "Active military and reconnaissance satellite tracking";
		this.icon = Radar;
		this.category = "infrastructure";
		this.version = "1.0.0";
		this.context = null;
		this.iconUrls = {};
	}
	async initialize(ctx) {
		this.context = ctx;
	}
	destroy() {
		this.context = null;
	}
	mapPayload(payload) {
		const sats = payload?.satellites ?? payload?.items?.satellites ?? (Array.isArray(payload?.items) ? payload.items : null) ?? [];
		if (!Array.isArray(sats)) return [];
		return sats.map((sat) => ({
			id: `surv-sat-${sat.noradId}`,
			pluginId: "surveillance-satellites",
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
				group: sat.group === "military" ? "Military" : "Recon",
				country: sat.country || "Unknown",
				objectType: sat.objectType,
				altitudeKm: Math.round(sat.altitude),
				speedKph: Math.round(sat.speed * 3.6),
				period: sat.period
			}
		}));
	}
	async fetch(_timeRange) {
		return [];
	}
	mapWebsocketPayload(payload, _existingEntities) {
		return this.mapPayload(payload);
	}
	getPollingInterval() {
		return 0;
	}
	getLayerConfig() {
		return {
			color: "#ef4444",
			clusterEnabled: false,
			clusterDistance: 0,
			maxEntities: 1e3
		};
	}
	renderEntity(entity) {
		const color = entity.properties.group === "Military" ? "#3b82f6" : "#f97316";
		if (!this.iconUrls[color]) this.iconUrls[color] = globalThis.__WWV_HOST__.WWVPluginSDK.createSvgIconUrl(Radar, { color });
		return {
			type: "billboard",
			iconUrl: this.iconUrls[color],
			color,
			labelText: entity.label,
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
			trailColor: "#ef4444",
			flyToOffsetMultiplier: 4,
			flyToBaseDistance: 2e6
		};
	}
	getFilterDefinitions() {
		return [{
			id: "group",
			label: "Mission Type",
			type: "select",
			propertyKey: "group",
			options: [{
				value: "Military",
				label: "Military Operations"
			}, {
				value: "Recon",
				label: "Reconnaissance"
			}]
		}];
	}
	getLegend() {
		return [{
			label: "Military Satellites",
			color: "#3b82f6",
			filterId: "group",
			filterValue: "Military"
		}, {
			label: "Reconnaissance",
			color: "#f97316",
			filterId: "group",
			filterValue: "Recon"
		}];
	}
	getServerConfig() {
		return {
			apiBasePath: "/api/surveillance_satellites",
			pollingIntervalMs: 0,
			historyEnabled: true
		};
	}
};
//#endregion
export { SurveillanceSatellitesPlugin };

//# sourceMappingURL=frontend.mjs.map
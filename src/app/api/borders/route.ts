import { NextResponse } from "next/server";
export const revalidate = 86400;
const COUNTRIES = {
  type: "FeatureCollection",
  features: [
    { type: "Feature", properties: { name: "United States", id: "US" }, geometry: { type: "Polygon", coordinates: [[[-125,25],[-125,50],[-65,50],[-65,25],[-125,25]]] } },
    { type: "Feature", properties: { name: "Canada", id: "CA" }, geometry: { type: "Polygon", coordinates: [[[-140,45],[-140,75],[-50,75],[-50,45],[-140,45]]] } },
    { type: "Feature", properties: { name: "Brazil", id: "BR" }, geometry: { type: "Polygon", coordinates: [[[-75,-35],[-75,5],[-35,5],[-35,-35],[-75,-35]]] } },
    { type: "Feature", properties: { name: "Russia", id: "RU" }, geometry: { type: "Polygon", coordinates: [[[25,50],[25,75],[180,75],[180,50],[25,50]]] } },
    { type: "Feature", properties: { name: "China", id: "CN" }, geometry: { type: "Polygon", coordinates: [[[75,15],[75,55],[135,55],[135,15],[75,15]]] } },
    { type: "Feature", properties: { name: "Australia", id: "AU" }, geometry: { type: "Polygon", coordinates: [[[110,-45],[110,-10],[155,-10],[155,-45],[110,-45]]] } },
    { type: "Feature", properties: { name: "India", id: "IN" }, geometry: { type: "Polygon", coordinates: [[[68,5],[68,40],[97,40],[97,5],[68,5]]] } },
    { type: "Feature", properties: { name: "Greece", id: "GR" }, geometry: { type: "Polygon", coordinates: [[[20,35],[20,42],[30,42],[30,35],[20,35]]] } },
    { type: "Feature", properties: { name: "United Kingdom", id: "GB" }, geometry: { type: "Polygon", coordinates: [[[-10,50],[-10,60],[2,60],[2,50],[-10,50]]] } },
    { type: "Feature", properties: { name: "Germany", id: "DE" }, geometry: { type: "Polygon", coordinates: [[[5,47],[5,55],[15,55],[15,47],[5,47]]] } },
    { type: "Feature", properties: { name: "France", id: "FR" }, geometry: { type: "Polygon", coordinates: [[[-5,42],[-5,51],[8,51],[8,42],[-5,42]]] } },
    { type: "Feature", properties: { name: "Japan", id: "JP" }, geometry: { type: "Polygon", coordinates: [[[129,31],[129,46],[146,46],[146,31],[129,31]]] } },
  ],
  metadata: { count: 12, source: "simplified-borders", note: "Replace with Natural Earth or GADM for production" }
};
export async function GET() {
    try {
        const response = await fetch("https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.geojson", {
            headers: { "User-Agent": "Oculus0Osint/1.0" } });
        if (response.ok) {
            const data = await response.json();
            return NextResponse.json({ type: "FeatureCollection", features: data.features || [], metadata: { count: data.features?.length || 0, source: "naturalearth" } });
        }
        return NextResponse.json(COUNTRIES);
    } catch (error) { console.error("[BordersRoute] Error:", error); return NextResponse.json(COUNTRIES); }
}
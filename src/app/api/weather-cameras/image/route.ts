import { NextResponse, type NextRequest } from "next/server";

export const revalidate = 60;

export async function GET(req: NextRequest) {
    const cameraId = req.nextUrl.searchParams.get("cameraId");
    if (!cameraId) {
        return NextResponse.json({ error: "cameraId is required" }, { status: 400 });
    }

    const upstream = `https://weathercams.faa.gov/api/cameras/${encodeURIComponent(cameraId)}/images/current`;

    try {
        const response = await fetch(upstream, {
            headers: {
                Accept: "application/json",
                Referer: "https://weathercams.faa.gov/cameras",
                "User-Agent": "Oculus0Osint/1.0",
            },
            next: { revalidate },
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `FAA WeatherCams image endpoint returned ${response.status}` },
                { status: 502 },
            );
        }

        const data = await response.json();
        const imageUri = data?.payload?.imageUri;
        if (typeof imageUri !== "string" || !imageUri.startsWith("https://")) {
            return NextResponse.json({ error: "No current camera image available" }, { status: 404 });
        }

        return NextResponse.redirect(imageUri);
    } catch (error) {
        console.error("[WeatherCameraImageRoute] Error:", error);
        return NextResponse.json({ error: "Failed to fetch weather camera image" }, { status: 502 });
    }
}

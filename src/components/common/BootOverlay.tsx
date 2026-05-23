"use client";

import "./BootOverlay.css";

interface BootOverlayProps {
    visible: boolean;
}

export function BootOverlay({ visible }: BootOverlayProps) {
    return (
        <div className={`boot-overlay ${visible ? "" : "boot-overlay--hidden"}`}>
            {/* Orbital rings */}
            <div className="boot-overlay__rings">
                <div className="boot-overlay__ring boot-overlay__ring--1" />
                <div className="boot-overlay__ring boot-overlay__ring--2" />
                <div className="boot-overlay__ring boot-overlay__ring--3" />
                <div className="boot-overlay__core" />
            </div>

            {/* Brand + status */}
            <div className="boot-overlay__title">Oculus0Osint</div>
            <div className="boot-overlay__status">Initializing Systems...</div>
        </div>
    );
}

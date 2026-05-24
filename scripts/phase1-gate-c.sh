#!/usr/bin/env bash
set -e
export SHOOT_SETTLE_MS=12000
export SHOOT_POST_EVAL_MS=8000
export SHOOT_EVAL='(()=>{const items=Array.from(document.querySelectorAll(".layer-item"));const targets=["aviation","earthquake","wildfire","camera"];let clicked=[];for(const it of items){const name=(it.querySelector(".layer-item__name")?.textContent||"").toLowerCase();if(targets.some(t=>name.includes(t))){const toggle=it.querySelector(".layer-item__toggle");if(toggle&&!toggle.classList.contains("layer-item__toggle--on")){toggle.click();clicked.push(name);}}}return JSON.stringify({total:items.length,clicked});})()'
node scripts/phase1-shoot.mjs http://localhost:3010/ _phase1_verification/gate-c-globe-layers.png /tmp/auth/cookies.txt

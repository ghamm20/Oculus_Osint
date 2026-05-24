#!/usr/bin/env bash
set -e
export SHOOT_SETTLE_MS=14000
export SHOOT_POST_EVAL_MS=18000
export SHOOT_EVAL='(()=>{const tab=Array.from(document.querySelectorAll(".panel-tab")).find(b=>b.getAttribute("title")==="Oculus Analyst");if(tab)tab.click();const input=document.querySelector("input[placeholder=\"Ask Oculus Analyst...\"]");if(input){const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,"value").set;setter.call(input,"ping");input.dispatchEvent(new Event("input",{bubbles:true}));}setTimeout(()=>{const form=input?.closest("form");if(form)form.requestSubmit();},500);return"submitted";})()'
node scripts/phase1-shoot.mjs http://localhost:3010/ _phase1_verification/gate-d-analyst-online.png /tmp/auth/cookies.txt

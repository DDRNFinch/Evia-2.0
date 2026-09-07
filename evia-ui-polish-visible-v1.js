(()=>{'use strict';
const ID='eviaUiPolishVisibleV1';
if(document.getElementById(ID))return;
const style=document.createElement('style');
style.id=ID;
style.textContent=`
/* Visible refinement layer: same Evia layout, clearer hierarchy and surfaces. */
:root{--evia-yellow:#f2c94c!important}
/* Sam-inspired Evia avatar shell only. Evia movement, shrink-to-top and expression logic remain unchanged. */
.evia-float{isolation:isolate}
.evia-float::before{
  inset:-.58em!important;
  background:
    radial-gradient(circle at 40% 46%,rgba(255,220,84,.48) 0%,rgba(250,208,70,.25) 22%,rgba(242,201,76,.08) 46%,rgba(242,201,76,0) 68%),
    radial-gradient(circle at 66% 58%,rgba(255,230,120,.35) 0%,rgba(255,226,100,.12) 27%,rgba(255,226,100,0) 55%)!important;
  filter:blur(.10em)!important;
  transform:scale(1)!important;
  opacity:.78!important
}
.evia-float::after{
  content:"";position:absolute;inset:-.32em;border-radius:50%;pointer-events:none;z-index:0;
  background:radial-gradient(circle,rgba(255,223,95,.48) 0%,rgba(250,213,77,.24) 34%,rgba(242,201,76,.08) 58%,rgba(242,201,76,0) 76%);
  filter:blur(.07em);opacity:.8;animation:glowPulse 5.2s ease-in-out infinite
}
.evia-character::before{
  content:"";position:absolute;inset:-.82em;border-radius:50%;pointer-events:none;z-index:-1;opacity:.62;
  background:
    radial-gradient(circle at 28% 38%,rgba(255,220,84,.18) 0%,rgba(255,220,84,.07) 13%,transparent 29%),
    radial-gradient(circle at 73% 31%,rgba(255,237,154,.16) 0%,rgba(255,237,154,.055) 12%,transparent 27%),
    radial-gradient(circle at 68% 72%,rgba(242,201,76,.15) 0%,rgba(242,201,76,.05) 14%,transparent 30%),
    radial-gradient(circle at 39% 76%,rgba(255,228,116,.11) 0%,rgba(255,228,116,.035) 13%,transparent 28%);
  filter:blur(.065em);animation:glowPulse 8.8s ease-in-out infinite
}
.evia-character::after{
  content:"";position:absolute;inset:-.28em;border-radius:50%;pointer-events:none;z-index:0;opacity:.46;
  background:radial-gradient(circle,transparent 48%,rgba(242,201,76,.10) 56%,rgba(242,201,76,.035) 61%,transparent 68%);
  filter:blur(.012em);animation:glowPulse 7.4s ease-in-out infinite
}
.evia-body{
  border:1px solid rgba(163,123,0,.18)!important;
  background:radial-gradient(circle at 50% 43%,rgba(255,255,255,1) 0%,rgba(255,255,248,1) 36%,rgba(255,247,195,.99) 61%,rgba(255,222,92,.99) 80%,rgba(242,201,76,1) 100%)!important;
  box-shadow:0 0 .05em rgba(255,231,112,1),0 0 .11em rgba(250,215,80,.98),0 0 .21em rgba(242,201,76,.72),0 0 .35em rgba(220,177,34,.32)!important;
  filter:none!important;overflow:hidden
}
.evia-body::before{
  content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;z-index:0;
  background:radial-gradient(circle at 48% 35%,rgba(255,255,255,.94) 0%,rgba(255,255,255,.32) 27%,rgba(255,255,255,0) 54%);mix-blend-mode:screen
}
.evia-body::after{
  content:"";position:absolute;inset:7%;border-radius:50%;pointer-events:none;z-index:0;
  box-shadow:inset 0 -.04em .08em rgba(218,174,36,.14),inset 0 .03em .08em rgba(255,255,255,.52)
}
.eyes{position:relative;z-index:2;width:82%!important;height:46%!important;gap:12%!important}
.eye{
  position:relative;width:42%!important;height:auto!important;aspect-ratio:1;border-radius:50%!important;
  border:1.5px solid rgba(145,109,0,.24)!important;background:rgba(255,255,255,.10)!important;
  box-shadow:0 0 .018em rgba(255,221,83,.20),inset 0 0 .018em rgba(255,255,255,.30)!important;
  flex:0 0 auto!important
}
@media (prefers-reduced-motion:reduce){.evia-float::after,.evia-character::before,.evia-character::after{animation:none!important}}
.evia-menu-button{border-color:rgba(242,201,76,.34)!important}
.evia-menu-button svg path,.evia-tool-icon svg path,.evia-tool-icon svg circle,.evia-support-back svg path,.evia-support-back svg circle{stroke:#f2c94c!important}
.evia-menu-mini,.evia-menu-mini-eye{border-color:#f2c94c!important}.evia-menu-mini{box-shadow:0 0 8px rgba(242,201,76,.10)!important}
.support-toggle.on{background:#f2c94c!important}.support-range{accent-color:#f2c94c!important}.tint-choice.selected{outline-color:#f2c94c!important}
.evia-focus-strip{border-color:rgba(242,201,76,.62)!important}.evia-focus-handle{border-color:rgba(242,201,76,.68)!important}.evia-focus-handle i{background:#f2c94c!important}
#naxosArch{background:#f2c94c!important}
.overlay-panel{background:rgba(248,248,246,.965)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.chat-card,.portfolio-card,.scanner-card,.arch-detail-card{border:1px solid rgba(45,45,45,.09)!important;box-shadow:0 22px 55px rgba(35,35,35,.105)!important}
.arch-detail-card,.portfolio-card,.scanner-card{background:#fff!important}
.detail-card,.etr-target,.etr-summary,.etr-review,.evia-epa-card,.evia-epa-hero,.evia-support-section,.evia-update-card{border:1.5px solid rgba(242,201,76,.31)!important;background:linear-gradient(180deg,#fff 0%,#fffdf7 100%)!important;box-shadow:0 10px 26px rgba(35,35,35,.055)!important}
.pill{border:1.5px solid rgba(242,201,76,.39)!important;background:linear-gradient(180deg,#fffdf8,rgba(250,249,242,.98))!important;box-shadow:0 9px 22px rgba(35,35,35,.06)!important}
.pill-label{color:rgba(38,38,38,.76)!important;font-weight:600!important}
.evidence-choice,.evidence-requirements,.capture-surface{border:1.5px solid rgba(242,201,76,.36)!important;background:linear-gradient(180deg,#fff,#fffdf8)!important;box-shadow:0 10px 26px rgba(35,35,35,.06)!important}
#eviaToolsMenu.evia-tools-menu{border:1px solid rgba(242,201,76,.30)!important;box-shadow:0 18px 48px rgba(35,35,35,.12)!important}
#eviaToolsMenu .evia-tool-item{border:1px solid rgba(242,201,76,.12)!important;background:linear-gradient(180deg,#fffdf8,rgba(250,249,242,.88))!important}
.chat-bubble{box-shadow:0 6px 18px rgba(35,35,35,.055)!important}.chat-row.bot .chat-bubble{background:#f1f1f1!important}.chat-row.user .chat-bubble{background:rgba(242,201,76,.18)!important}
.chat-option{border:1.5px solid rgba(242,201,76,.39)!important;background:#fffdf8!important;box-shadow:0 6px 17px rgba(35,35,35,.045)!important}
.etr-badge{background:rgba(242,201,76,.15)!important}.etr-track{height:7px!important}.etr-track i{box-shadow:0 0 6px rgba(242,201,76,.14)}
.evia-epa-metric,.etr-metric{background:#fff!important;border-color:rgba(242,201,76,.20)!important}
.support-row+.support-row{border-top:1px solid rgba(45,45,45,.045)}
.support-toggle{box-shadow:inset 0 0 0 1px rgba(45,45,45,.055)!important}.support-toggle.on{box-shadow:0 0 0 3px rgba(242,201,76,.08)!important}
.evia-preview-column{border-radius:20px}.evia-preview-sample{border-color:rgba(242,201,76,.30)!important}
.arch-progress-track{stroke:rgba(242,201,76,.18)!important}.arch-progress-fill{stroke:#f2c94c!important;filter:drop-shadow(0 1px 2px rgba(194,151,26,.10))!important}
.status-arch-value{letter-spacing:-.01em}.status-arch-label{letter-spacing:.015em!important}
.overlay-panel.open>.chat-card,.overlay-panel.open>.portfolio-card,.overlay-panel.open>.scanner-card,.overlay-panel.open>.arch-detail-card,.evia-support-overlay.open .evia-support-shell,.evia-support-preview.open .evia-preview-shell,.evia-update-overlay.open .evia-update-shell{animation:eviaVisibleCardIn 300ms cubic-bezier(.22,1,.36,1) both!important}
@keyframes eviaVisibleCardIn{from{opacity:0;transform:translateY(14px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
html.evia-reduce-motion .overlay-panel.open>*,html.evia-reduce-motion .evia-support-overlay.open .evia-support-shell,html.evia-reduce-motion .evia-support-preview.open .evia-preview-shell,html.evia-reduce-motion .evia-update-overlay.open .evia-update-shell{animation:none!important}
html.evia-reduce-motion #screen.evia-update-ready .evia-body{animation:eviaUpdateHeartbeat 1.35s ease-in-out infinite!important}
`;
document.head.appendChild(style);
})();

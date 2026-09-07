(()=>{'use strict';
const STYLE_ID='eviaUiPolishV1';
if(document.getElementById(STYLE_ID))return;
const style=document.createElement('style');
style.id=STYLE_ID;
style.textContent=`
:root{
  --evia-polish-yellow:#f5c400;
  --evia-polish-text:#343434;
  --evia-polish-muted:#686868;
  --evia-polish-line:rgba(245,196,0,.24);
  --evia-polish-line-strong:rgba(245,196,0,.38);
  --evia-polish-surface:#fff;
  --evia-polish-soft:rgba(250,249,242,.96);
  --evia-polish-shadow:0 10px 28px rgba(35,35,35,.055);
  --evia-polish-shadow-raised:0 18px 46px rgba(35,35,35,.085);
  --evia-polish-ease:cubic-bezier(.22,1,.36,1);
}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%;text-rendering:optimizeLegibility}
body{color:var(--evia-polish-text);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
button,input,textarea,select{font:inherit}
button{touch-action:manipulation}
button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible,[role="button"]:focus-visible{outline:3px solid rgba(245,196,0,.24)!important;outline-offset:2px!important}
.evia-menu-button,.back-button,.naxos-arch,.status-arch{transition:transform 160ms ease,opacity 160ms ease,border-color 180ms ease,box-shadow 180ms ease,background 180ms ease!important}
.evia-menu-button:active,.back-button:active,.naxos-arch:active,.status-arch:active{transform:scale(.965)}
.evia-menu-button{box-shadow:0 8px 22px rgba(35,35,35,.055)!important;border-color:rgba(245,196,0,.30)!important}
.course-title{font-weight:650!important;letter-spacing:.005em!important;color:rgba(45,45,45,.66)!important}
.evia-speech{font-weight:450;letter-spacing:.003em}
.status-arch-value{font-size:12.5px!important;font-weight:800!important;color:rgba(45,45,45,.78)!important}
.status-arch-label{font-size:9.5px!important;font-weight:650!important;color:rgba(45,45,45,.56)!important}
.arch-progress-track{stroke:rgba(245,196,0,.115)!important}.arch-progress-fill{stroke-width:3.2!important}
#eviaToolsMenu.evia-tools-menu{border-color:rgba(245,196,0,.23)!important;background:rgba(255,255,255,.975)!important;box-shadow:0 16px 42px rgba(35,35,35,.10)!important;backdrop-filter:blur(14px)!important;-webkit-backdrop-filter:blur(14px)!important;transform-origin:top right}
#eviaToolsMenu.evia-tools-menu.open{animation:eviaPolishMenuIn 220ms var(--evia-polish-ease) both}
#eviaToolsMenu .evia-tool-item{background:rgba(250,249,242,.70)!important;transition:transform 140ms ease,background 160ms ease,border-color 160ms ease!important}
#eviaToolsMenu .evia-tool-item:active{transform:scale(.94);background:rgba(245,196,0,.10)!important}
.overlay-panel.open,.evia-support-overlay.open,.evia-support-preview.open,.evia-update-overlay.open{animation:eviaPolishFadeIn 180ms ease both}
.overlay-panel.open>.chat-card,.overlay-panel.open>.portfolio-card,.overlay-panel.open>.scanner-card,.overlay-panel.open>.arch-detail-card,.evia-support-overlay.open .evia-support-shell,.evia-support-preview.open .evia-preview-shell,.evia-update-overlay.open .evia-update-shell{animation:eviaPolishCardIn 260ms var(--evia-polish-ease) both}
.overlay-panel,.evia-support-overlay,.evia-support-preview,.evia-update-overlay{overscroll-behavior:contain}
.chat-scroll,.portfolio-main,.arch-detail-content,.evia-support-overlay,.evia-support-preview,.evia-update-overlay{-webkit-overflow-scrolling:touch;scrollbar-width:thin;scrollbar-color:rgba(245,196,0,.36) transparent}
.chat-scroll::-webkit-scrollbar,.portfolio-main::-webkit-scrollbar,.arch-detail-content::-webkit-scrollbar,.evia-support-overlay::-webkit-scrollbar,.evia-support-preview::-webkit-scrollbar,.evia-update-overlay::-webkit-scrollbar{width:5px}
.chat-scroll::-webkit-scrollbar-thumb,.portfolio-main::-webkit-scrollbar-thumb,.arch-detail-content::-webkit-scrollbar-thumb,.evia-support-overlay::-webkit-scrollbar-thumb,.evia-support-preview::-webkit-scrollbar-thumb,.evia-update-overlay::-webkit-scrollbar-thumb{background:rgba(245,196,0,.34);border-radius:99px}
.chat-card,.portfolio-card,.scanner-card,.arch-detail-card{border:1px solid rgba(45,45,45,.075)!important;background:rgba(255,255,255,.99)!important;border-radius:28px!important;box-shadow:var(--evia-polish-shadow-raised)!important}
.arch-detail-card{padding:17px!important}
.arch-detail-title,.portfolio-title{letter-spacing:-.012em!important;color:rgba(45,45,45,.86)!important}
.detail-card,.etr-target,.etr-summary,.etr-review,.evia-epa-card,.evia-epa-hero,.evia-support-section,.evia-update-card{border-color:var(--evia-polish-line)!important;background:linear-gradient(180deg,#fff,rgba(250,249,242,.93))!important;box-shadow:var(--evia-polish-shadow)!important}
.detail-card,.etr-target,.etr-summary,.etr-review,.evia-epa-card,.evia-support-section,.evia-update-card{border-radius:22px!important}
.pill,.evidence-choice,.criterion-tile,.unit-button,.mapping-button,.catchup-button,.secondary-button,.capture-button,.reflection-pill,.detail-action-button{transition:transform 150ms ease,border-color 180ms ease,box-shadow 180ms ease,background 180ms ease,opacity 160ms ease!important}
.pill{border-color:rgba(245,196,0,.31)!important;background:rgba(250,249,242,.965)!important;box-shadow:0 8px 20px rgba(35,35,35,.045)!important}
.pill:active,.evidence-choice:active,.criterion-tile:active,.unit-button:active,.mapping-button:active,.catchup-button:active,.secondary-button:active,.capture-button:active,.reflection-pill:active,.detail-action-button:active{transform:scale(.985)!important}
.pill-label{color:rgba(45,45,45,.70)!important;font-weight:560}
.evidence-choice,.evidence-requirements,.capture-surface{border-color:rgba(245,196,0,.29)!important;box-shadow:0 8px 22px rgba(35,35,35,.045)!important}
.evidence-choice{padding:15px 18px!important}.evidence-choice-heading{font-weight:700!important;color:rgba(45,45,45,.61)!important}.evidence-choice-type{color:rgba(45,45,45,.84)!important}.evidence-choice-instruction,.evidence-gallery-meta{line-height:1.48!important}
.chat-card{overflow:hidden}.chat-header{font-weight:750!important;letter-spacing:-.01em;color:rgba(45,45,45,.82)!important}
.chat-bubble{border:1px solid rgba(45,45,45,.055);box-shadow:0 4px 14px rgba(35,35,35,.035);line-height:1.48!important;padding:11px 14px!important}
.chat-row.user .chat-bubble{border-color:rgba(245,196,0,.18);background:rgba(245,196,0,.15)!important}
.chat-options{gap:9px!important;padding:11px 12px max(14px,env(safe-area-inset-bottom))!important;background:linear-gradient(180deg,rgba(255,255,255,.96),#fff)!important}
.chat-option{border-color:rgba(245,196,0,.34)!important;background:rgba(250,249,242,.96)!important;box-shadow:0 5px 14px rgba(35,35,35,.035);transition:transform 140ms ease,background 160ms ease,border-color 160ms ease!important}
.chat-option:active{transform:scale(.975);background:rgba(245,196,0,.10)!important}
.etr-tabs{gap:9px!important}.etr-tab{transition:transform 140ms ease,background 160ms ease,border-color 160ms ease!important}.etr-tab:active{transform:scale(.98)}
.etr-target{padding:15px!important;margin-bottom:11px!important}.etr-target:active{transform:scale(.99)}
.etr-head{align-items:flex-start!important}.etr-head strong{font-size:13.5px!important;line-height:1.32!important;color:rgba(45,45,45,.82)}
.etr-badge{flex:0 0 auto;padding:4px 7px;border-radius:999px;background:rgba(245,196,0,.11);letter-spacing:.025em}
.etr-target p,.etr-review p{font-size:11px!important;line-height:1.48!important}.etr-track{height:7px!important;margin-top:10px!important;background:rgba(45,45,45,.07)!important}.etr-track i{border-radius:99px}.etr-foot{margin-top:7px!important;line-height:1.3}.etr-grid{gap:8px!important}.etr-metric{min-height:67px;background:rgba(255,255,255,.75);border-color:rgba(245,196,0,.15)!important}
.etr-review{overflow:hidden}.etr-review button{padding:1px 0!important}.etr-detail{margin-top:10px!important}.etr-row{padding:7px 0!important;border-bottom:1px solid rgba(45,45,45,.045)}.etr-row:last-child{border-bottom:0}
.evia-epa-hero{padding:17px!important;border-radius:25px!important}.evia-epa-ring-large{box-shadow:0 0 0 5px rgba(245,196,0,.055),0 0 18px rgba(245,196,0,.10)!important}.evia-epa-card{padding:16px!important;margin-bottom:11px!important}.evia-epa-metric{border-color:rgba(245,196,0,.15)!important;background:rgba(255,255,255,.78)!important}.evia-epa-check{padding:11px 0!important}.evia-epa-method{padding:11px 0!important}
.evia-support-header{position:sticky;top:0;z-index:2;padding:4px 0 10px;background:linear-gradient(180deg,rgba(255,255,255,.99) 78%,rgba(255,255,255,0));backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)}
.evia-support-back{box-shadow:0 5px 15px rgba(35,35,35,.04)!important;transition:transform 140ms ease,border-color 160ms ease!important}.evia-support-back:active{transform:scale(.96)}
.evia-support-title{letter-spacing:-.012em!important}.evia-support-section{padding:17px!important}.support-row{padding:5px 0!important}.support-label strong{font-size:13.25px!important}.support-label span{line-height:1.42!important}
.support-toggle{box-shadow:inset 0 0 0 1px rgba(45,45,45,.035);transition:background 180ms ease,transform 140ms ease!important}.support-toggle:active{transform:scale(.96)}.tint-choice{transition:transform 140ms ease,outline-color 160ms ease!important}.tint-choice:active{transform:scale(.92)}
.read-aloud-button{box-shadow:0 5px 14px rgba(35,35,35,.035);transition:transform 140ms ease,background 160ms ease!important}.read-aloud-button:active{transform:scale(.985)}
.evia-preview-sample{box-shadow:0 8px 22px rgba(35,35,35,.045)!important}.evia-preview-actions button,.evia-update-actions button{transition:transform 140ms ease,background 160ms ease,border-color 160ms ease!important}.evia-preview-actions button:active,.evia-update-actions button:active{transform:scale(.98)}
#portfolioPanel .portfolio-card,#scannerPanel .scanner-card{padding:17px!important}#portfolioPanel button,#scannerPanel button,#portfolioPanel input,#portfolioPanel textarea{transition:transform 140ms ease,border-color 160ms ease,box-shadow 160ms ease,background 160ms ease}#portfolioPanel button:active,#scannerPanel button:active{transform:scale(.985)}
textarea,input[type="text"],input[type="tel"],input[type="date"],input[type="number"]{border-color:rgba(45,45,45,.13)!important;border-radius:14px!important}
textarea:focus,input[type="text"]:focus,input[type="tel"]:focus,input[type="date"]:focus,input[type="number"]:focus{border-color:rgba(245,196,0,.52)!important;box-shadow:0 0 0 3px rgba(245,196,0,.09)!important}
.evia-update-pill{box-shadow:0 8px 22px rgba(35,35,35,.055)!important;transition:transform 150ms ease,box-shadow 180ms ease!important}.evia-update-pill:active{transform:translateX(-50%) scale(.97)!important}.evia-update-card{padding:18px!important}.evia-update-item{line-height:1.48!important}
@media(max-width:390px){.overlay-panel{padding-left:14px!important;padding-right:14px!important}.arch-detail-card,.portfolio-card,.scanner-card{border-radius:24px!important}.evia-support-overlay,.evia-support-preview,.evia-update-overlay{padding-left:13px!important;padding-right:13px!important}.etr-target,.etr-summary,.etr-review,.evia-epa-card,.evia-support-section{padding:14px!important}.chat-options{gap:7px!important;padding-left:9px!important;padding-right:9px!important}}
html.evia-reduce-motion .overlay-panel.open,html.evia-reduce-motion .evia-support-overlay.open,html.evia-reduce-motion .evia-support-preview.open,html.evia-reduce-motion .evia-update-overlay.open,html.evia-reduce-motion .overlay-panel.open>*{animation:none!important}
html.evia-reduce-motion #screen.evia-update-ready .evia-body{animation:eviaUpdateHeartbeat 1.35s ease-in-out infinite!important}
@keyframes eviaPolishFadeIn{from{opacity:0}to{opacity:1}}@keyframes eviaPolishCardIn{from{opacity:0;transform:translateY(8px) scale(.992)}to{opacity:1;transform:none}}@keyframes eviaPolishMenuIn{from{opacity:0;transform:translateY(-4px) scale(.96)}to{opacity:1;transform:none}}
`;
document.head.appendChild(style);
document.documentElement.classList.add('evia-ui-polished');
})();

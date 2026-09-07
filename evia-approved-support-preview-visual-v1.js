(()=>{'use strict';
const SUPPORT_KEY='eviaLearningSupportV1';
const STYLE_ID='eviaStablePreviewVisualFixStyles';
function load(){try{const value=JSON.parse(localStorage.getItem(SUPPORT_KEY)||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
function mark(kind,enable){const preview=document.getElementById('eviaStablePreview');if(!preview)return;preview.dataset.previewKind=kind;preview.dataset.previewEnable=enable?'1':'0'}
function toggleKind(key){return{dyslexiaFriendly:'dyslexia',simplifiedReading:'simplified',lineSpacing:'line',letterSpacing:'letters',highContrast:'contrast'}[key]||''}
function onClick(event){
  const toggle=event.target?.closest?.('[data-stable-toggle]');
  if(toggle){const key=toggle.dataset.stableToggle||'';const kind=toggleKind(key);if(kind){const current=load();mark(kind,!Boolean(current[key]))}return}
  if(event.target?.closest?.('[data-stable-tint]'))mark('tint',true);
}
function onChange(event){if(event.target?.id==='eviaStableTextScale')mark('textScale',true)}
function injectStyles(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample,
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample{font-family:Verdana,Tahoma,Arial,sans-serif!important;letter-spacing:.025em!important;word-spacing:.085em!important;line-height:1.68!important}
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample p,
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample-pill,
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample p,
    #eviaStablePreview[data-preview-kind="dyslexia"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample-pill{line-height:1.68!important}

    #eviaStablePreview[data-preview-kind="simplified"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample,
    #eviaStablePreview[data-preview-kind="simplified"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample{box-shadow:none!important;background:#fff!important}
    #eviaStablePreview[data-preview-kind="simplified"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample p,
    #eviaStablePreview[data-preview-kind="simplified"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample p{font-size:1.06em!important;line-height:1.78!important}

    #eviaStablePreview[data-preview-kind="line"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample,
    #eviaStablePreview[data-preview-kind="line"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample{line-height:1.75!important}
    #eviaStablePreview[data-preview-kind="line"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample p,
    #eviaStablePreview[data-preview-kind="line"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample p{line-height:1.78!important}

    #eviaStablePreview[data-preview-kind="letters"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample,
    #eviaStablePreview[data-preview-kind="letters"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample{letter-spacing:.06em!important;word-spacing:.18em!important}

    #eviaStablePreview[data-preview-kind="contrast"][data-preview-enable="1"] .evia-stable-preview-column:nth-child(2) .evia-stable-sample,
    #eviaStablePreview[data-preview-kind="contrast"][data-preview-enable="0"] .evia-stable-preview-column:nth-child(1) .evia-stable-sample{filter:contrast(1.28)!important}
  `;document.head.appendChild(style);
}
injectStyles();
document.addEventListener('click',onClick,true);
document.addEventListener('change',onChange,true);
})();

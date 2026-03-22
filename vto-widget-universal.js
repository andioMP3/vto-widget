/*
 * Virtual Try-On Widget – Universal Snippet
 * ==========================================
 * Kompatibel mit: Shopware 6, Shopware 5, Shopify, WooCommerce, Magento, Custom HTML
 *
 * ── INTEGRATION ──────────────────────────────────────────────────────────────
 *
 * Diesen <script>-Tag direkt in das Produkt-Template einfügen (vor </body>):
 *
 * Shopware 6 (Twig):
 * <script src="https://DEIN-CDN.com/vto-widget.js"
 *         data-shop-id="SHOP123"
 *         data-endpoint="https://DEIN-ENDPOINT.europe-west4.run.app/vto"
 *         data-product-image="{{ product.cover.media.url }}"
 *         data-product-name="{{ product.name }}">
 * </script>
 *
 * Shopify (Liquid):
 * <script src="https://DEIN-CDN.com/vto-widget.js"
 *         data-shop-id="SHOP123"
 *         data-endpoint="https://DEIN-ENDPOINT.europe-west4.run.app/vto"
 *         data-product-image="{{ product.featured_image | img_url: 'master' }}"
 *         data-product-name="{{ product.title }}">
 * </script>
 *
 * WooCommerce (PHP):
 * <script src="https://DEIN-CDN.com/vto-widget.js"
 *         data-shop-id="SHOP123"
 *         data-endpoint="https://DEIN-ENDPOINT.europe-west4.run.app/vto"
 *         data-product-image="<?= get_the_post_thumbnail_url(null, 'full') ?>"
 *         data-product-name="<?= get_the_title() ?>">
 * </script>
 *
 * Shopware 5 (Smarty):
 * <script src="https://DEIN-CDN.com/vto-widget.js"
 *         data-shop-id="SHOP123"
 *         data-endpoint="https://DEIN-ENDPOINT.europe-west4.run.app/vto"
 *         data-product-image="{$sArticle.image.src.3}"
 *         data-product-name="{$sArticle.articleName}">
 * </script>
 *
 * Magento 2 (PHTML):
 * <script src="https://DEIN-CDN.com/vto-widget.js"
 *         data-shop-id="SHOP123"
 *         data-endpoint="https://DEIN-ENDPOINT.europe-west4.run.app/vto"
 *         data-product-image="<?= $block->getImage($_product, 'product_page_image_large')->getImageUrl() ?>"
 *         data-product-name="<?= $block->escapeHtml($_product->getName()) ?>">
 * </script>
 *
 * ── PFLICHTFELDER ────────────────────────────────────────────────────────────
 * data-shop-id        Deine Shop-ID (wird vom Anbieter vergeben)
 * data-endpoint       Deine Cloud Run URL
 * data-product-image  Vollständige URL des Produkthauptbildes
 * data-product-name   Name des Produkts
 *
 * ── OPTIONALE FELDER ─────────────────────────────────────────────────────────
 * data-accent         Akzentfarbe HEX (Standard: #4a7c59)
 * data-lang           Sprache: "de" (Standard), "en", "at"
 * ─────────────────────────────────────────────────────────────────────────────
 */
(function(){
'use strict';

// ── SNIPPET-KONFIGURATION: Werte aus data-Attributen lesen ───────────────────
var _script = document.currentScript ||
  (function(){ var s=document.querySelectorAll('script[data-shop-id]'); return s[s.length-1]; })();

var CFG={
  cloudRunEndpoint: (_script && _script.getAttribute('data-endpoint')) || '',
  shopId:           (_script && _script.getAttribute('data-shop-id'))  || '',
  // Produktbild + Name direkt vom Shop-Template übergeben (zuverlässig, CORS-sicher)
  productImageUrl:  (_script && _script.getAttribute('data-product-image')) || null,
  productName:      (_script && _script.getAttribute('data-product-name'))  || null,
  // Mehrere Bilder kommagetrennt: "url1.jpg, url2.jpg, url3.jpg"
  productImages:    (function(){
    var raw = _script && _script.getAttribute('data-product-images');
    if(!raw) return [];
    return raw.split(',').map(function(u){return u.trim();}).filter(Boolean);
  })(),
  accent:           (_script && _script.getAttribute('data-accent')) || '#4a7c59',
  lang:             (_script && _script.getAttribute('data-lang'))   || 'de',
  // Keys für localStorage (shop-spezifisch damit mehrere Shops sich nicht überschreiben)
  get savedKey(){ return 'vtro_saved_' + this.shopId; },
  get outfitKey(){ return 'vtro_outfit_' + this.shopId; },
  agbText:'Ich stimme zu, dass mein Foto zur Erstellung der virtuellen Anprobe verarbeitet wird. Das Foto wird ausschließlich für diesen Zweck verwendet, nach der Generierung sofort vom Server gelöscht und nicht an Dritte weitergegeben.',
  onGenerate: null,
  onSave:     null,
  onDownload: null,
};

// ── MEHRSPRACHIGKEIT ──────────────────────────────────────────────────────────
var LABELS = {
  de: {
    btnTrigger:'Virtuell Anprobieren',btnGenerate:'✨ Anprobieren',btnGenerating:'Bild wird erstellt…',
    title:'Virtuelles Anprobieren',yourPhoto:'Dein Foto',result:'Ergebnis',upload:'Hochladen',camera:'Kamera',
    snapBtn:'Foto aufnehmen',uploadHint:'Foto auswählen oder ablegen',uploadSub:'Bitte ein Ganzkörper-Foto verwenden',
    placeholderHint:'Lade dein Foto hoch, stimme den Bedingungen zu und klicke Anprobieren.',
    agbError:'Bitte akzeptiere die Nutzungsbedingungen.',catTop:'👕 Oberteil',catBottom:'👖 Unterteil',
    catUnknown:'👗 Kleidungsstück',outfitTitle:'Mein Outfit',savedTitle:'Gespeicherte Anproben',
    saveTop:'👕 Top',saveBottom:'👖 Bottom',download:'⬇ Download',clear:'Leeren',deleteAll:'Alle löschen',
    emptyOutfit:'Noch kein Outfit zusammengestellt.',emptySaved:'Noch keine gespeicherten Bilder.',
    savedBadge:'✓ Gespeichert',toastSaved:'Automatisch gespeichert',toastOutfit:'Im Outfit gespeichert!',
    camDenied:'Kamerazugriff verweigert.',imgWarning:'Tipp: Ganzkörper-Foto mit guter Beleuchtung liefert beste Ergebnisse.',
    retryBtn:'Nochmal versuchen',
    selectImage:'Bild wählen',
    history:'Verlauf',
  },
  en: {
    btnTrigger:'Virtual Try-On',btnGenerate:'✨ Try On',btnGenerating:'Generating…',
    title:'Virtual Try-On',yourPhoto:'Your Photo',result:'Result',upload:'Upload',camera:'Camera',
    snapBtn:'Take Photo',uploadHint:'Select or drop photo',uploadSub:'Please use a full-body photo',
    placeholderHint:'Upload your photo, agree to terms and click Try On.',
    agbError:'Please accept the terms of use.',catTop:'👕 Top',catBottom:'👖 Bottom',
    catUnknown:'👗 Garment',outfitTitle:'My Outfit',savedTitle:'Saved Try-Ons',
    saveTop:'👕 Top',saveBottom:'👖 Bottom',download:'⬇ Download',clear:'Clear',deleteAll:'Delete all',
    emptyOutfit:'No outfit created yet.',emptySaved:'No saved images yet.',
    savedBadge:'✓ Saved',toastSaved:'Auto-saved',toastOutfit:'Saved to outfit!',
    camDenied:'Camera access denied.',imgWarning:'Tip: Full-body photo with good lighting gives best results.',
    retryBtn:'Try again',
    selectImage:'Select image',
    history:'History',
  }
};
// Österreichisches Deutsch = Deutsch
LABELS.at = LABELS.de;

CFG.labels = LABELS[CFG.lang] || LABELS.de;

// ── GUARD: Nur auf Produktseiten initialisieren ──────────────────────────────
// Wenn kein Produktbild übergeben wurde UND kein Produkt im DOM erkennbar → abbrechen
if(!CFG.productImageUrl && !document.querySelector('.product-detail,.product,.single-product,[data-product-id]')){
  return;
}

// ── CSS ──────────────────────────────────────────────────────────────────────
var A = CFG.accent;
var D ='#1a2e1e';
var HEAD_BG  ='#1a2e1e';
var HEAD_TEXT='#f5f0e8';
var CSS=[
  "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Lato:wght@300;400;700&display=swap');",
  "@keyframes vtro-pop{0%{transform:scale(0);opacity:0}100%{transform:scale(1);opacity:1}}",
  "@keyframes vtro-spin{to{transform:rotate(360deg)}}",
  "@keyframes vtro-pulse{0%,100%{opacity:1}50%{opacity:.4}}",
  "@keyframes vtro-progress{0%{width:5%}100%{width:95%}}",
  ".vtro-btn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;margin-top:10px;padding:13px 20px;background:"+D+";border:2px solid "+D+";color:white;font-family:'Lato',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;border-radius:3px;transition:background .22s,border-color .22s;position:relative;-webkit-tap-highlight-color:transparent;}",
  ".vtro-btn:hover{background:"+A+";border-color:"+A+";}",
  ".vtro-saved-dot{position:absolute;top:-7px;right:-7px;width:20px;height:20px;background:#2e7d32;border-radius:50%;display:none;align-items:center;justify-content:center;border:2px solid white;font-size:10px;}",
  ".vtro-btn.vtro-has-saved .vtro-saved-dot{display:flex;animation:vtro-pop .4s cubic-bezier(.34,1.56,.64,1);}",
  ".vtro-overlay{position:fixed;inset:0;background:rgba(20,10,5,.72);z-index:999990;display:flex;align-items:flex-end;justify-content:center;opacity:0;pointer-events:none;transition:opacity .28s ease;}",
  "@media(min-width:600px){.vtro-overlay{align-items:center;padding:16px;}}",
  ".vtro-overlay.vtro-open{opacity:1;pointer-events:all;}",
  ".vtro-modal{background:#faf7f4;width:100%;max-width:900px;max-height:96vh;border-radius:10px 10px 0 0;overflow-y:auto;overflow-x:hidden;display:flex;flex-direction:column;transform:translateY(40px);transition:transform .35s cubic-bezier(.22,1,.36,1);font-family:'Lato',sans-serif;-webkit-overflow-scrolling:touch;}",
  "@media(min-width:600px){.vtro-modal{border-radius:8px;max-height:92vh;transform:translateY(28px) scale(.97);}}",
  ".vtro-overlay.vtro-open .vtro-modal{transform:translateY(0) scale(1);}",
  ".vtro-handle{width:40px;height:4px;background:#d4c4b0;border-radius:2px;margin:10px auto 0;flex-shrink:0;}",
  "@media(min-width:600px){.vtro-handle{display:none;}}",
  ".vtro-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px 14px;border-bottom:3px solid "+A+";position:sticky;top:0;background:"+HEAD_BG+";z-index:2;}",
  ".vtro-header h2{font-family:'Playfair Display',serif;font-size:19px;color:"+HEAD_TEXT+";display:flex;align-items:center;gap:10px;font-style:italic;letter-spacing:.3px;}",
  "@media(min-width:600px){.vtro-header h2{font-size:22px;}}",
  ".vtro-badge{font-family:'Lato',sans-serif;font-size:9px;font-weight:700;letter-spacing:1px;text-transform:uppercase;background:"+A+";color:white;padding:2px 8px;border-radius:20px;font-style:normal;}",
  ".vtro-close{background:rgba(255,255,255,.1);border:none;cursor:pointer;color:"+HEAD_TEXT+";font-size:20px;line-height:1;padding:4px 8px;border-radius:4px;transition:background .18s;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;}",
  ".vtro-close:hover{background:rgba(255,255,255,.2);}",
  ".vtro-product-bar{display:flex;align-items:center;gap:12px;padding:10px 20px;background:#eef3f0;border-bottom:1px solid #d0ddd4;}",
  ".vtro-product-thumb-wrap{flex-shrink:0;width:50px;height:50px;border-radius:5px;overflow:hidden;background:#e8e0d8;border:1px solid #d4c4b0;}",
  ".vtro-product-thumb{width:100%;height:100%;object-fit:cover;display:block;}",
  ".vtro-product-info{flex:1;min-width:0;}",
  ".vtro-product-name{font-size:13px;font-weight:700;color:"+D+";white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
  ".vtro-product-cat{display:inline-flex;align-items:center;gap:5px;margin-top:3px;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 8px;border-radius:20px;}",
  ".vtro-product-cat.cat-top{background:#fde8d8;color:"+A+";}",
  ".vtro-product-cat.cat-bottom{background:#d8e8fd;color:#2c5282;}",
  ".vtro-product-cat.cat-unknown{background:#e5ddd5;color:#8b7355;}",
  ".vtro-body{display:flex;flex-direction:column;}",
  "@media(min-width:600px){.vtro-body{flex-direction:row;}}",
  ".vtro-input-side{padding:18px 20px;border-bottom:1px solid #e5ddd5;}",
  "@media(min-width:600px){.vtro-input-side{flex:1;border-bottom:none;border-right:1px solid #e5ddd5;}}",
  ".vtro-section-label{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#8b7355;margin-bottom:10px;}",
  ".vtro-tabs{display:flex;margin-bottom:14px;border:1px solid #e5ddd5;border-radius:4px;overflow:hidden;}",
  ".vtro-tab{flex:1;padding:10px 8px;background:white;border:none;cursor:pointer;font-family:'Lato',sans-serif;font-size:13px;color:#8b7355;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .2s;-webkit-tap-highlight-color:transparent;min-height:44px;}",
  ".vtro-tab:not(:last-child){border-right:1px solid #e5ddd5;}",
  ".vtro-tab.active{background:"+A+";color:white;font-weight:700;}",
  ".vtro-upload-zone{border:2px dashed #d4c4b0;border-radius:6px;padding:22px 16px;text-align:center;cursor:pointer;transition:all .2s;background:white;position:relative;overflow:hidden;}",
  ".vtro-upload-zone:hover,.vtro-upload-zone.dragover{border-color:"+A+";background:#fdf6f0;}",
  ".vtro-upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;font-size:0;}",
  ".vtro-upload-icon{font-size:28px;margin-bottom:7px;}",
  ".vtro-upload-text{font-size:12px;color:#8b7355;line-height:1.5;}",
  ".vtro-upload-text strong{color:"+D+";display:block;margin-bottom:3px;font-size:13px;}",
  ".vtro-img-warning{display:none;margin-top:8px;padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:5px;font-size:11px;color:#7c6000;line-height:1.5;}",
  ".vtro-img-warning.visible{display:block;}",
  ".vtro-preview{position:relative;border-radius:6px;overflow:hidden;background:#e8e0d8;aspect-ratio:3/4;display:none;}",
  ".vtro-preview.has-image{display:block;}",
  ".vtro-preview img{width:100%;height:100%;object-fit:cover;}",
  ".vtro-preview-remove{position:absolute;top:8px;right:8px;background:rgba(0,0,0,.55);color:white;border:none;border-radius:50%;width:32px;height:32px;font-size:15px;cursor:pointer;display:flex;align-items:center;justify-content:center;}",
  ".vtro-webcam-wrap{display:none;flex-direction:column;gap:10px;}",
  ".vtro-webcam-wrap.active{display:flex;}",
  ".vtro-webcam-wrap video{width:100%;border-radius:6px;background:#111;aspect-ratio:3/4;object-fit:cover;transform:scaleX(-1);}",
  ".vtro-snap-btn{background:"+A+";color:white;border:none;padding:12px;border-radius:4px;font-family:'Lato',sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;min-height:48px;-webkit-tap-highlight-color:transparent;}",
  ".vtro-agb-wrap{margin-top:14px;padding:12px 14px;background:white;border:1px solid #e5ddd5;border-radius:6px;display:flex;align-items:flex-start;gap:10px;}",
  ".vtro-agb-wrap input[type=checkbox]{width:18px;height:18px;flex-shrink:0;accent-color:"+A+";cursor:pointer;margin-top:2px;}",
  ".vtro-agb-label{font-size:12px;color:#6b5c4e;line-height:1.5;cursor:pointer;}",
  ".vtro-agb-label a{color:"+A+";}",
  ".vtro-agb-wrap.vtro-agb-error{border-color:#c0392b;background:#fff8f7;}",
  ".vtro-agb-err{font-size:11px;color:#c0392b;margin-top:5px;display:none;}",
  ".vtro-agb-err.visible{display:block;}",
  ".vtro-gen-btn{width:100%;margin-top:16px;padding:14px;background:"+A+";color:white;border:none;border-radius:4px;font-family:'Lato',sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:opacity .2s;min-height:50px;-webkit-tap-highlight-color:transparent;}",
  ".vtro-gen-btn:hover{opacity:.85;}",
  ".vtro-gen-btn:disabled{opacity:.35;cursor:not-allowed;}",
  ".vtro-progress-wrap{width:100%;margin-top:16px;display:none;flex-direction:column;gap:8px;}",
  ".vtro-progress-wrap.visible{display:flex;}",
  ".vtro-progress-track{width:100%;height:4px;background:#e5ddd5;border-radius:2px;overflow:hidden;}",
  ".vtro-progress-bar{height:100%;background:"+A+";border-radius:2px;animation:vtro-progress 18s cubic-bezier(.1,0,.9,1) forwards;}",
  ".vtro-progress-status{font-size:12px;color:#8b7355;text-align:center;font-family:'Lato',sans-serif;animation:vtro-pulse 2s ease infinite;}",
  ".vtro-result-side{padding:18px 20px;display:flex;flex-direction:column;}",
  "@media(min-width:600px){.vtro-result-side{flex:1;}}",
  ".vtro-result-placeholder{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;padding:24px 16px;border:2px dashed #e5ddd5;border-radius:6px;background:white;min-height:180px;}",
  ".vtro-result-placeholder p{font-size:12px;line-height:1.5;color:#a89880;}",
  ".vtro-result-wrap{display:none;flex-direction:column;gap:10px;}",
  ".vtro-result-wrap.visible{display:flex;}",
  ".vtro-result-img-box{position:relative;}",
  ".vtro-result-img-box img{width:100%;border-radius:6px;object-fit:cover;aspect-ratio:3/4;display:block;}",
  ".vtro-saved-badge{position:absolute;top:10px;left:10px;background:#2e7d32;color:white;font-family:'Lato',sans-serif;font-size:11px;font-weight:700;letter-spacing:1px;padding:5px 10px;border-radius:20px;display:none;align-items:center;gap:5px;}",
  ".vtro-saved-badge.visible{display:flex;animation:vtro-pop .4s cubic-bezier(.34,1.56,.64,1);}",
  ".vtro-retry-wrap{display:none;margin-top:12px;}",
  ".vtro-retry-wrap.visible{display:block;}",
  ".vtro-retry-btn{width:100%;padding:11px;border:2px solid #c0392b;background:white;color:#c0392b;border-radius:4px;font-family:'Lato',sans-serif;font-size:12px;font-weight:700;letter-spacing:1px;cursor:pointer;-webkit-tap-highlight-color:transparent;}",
  ".vtro-actions{display:flex;gap:8px;flex-wrap:wrap;}",
  ".vtro-act-btn{flex:1;min-width:70px;padding:10px 8px;border:2px solid #e5ddd5;background:white;border-radius:4px;font-family:'Lato',sans-serif;font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;cursor:pointer;color:#8b7355;transition:all .18s;display:flex;align-items:center;justify-content:center;gap:5px;min-height:42px;-webkit-tap-highlight-color:transparent;}",
  ".vtro-act-btn:hover{border-color:"+A+";color:"+A+";}",
  ".vtro-act-btn.prim{background:"+A+";border-color:"+A+";color:white;}",
  ".vtro-act-btn.prim:hover{opacity:.88;}",
  ".vtro-outfit-preview{display:none;gap:8px;margin-top:6px;}",
  ".vtro-outfit-preview.visible{display:flex;}",
  ".vtro-outfit-preview img{flex:1;border-radius:5px;object-fit:cover;aspect-ratio:2/3;border:2px solid "+A+";}",
  ".vtro-outfit-preview-label{font-size:9px;color:#8b7355;text-align:center;margin-top:3px;font-weight:700;text-transform:uppercase;letter-spacing:1px;}",
  ".vtro-shelf,.vtro-saved-section{padding:14px 20px 20px;border-top:1px solid #e5ddd5;}",
  ".vtro-shelf-hdr,.vtro-saved-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}",
  ".vtro-shelf-items,.vtro-saved-items{display:flex;gap:10px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;}",
  ".vtro-shelf-item,.vtro-saved-item{position:relative;flex-shrink:0;width:68px;}",
  ".vtro-shelf-item img,.vtro-saved-item img{width:68px;height:90px;object-fit:cover;border-radius:4px;border:2px solid #e5ddd5;display:block;}",
  ".vtro-saved-item img{border-color:#a5d6a7;cursor:pointer;}",
  ".vtro-item-lbl{font-size:9px;color:#8b7355;text-align:center;margin-top:4px;font-weight:700;letter-spacing:1px;text-transform:uppercase;}",
  ".vtro-item-ts{font-size:9px;color:#a89880;text-align:center;margin-top:3px;}",
  ".vtro-item-rm{position:absolute;top:-7px;right:-7px;background:"+D+";color:white;border:none;border-radius:50%;width:20px;height:20px;font-size:11px;cursor:pointer;display:flex;align-items:center;justify-content:center;}",
  ".vtro-empty{font-size:12px;color:#c4b49e;font-style:italic;}",
  // Produktbild-Galerie im Modal
  ".vtro-gallery{display:none;gap:6px;margin-bottom:14px;overflow-x:auto;padding-bottom:4px;-webkit-overflow-scrolling:touch;}",
  ".vtro-gallery.visible{display:flex;}",
  ".vtro-gallery-item{flex-shrink:0;width:56px;cursor:pointer;border-radius:4px;overflow:hidden;border:2px solid #e5ddd5;transition:border-color .18s;}",
  ".vtro-gallery-item:hover{border-color:"+A+";}",
  ".vtro-gallery-item.active{border-color:"+A+";box-shadow:0 0 0 2px "+A+"40;}",
  ".vtro-gallery-item img{width:56px;height:72px;object-fit:cover;display:block;}",
  ".vtro-gallery-label{font-size:9px;color:#8b7355;text-align:center;padding:2px 0;font-weight:700;letter-spacing:.5px;}",
  ".vtro-history-panel{padding:4px 0;}",
  ".vtro-history-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}",
  ".vtro-history-thumb{position:relative;cursor:pointer;border-radius:5px;overflow:hidden;border:2px solid #e5ddd5;transition:border-color .18s;aspect-ratio:3/4;}",
  ".vtro-history-thumb:hover{border-color:"+A+";}",
  ".vtro-history-thumb.active{border-color:"+A+";box-shadow:0 0 0 2px "+A+"40;}",
  ".vtro-history-thumb img{width:100%;height:100%;object-fit:cover;display:block;}",
  ".vtro-history-empty{font-size:12px;color:#c4b49e;font-style:italic;text-align:center;padding:24px 0;}",
  "@media(prefers-color-scheme:dark){.vtro-modal{background:#111a13;}.vtro-header{background:#0a1409;border-color:"+A+";}.vtro-product-bar{background:#0f1f11;border-color:#2a4030;}.vtro-body,.vtro-input-side{border-color:#2a4030;}.vtro-upload-zone{background:#0f1f11;border-color:#2a4030;color:#c8d8c0;}.vtro-upload-zone:hover{background:#142314;}.vtro-upload-text{color:#7a9870;}.vtro-upload-text strong{color:#c8d8c0;}.vtro-agb-wrap{background:#0f1f11;border-color:#2a4030;}.vtro-agb-label{color:#8aaa80;}.vtro-result-placeholder{background:#0f1f11;border-color:#2a4030;}.vtro-act-btn{background:#0f1f11;border-color:#2a4030;color:#7a9870;}.vtro-section-label{color:#6a8860;}.vtro-shelf,.vtro-saved-section{border-color:#2a4030;}.vtro-tabs{border-color:#2a4030;}.vtro-tab{background:#0f1f11;color:#7a9870;}.vtro-tab:not(:last-child){border-color:#2a4030;}}",
  ".vtro-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);background:"+D+";color:white;padding:12px 18px;border-radius:6px;font-family:'Lato',sans-serif;font-size:14px;z-index:9999999;transition:transform .3s cubic-bezier(.22,1,.36,1);white-space:nowrap;pointer-events:none;display:flex;align-items:center;gap:8px;}",
  ".vtro-toast.show{transform:translateX(-50%) translateY(0);}",
  "canvas.vtro-hidden{display:none;}",
].join('');

// ── HELPERS ──────────────────────────────────────────────────────────────────
function loadJSON(key,fb){try{return JSON.parse(localStorage.getItem(key))||fb;}catch(e){return fb;}}
function L(k){return CFG.labels[k]||k;}

// ── PRODUKT-ERKENNUNG ────────────────────────────────────────────────────────
function detectCategory(){
  var src=(window.location.pathname+' '+document.title+' '+
    (document.querySelector('.breadcrumb,.breadcrumbs,nav[aria-label="breadcrumb"],[data-breadcrumb]')||{textContent:''}).textContent
  ).toLowerCase();
  // Produktname aus data-Attribut zusätzlich einbeziehen
  if(CFG.productName) src += ' ' + CFG.productName.toLowerCase();
  var TOP=['hemd','bluse','shirt','polo','pullover','hoodie','jacke','weste','gilet','body','dirndl','mieder','anzug','poncho'];
  var BOT=['lederhose','hose','rock','shorts','badehose','unterhose','freizeithose'];
  var t=0,b=0;
  TOP.forEach(function(w){if(src.indexOf(w)>-1)t++;});
  BOT.forEach(function(w){if(src.indexOf(w)>-1)b++;});
  return b>t?'bottom':t>b?'top':'unknown';
}

// ── BILD-SKALIERUNG ──────────────────────────────────────────────────────────
var MAX_PX=1024, QUALITY=0.88;
function resizeToB64(source,mimeOut){
  mimeOut=mimeOut||'image/jpeg';
  return new Promise(function(ok,fail){
    try{
      var sw=source.naturalWidth||source.videoWidth||source.width||512;
      var sh=source.naturalHeight||source.videoHeight||source.height||512;
      var scale=Math.min(1,MAX_PX/Math.max(sw,sh));
      var tw=Math.round(sw*scale),th=Math.round(sh*scale);
      var c=document.createElement('canvas');c.width=tw;c.height=th;
      c.getContext('2d').drawImage(source,0,0,tw,th);
      ok(c.toDataURL(mimeOut,QUALITY).split(',')[1]);
    }catch(e){fail(e);}
  });
}
function imgElementToB64(imgEl){return resizeToB64(imgEl);}

// ── PRODUKTBILD HOLEN ────────────────────────────────────────────────────────
// Priorität 1: data-product-image Attribut (vom Shop-Template übergeben) – zuverlässig & CORS-sicher
// Priorität 2: DOM-Scanning als Fallback
function getProductImageUrl(){
  if(CFG.productImageUrl) return CFG.productImageUrl;
  // DOM-Fallback
  var candidates=[];
  document.querySelectorAll('img').forEach(function(img){
    var src=img.src||img.dataset.src||'';
    if(!src||src.indexOf('data:')===0)return;
    if(/logo|icon|sprite|svg|badge|rating|star|avatar|payment|flag|arrow|chevron|close|menu/i.test(src))return;
    if(img.width<80||img.height<80)return;
    var score=0,alt=(img.alt||'').toLowerCase(),srcL=src.toLowerCase();
    if(/^vorderansicht/i.test(img.alt))score+=100;
    if(/[-_]vorne\b|[-_]front\b|[-_]01\b|[-_]001\b/.test(srcL))score+=60;
    if(srcL.indexOf('/media/')>-1)score+=20;
    if(img.closest('.gallery-slider,.product-gallery,.product__media,.cms-element-image-gallery,[class*="gallery"],[class*="product-img"]'))score+=30;
    if(/hinten|rücken|back|detail|stick|wappen|saum|zoom/i.test(alt+srcL))score-=40;
    if(/thumbnail|thumb|small|xs/i.test(srcL))score-=20;
    score+=Math.min((img.naturalWidth*img.naturalHeight)/50000,20);
    candidates.push({src:src,el:img,score:score});
  });
  if(!candidates.length)return null;
  candidates.sort(function(a,b){return b.score-a.score;});
  return candidates[0].src;
}

function getProductImgElement(){
  if(CFG.productImageUrl){
    // Passendes <img>-Element im DOM finden
    var found=null;
    document.querySelectorAll('img').forEach(function(img){
      if(img.src===CFG.productImageUrl||img.src.startsWith(CFG.productImageUrl.split('?')[0])){
        found=img;
      }
    });
    return found;
  }
  return null;
}

var _cache=null;
function getProductInfo(){
  if(_cache)return _cache;
  _cache={
    imageUrl: getProductImageUrl(),
    imgEl:    getProductImgElement(),
    category: detectCategory(),
    name:     CFG.productName || (document.querySelector('h1')||{textContent:''}).textContent.trim() || document.title.split('|')[0].trim()
  };
  return _cache;
}

// ── GALERIE ───────────────────────────────────────────────────────────────────
function renderGallery(){
  var images = CFG.productImages.length > 0
    ? CFG.productImages
    : (CFG.productImageUrl ? [CFG.productImageUrl] : []);
  // Nur anzeigen wenn mehr als 1 Bild
  var gallery = document.getElementById('vtro-gallery');
  if(images.length < 2){ gallery.classList.remove('visible'); return; }
  // Erstes Bild vorauswählen falls noch keines gewählt
  // Immer CFG.productImageUrl als aktives Bild verwenden (wird von vtro.setProduct() aktualisiert)
  S.selectedImageUrl = CFG.productImageUrl || images[0];
  gallery.classList.add('visible');
  gallery.innerHTML = images.map(function(url, i){
    var active = url === S.selectedImageUrl ? ' active' : '';
    return '<div class="vtro-gallery-item'+active+'" data-url="'+url+'">'+
      '<img src="'+url+'" alt="Bild '+(i+1)+'">'+
      '<div class="vtro-gallery-label">'+(i+1)+'</div>'+
    '</div>';
  }).join('');
  gallery.querySelectorAll('.vtro-gallery-item').forEach(function(item){
    item.addEventListener('click', function(){
      selectGalleryImage(item.dataset.url);
    });
  });
}
function selectGalleryImage(url){
  S.selectedImageUrl = url;
  _cache = null; // Produkt-Cache zurücksetzen
  CFG.productImageUrl = url;
  // Thumbnail im Header aktualisieren
  var thumb = document.getElementById('vtro-product-thumb');
  if(thumb) thumb.src = url;
  // Hauptbild auf Seite aktualisieren
  var mainImg = document.getElementById('main-product-img');
  if(mainImg) mainImg.src = url;
  // Aktiv-Klasse in Galerie setzen
  document.querySelectorAll('.vtro-gallery-item').forEach(function(item){
    item.classList.toggle('active', item.dataset.url === url);
  });
}

function productToB64(){
  // Priorität 1: URL fetch vom ausgewählten Bild (volle Auflösung, zuverlässig)
  var url = S.selectedImageUrl || CFG.productImageUrl;
  if(url) return urlToB64(url);
  // Priorität 2: Hauptbild auf der Seite via Canvas
  var mainImg = document.getElementById("main-product-img");
  if(mainImg && mainImg.complete && mainImg.naturalWidth > 0){
    return imgElementToB64(mainImg);
  }
  // Priorität 3: Galerie-Thumbnail (klein, letzter Ausweg)
  var activeThumb = document.querySelector(".vtro-gallery-item.active img");
  if(activeThumb && activeThumb.complete && activeThumb.naturalWidth > 0){
    return imgElementToB64(activeThumb);
  }
  return Promise.resolve(null);
}
function urlToB64(url){
  return fetch(url,{mode:'cors'}).then(function(r){return r.blob();}).then(function(blob){
    return new Promise(function(ok){var r=new FileReader();r.onload=function(){ok(r.result.split(',')[1]);};r.readAsDataURL(blob);});
  });
}
function fileToB64(file){
  return new Promise(function(ok,fail){
    var reader=new FileReader();
    reader.onload=function(e){
      var img=new Image();
      img.onload=function(){resizeToB64(img).then(function(b64){ok({b64:b64,dataUrl:e.target.result});}).catch(fail);};
      img.onerror=fail;img.src=e.target.result;
    };reader.onerror=fail;reader.readAsDataURL(file);
  });
}
function checkImageQuality(b64,dataUrl){
  return new Promise(function(ok){
    var i=new Image();
    i.onload=function(){var ratio=i.width/i.height;ok(i.width<300||i.height<400||ratio>0.85);};
    i.onerror=function(){ok(false);};i.src=dataUrl;
  });
}
function showToast(msg,emoji){
  emoji=emoji||'✓';
  var t=document.querySelector('.vtro-toast');
  if(!t){t=document.createElement('div');t.className='vtro-toast';document.body.appendChild(t);}
  t.innerHTML='<span>'+emoji+'</span><span>'+msg+'</span>';
  t.classList.add('show');clearTimeout(t._t);
  t._t=setTimeout(function(){t.classList.remove('show');},2800);
}
function fmtDate(ts){return new Date(ts).toLocaleDateString('de-AT',{day:'2-digit',month:'2-digit'});}

var PROGRESS_STEPS=['Foto wird analysiert…','Kleidungsstück wird erkannt…','Outfit wird zusammengestellt…','Bild wird generiert…','Fast fertig…'];
var _progressTimer=null,_stepIdx=0;
function startProgress(){
  _stepIdx=0;
  var pw=document.getElementById('vtro-progress-wrap');
  var ps=document.getElementById('vtro-progress-status');
  var pb=document.getElementById('vtro-progress-bar');
  pw.classList.add('visible');ps.textContent=PROGRESS_STEPS[0];
  pb.style.animation='none';pb.offsetHeight;pb.style.animation='';
  _progressTimer=setInterval(function(){_stepIdx=Math.min(_stepIdx+1,PROGRESS_STEPS.length-1);ps.textContent=PROGRESS_STEPS[_stepIdx];},3500);
}
function stopProgress(){clearInterval(_progressTimer);document.getElementById('vtro-progress-wrap').classList.remove('visible');}

// ── STATE ────────────────────────────────────────────────────────────────────
var S={
  personB64:null,loading:false,agbAccepted:false,resultB64:null,
  webcamStream:null,activeTab:'upload',
  selectedImageUrl: null,  // aktuell gewähltes Produktbild (aus Galerie)
  outfit:loadJSON(CFG.outfitKey,{top:null,bottom:null}),
  saved:loadJSON(CFG.savedKey,[]),
};
function persistOutfit(){localStorage.setItem(CFG.outfitKey,JSON.stringify(S.outfit));}
function persistSaved(){if(S.saved.length>10)S.saved=S.saved.slice(-10);localStorage.setItem(CFG.savedKey,JSON.stringify(S.saved));}

// ── MODAL HTML ───────────────────────────────────────────────────────────────
function buildModal(){
  var o=document.createElement('div');
  o.className='vtro-overlay';o.id='vtro-overlay';
  o.innerHTML=
    '<div class="vtro-modal" role="dialog" aria-modal="true" aria-label="'+L('title')+'">'+
      '<div class="vtro-handle"></div>'+
      '<div class="vtro-header">'+
        '<h2>'+L('title')+' <span class="vtro-badge">Beta</span></h2>'+
        '<button class="vtro-close" id="vtro-close" aria-label="Schließen">✕</button>'+
      '</div>'+
      '<div class="vtro-product-bar">'+
        '<div class="vtro-product-thumb-wrap"><img class="vtro-product-thumb" id="vtro-product-thumb" src="" alt="Produkt"></div>'+
        '<div class="vtro-product-info">'+
          '<div class="vtro-product-name" id="vtro-product-name">…</div>'+
          '<div class="vtro-product-cat" id="vtro-product-cat"></div>'+
        '</div>'+
      '</div>'+
      // Bildgalerie – nur sichtbar wenn mehrere Bilder vorhanden
      '<div class="vtro-gallery" id="vtro-gallery"></div>'+
      '<div class="vtro-body">'+
        '<div class="vtro-input-side">'+
          '<div class="vtro-section-label">'+L('yourPhoto')+'</div>'+
          '<div class="vtro-tabs" role="tablist">'+
            '<button class="vtro-tab active" id="vtro-tab-upload" role="tab">'+
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>'+
              L('upload')+
            '</button>'+
            '<button class="vtro-tab" id="vtro-tab-webcam" role="tab">'+
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M23 7l-5-4H6L1 7v10l5 4h12l5-4V7z"/></svg>'+
              L('camera')+
            '</button>'+
            '<button class="vtro-tab" id="vtro-tab-history" role="tab">'+
              '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>'+
              L('history')+
            '</button>'+
          '</div>'+
          '<div id="vtro-upload-panel">'+
            '<div class="vtro-upload-zone" id="vtro-dropzone">'+
              '<input type="file" id="vtro-file-input" accept="image/*">'+
              '<div class="vtro-upload-icon">📷</div>'+
              '<div class="vtro-upload-text"><strong>'+L('uploadHint')+'</strong>'+L('uploadSub')+'</div>'+
            '</div>'+
            '<div class="vtro-img-warning" id="vtro-img-warning">'+L('imgWarning')+'</div>'+
            '<div class="vtro-preview" id="vtro-preview">'+
              '<img id="vtro-preview-img" src="" alt="Vorschau">'+
              '<button class="vtro-preview-remove" id="vtro-preview-remove" aria-label="Entfernen">✕</button>'+
            '</div>'+
          '</div>'+
          '<div class="vtro-webcam-wrap" id="vtro-webcam-panel">'+
            '<video id="vtro-video" autoplay playsinline muted></video>'+
            '<canvas class="vtro-hidden" id="vtro-canvas"></canvas>'+
            '<button class="vtro-snap-btn" id="vtro-snap">'+
              '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="3"/><path d="M23 7l-5-4H6L1 7v10l5 4h12l5-4V7z"/></svg>'+
              L('snapBtn')+
            '</button>'+
          '</div>'+
          '<div class="vtro-history-panel" id="vtro-history-panel" style="display:none">'+
            '<div class="vtro-history-grid" id="vtro-history-grid"></div>'+
          '</div>'+
          '<div class="vtro-agb-wrap" id="vtro-agb-wrap">'+
            '<input type="checkbox" id="vtro-agb-check">'+
            '<label for="vtro-agb-check" class="vtro-agb-label">'+CFG.agbText+'</label>'+
          '</div>'+
          '<div class="vtro-agb-err" id="vtro-agb-err">'+L('agbError')+'</div>'+
          '<button class="vtro-gen-btn" id="vtro-generate" disabled>'+
            '<span class="vtro-lbl">'+L('btnGenerate')+'</span>'+
          '</button>'+
          '<div class="vtro-progress-wrap" id="vtro-progress-wrap">'+
            '<div class="vtro-progress-track"><div class="vtro-progress-bar" id="vtro-progress-bar"></div></div>'+
            '<div class="vtro-progress-status" id="vtro-progress-status"></div>'+
          '</div>'+
          '<div class="vtro-retry-wrap" id="vtro-retry-wrap">'+
            '<button class="vtro-retry-btn" id="vtro-retry">'+L('retryBtn')+'</button>'+
          '</div>'+
        '</div>'+
        '<div class="vtro-result-side">'+
          '<div class="vtro-section-label">'+L('result')+'</div>'+
          '<div class="vtro-result-placeholder" id="vtro-placeholder">'+
            '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d4c4b0" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'+
            '<p>'+L('placeholderHint')+'</p>'+
          '</div>'+
          '<div class="vtro-result-wrap" id="vtro-result-wrap">'+
            '<div class="vtro-result-img-box">'+
              '<img id="vtro-result-img" src="" alt="Ergebnis">'+
              '<div class="vtro-saved-badge" id="vtro-saved-badge">'+
                '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>'+
                L('savedBadge')+
              '</div>'+
            '</div>'+
            '<div class="vtro-actions">'+
              '<button class="vtro-act-btn" id="vtro-save-top">'+L('saveTop')+'</button>'+
              '<button class="vtro-act-btn" id="vtro-save-bottom">'+L('saveBottom')+'</button>'+
              '<button class="vtro-act-btn" id="vtro-download">'+L('download')+'</button>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<div class="vtro-shelf">'+
        '<div class="vtro-shelf-hdr">'+
          '<div class="vtro-section-label" style="margin:0">'+L('outfitTitle')+'</div>'+
          '<button class="vtro-act-btn" id="vtro-clear-outfit" style="flex:0;padding:5px 12px;font-size:10px">'+L('clear')+'</button>'+
        '</div>'+
        '<div class="vtro-shelf-items" id="vtro-shelf-items"><span class="vtro-empty">'+L('emptyOutfit')+'</span></div>'+
        '<div class="vtro-outfit-preview" id="vtro-outfit-preview">'+
          '<div style="flex:1"><img id="vtro-outfit-top-img" src="" alt="Top"><div class="vtro-outfit-preview-label">TOP</div></div>'+
          '<div style="flex:1"><img id="vtro-outfit-bottom-img" src="" alt="Bottom"><div class="vtro-outfit-preview-label">BOTTOM</div></div>'+
        '</div>'+
      '</div>'+
      '<div class="vtro-saved-section">'+
        '<div class="vtro-saved-hdr">'+
          '<div class="vtro-section-label" style="margin:0">'+L('savedTitle')+'</div>'+
          '<button class="vtro-act-btn" id="vtro-clear-saved" style="flex:0;padding:5px 12px;font-size:10px">'+L('deleteAll')+'</button>'+
        '</div>'+
        '<div class="vtro-saved-items" id="vtro-saved-items"><span class="vtro-empty">'+L('emptySaved')+'</span></div>'+
      '</div>'+
    '</div>';
  document.body.appendChild(o);return o;
}

// ── INIT ─────────────────────────────────────────────────────────────────────
function init(){
  var s=document.createElement('style');s.textContent=CSS;document.head.appendChild(s);
  var btn=document.createElement('button');
  btn.className='vtro-btn';btn.id='vtro-trigger';
  btn.innerHTML=
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>'+
    L('btnTrigger')+'<span class="vtro-saved-dot">✓</span>';
  if(S.saved.length>0)btn.classList.add('vtro-has-saved');
  var anchor=document.querySelector('#add-to-cart-section,.product-form,form[action*="cart"],.product__form,.buy-widget');
  if(anchor)anchor.appendChild(btn);else document.body.appendChild(btn);
  var overlay=buildModal();
  btn.addEventListener('click',openModal);
  document.getElementById('vtro-close').addEventListener('click',closeModal);
  overlay.addEventListener('click',function(e){if(e.target===overlay)closeModal();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')closeModal();});
  document.getElementById('vtro-tab-upload').addEventListener('click',function(){switchTab('upload');});
  document.getElementById('vtro-tab-webcam').addEventListener('click',function(){switchTab('webcam');});
  document.getElementById('vtro-tab-history').addEventListener('click',function(){switchTab('history');});
  var fi=document.getElementById('vtro-file-input');
  var dz=document.getElementById('vtro-dropzone');
  fi.addEventListener('change',function(e){handleFile(e.target.files[0]);});
  dz.addEventListener('dragover',function(e){e.preventDefault();dz.classList.add('dragover');});
  dz.addEventListener('dragleave',function(){dz.classList.remove('dragover');});
  dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('dragover');handleFile(e.dataTransfer.files[0]);});
  document.getElementById('vtro-preview-remove').addEventListener('click',clearPerson);
  document.getElementById('vtro-snap').addEventListener('click',snapPhoto);
  document.getElementById('vtro-agb-check').addEventListener('change',function(e){
    S.agbAccepted=e.target.checked;
    document.getElementById('vtro-agb-wrap').classList.remove('vtro-agb-error');
    document.getElementById('vtro-agb-err').classList.remove('visible');
    updateGenBtn();
  });
  document.getElementById('vtro-generate').addEventListener('click',generate);
  document.getElementById('vtro-retry').addEventListener('click',generate);
  document.getElementById('vtro-save-top').addEventListener('click',function(){saveOutfit('top');});
  document.getElementById('vtro-save-bottom').addEventListener('click',function(){saveOutfit('bottom');});
  document.getElementById('vtro-download').addEventListener('click',downloadResult);
  document.getElementById('vtro-clear-outfit').addEventListener('click',clearOutfit);
  document.getElementById('vtro-clear-saved').addEventListener('click',clearSaved);
  renderOutfitShelf();renderSaved();
}

// ── OPEN / CLOSE ─────────────────────────────────────────────────────────────
function openModal(){
  document.getElementById('vtro-overlay').classList.add('vtro-open');
  document.body.style.overflow='hidden';
  var info=getProductInfo();
  var thumb=document.getElementById('vtro-product-thumb');
  if(info.imageUrl){thumb.src=info.imageUrl;thumb.onerror=function(){thumb.style.display='none';};}
  document.getElementById('vtro-product-name').textContent=info.name;
  var catEl=document.getElementById('vtro-product-cat');
  catEl.textContent={top:L('catTop'),bottom:L('catBottom'),unknown:L('catUnknown')}[info.category]||L('catUnknown');
  catEl.className='vtro-product-cat cat-'+info.category;
  renderGallery();
}
function closeModal(){
  document.getElementById('vtro-overlay').classList.remove('vtro-open');
  document.body.style.overflow='';stopWebcam();
}

// ── TABS ─────────────────────────────────────────────────────────────────────
function switchTab(tab){
  S.activeTab=tab;
  document.getElementById('vtro-tab-upload').classList.toggle('active',tab==='upload');
  document.getElementById('vtro-tab-webcam').classList.toggle('active',tab==='webcam');
  document.getElementById('vtro-tab-history').classList.toggle('active',tab==='history');
  document.getElementById('vtro-upload-panel').style.display=tab==='upload'?'':'none';
  document.getElementById('vtro-history-panel').style.display=tab==='history'?'':'none';
  var wp=document.getElementById('vtro-webcam-panel');
  if(tab==='webcam'){wp.classList.add('active');startWebcam();}
  else{wp.classList.remove('active');stopWebcam();}
  if(tab==='history') renderHistoryPanel();
}

// ── FILE / WEBCAM ─────────────────────────────────────────────────────────────
function handleFile(file){
  if(!file||!file.type.startsWith('image/'))return;
  fileToB64(file).then(function(r){
    S.personB64=r.b64;showPersonPreview(r.dataUrl);
    checkImageQuality(r.b64,r.dataUrl).then(function(warn){
      document.getElementById('vtro-img-warning').classList.toggle('visible',warn);
    });updateGenBtn();
  });
}
function showPersonPreview(dataUrl){
  document.getElementById('vtro-dropzone').style.display='none';
  var p=document.getElementById('vtro-preview');p.classList.add('has-image');
  document.getElementById('vtro-preview-img').src=dataUrl;
}
function clearPerson(){
  S.personB64=null;
  document.getElementById('vtro-dropzone').style.display='';
  document.getElementById('vtro-preview').classList.remove('has-image');
  document.getElementById('vtro-preview-img').src='';
  document.getElementById('vtro-file-input').value='';
  document.getElementById('vtro-img-warning').classList.remove('visible');
  updateGenBtn();
}
function startWebcam(){
  navigator.mediaDevices.getUserMedia({video:{facingMode:'user'}}).then(function(stream){
    S.webcamStream=stream;document.getElementById('vtro-video').srcObject=stream;
  }).catch(function(){showToast(L('camDenied'),'⚠️');});
}
function stopWebcam(){
  if(S.webcamStream){S.webcamStream.getTracks().forEach(function(t){t.stop();});S.webcamStream=null;}
}
function snapPhoto(){
  var v=document.getElementById('vtro-video'),c=document.getElementById('vtro-canvas');
  c.width=v.videoWidth;c.height=v.videoHeight;
  var ctx=c.getContext('2d');ctx.translate(c.width,0);ctx.scale(-1,1);ctx.drawImage(v,0,0);
  var previewDataUrl=c.toDataURL('image/jpeg',0.92);
  resizeToB64(c).then(function(b64){S.personB64=b64;switchTab('upload');showPersonPreview(previewDataUrl);updateGenBtn();});
}
function updateGenBtn(){document.getElementById('vtro-generate').disabled=!(S.personB64&&S.agbAccepted);}

// ── GENERATE ─────────────────────────────────────────────────────────────────
function generate(){
  if(!S.personB64)return;
  if(!S.agbAccepted){
    document.getElementById('vtro-agb-wrap').classList.add('vtro-agb-error');
    document.getElementById('vtro-agb-err').classList.add('visible');return;
  }
  S.loading=true;
  var genBtn=document.getElementById('vtro-generate');
  genBtn.disabled=true;genBtn.querySelector('.vtro-lbl').textContent=L('btnGenerating');
  document.getElementById('vtro-retry-wrap').classList.remove('visible');
  document.getElementById('vtro-saved-badge').classList.remove('visible');
  startProgress();
  var info=getProductInfo();
  if(typeof CFG.onGenerate==='function'){try{CFG.onGenerate(info.category,info.name);}catch(e){}}
  productToB64().then(function(productB64){
    return fetch(CFG.cloudRunEndpoint,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Shop-ID': CFG.shopId   // Shop-ID im Header für späteres Multi-Tenant / Billing
      },
      body:JSON.stringify({
        person_image:  S.personB64,
        product_image: productB64||null,
        product_url:   (!productB64&&info.imageUrl)?info.imageUrl:null
      })
    });
  }).then(function(r){
    if(!r.ok)throw new Error('HTTP '+r.status);return r.json();
  }).then(function(data){
    var rawImg=(data.status==='success'&&data.image)
      ||(data.predictions&&data.predictions[0]&&data.predictions[0].bytesBase64Encoded)
      ||(data.result&&data.result.bytesBase64Encoded)
      ||data.image||data.output;
    if(!rawImg){console.error('[VTO] Response keys:',Object.keys(data));throw new Error('Kein Ergebnis erhalten.');}
    var imgSrc=rawImg.startsWith('data:')?rawImg:'data:image/png;base64,'+rawImg;
    var b64=imgSrc.split(',')[1];
    if(!b64)throw new Error('b64 konnte nicht extrahiert werden.');
    S.resultB64=b64;
    document.getElementById('vtro-result-img').src=imgSrc;
    document.getElementById('vtro-placeholder').style.display='none';
    document.getElementById('vtro-result-wrap').classList.add('visible');
    var cat=info.category;
    document.getElementById('vtro-save-top').classList.toggle('prim',cat==='top');
    document.getElementById('vtro-save-bottom').classList.toggle('prim',cat==='bottom');
    autoSave(b64);
  }).catch(function(err){
    console.error('[VirtualTryOn]',err);
    showToast('Fehler: '+err.message,'⚠️');
    document.getElementById('vtro-retry-wrap').classList.add('visible');
  }).finally(function(){
    S.loading=false;stopProgress();
    genBtn.disabled=!(S.personB64&&S.agbAccepted);
    genBtn.querySelector('.vtro-lbl').textContent=L('btnGenerate');
  });
}
function autoSave(b64){
  var exists=S.saved.some(function(i){return i.b64===b64;});
  if(!exists){S.saved.push({b64:b64,ts:Date.now()});persistSaved();}
  document.getElementById('vtro-trigger').classList.add('vtro-has-saved');
  document.getElementById('vtro-saved-badge').classList.add('visible');
  renderSaved();
  if(typeof CFG.onSave==='function'){try{CFG.onSave('history');}catch(e){}}
}

// ── OUTFIT ───────────────────────────────────────────────────────────────────
function saveOutfit(slot){
  if(!S.resultB64)return;
  S.outfit[slot]={b64:S.resultB64,label:slot==='top'?'TOP':'BOTTOM',ts:Date.now()};
  persistOutfit();renderOutfitShelf();showToast(L('toastOutfit'),'👗');
  if(typeof CFG.onSave==='function'){try{CFG.onSave(slot);}catch(e){}}
}
function clearOutfit(){S.outfit={top:null,bottom:null};persistOutfit();renderOutfitShelf();}
function renderOutfitShelf(){
  var c=document.getElementById('vtro-shelf-items');
  var items=Object.entries(S.outfit).filter(function(e){return e[1]!==null;});
  if(!items.length){c.innerHTML='<span class="vtro-empty">'+L('emptyOutfit')+'</span>';}
  else{
    c.innerHTML=items.map(function(e){
      var slot=e[0],item=e[1];
      return '<div class="vtro-shelf-item"><img src="data:image/png;base64,'+item.b64+'" alt="'+item.label+'"><button class="vtro-item-rm" data-slot="'+slot+'">✕</button><div class="vtro-item-lbl">'+item.label+'</div></div>';
    }).join('');
    c.querySelectorAll('.vtro-item-rm').forEach(function(b){
      b.addEventListener('click',function(){S.outfit[b.dataset.slot]=null;persistOutfit();renderOutfitShelf();});
    });
  }
  var preview=document.getElementById('vtro-outfit-preview');
  if(S.outfit.top&&S.outfit.bottom){
    document.getElementById('vtro-outfit-top-img').src='data:image/png;base64,'+S.outfit.top.b64;
    document.getElementById('vtro-outfit-bottom-img').src='data:image/png;base64,'+S.outfit.bottom.b64;
    preview.classList.add('visible');
  }else{preview.classList.remove('visible');}
}

// ── HISTORY PANEL (3. Reiter) ────────────────────────────────────────────────
function renderHistoryPanel(){
  var grid = document.getElementById('vtro-history-grid');
  if(!S.saved.length){
    grid.innerHTML='<div class="vtro-history-empty">Noch keine gespeicherten Anproben.</div>';
    return;
  }
  grid.innerHTML = [].concat(S.saved).reverse().map(function(item, i){
    var idx = S.saved.length - 1 - i;
    var active = (S.personB64 === item.b64) ? ' active' : '';
    return '<div class="vtro-history-thumb'+active+'" data-idx="'+idx+'" data-b64="'+item.b64+'">'+
      '<img src="data:image/png;base64,'+item.b64+'" alt="Anprobe">'+
    '</div>';
  }).join('');
  grid.querySelectorAll('.vtro-history-thumb').forEach(function(thumb){
    thumb.addEventListener('click', function(){
      var b64 = thumb.dataset.b64;
      S.personB64 = b64;
      // Vorschau anzeigen
      showPersonPreview('data:image/png;base64,' + b64);
      // Aktiv markieren
      grid.querySelectorAll('.vtro-history-thumb').forEach(function(t){ t.classList.remove('active'); });
      thumb.classList.add('active');
      // Zu Upload-Tab wechseln damit Vorschau + Generate-Button sichtbar sind
      switchTab('upload');
      updateGenBtn();
      showToast('Bild ausgewählt','✓');
    });
  });
}

// ── SAVED ────────────────────────────────────────────────────────────────────
function renderSaved(){
  var c=document.getElementById('vtro-saved-items');
  if(!S.saved.length){c.innerHTML='<span class="vtro-empty">'+L('emptySaved')+'</span>';return;}
  c.innerHTML=[].concat(S.saved).reverse().map(function(item,i){
    var idx=S.saved.length-1-i;
    return '<div class="vtro-saved-item"><img src="data:image/png;base64,'+item.b64+'" alt="Gespeichert" data-idx="'+idx+'" title="Anzeigen"><button class="vtro-item-rm" data-idx="'+idx+'">✕</button><div class="vtro-item-ts">'+fmtDate(item.ts)+'</div></div>';
  }).join('');
  c.querySelectorAll('.vtro-saved-item img').forEach(function(img){
    img.addEventListener('click',function(){
      var item=S.saved[+img.dataset.idx];S.resultB64=item.b64;
      document.getElementById('vtro-result-img').src='data:image/png;base64,'+item.b64;
      document.getElementById('vtro-placeholder').style.display='none';
      document.getElementById('vtro-result-wrap').classList.add('visible');
      document.getElementById('vtro-saved-badge').classList.add('visible');
    });
  });
  c.querySelectorAll('.vtro-item-rm').forEach(function(b){
    b.addEventListener('click',function(){
      S.saved.splice(+b.dataset.idx,1);persistSaved();renderSaved();
      if(!S.saved.length)document.getElementById('vtro-trigger').classList.remove('vtro-has-saved');
    });
  });
}
function clearSaved(){S.saved=[];persistSaved();renderSaved();document.getElementById('vtro-trigger').classList.remove('vtro-has-saved');}

// ── DOWNLOAD ─────────────────────────────────────────────────────────────────
function downloadResult(){
  if(!S.resultB64)return;
  if(navigator.share&&navigator.canShare){
    fetch('data:image/png;base64,'+S.resultB64).then(function(r){return r.blob();}).then(function(blob){
      var file=new File([blob],'anprobe.png',{type:'image/png'});
      if(navigator.canShare({files:[file]}))return navigator.share({files:[file],title:'Meine virtuelle Anprobe'});
      throw new Error('share not supported');
    }).catch(function(){fallbackDownload();});
  }else{fallbackDownload();}
  if(typeof CFG.onDownload==='function'){try{CFG.onDownload();}catch(e){}}
}
function fallbackDownload(){
  var a=document.createElement('a');
  a.href='data:image/png;base64,'+S.resultB64;
  a.download='anprobe-'+Date.now()+'.png';a.click();
}

// ── PUBLIC API ───────────────────────────────────────────────────────────────
// Ermöglicht dem Shop-Template das aktive Produkt zu wechseln ohne Seite neu zu laden.
// Aufruf: vtro.setProduct({ image: '...url...', name: 'Produktname', category: 'top'|'bottom'|'unknown' })
window.vtro = {
  setProduct: function(opts) {
    if(!opts) return;
    // Cache zurücksetzen damit getProductInfo() neu liest
    _cache = null;
    // CFG aktualisieren
    if(opts.image){ CFG.productImageUrl = opts.image; S.selectedImageUrl = opts.image; }
    if(opts.name)  CFG.productName     = opts.name;
    // Produktleiste im Modal sofort aktualisieren falls offen
    var thumb = document.getElementById('vtro-product-thumb');
    var nameEl = document.getElementById('vtro-product-name');
    var catEl  = document.getElementById('vtro-product-cat');
    if(thumb && opts.image) { thumb.src = opts.image; }
    if(nameEl && opts.name) { nameEl.textContent = opts.name; }
    if(catEl) {
      var cat = opts.category || detectCategory();
      catEl.textContent = {top:L('catTop'),bottom:L('catBottom'),unknown:L('catUnknown')}[cat]||L('catUnknown');
      catEl.className = 'vtro-product-cat cat-' + cat;
    }
    // Hauptbild auf der Seite aktualisieren
    var mainImg = document.getElementById('main-product-img');
    if(mainImg && opts.image) mainImg.src = opts.image;
  }
};

// ── START ────────────────────────────────────────────────────────────────────
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();

})();
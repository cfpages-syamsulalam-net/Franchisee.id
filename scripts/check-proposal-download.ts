import assert from "node:assert/strict";
// @ts-expect-error Pages Functions are JavaScript modules without generated declarations.
import { buildPdfFromJpegs } from "../functions/_proposal-pdf.js";
import { sanitizeLegacyWordPressRuntime } from "../src/lib/franchise-text";

const jpeg1x1 = Buffer.from(
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAVEAEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEAMQAAAB9A//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/Aaf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/Aaf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z",
  "base64",
);

const pdf = buildPdfFromJpegs([{ bytes: new Uint8Array(jpeg1x1), width: 1, height: 1 }], { watermark: "FRANCHISEE.ID" });
const pdfText = Buffer.from(pdf).toString("latin1");
assert.match(pdfText, /^%PDF-1\.4/);
assert.match(pdfText, /FRANCHISEE\.ID/);
assert.match(pdfText, /\/Subtype \/Image/);

const dirtyHtml = `
<script>window._wpemojiSettings = {"source":{"concatemoji":"/wp-includes/js/wp-emoji-release.min.js?ver=6.8.3"}};</script>
<script id="latepoint-main-front-js-extra">var latepoint_helper = {"ajaxurl":"\\/wp-admin\\/admin-ajax.php"};</script>
<script src="/wp-content/plugins/latepoint/public/javascripts/front.js?ver=5.2.4" id="latepoint-main-front-js"></script>
<script id="analyticswp-js-extra">var analyticswp_vars = {"ajaxurl":"\\/wp-admin\\/admin-ajax.php"};</script>
<script src="/wp-content/plugins/analyticswp/Lib/../Lib/analyticswp.min.js?ver=2.2.0" id="analyticswp-js"></script>
`;
const cleanHtml = sanitizeLegacyWordPressRuntime(dirtyHtml);
assert.ok(!/analyticswp|wp-emoji-release|latepoint-main-front|admin-ajax/i.test(cleanHtml));

console.log("Proposal download and legacy-runtime cleanup check passed.");

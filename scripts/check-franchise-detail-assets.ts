import assert from "node:assert/strict";
import { injectDetailAssets } from "../src/lib/franchise-detail-assets";

const fixture = `<!doctype html>
<html>
<head><title>Detail Fixture</title></head>
<body>
  <main>
    <div class="franchise-premium-detail">
      <div class="e-n-tabs">
        <button class="e-n-tab-title" id="tab-profile" aria-controls="panel-profile" aria-selected="true">Profil</button>
        <div id="panel-profile" role="tabpanel">Profil brand</div>
      </div>
      <section class="fr-proposal-reader" data-proposal-reader>
        <div class="fr-proposal-frame">
          <img class="fr-proposal-image" src="https://assets.franchisee.id/franchises/demo/proposal/01.jpg" alt="Brosur Demo halaman 1">
          <div class="fr-proposal-overlaybar">
            <button class="fr-proposal-download" type="button" data-proposal-pdf="/proposal-download" data-proposal-slug="demo">Download PDF</button>
          </div>
          <button class="fr-proposal-hit fr-proposal-hit-prev" type="button">Sebelumnya</button>
          <button class="fr-proposal-hit fr-proposal-hit-next" type="button">Berikutnya</button>
        </div>
      </section>
    </div>
  </main>
</body>
</html>`;

const injected = injectDetailAssets(fixture);
const injectedTwice = injectDetailAssets(injected);

const count = (haystack: string, needle: string) => haystack.split(needle).length - 1;

assert.equal(count(injected, "franchise-detail-generated-css"), 1, "detail CSS should be injected once");
assert.equal(count(injected, "franchise-detail-tabs-js"), 1, "detail JS should be injected once");
assert.equal(injectedTwice, injected, "detail asset injection should be idempotent");

assert.match(injected, /\.fr-proposal-overlaybar/, "proposal overlay bar styles should exist");
assert.match(injected, /\.fr-proposal-hit/, "proposal half-image navigation styles should exist");
assert.match(injected, /initProposalReaders\(\)/, "proposal reader bootstrap should exist");
assert.match(injected, /\/proposal-download/, "proposal PDF download endpoint should be wired");
assert.match(injected, /initCompareButtons\(\)/, "compare action bootstrap should exist");
assert.match(injected, /data-open-contact-tab/, "contact tab shortcut handling should exist");
assert.match(injected, /\.fr-brand-contact-floats/, "dynamic brand contact float styles should exist");

assert.doesNotMatch(injected, /analyticswp|wp-emoji-release|admin-ajax/i, "legacy WordPress runtime references should not be injected");

console.log("Franchise detail asset injection check passed.");

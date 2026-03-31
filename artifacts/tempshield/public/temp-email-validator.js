/**
 * TempShield - Disposable Email Validator
 * Drop-in script for any website: WordPress, Laravel, HTML, etc.
 * Usage: <script src="https://yourdomain.com/temp-email-validator.js" data-api-key="YOUR_API_KEY"></script>
 */
(function () {
  "use strict";

  var script = document.currentScript || (function () {
    var scripts = document.getElementsByTagName("script");
    return scripts[scripts.length - 1];
  })();

  var scriptURL = new URL(script.src);
  var API_KEY = script.getAttribute("data-api-key") || "";
  var API_URL = (script.getAttribute("data-api-url") || scriptURL.origin) + "/api/check-email";
  var DEBOUNCE_MS = parseInt(script.getAttribute("data-debounce") || "600", 10);
  var ERROR_MSG = script.getAttribute("data-error-message") || "Temporary email addresses are not allowed.";
  var ERROR_COLOR = script.getAttribute("data-error-color") || "#ef4444";
  var ERROR_BORDER = script.getAttribute("data-error-border") || "#f87171";
  var ORIGINAL_BORDERS = new WeakMap();
  var TIMERS = new WeakMap();
  var PENDING = new WeakMap();

  function createErrorEl(input) {
    var id = "__ts_err_" + Math.random().toString(36).slice(2);
    var el = document.createElement("span");
    el.id = id;
    el.setAttribute("aria-live", "polite");
    el.style.cssText = "display:block;margin-top:4px;font-size:0.875em;color:" + ERROR_COLOR + ";font-weight:500;";
    el.textContent = ERROR_MSG;
    input.parentNode.insertBefore(el, input.nextSibling);
    input._tsErrId = id;
    return el;
  }

  function showError(input) {
    if (!input._tsErrId || !document.getElementById(input._tsErrId)) {
      createErrorEl(input);
    }
    var el = document.getElementById(input._tsErrId);
    if (el) el.style.display = "block";
    if (!ORIGINAL_BORDERS.has(input)) {
      ORIGINAL_BORDERS.set(input, input.style.borderColor);
    }
    input.style.borderColor = ERROR_BORDER;
    input.style.backgroundColor = "rgba(239,68,68,0.07)";
    input.setCustomValidity(ERROR_MSG);
  }

  function clearError(input) {
    if (input._tsErrId) {
      var el = document.getElementById(input._tsErrId);
      if (el) el.style.display = "none";
    }
    var orig = ORIGINAL_BORDERS.get(input);
    input.style.borderColor = orig !== undefined ? orig : "";
    input.style.backgroundColor = "";
    input.setCustomValidity("");
  }

  function checkEmail(input, email) {
    if (PENDING.get(input)) return;
    PENDING.set(input, true);

    var headers = { "Content-Type": "application/json" };
    if (API_KEY) headers["Authorization"] = "Bearer " + API_KEY;

    fetch(API_URL, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ email: email }),
      // No credentials needed — authentication travels in the Authorization header (Bearer token).
      // This allows the request to work from any domain (cross-origin).
      credentials: "omit"
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.isDisposable) {
          showError(input);
        } else {
          clearError(input);
        }
      })
      .catch(function () { clearError(input); })
      .finally(function () { PENDING.set(input, false); });
  }

  function isEmailInput(el) {
    if (el.tagName !== "INPUT") return false;
    var t = (el.type || "").toLowerCase();
    var n = (el.name || "").toLowerCase();
    var p = (el.placeholder || "").toLowerCase();
    var id = (el.id || "").toLowerCase();
    return (
      t === "email" ||
      n.indexOf("email") !== -1 ||
      p.indexOf("email") !== -1 ||
      id.indexOf("email") !== -1
    );
  }

  function attachToInput(input) {
    if (input._tsAttached) return;
    input._tsAttached = true;

    input.addEventListener("input", function () {
      clearTimeout(TIMERS.get(input));
      clearError(input);
      var val = input.value.trim();
      if (!val || val.indexOf("@") === -1) return;
      TIMERS.set(input, setTimeout(function () {
        checkEmail(input, val);
      }, DEBOUNCE_MS));
    });

    input.addEventListener("blur", function () {
      clearTimeout(TIMERS.get(input));
      var val = input.value.trim();
      if (val && val.indexOf("@") !== -1) {
        checkEmail(input, val);
      }
    });
  }

  function scanInputs(root) {
    var inputs = (root || document).querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) {
      if (isEmailInput(inputs[i])) attachToInput(inputs[i]);
    }
  }

  function init() {
    scanInputs(document);
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType === 1) {
            if (isEmailInput(node)) attachToInput(node);
            scanInputs(node);
          }
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

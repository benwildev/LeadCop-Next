"use strict";
(function () {
  "use strict";

  // 1. Setup Configuration
  var sc =
    document.currentScript ||
    (function () {
      var t = document.getElementsByTagName("script");
      return t[t.length - 1];
    })();

  var origin = new URL(sc.src).origin;
  var apiKey = sc.getAttribute("data-api-key") || "";
  var apiUrl = (sc.getAttribute("data-api-url") || origin) + "/api/check-email";
  var gateActive = sc.getAttribute("data-gate") === "true";
  var debounceMs = parseInt(sc.getAttribute("data-debounce") || "600", 10);

  // Read toggle flags (defaults match LeadCop defaults)
  var checkDisposable = sc.getAttribute("data-check-disposable") !== "false";
  var checkRole = sc.getAttribute("data-check-role") !== "false";
  var checkMx = sc.getAttribute("data-check-mx") !== "false";
  var checkTld = sc.getAttribute("data-check-tld") !== "false";
  var checkForwarding = sc.getAttribute("data-check-forwarding") === "true";
  var checkFree = sc.getAttribute("data-check-free") === "true";
  var checkSmtp = sc.getAttribute("data-check-smtp") === "true";

  // Colors
  var errColor = sc.getAttribute("data-error-color") || "#ef4444";
  var errBorder = sc.getAttribute("data-error-border") || "#f87171";

  // Messages
  var defaultErrMsg = sc.getAttribute("data-error-message") || "Temporary email addresses are not allowed.";
  var errTldMsg = sc.getAttribute("data-error-tld-message") || "Invalid domain. Please check for typos.";
  var errMxMsg = sc.getAttribute("data-error-mx-message") || "This email domain has no mail server — messages cannot be delivered.";
  var errRoleMsg = sc.getAttribute("data-error-role-message") || "Role-based accounts (like info@ or admin@) are not accepted.";
  var errFreeMsg = sc.getAttribute("data-error-free-message") || "Free email providers are not accepted. Please use a work email.";
  var errForwardMsg = sc.getAttribute("data-error-forward-message") || "Email relay/forwarding services are not permitted.";

  var origBorder = new WeakMap();
  var inFlight = new WeakMap();
  var validStates = new WeakMap();

  // 2. UI Helpers
  function getOrCreateSpan(input, color) {
    var existing = input._tsSpanId ? document.getElementById(input._tsSpanId) : null;
    if (!existing) {
      var span = document.createElement("span");
      span.id = "__ts_" + Math.random().toString(36).slice(2);
      span.setAttribute("aria-live", "polite");
      span.style.cssText = "display:block;margin-top:4px;font-size:0.875em;font-weight:500;";
      if (input.parentNode) input.parentNode.insertBefore(span, input.nextSibling);
      input._tsSpanId = span.id;
      existing = span;
    }
    existing.style.color = color;
    existing.style.display = "block";
    return existing;
  }

  function showError(input, msg) {
    var m = msg || defaultErrMsg;
    var span = getOrCreateSpan(input, errColor);
    span.textContent = m;
    if (!origBorder.has(input)) origBorder.set(input, input.style.borderColor);
    input.style.borderColor = errBorder;
    input.style.backgroundColor = "rgba(239, 68, 68, 0.07)";
    input.setCustomValidity(m); // Blocks HTML5 form submission natively
    validStates.set(input, false);
  }

  function clearAll(input) {
    if (input._tsSpanId) {
      var span = document.getElementById(input._tsSpanId);
      if (span) span.style.display = "none";
    }
    var orig = origBorder.get(input);
    input.style.borderColor = orig !== undefined ? orig : "";
    input.style.backgroundColor = "";
    input.setCustomValidity(""); // Clears HTML5 block
    validStates.set(input, true);
  }

  // 3. Core Logic
  function checkEmail(input, email) {
    if (inFlight.get(input)) return;
    inFlight.set(input, true);

    var headers = {
      "Content-Type": "application/json",
      "X-LeadCop-Source": "frontend-script",
    };
    if (gateActive) headers["X-LeadCop-Gate"] = "true";
    if (apiKey) headers["Authorization"] = "Bearer " + apiKey;

    fetch(apiUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify({ email: email, path: window.location.pathname }),
      credentials: "omit",
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        // Enforce the API payload results based strictly on configured toggles

        if (data.error) {
          showError(input, data.error);
        } else if (checkDisposable && data.isDisposable) {
          showError(input, defaultErrMsg);
        } else if (checkTld && data.isInvalidTld) {
          showError(input, errTldMsg);
        } else if (checkMx && data.mxValid === false) {
          showError(input, errMxMsg);
        } else if (checkRole && data.isRoleAccount) {
          showError(input, errRoleMsg);
        } else if (checkFree && data.isFreeEmail) {
          showError(input, errFreeMsg);
        } else if (checkForwarding && data.isForwarding) {
          showError(input, errForwardMsg);
        } else if (checkSmtp && data.smtpValid === false) {
           // Basic unroutable check using the default error message
          showError(input, "Undeliverable address.");
        } else {
          // Address passed all configured checks!
          clearAll(input);
        }
      })
      .catch(function () {
        // Fail open - don't block users if the API goes down
        clearAll(input);
      })
      .finally(function () {
        inFlight.set(input, false);
      });
  }

  function isEmailInput(el) {
    if (el.tagName !== "INPUT") return false;
    var type = (el.type || "").toLowerCase(),
      name = (el.name || "").toLowerCase(),
      ph = (el.placeholder || "").toLowerCase(),
      id = (el.id || "").toLowerCase();
    return (
      type === "email" ||
      name.indexOf("email") !== -1 ||
      ph.indexOf("email") !== -1 ||
      id.indexOf("email") !== -1
    );
  }

  function attachTo(input) {
    if (input._tsAttached) return;
    input._tsAttached = true;
    var timer = null;

    input.addEventListener("input", function () {
      clearTimeout(timer);
      clearAll(input);
      var val = input.value.trim();
      if (!val || val.indexOf("@") === -1) return;
      timer = setTimeout(function () {
        checkEmail(input, val);
      }, debounceMs);
    });

    input.addEventListener("blur", function () {
      clearTimeout(timer);
      var val = input.value.trim();
      if (val && val.indexOf("@") !== -1) checkEmail(input, val);
    });

    // Automatically recover state on any generic changes
    input.addEventListener("change", function () {
      clearAll(input);
    });

    if (gateActive) {
      var form = input.form;
      if (form) {
        form.addEventListener("submit", function (e) {
          if (validStates.get(input) === false) {
            e.preventDefault();
            input.focus();
            showError(input); // Re-emphasize the error
          }
        });
      }
    }
  }

  function scanAndAttach() {
    var inputs = document.querySelectorAll("input");
    for (var i = 0; i < inputs.length; i++) {
        if (isEmailInput(inputs[i])) attachTo(inputs[i]);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scanAndAttach);
  } else {
    scanAndAttach();
  }

  // Watch for dynamically added forms
  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var added = mutations[i].addedNodes;
      for (var j = 0; j < added.length; j++) {
        var node = added[j];
        if (node.nodeType !== 1) continue;
        if (isEmailInput(node)) {
          attachTo(node);
          continue;
        }
        var nested = node.querySelectorAll ? node.querySelectorAll("input") : [];
        for (var k = 0; k < nested.length; k++) {
            if (isEmailInput(nested[k])) attachTo(nested[k]);
        }
      }
    }
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true,
  });
})();

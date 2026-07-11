// utils.js - JWT decoder, JSON formatter, Base64 encoder, Regex matcher, and real-time Hashing

document.addEventListener("DOMContentLoaded", () => {
  // 1. JWT Decoder
  const jwtInput = document.getElementById("util-jwt-input");
  const jwtOutput = document.getElementById("util-jwt-output");
  if (jwtInput && jwtOutput) {
    jwtInput.addEventListener("input", () => {
      const token = jwtInput.value.trim();
      if (!token) {
        jwtOutput.classList.add("hidden");
        return;
      }
      try {
        const parts = token.split(".");
        if (parts.length < 2 || parts.length > 3) {
          throw new Error("Invalid JWT token format. Must contain a header, payload, and signature separated by dots.");
        }
        
        const decodePart = (str) => {
          str = str.replace(/-/g, "+").replace(/_/g, "/");
          while (str.length % 4) str += "=";
          return decodeURIComponent(atob(str).split("").map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)).join(""));
        };

        const headerJson = JSON.parse(decodePart(parts[0]));
        const payloadJson = JSON.parse(decodePart(parts[1]));

        jwtOutput.classList.remove("hidden");
        jwtOutput.innerText = `Header:\n${JSON.stringify(headerJson, null, 2)}\n\nPayload:\n${JSON.stringify(payloadJson, null, 2)}`;
      } catch (err) {
        jwtOutput.classList.remove("hidden");
        jwtOutput.innerText = `Decoding failed: ${err.message}`;
      }
    });
  }

  // 2. JSON Formatter
  const jsonInput = document.getElementById("util-json-input");
  const jsonOutput = document.getElementById("util-json-output");
  const btnBeautify = document.getElementById("btn-util-json-beautify");
  const btnMinify = document.getElementById("btn-util-json-minify");

  if (jsonInput && jsonOutput) {
    const processJSON = (beautify = true) => {
      const text = jsonInput.value.trim();
      if (!text) {
        jsonOutput.classList.add("hidden");
        return;
      }
      try {
        const parsed = JSON.parse(text);
        jsonOutput.classList.remove("hidden");
        jsonOutput.innerText = beautify ? JSON.stringify(parsed, null, 2) : JSON.stringify(parsed);
      } catch (err) {
        jsonOutput.classList.remove("hidden");
        jsonOutput.innerText = `Formatting failed: ${err.message}`;
      }
    };

    if (btnBeautify) btnBeautify.addEventListener("click", () => processJSON(true));
    if (btnMinify) btnMinify.addEventListener("click", () => processJSON(false));
  }

  // 3. Base64 Converter
  const b64Input = document.getElementById("util-base64-input");
  const b64Output = document.getElementById("util-base64-output");
  const btnEncode = document.getElementById("btn-util-base64-encode");
  const btnDecode = document.getElementById("btn-util-base64-decode");

  if (b64Input && b64Output) {
    if (btnEncode) {
      btnEncode.addEventListener("click", () => {
        const txt = b64Input.value;
        if (!txt) {
          b64Output.classList.add("hidden");
          return;
        }
        try {
          const encoded = btoa(unescape(encodeURIComponent(txt)));
          b64Output.classList.remove("hidden");
          b64Output.innerText = encoded;
        } catch (e) {
          b64Output.classList.remove("hidden");
          b64Output.innerText = `Encoding failed: ${e.message}`;
        }
      });
    }

    if (btnDecode) {
      btnDecode.addEventListener("click", () => {
        const txt = b64Input.value.trim();
        if (!txt) {
          b64Output.classList.add("hidden");
          return;
        }
        try {
          const decoded = decodeURIComponent(escape(atob(txt)));
          b64Output.classList.remove("hidden");
          b64Output.innerText = decoded;
        } catch (e) {
          b64Output.classList.remove("hidden");
          b64Output.innerText = `Decoding failed: Invalid Base64 character string.`;
        }
      });
    }
  }

  // 4. Regex Pattern Matcher
  const regexPattern = document.getElementById("util-regex-pattern");
  const regexString = document.getElementById("util-regex-string");
  const regexOutput = document.getElementById("util-regex-output");

  if (regexPattern && regexString && regexOutput) {
    const runRegexMatch = () => {
      const pat = regexPattern.value.trim();
      const str = regexString.value;
      if (!pat || !str) {
        regexOutput.classList.add("hidden");
        return;
      }
      try {
        const re = new RegExp(pat, "g");
        const matches = Array.from(str.matchAll(re));
        
        regexOutput.classList.remove("hidden");
        if (matches.length === 0) {
          regexOutput.innerText = "No pattern matches found.";
        } else {
          let output = `Found ${matches.length} matches:\n\n`;
          matches.forEach((m, idx) => {
            output += `${idx + 1}. Match: "${m[0]}" at offset index ${m.index}\n`;
          });
          regexOutput.innerText = output;
        }
      } catch (e) {
        regexOutput.classList.remove("hidden");
        regexOutput.innerText = `Invalid Regular Expression pattern: ${e.message}`;
      }
    };

    regexPattern.addEventListener("input", runRegexMatch);
    regexString.addEventListener("input", runRegexMatch);
  }

  // 5. SHA-256 / SHA-1 Hash Generator
  const hashInput = document.getElementById("util-hash-input");
  const hashOutput = document.getElementById("util-hash-output");

  if (hashInput && hashOutput) {
    hashInput.addEventListener("input", async () => {
      const val = hashInput.value;
      if (!val) {
        hashOutput.classList.add("hidden");
        return;
      }

      try {
        const buffer = new TextEncoder().encode(val);
        
        // Generate SHA-256
        const sha256Buffer = await crypto.subtle.digest("SHA-256", buffer);
        const sha256Hex = Array.from(new Uint8Array(sha256Buffer)).map(b => b.toString(16).padStart(2, "0")).join("");

        // Generate SHA-1
        const sha1Buffer = await crypto.subtle.digest("SHA-1", buffer);
        const sha1Hex = Array.from(new Uint8Array(sha1Buffer)).map(b => b.toString(16).padStart(2, "0")).join("");

        hashOutput.classList.remove("hidden");
        hashOutput.innerText = `SHA-256 Hash:\n${sha256Hex}\n\nSHA-1 Hash:\n${sha1Hex}`;
      } catch (e) {
        hashOutput.classList.remove("hidden");
        hashOutput.innerText = `Hash generation failed: ${e.message}`;
      }
    });
  }
});

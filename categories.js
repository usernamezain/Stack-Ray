// categories.js - The centralized technology detection engine

const CATEGORIES = [
  {
    name: "Frontend Frameworks",
    isCore: true,
    keys: [
      "React",
      "Vue",
      "Angular",
      "Svelte",
      "SolidJS",
      "Preact",
      "AlpineJS",
      "Lit",
      "Stencil",
      "Qwik",
      "Astro",
      "Ember",
      "Mithril",
      "Backbone",
      "Knockout",
      "Riot",
      "Marko",
      "Inferno",
      "Dojo",
    ],
  },
  {
    name: "Meta Frameworks",
    isCore: true,
    keys: [
      "NextJS",
      "NuxtJS",
      "Gatsby",
      "Remix",
      "SvelteKit",
      "RedwoodJS",
      "BlitzJS",
      "Hydrogen",
      "Analog",
      "SolidStart",
    ],
  },
  {
    name: "E-Commerce",
    isCore: true,
    keys: [
      "Shopify",
      "WooCommerce",
      "Magento",
      "PrestaShop",
      "BigCommerce",
      "OpenCart",
      "Wix",
      "Squarespace",
      "Salesforce Commerce Cloud",
      "SAP Upscale Commerce",
      "Shoplazza",
      "Ecwid",
      "Gumroad",
      "LemonSqueezy",
    ],
  },
  {
    name: "CMS & Platforms",
    isCore: true,
    keys: [
      "WordPress",
      "Webflow",
      "Bubble",
      "Ghost",
      "Drupal",
      "Joomla",
      "Contentful",
      "Sanity",
      "Strapi",
      "Prismic",
      "Squidex",
      "Directus",
      "PayloadCMS",
      "Umbraco",
      "Sitecore",
      "DatoCMS",
      "Hygraph",
      "Storyblok",
      "NetlifyCMS",
      "TinaCMS",
    ],
  },
  {
    name: "UI & CSS Frameworks",
    keys: [
      "Tailwind",
      "Bootstrap",
      "MaterialUI",
      "ChakraUI",
      "AntDesign",
      "RadixUI",
      "shadcn_ui",
      "DaisyUI",
      "Flowbite",
      "Bulma",
      "Foundation",
      "SemanticUI",
      "PureCSS",
      "Uikit",
      "Mantine",
      "Primer",
      "NaiveUI",
    ],
  },
  {
    name: "JavaScript Libraries",
    keys: [
      "jQuery",
      "Lodash",
      "Moment",
      "Axios",
      "ChartJS",
      "core-js",
      "Underscore",
      "Handlebars",
      "Redux",
      "Zustand",
      "Recoil",
      "TanStackQuery",
    ],
  },
  {
    name: "JavaScript",
    keys: [
      "WebSerial",
      "WebShare",
      "ScreenWakeLock",
      "DeviceOrientation",
      "Geolocation",
      "ClipboardAPI",
      "PaymentRequest",
      "CredentialManagement",
      "WebAuthn",
      "TrustedTypes",
      "ContentIndex",
      "SpeculationRules",
      "PriorityHints",
      "ResourceHints",
      "Preload",
      "Prefetch",
      "Preconnect",
      "DNSPrefetch",
      "Prerender",
      "ModulePreload",
    ],
  },
  {
    name: "Animation & Motion",
    keys: [
      "GSAP",
      "FramerMotion",
      "Lenis",
      "ThreeJS",
      "AnimeJS",
      "Lottie",
      "AOS",
      "Swiper",
      "LocomotiveScroll",
      "VelocityJS",
      "Popmotion",
      "MoJS",
      "KuteJS",
    ],
  },
  {
    name: "Analytics & Tracking",
    keys: [
      "GoogleAnalytics",
      "GoogleTagManager",
      "Mixpanel",
      "Amplitude",
      "Segment",
      "Hotjar",
      "FullStory",
      "PostHog",
      "Sentry",
      "LogRocket",
      "Heap",
      "Clarity",
      "Matomo",
      "Plausible",
      "Fathom",
      "SimpleAnalytics",
      "Clicky",
    ],
  },
  {
    name: "Marketing & Ads",
    keys: [
      "GoogleAdSense",
      "FacebookPixel",
      "TwitterPixel",
      "LinkedInInsight",
      "HubSpot",
      "Mailchimp",
      "Klaviyo",
      "ActiveCampaign",
      "Intercom",
      "Drift",
      "Zendesk",
      "Typeform",
      "ConvertKit",
      "Drip",
      "Braze",
      "Pardot",
      "Marketo",
    ],
  },
  {
    name: "Payments & Auth",
    keys: [
      "Stripe",
      "PayPal",
      "Clerk",
      "Auth0",
      "NextAuth",
      "FirebaseAuth",
      "SupabaseAuth",
      "Paddle",
      "Adyen",
      "Razorpay",
      "Braintree",
      "Okta",
    ],
  },
  {
    name: "Programming Languages",
    keys: ["TypeScript", "NodeJS", "PHP", "Python", "Ruby", "Go", "Rust"],
  },
  {
    name: "Backend & Database",
    keys: [
      "Firebase",
      "Supabase",
      "MySQL",
      "PostgreSQL",
      "MongoDB",
      "Redis",
      "Hasura",
      "PocketBase",
      "Appwrite",
    ],
  },
  {
    name: "Hosting & Infrastructure",
    keys: [
      "Vercel",
      "Netlify",
      "Cloudflare",
      "AWS",
      "GoogleCloud",
      "Azure",
      "Heroku",
      "DigitalOcean",
      "Fly_io",
      "Railway",
      "Render",
    ],
  },
  {
    name: "Core Web Tech",
    isCore: true,
    keys: [
      "HTML5",
      "CSS3",
      "JavaScript",
      "WebAssembly",
      "ServiceWorkers",
      "ProgressiveWebApp",
      "WebRTC",
      "WebGPU",
      "WebSockets",
    ],
  },
];

class TechDetector {
  constructor() {
    this.detected = {};
    this.implications = {
      NextJS: ["React", "NodeJS"],
      NuxtJS: ["Vue", "NodeJS"],
      Gatsby: ["React", "NodeJS"],
      Remix: ["React", "NodeJS"],
      SvelteKit: ["Svelte", "NodeJS"],
      WooCommerce: ["WordPress", "PHP"],
      shadcn_ui: ["Tailwind", "RadixUI", "React"],
      v0_AI: ["Tailwind", "React", "shadcn_ui"],
      NextAuth: ["NextJS", "React"],
      RTKQuery: ["Redux"],
      ReactHookForm: ["React"],
      Formik: ["React"],
      Tailwind: ["PostCSS"],
      ThreeJS: ["WebGL"],
      MapboxGL: ["WebGL"],
      StripeElements: ["Stripe"],
      FirebaseAuth: ["Firebase"],
      SupabaseAuth: ["Supabase"],
      Ember: ["Handlebars"],
      Backbone: ["Underscore"],
      Hydrogen: ["Remix", "React", "Shopify"],
      "Salesforce Commerce Cloud": ["Demandware"],
      Express: ["NodeJS"],
      NaiveUI: ["Vue"],
      NextJS: ["React", "NodeJS", "TypeScript"],
      NuxtJS: ["Vue", "NodeJS", "TypeScript"],
    };
  }

  detect(htmlContent) {
    this.detected = {};
    this.detectFromGlobals();
    this.detectFromDOM();
    this.detectFromScripts();
    this.detectFromContent(htmlContent);
    this.detectBrowserAPIs();
    this.resolveImplications();
    return this.formatResults();
  }

  detectFromScripts() {
    const scripts = Array.from(document.scripts);
    for (const script of scripts) {
      const src = script.src;
      const content = script.textContent;

      if (src.includes("gtm.js")) this.addDetection("GoogleTagManager");
      if (src.includes("gtag/js")) this.addDetection("GoogleAnalytics");
      if (src.includes("vue")) this.addDetection("Vue");
      if (src.includes("react")) this.addDetection("React");
      if (src.includes("naive-ui")) this.addDetection("NaiveUI");
      if (src.includes("core-js")) this.addDetection("core-js");
      if (src.includes("express")) this.addDetection("Express");

      // Check for TypeScript in content or src
      if (src.includes(".ts") || content.includes(".ts"))
        this.addDetection("TypeScript");

      // Version detection from URL
      const versionMatch = src.match(/@(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        // Try to associate version with tech
        for (const tech of Object.keys(this.detected)) {
          if (src.toLowerCase().includes(tech.toLowerCase())) {
            this.detected[tech].version = versionMatch[1];
          }
        }
      }
    }
  }

  detectBrowserAPIs() {
    const apis = {
      WebSerial: () => !!navigator.serial,
      WebShare: () => !!navigator.share,
      ScreenWakeLock: () => !!navigator.wakeLock,
      DeviceOrientation: () => !!window.DeviceOrientationEvent,
      Geolocation: () => !!navigator.geolocation,
      ClipboardAPI: () => !!navigator.clipboard,
      PaymentRequest: () => !!window.PaymentRequest,
      CredentialManagement: () => !!navigator.credentials,
      WebAuthn: () => !!window.PublicKeyCredential,
      TrustedTypes: () => !!window.trustedTypes,
      ContentIndex: () => !!navigator.contentIndex,
      SpeculationRules: () =>
        document.querySelector('script[type="speculationrules"]'),
      PriorityHints: () =>
        document.querySelector("img[importance], script[importance]"),
      ResourceHints: () =>
        document.querySelector(
          'link[rel="dns-prefetch"], link[rel="preconnect"]',
        ),
      Preload: () => document.querySelector('link[rel="preload"]'),
      Prefetch: () => document.querySelector('link[rel="prefetch"]'),
      Preconnect: () => document.querySelector('link[rel="preconnect"]'),
      DNSPrefetch: () => document.querySelector('link[rel="dns-prefetch"]'),
      Prerender: () => document.querySelector('link[rel="prerender"]'),
      ModulePreload: () => document.querySelector('link[rel="modulepreload"]'),
    };

    for (const [name, check] of Object.entries(apis)) {
      try {
        if (check()) this.addDetection(name);
      } catch (e) {}
    }
  }

  addDetection(name, version = null) {
    if (!this.detected[name]) {
      this.detected[name] = {
        detected: true,
        version: version,
        category: this.getCategory(name),
      };
    }
  }

  getCategory(name) {
    for (const cat of CATEGORIES) {
      if (cat.keys.includes(name)) return cat.name;
    }
    return "Other";
  }

  detectFromGlobals() {
    const globals = {
      React: () =>
        window.React ||
        window.ReactDOM ||
        !!window.__REACT_DEVTOOLS_GLOBAL_HOOK__,
      Vue: () =>
        window.Vue || !!window.__VUE__ || !!window.__VUE_DEVTOOLS_GLOBAL_HOOK__,
      Angular: () => window.angular || !!window.ng,
      Svelte: () => window.__svelte,
      jQuery: () => window.jQuery || window.$,
      NextJS: () => window.__NEXT_DATA__ || window.next,
      NuxtJS: () => window.__NUXT__,
      GSAP: () => window.gsap || window.TweenMax,
      ThreeJS: () => window.THREE || window.__THREE__,
      Shopify: () => window.Shopify,
      Webflow: () => window.Webflow,
      Wix: () => window.wixData,
      Bubble: () => window.bubble_session,
      GoogleAnalytics: () => window.ga || window.gtag,
      GoogleTagManager: () => window.dataLayer,
      Stripe: () => window.Stripe,
      PayPal: () => window.paypal,
      Firebase: () => window.firebase,
      Supabase: () => window.supabase,
      Intercom: () => window.Intercom,
      HubSpot: () => window.HubSpotGui || window.hs,
      Ember: () => window.Ember,
      Mithril: () => window.m,
      Backbone: () => window.Backbone,
      Knockout: () => window.ko,
      Lodash: () => window._ && window._.VERSION,
      Moment: () => window.moment,
      Axios: () => window.axios,
      ChartJS: () => window.Chart,
      "core-js": () => window["__core-js_shared__"],
      NaiveUI: () => window.naive,
      TypeScript: () => !!window.ts || !!window.TypeScript,
    };

    for (const [tech, checker] of Object.entries(globals)) {
      try {
        const result = checker();
        if (result) {
          let version = null;
          if (tech === "React" && window.React) version = window.React.version;
          if (tech === "jQuery" && window.jQuery)
            version = window.jQuery.fn.jquery;
          if (tech === "NextJS" && window.next) version = window.next.version;
          if (tech === "Lodash" && window._) version = window._.VERSION;
          if (tech === "core-js" && result.versions) {
            version = result.versions[0].version; // Get the most recent one
          }
          this.addDetection(tech, version);
        }
      } catch (e) {}
    }
  }

  detectFromDOM() {
    const domRules = {
      React: "[data-reactroot], [data-reactid]",
      Vue: "[data-v-app], [data-v-]",
      Angular: "[ng-version], [ng-app]",
      AlpineJS: "[x-data]",
      Tailwind: '[class*="flex"], [class*="grid"], [class*="md:"]',
      Bootstrap: ".container, .row, .col-md-",
      WordPress: 'link[href*="wp-content"], .wordpress',
      Webflow: "html[data-wf-page], html[data-wf-site]",
      Wix: 'meta[name="generator"][content*="Wix.com"]',
      NextJS: 'script[src*="/_next/"]',
      NuxtJS: 'script[src*="/_nuxt/"]',
      Gatsby: 'script[id="gatsby-chunk-mapping"]',
      Astro: "astro-island, [data-astro-cid]",
      RadixUI: "[data-radix-collection-item]",
      Lucide: 'svg.lucide, i[class*="lucide"]',
      FontAwesome: ".fa, .fas, .far, .fab",
      Swiper: ".swiper, .swiper-container",
      Shopify: ".shopify-section, [id*='shopify']",
      WooCommerce: ".woocommerce, .wc-block",
      Mantine: ".mantine-",
      ChakraUI: ".chakra-",
      NaiveUI: ".n-config-provider, .n-button, .n-layout",
    };
    for (const [tech, selector] of Object.entries(domRules)) {
      if (document.querySelector(selector)) this.addDetection(tech);
    }
  }

  detectFromContent(html) {
    const patterns = {
      React: /react(?:\.development)?\.js|react-dom/i,
      Vue: /vue(?:\.global)?\.js|vue-router|@vue/i,
      Angular: /angular(?:\.min)?\.js|@angular/i,
      Svelte: /svelte(?:\.internal)?/i,
      NextJS: /\/_next\/|__NEXT_DATA__/i,
      NuxtJS: /\/_nuxt\/|__NUXT__/i,
      Gatsby: /gatsby/i,
      jQuery: /jquery|jQuery/i,
      GSAP: /gsap|greensock/i,
      Tailwind: /tailwindcss|tailwind/i,
      Bootstrap: /bootstrap/i,
      Stripe: /stripe\.com|stripe\.js/i,
      PayPal: /paypal\.com|paypalobjects/i,
      GoogleAnalytics: /google-analytics|gtag/i,
      GoogleTagManager: /googletagmanager/i,
      FacebookPixel: /fbevents\.js/i,
      Vercel: /vercel|vercel\.app/i,
      Netlify: /netlify|netlify\.app/i,
      Cloudflare: /cloudflare/i,
      Shopify: /shopify|myshopify\.com/i,
      WordPress: /wp-content|wp-includes/i,
      PHP: /PHPSESSID|meta\[name="generator"\]\[content\*="PHP"\]/i,
      HubSpot: /hubspot\.com|hs-scripts/i,
      Klaviyo: /klaviyo\.com/i,
      Mailchimp: /mailchimp\.com/i,
      Intercom: /intercomcdn\.com/i,
      Hotjar: /hotjar\.com/i,
      NaiveUI: /naive-ui/i,
      "core-js": /core-js/i,
    };
    for (const [tech, regex] of Object.entries(patterns)) {
      if (regex.test(html)) this.addDetection(tech);
    }
  }

  resolveImplications() {
    Object.keys(this.detected).forEach((tech) => {
      if (this.implications[tech]) {
        this.implications[tech].forEach((implied) =>
          this.addDetection(implied),
        );
      }
    });
  }

  formatResults() {
    return this.detected;
  }
}

// Attach to window for injection
window.TechDetector = TechDetector;
window.CATEGORIES = CATEGORIES;

// domain.js - Modular Domain WHOIS (RDAP) and Hosting Geolocation (ip-api) Scraper

window.fetchDomainInfo = async function(hostname) {
  const result = {
    hosting: null,
    whois: null,
    error: null
  };

  if (!hostname) {
    result.error = "No hostname provided";
    return result;
  }

  // Get second-level domain (e.g. "example.com" from "www.example.com")
  const parts = hostname.split('.');
  if (parts.length < 2) {
    result.error = "Invalid domain name";
    return result;
  }
  const secondLevelDomain = parts.slice(-2).join('.');

  // 1. Fetch Hosting Info (ISP, Geo, ASN)
  try {
    const hostRes = await fetch(`https://ip-api.com/json/${secondLevelDomain}?fields=status,message,country,city,isp,org,as`);
    const hostData = await hostRes.json();
    if (hostData && hostData.status === "success") {
      result.hosting = {
        isp: hostData.isp || hostData.org || "Unknown",
        location: `${hostData.city ? hostData.city + ", " : ""}${hostData.country || ""}`,
        asn: hostData.as || "Unknown"
      };
    } else {
      result.hosting = { error: hostData.message || "Failed to load" };
    }
  } catch (e) {
    result.hosting = { error: "Network error fetching hosting details" };
  }

  // 2. Fetch WHOIS Details via RDAP
  try {
    const rdapRes = await fetch(`https://rdap.org/domain/${secondLevelDomain}`);
    if (rdapRes.ok) {
      const rdapData = await rdapRes.json();
      
      // Parse registration/expiration dates
      let createdDate = "Unknown";
      let expiryDate = "Unknown";
      if (rdapData.events) {
        const regEvent = rdapData.events.find(e => e.eventAction === "registration");
        if (regEvent) createdDate = new Date(regEvent.eventDate).toLocaleDateString();
        const expEvent = rdapData.events.find(e => e.eventAction === "expiration");
        if (expEvent) expiryDate = new Date(expEvent.eventDate).toLocaleDateString();
      }

      // Parse registrar name
      let registrarName = "Unknown";
      if (rdapData.entities) {
        const registrarEntity = rdapData.entities.find(e => e.roles && e.roles.includes("registrar"));
        if (registrarEntity) {
          if (registrarEntity.vcardArray && registrarEntity.vcardArray[1]) {
            const fnEntry = registrarEntity.vcardArray[1].find(item => item[0] === "fn");
            if (fnEntry) registrarName = fnEntry[3];
          }
          if (registrarName === "Unknown" && registrarEntity.handle) {
            registrarName = registrarEntity.handle;
          }
        }
      }

      // Parse Name Servers
      let nameServers = "None";
      if (rdapData.nameservers && rdapData.nameservers.length > 0) {
        nameServers = rdapData.nameservers.map(ns => ns.ldhName.toLowerCase()).join(", ");
      }

      result.whois = {
        registrar: registrarName,
        registered: createdDate,
        expires: expiryDate,
        nameservers: nameServers
      };
    } else {
      result.whois = { error: `WHOIS/RDAP details not found (${rdapRes.status})` };
    }
  } catch (e) {
    result.whois = { error: "No public WHOIS details resolved" };
  }

  return result;
};

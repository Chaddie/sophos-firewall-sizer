import type {
  Environment,
  ProtectionLevel,
  SiteRole,
  TlsInspectionScope,
  VpnType,
  WafLicense,
} from "@/lib/sizing/types";

export const PROTECTION_INCLUDES: Record<ProtectionLevel, string[]> = {
  standard: [
    "Intrusion Prevention (IPS)",
    "Advanced Threat Protection (ATP)",
    "Web Protection and URL filtering",
    "Application Control",
    "Network-level anti-malware scanning (perimeter traffic)",
    "Security Heartbeat",
  ],
  xstream: [
    "Intrusion Prevention (IPS)",
    "Advanced Threat Protection (ATP)",
    "Full Web Protection and URL filtering",
    "Application Control",
    "Network-level anti-malware scanning (perimeter traffic)",
    "Security Heartbeat",
    "Zero-Day Protection (cloud sandboxing of unknown files)",
    "Xstream SSL/TLS deep packet inspection",
    "Xstream deep packet inspection for evasive threats/apps",
  ],
};

export const PROTECTION_NOT_INCLUDED = [
  "Email Protection (separate Sophos Email license)",
  "Web Server Protection / WAF (separate license — see below)",
  "Zero Trust Network Access (separate license)",
];

export const XSTREAM_MDR_NOTE =
  "If a customer wishes to integrate a Sophos Firewall into the MDR Service, the firewall is required to have Xstream Protection.";

export const ENVIRONMENT_TOOLTIPS: Record<Environment, string> = {
  physical:
    "A dedicated Sophos XGS hardware appliance installed on site. Best when you need physical WAN/LAN ports and a fixed, supportable platform.",
  virtual:
    "Sophos Firewall as a virtual machine on VMware, Hyper-V, KVM, or similar. You provide the hypervisor and allocate vCPU/RAM.",
  aws: "Sophos Firewall deployed as a virtual appliance on Amazon EC2. Sized to an SFv license tier mapped to an instance type.",
  azure:
    "Sophos Firewall deployed as a virtual machine in Microsoft Azure. Sized to an SFv license tier mapped to a VM size.",
};

export const SITE_ROLE_TOOLTIPS: Record<SiteRole, string> = {
  hq: "Main office or headquarters. Often higher traffic, more VPN hubs, and may warrant a larger 1U/2U model.",
  branch: "Remote or branch office. Typically lower throughput and fewer concurrent users.",
  datacenter:
    "Central or hosted datacenter location. Expect higher throughput, internal segmentation, and HA.",
  cloud_edge:
    "Firewall protecting cloud workloads or connecting cloud networks to on-premise sites.",
};

export const WAN_FIELD_TOOLTIPS = {
  totalWanBandwidthMbps:
    "The contracted or maximum speed of your internet/WAN circuit (e.g. 100 Mbps, 1 Gbps).",
  averageWanConsumptionMbps:
    "Typical internet usage during business hours — not the line speed, but what you actually consume on average.",
  expectedPeakThroughputMbps:
    "The highest concurrent internet throughput you expect during busy periods (backups, video, large transfers).",
  wanGrowth3yrPercent:
    "How much you expect average usage to grow over the next three years, as a percentage.",
};

export const TLS_INSPECTION_TOOLTIPS: Record<TlsInspectionScope, string> = {
  full: "Most HTTPS traffic is decrypted and inspected. Highest security; requires the most firewall throughput (especially with Xstream).",
  selective:
    "Only selected categories, users, or domains are SSL-inspected. A balance of security and performance.",
  minimal:
    "Little or no TLS inspection. Lower firewall load, but encrypted threats may pass through unchecked.",
};

export const VPN_TYPE_TOOLTIPS: Record<VpnType, string> = {
  none: "No site-to-site or remote-access VPN terminates on this firewall.",
  ipsec:
    "Site-to-site VPN tunnels (e.g. branch to HQ, partner networks). Common with SD-WAN and IPsec VPN.",
  ssl: "Remote access VPN for users connecting with the Sophos Connect client or browser SSL VPN.",
  both: "You use both site-to-site IPsec and remote-access SSL VPN on this firewall.",
};

export const VPN_FIELD_TOOLTIPS = {
  ipsecTunnels:
    "Maximum number of IPsec site-to-site tunnels active at the same time.",
  sslVpnTunnels:
    "Maximum number of remote-access SSL VPN users or sessions connected concurrently.",
  peakVpnThroughputMbps:
    "Peak combined throughput across all VPN tunnels during busy periods.",
};

export const USER_FIELD_TOOLTIPS = {
  endpointCount:
    "Total employees, PCs, phones, printers, servers, or other devices at this location — even if they do not authenticate directly to the firewall.",
  userAuthEnabled:
    "Whether users log in via VPN, captive portal, or other firewall authentication (not general Active Directory use alone).",
  authUserCount:
    "Users who will authenticate through the firewall for VPN, captive portal, or similar.",
  internalTrafficEnabled:
    "Whether traffic between internal VLANs, DMZs, or subnets is routed through the firewall (hairpinned) rather than switched locally.",
  internalTrafficMbps:
    "Estimated peak traffic between internal segments that passes through the firewall.",
};

export const HA_TOOLTIPS = {
  haRequired:
    "A redundant pair of firewalls in high availability mode. Requires two appliances plus Enhanced Support and an upgrade entitlement.",
};

export const ACCESSORY_FIELD_TOOLTIPS = {
  requiresSfpPlus:
    "Select yes if this site needs SFP+ fibre uplinks on the firewall appliance.",
  includeSophosTransceivers:
    "If yes, Sophos-branded SFP+ optics will be added to the quote using the SKUs configured in Catalog admin.",
  sfpTransceiverType:
    "SR (short-range) for multimode fibre within a building or campus; LR (long-range) for single-mode fibre over longer distances.",
  sfpTransceiverCount:
    "Total number of Sophos SFP+ transceivers to include on the quote for this site.",
  redundantPsuRequired:
    "Adds a spare / redundant power supply unit for each physical appliance (SKU configured per model in Catalog admin).",
};

export const WAF_LICENSE_TOOLTIPS: Record<WafLicense, string> = {
  not_required:
    "You do not need to protect published web applications with a Web Application Firewall on this firewall.",
  required:
    "Add a Web Server Protection (WAF) license. Provides OWASP-style protection for web servers — this is not included in Standard or Xstream protection bundles.",
};

export const WAF_LICENSE_LABELS: Record<WafLicense, string> = {
  not_required: "Not required",
  required: "Required — add Web Server Protection (WAF) license",
};

export const PROTECTION_TOOLTIPS: Record<ProtectionLevel, string> = {
  standard:
    "Sophos Standard Protection subscription. Network and web threat stack without Zero-Day file sandboxing or Xstream deep packet inspection.",
  xstream:
    "Sophos Xstream Protection subscription (recommended default). Adds Zero-Day Protection and Xstream deep packet inspection, and sizes on Xstream SSL/TLS throughput — allow extra headroom vs Standard. If a customer wishes to integrate a Sophos Firewall into the MDR Service, the firewall is required to have Xstream Protection.",
};

export const CONTACT_FIELD_TOOLTIPS = {
  customerName: "Optional — helps your Sophos Account Management team follow up on this sizing request.",
  customerEmail:
    "Optional — your account team can send the recommendation or clarifying questions here.",
};

export const SITE_FIELD_TOOLTIPS = {
  siteName:
    "A short, recognizable name for this location (e.g. \"HQ - London\", \"Warehouse 2\"). Used to label products for this site in the final bill of materials.",
};

export const PRODUCT_TOGGLE_TOOLTIPS = {
  firewall:
    "Size a Sophos Firewall appliance or virtual machine for this site based on bandwidth, VPN, and user requirements.",
  switches:
    "Size Sophos Switch 200/1000 series hardware for this site based on port count, speed, and PoE requirements.",
  wireless:
    "Collect the information the presales wireless team needs to scope Sophos Access Points for this site. APs are not sized automatically — this starts a handoff to a specialist.",
};

export const SWITCH_FIELD_TOOLTIPS = {
  switchPortCount:
    "Total number of Ethernet ports needed at this location, including uplinks and any spare ports for future devices.",
  switchQuantity:
    "How many identical switches of the sized model to quote (for example multi-closet campuses). Port and PoE answers describe each unit's requirements.",
  needs2_5GbE:
    "Some access points, cameras, and modern laptops need 2.5GbE (multi-gigabit) ports to reach their full speed over Ethernet.",
  needs10GbE:
    "10GbE ports are typically used for servers, storage, or high-bandwidth workstations that need more than 1 Gbps.",
  needs10GbSfpUplink:
    "A 10Gb fiber (SFP+) uplink connects this switch back to your core/distribution switch or firewall at high speed, often over longer distances than copper.",
  needsPoE:
    "Power over Ethernet lets the switch supply power to devices like access points, cameras, and VoIP phones over the same cable as data, avoiding separate power adapters.",
  poe30wDeviceCount:
    "Devices needing up to 30W (802.3at / PoE+) — e.g. most Wi-Fi 6 access points, PTZ cameras.",
  poeBt60wDeviceCount:
    "Devices needing up to 60W (802.3bt Type 3/4 / PoE++) — e.g. Wi-Fi 6E/7 access points, heated PTZ cameras, some VoIP conference phones.",
};

export const WIRELESS_FIELD_TOOLTIPS = {
  facilityType:
    "The type of building or space affects expected foot traffic and construction, both of which influence access point density and placement.",
  ceilingHeight:
    "Higher ceilings reduce Wi-Fi signal strength at floor level and may change how many access points are needed or how they're mounted.",
  numberOfFloors:
    "Multi-floor buildings need access points planned per floor — Wi-Fi signal does not pass well between floors, especially through concrete or metal decking.",
  internalWallMaterial:
    "Dense materials (concrete, brick, metal studs) attenuate Wi-Fi signal more than drywall or glass, affecting how many access points are needed.",
  externalWallMaterial:
    "Exterior wall material affects how much signal leaks outside the building and how much attenuation to expect near perimeter walls.",
  floorPlanNotes:
    "A rough description of the space and its size helps the presales wireless team estimate access point count before the full survey is completed.",
  sitePlanFiles:
    "Attach floor plans, CAD drawings, or site photos. These help the presales wireless team perform an accurate remote or on-site survey.",
  totalUsers:
    "Total number of people who will connect to the wireless network at this site.",
  usersPerAp:
    "Expected number of concurrent users per access point. Lower numbers (e.g. 15–20) suit high-density areas; higher numbers suit general office space.",
  lowSignalAcceptableAreas:
    "Areas where weaker Wi-Fi signal is acceptable, so the survey can skip unnecessary access point placement (e.g. restrooms, storage rooms).",
  highBandwidthAreas:
    "Areas where users need the most bandwidth (e.g. video calls, streaming, large file transfers) — these may need additional access points or wired backhaul.",
  devicesPerUser:
    "Average number of Wi-Fi devices each user connects (phone, laptop, etc.) — higher device density increases capacity requirements.",
  suggestedApModels:
    "Preferred Sophos AP6 model for this site. The presales wireless team will validate suitability based on the site survey.",
  unavailableChannels:
    "Wi-Fi channels that are already congested or reserved by neighboring networks, to avoid during the survey and channel planning.",
  restrictedChannels:
    "Regulatory or site-specific restrictions on which Wi-Fi channels or frequencies may be used (e.g. radar-restricted DFS channels, local regulations).",
};

export const WIRELESS_DESIGN_GOAL_TOOLTIPS = {
  capacity:
    "Prioritizes supporting many concurrent devices/users in a dense space (e.g. stadiums, auditoriums, classrooms) — usually means more, lower-power APs.",
  coverage:
    "Prioritizes signal reach across a large area with lower user density (e.g. warehouses, outdoor spaces) — usually means fewer, higher-power APs.",
};

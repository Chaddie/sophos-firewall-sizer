import fs from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { sophosBrand } from "../lib/brand";

type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "callout"; text: string };

interface Section {
  heading: string;
  blocks: Block[];
}

interface GuideSpec {
  filename: string;
  title: string;
  subtitle: string;
  intro: string;
  sections: Section[];
}

const { colors } = sophosBrand;

function renderCover(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  const bandHeight = 190;
  doc.rect(0, 0, doc.page.width, bandHeight).fill(colors.navy);

  doc
    .fillColor(colors.white)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text("SOPHOS", 50, 50, { characterSpacing: 3 });

  doc
    .fillColor(colors.turquoise)
    .font("Helvetica")
    .fontSize(9)
    .text(sophosBrand.tagline.toUpperCase(), 50, 68, { characterSpacing: 1.5 });

  doc
    .fillColor(colors.white)
    .font("Helvetica-Bold")
    .fontSize(25)
    .text(title, 50, 105, { width: doc.page.width - 100 });

  doc
    .fillColor(colors.grey2)
    .font("Helvetica")
    .fontSize(13)
    .text(subtitle, 50, doc.y + 6, { width: doc.page.width - 100 });

  doc.x = 50;
  doc.y = bandHeight + 35;
}

function renderIntro(doc: PDFKit.PDFDocument, contentWidth: number, intro: string) {
  doc
    .fillColor(colors.gray)
    .font("Helvetica-Oblique")
    .fontSize(11)
    .text(intro, { width: contentWidth, lineGap: 3 });
  doc.moveDown(1.2);
}

function renderSection(
  doc: PDFKit.PDFDocument,
  contentWidth: number,
  index: number,
  section: Section,
) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 80) {
    doc.addPage();
  }

  doc.x = doc.page.margins.left;
  doc
    .fillColor(colors.navy)
    .font("Helvetica-Bold")
    .fontSize(15)
    .text(`${index}. ${section.heading}`, { width: contentWidth });
  doc
    .moveTo(doc.page.margins.left, doc.y + 4)
    .lineTo(doc.page.margins.left + 40, doc.y + 4)
    .lineWidth(2)
    .strokeColor(colors.blue)
    .stroke();
  doc.moveDown(0.8);

  for (const block of section.blocks) {
    doc.x = doc.page.margins.left;

    if (block.type === "paragraph") {
      doc
        .fillColor(colors.ink)
        .font("Helvetica")
        .fontSize(10.5)
        .text(block.text, { width: contentWidth, lineGap: 3 });
      doc.moveDown(0.6);
    } else if (block.type === "bullets") {
      doc.font("Helvetica").fontSize(10.5).fillColor(colors.ink);
      for (const item of block.items) {
        doc.text(`\u2022  ${item}`, {
          width: contentWidth,
          lineGap: 3,
          indent: 0,
        });
        doc.moveDown(0.2);
      }
      doc.moveDown(0.5);
    } else if (block.type === "callout") {
      doc
        .fillColor(colors.blue)
        .font("Helvetica-Bold")
        .fontSize(10.5)
        .text(`Important: ${block.text}`, { width: contentWidth, lineGap: 3 });
      doc.moveDown(0.8);
    }
  }

  doc.moveDown(0.4);
}

function generateGuide(spec: GuideSpec, outDir: string) {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: spec.title,
      Subject: spec.subtitle,
      Author: "Sophos",
    },
  });

  const outPath = path.join(outDir, spec.filename);
  doc.pipe(fs.createWriteStream(outPath));

  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  renderCover(doc, spec.title, spec.subtitle);
  renderIntro(doc, contentWidth, spec.intro);

  spec.sections.forEach((section, i) => {
    renderSection(doc, contentWidth, i + 1, section);
  });

  doc.end();
  console.log(`Generated ${outPath}`);
}

const accountManagerGuide: GuideSpec = {
  filename: "account-manager-guide.pdf",
  title: "Sophos Hardware Sizing Tool",
  subtitle: "Account Manager, Sales Engineer & Partner Guide",
  intro:
    "This guide covers creating sizing links, the Flag \u2192 SE Review \u2192 export workflow, partner access, catalog admin (admins only), and how to reopen or correct a submission.",
  sections: [
    {
      heading: "What this tool does",
      blocks: [
        {
          type: "paragraph",
          text: "The Sophos Hardware Sizing tool turns a customer's environment details into a right-sized hardware recommendation for Sophos Firewalls, Switches, and Wireless access points. Use it as the sizing engine of record for Firewall/Switch intake and SE discussion. Pricing, terms, and some subscription SKUs still belong in CPQ/spreadsheet until fully mapped.",
        },
        {
          type: "bullets",
          items: [
            "Send a customer a guided multi-site questionnaire (Firewall / Switches / Wireless)",
            "Get Minimum / Recommended / Optimal model tiers plus a consolidated bill of materials (BOM)",
            "Hand off wireless / AP scoping to the Sophos presales wireless team (no fake AP BOM)",
            "Flag for SE review, notify the AM when reviewed or needs changes, then export",
          ],
        },
      ],
    },
    {
      heading: "Roles",
      blocks: [
        {
          type: "bullets",
          items: [
            "Account Manager \u2014 creates links, sees only their own requests, flags for SE, exports after review",
            "Sales Engineer \u2014 sees all requests, SE review queue (flagged), marks reviewed / needs changes, can apply SE corrections",
            "Partner \u2014 magic-link access to create sizing links for their deals (sponsored by an SE)",
            "Admin \u2014 catalog admin, archive, and BOM recalculate after catalog changes",
          ],
        },
      ],
    },
    {
      heading: "Creating and sharing a sizing link",
      blocks: [
        {
          type: "paragraph",
          text: "From the dashboard, click \u201cNew link\u201d. Enter a customer label, vanity slug, contact name/email, and optional expiry. Copy the link and send it to your contact. Anyone on the same email domain can unlock the wizard after confirming their email.",
        },
        {
          type: "callout",
          text: "You receive an in-app notification (and email when configured) when the customer submits.",
        },
      ],
    },
    {
      heading: "Flag \u2192 SE Review \u2192 export",
      blocks: [
        {
          type: "bullets",
          items: [
            "AM: open the submitted request, optionally add a note, click Flag for SE \u2014 the aligned SE is notified by default (optional Notify all SEs)",
            "SE: use the dashboard \u201cSE queue\u201d filter (review = flagged), open the request, work the checklist (opportunity ID, wireless handoff, sizing-only SKUs), add notes or a needs-changes template, then Mark reviewed or Needs changes",
            "AM is notified in-app (and by email when configured) when SE sets reviewed or needs_changes",
            "AM CSV / quote export stays locked until reviewStatus is reviewed (SEs can always export)",
          ],
        },
        {
          type: "callout",
          text: "Always complete SE review before pasting a BOM into CPQ. Treat the tool as sizing guidance until subscription/support SKUs are fully orderable.",
        },
      ],
    },
    {
      heading: "Reading the recommendation",
      blocks: [
        {
          type: "bullets",
          items: [
            "Each site card shows binding constraint, why Recommended differs from Minimum, confidence (Green / Amber / Red), and sizing notes",
            "Minimum / Recommended / Optimal use capacity headroom bands (\u226525% / \u226550% throughput, or spare switch ports) \u2014 not catalog index +1/+2",
            "Catalog provenance (version, source, as-of) appears under Why this size",
          ],
        },
      ],
    },
    {
      heading: "Resubmit and SE correction",
      blocks: [
        {
          type: "bullets",
          items: [
            "Allow customer resubmit \u2014 reopens the vanity link; prior BOM stays visible until they submit again, then the old version is archived",
            "SE correction \u2014 SE edits answers in-app, recalculates the BOM, archives the prior version, and marks the request reviewed",
            "Submission history on the request page lists archived versions (customer resubmit, SE correction, catalog recompute)",
          ],
        },
      ],
    },
    {
      heading: "Partners",
      blocks: [
        {
          type: "paragraph",
          text: "SEs invite partners from the Partners page with a one-time magic link. Partners sign in via email, create sizing links for their customers, and follow the same Flag \u2192 SE review workflow. Partners do not manage the catalog.",
        },
      ],
    },
    {
      heading: "Catalog admin (admins only)",
      blocks: [
        {
          type: "paragraph",
          text: "Only admins can open Catalog admin to edit firewall/switch/accessory specs and SKUs, import CSV, view the audit trail, and recalculate BOMs for open submitted deals after catalog changes. Sales Engineers do not get catalog edit access.",
        },
      ],
    },
    {
      heading: "Troubleshooting",
      blocks: [
        {
          type: "bullets",
          items: [
            "Wrong customer answers: Allow customer resubmit or use SE correction \u2014 do not create a duplicate link unless the slug must change",
            "Export disabled for AM: wait for SE Mark reviewed, or ask an SE to export",
            "Link expired or archived: create a new link, or unarchive (admin) if appropriate",
            "Email domain mismatch: contact email domain must match the customer\u2019s work domain",
          ],
        },
      ],
    },
  ],
};

const customerGuide: GuideSpec = {
  filename: "customer-guide.pdf",
  title: "Sophos Hardware Sizing Questionnaire",
  subtitle: "Customer Guide",
  intro:
    "Your Sophos account manager or partner has sent you a link to a short questionnaire covering your firewall, switch, and/or wireless requirements. This guide explains what to expect.",
  sections: [
    {
      heading: "What to expect",
      blocks: [
        {
          type: "paragraph",
          text: "The questionnaire takes about 10\u201315 minutes per site and helps your Sophos contact recommend the right Sophos hardware. You can add more than one site. Progress is saved automatically so you can finish later in the same browser (and on the server for this link).",
        },
      ],
    },
    {
      heading: "Opening the link",
      blocks: [
        {
          type: "bullets",
          items: [
            "Enter your work email address",
            "It must be on the same company domain the link was sent to",
            "This check is remembered for the browser session",
          ],
        },
      ],
    },
    {
      heading: "Completing the questionnaire",
      blocks: [
        {
          type: "bullets",
          items: [
            "Sites \u2014 add each physical location",
            "Configure \u2014 progress shows Site X of Y · Firewall (etc.); branch sites use a shorter path with Advanced options for WAF/TLS/HA",
            "Review \u2014 confirm your answers, then submit",
            "You will not see model recommendations in the wizard \u2014 your account team reviews sizing after submit",
          ],
        },
        {
          type: "callout",
          text: "Progress is saved on this device and on the server. You can close the tab and resume later with the same link on another device.",
        },
      ],
    },
    {
      heading: "Information to have ready",
      blocks: [
        {
          type: "bullets",
          items: [
            "Firewall: circuit speed, typical and peak usage, VPN, user counts",
            "Switches: ports needed per unit, how many switch units, PoE device counts",
            "Wireless: facility details and a floor plan upload if available",
          ],
        },
      ],
    },
    {
      heading: "After you submit",
      blocks: [
        {
          type: "paragraph",
          text: "You will see a confirmation page. Your Account Manager or Sophos partner (depending on who sent the link) reviews the recommendation with a Sales Engineer as needed. If they ask you to correct answers, they will reopen the same link so you can submit again.",
        },
      ],
    },
  ],
};

const whenToUseGuide: GuideSpec = {
  filename: "when-to-use-sizer.pdf",
  title: "When to use the Sophos Hardware Sizer",
  subtitle: "One-pager for Account Managers & Partners",
  intro:
    "Use this sheet before creating a sizing link. It clarifies what the tool is (and is not), and how to close the Flag \u2192 Review \u2192 Export loop.",
  sections: [
    {
      heading: "Use the sizer when",
      blocks: [
        {
          type: "bullets",
          items: [
            "You need multi-site Firewall and/or Switch intake without a spreadsheet questionnaire",
            "You want a defensible Minimum / Recommended / Optimal size before CPQ",
            "Wireless needs a structured handoff to the wireless desk (not an auto AP BOM)",
            "An AM/partner and aligned SE will review before quote export",
          ],
        },
      ],
    },
    {
      heading: "Do not use it as",
      blocks: [
        {
          type: "bullets",
          items: [
            "A live Salesforce sync or list-price calculator",
            "A replacement for wireless desk design",
            "A place to show customers model SKUs (thanks page never shows the BOM)",
            "A source of orderable protection/WAF/support SKUs until Catalog admin maps them",
          ],
        },
      ],
    },
    {
      heading: "How to flag SE",
      blocks: [
        {
          type: "bullets",
          items: [
            "Create the link with an aligned SE selected",
            "After submit, Flag for SE (aligned SE notified by default)",
            "SE works the checklist, marks Reviewed, then export unlocks for the AM",
          ],
        },
        {
          type: "callout",
          text: "Pilot success: higher complete-submit %, faster flag\u2192reviewed latency, export-after-review rate. Admins: /dashboard/admin/pilot.",
        },
      ],
    },
  ],
};

function main() {
  const outDir = path.join(__dirname, "..", "public", "guides");
  fs.mkdirSync(outDir, { recursive: true });

  generateGuide(accountManagerGuide, outDir);
  generateGuide(customerGuide, outDir);
  generateGuide(whenToUseGuide, outDir);
}

main();

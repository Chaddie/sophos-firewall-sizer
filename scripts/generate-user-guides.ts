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
  subtitle: "Account Manager & Sales Engineer Guide",
  intro:
    "This guide walks Account Managers and Sales Engineers through creating sizing links, sharing them with customers, and reviewing the recommendations that come back.",
  sections: [
    {
      heading: "What this tool does",
      blocks: [
        {
          type: "paragraph",
          text: "The Sophos Hardware Sizing tool turns a customer's environment details into a right-sized hardware recommendation for Sophos Firewalls, Switches, and Wireless access points.",
        },
        {
          type: "bullets",
          items: [
            "Send a customer a simple, guided questionnaire covering one or more sites",
            "Get back Minimum / Recommended / Optimal firewall and switch model options with a bill of materials (BOM)",
            "Hand off wireless / access point scoping to the Sophos presales wireless team",
            "Track every sizing request from a single dashboard",
          ],
        },
      ],
    },
    {
      heading: "Signing in and roles",
      blocks: [
        {
          type: "paragraph",
          text: "Sign in with the email and password provided by your team. Your role determines what you see on the dashboard:",
        },
        {
          type: "bullets",
          items: [
            "Account Manager \u2014 sees only the sizing links you personally created, and the submissions against them",
            "Sales Engineer \u2014 sees every sizing link across the team, who created each one, and can access Catalog admin",
          ],
        },
      ],
    },
    {
      heading: "Creating a sizing link",
      blocks: [
        {
          type: "paragraph",
          text: "From the dashboard, click \u201cNew link\u201d to open the create-request form. You will need:",
        },
        {
          type: "bullets",
          items: [
            "Customer / company label (required) \u2014 shown to the customer on the questionnaire",
            "Vanity URL slug \u2014 auto-suggested from the label, or set your own",
            "Contact name (optional) and contact email (required) \u2014 the person at the customer you are sending the link to",
            "Link expiry (optional) \u2014 after this date the link stops accepting submissions",
          ],
        },
        {
          type: "paragraph",
          text: "After submitting, you will land on the request's detail page with a copyable link to send to the customer.",
        },
      ],
    },
    {
      heading: "Sharing the link with the customer",
      blocks: [
        {
          type: "paragraph",
          text: "Copy the link and send it to your contact directly (for example, by email). When they open it:",
        },
        {
          type: "bullets",
          items: [
            "They are first asked to confirm their email address",
            "Access is granted to anyone using an email on the same domain as the contact email you entered \u2014 not only that one exact address",
            "Once verified, they see the sizing questionnaire (Sites, Configure, and Review steps)",
          ],
        },
      ],
    },
    {
      heading: "Reviewing a submission",
      blocks: [
        {
          type: "paragraph",
          text: "Once the customer submits, the request's detail page shows:",
        },
        {
          type: "bullets",
          items: [
            "A consolidated bill of materials (BOM) across all sites and products",
            "Per-site breakdowns for Firewall, Switches, and Wireless",
            "Minimum / Recommended / Optimal tier options you can switch between per site \u2014 the BOM updates automatically",
            "A wireless handoff button to email or download a summary for the Sophos presales wireless team, when wireless was requested",
          ],
        },
      ],
    },
    {
      heading: "Before you quote the customer",
      blocks: [
        {
          type: "callout",
          text: "Always review the auto-generated recommendation with your Sales Engineer before sending a formal quote to the customer. The tool provides a starting point based on the answers given \u2014 it does not replace a technical review.",
        },
      ],
    },
    {
      heading: "Catalog admin (Sales Engineers only)",
      blocks: [
        {
          type: "paragraph",
          text: "Sales Engineers can open \u201cCatalog admin\u201d from the navigation to edit the firewall and switch models the sizing engine recommends from, including order SKUs, without needing a redeploy.",
        },
      ],
    },
    {
      heading: "Troubleshooting",
      blocks: [
        {
          type: "bullets",
          items: [
            "Link expired: create a new link for the customer \u2014 expired links no longer accept submissions",
            "Customer says their email does not match: double-check the contact email domain you entered matches the customer's actual email domain",
            "Older links created before this feature has no contact email on file, so any customer can open them \u2014 email verification is only enforced when a contact email is on record",
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
    "Your Sophos account manager has sent you a link to a short questionnaire covering your firewall, switch, and/or wireless requirements. This guide explains what to expect.",
  sections: [
    {
      heading: "What to expect",
      blocks: [
        {
          type: "paragraph",
          text: "The questionnaire takes about 10\u201315 minutes per site and helps your Sophos account manager recommend the right Sophos hardware for your environment. You can add more than one site if you are sizing multiple locations.",
        },
      ],
    },
    {
      heading: "Opening the link",
      blocks: [
        {
          type: "paragraph",
          text: "When you open the link, you will first be asked to confirm your email address.",
        },
        {
          type: "bullets",
          items: [
            "Enter your work email address",
            "It must be on the same company domain the link was sent to (for example, if the link was sent to yourname@yourcompany.com, any @yourcompany.com email will work)",
            "This is a one-time check per browser session, so you will not be asked again if you come back to finish later in the same session",
          ],
        },
      ],
    },
    {
      heading: "Completing the questionnaire",
      blocks: [
        {
          type: "paragraph",
          text: "The questionnaire has three steps:",
        },
        {
          type: "bullets",
          items: [
            "Sites \u2014 add each physical location you want sized",
            "Configure \u2014 for each site, choose which products apply (Firewall, Switches, Wireless / access points) and answer the relevant questions",
            "Review \u2014 a summary of what you have entered before you submit",
          ],
        },
        {
          type: "paragraph",
          text: "Required fields are marked with an asterisk (*). If you try to continue with something missing, the page will jump to the first field that needs your attention.",
        },
      ],
    },
    {
      heading: "Information to have ready",
      blocks: [
        {
          type: "bullets",
          items: [
            "Firewall: internet circuit speed, typical and peak usage, VPN requirements (site-to-site / SD-WAN and remote access), user counts",
            "Switches: number of ports needed, PoE device counts",
            "Wireless: facility type, ceiling height, number of floors, wall materials, and a floor plan (you can upload a file)",
          ],
        },
      ],
    },
    {
      heading: "After you submit",
      blocks: [
        {
          type: "paragraph",
          text: "You will see a confirmation page \u2014 no further action is needed on your part. Your Sophos Account Manager will review your requirements and follow up with a recommended solution.",
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
}

main();

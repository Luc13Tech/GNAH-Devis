import jsPDF from "jspdf";
import type {
  AppSettings,
  Quote,
} from "@/lib/types";
import {
  money,
  quoteFileName,
} from "@/lib/format";

async function loadImage(
  src: string,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image =
      new Image();

    image.onload = () =>
      resolve(image);

    image.onerror = () =>
      resolve(null);

    image.src = src;
  });
}

function imageRatio(
  image: HTMLImageElement,
) {
  if (
    !image.naturalWidth ||
    !image.naturalHeight
  ) {
    return 1;
  }

  return (
    image.naturalWidth /
    image.naturalHeight
  );
}

function drawWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const lines =
    pdf.splitTextToSize(
      text || "",
      maxWidth,
    );

  pdf.text(
    lines,
    x,
    y,
  );

  return (
    y +
    lines.length *
      lineHeight
  );
}

export async function downloadQuotePDF(
  quote: Quote,
  settings: AppSettings,
) {
  const pdf =
    await createQuotePDF(
      quote,
      settings,
    );

  pdf.save(
    quoteFileName(
      quote,
    ),
  );
}

export async function printQuotePDF(
  quote: Quote,
  settings: AppSettings,
) {
  const pdf =
    await createQuotePDF(
      quote,
      settings,
    );

  const blob =
    pdf.output("blob");

  const url =
    URL.createObjectURL(
      blob,
    );

  const printWindow =
    window.open(
      url,
      "_blank",
    );

  if (!printWindow) {
    URL.revokeObjectURL(
      url,
    );

    throw new Error(
      "La fenêtre d'impression a été bloquée.",
    );
  }

  printWindow.onload =
    () => {
      printWindow.focus();
      printWindow.print();
    };

  window.setTimeout(
    () => {
      URL.revokeObjectURL(
        url,
      );
    },
    60000,
  );
}

async function createQuotePDF(
  quote: Quote,
  settings: AppSettings,
) {
  const pdf =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

  const pageWidth =
    pdf.internal.pageSize
      .getWidth();

  const pageHeight =
    pdf.internal.pageSize
      .getHeight();

  const margin = 15;

  const contentWidth =
    pageWidth -
    margin * 2;

  const company =
    settings.company;

  const logo =
    company.logoPath
      ? await loadImage(
          company.logoPath,
        )
      : null;

  const stamp =
    company.stampPath
      ? await loadImage(
          company.stampPath,
        )
      : null;

  const signature =
    company.signaturePath
      ? await loadImage(
          company.signaturePath,
        )
      : null;

  let y = 15;

  /*
   * ================================
   * HEADER
   * ================================
   */

  pdf.setDrawColor(
    225,
    225,
    225,
  );

  pdf.setLineWidth(
    0.3,
  );

  if (logo) {
    const maxLogoWidth =
      38;

    const maxLogoHeight =
      24;

    const ratio =
      imageRatio(logo);

    let logoWidth =
      maxLogoWidth;

    let logoHeight =
      logoWidth / ratio;

    if (
      logoHeight >
      maxLogoHeight
    ) {
      logoHeight =
        maxLogoHeight;

      logoWidth =
        logoHeight *
        ratio;
    }

    pdf.addImage(
      logo,
      "PNG",
      margin,
      y,
      logoWidth,
      logoHeight,
    );
  }

  const companyX =
    margin +
    (logo
      ? 44
      : 0);

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    13,
  );

  pdf.setTextColor(
    25,
    25,
    25,
  );

  pdf.text(
    `${company.name} ${company.legalForm}`,
    companyX,
    y + 5,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    90,
    90,
    90,
  );

  let companyY =
    y + 10;

  companyY =
    drawWrappedText(
      pdf,
      `NINEA : ${company.ninea}`,
      companyX,
      companyY,
      80,
      3.8,
    );

  companyY =
    drawWrappedText(
      pdf,
      company.rcs,
      companyX,
      companyY,
      80,
      3.8,
    );

  companyY =
    drawWrappedText(
      pdf,
      company.address,
      companyX,
      companyY,
      80,
      3.8,
    );

  companyY =
    drawWrappedText(
      pdf,
      `${company.phone} • ${company.email}`,
      companyX,
      companyY,
      80,
      3.8,
    );

  /*
   * DEVIS BOX
   */

  const boxWidth =
    50;

  const boxHeight =
    27;

  const boxX =
    pageWidth -
    margin -
    boxWidth;

  const boxY =
    y;

  pdf.setFillColor(
    247,
    243,
    233,
  );

  pdf.roundedRect(
    boxX,
    boxY,
    boxWidth,
    boxHeight,
    3,
    3,
    "F",
  );

  pdf.setTextColor(
    70,
    70,
    70,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7,
  );

  pdf.text(
    "DEVIS",
    boxX + 5,
    boxY + 7,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    15,
  );

  pdf.setTextColor(
    20,
    20,
    20,
  );

  pdf.text(
    quote.number,
    boxX + 5,
    boxY + 14,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7.5,
  );

  pdf.text(
    `Date : ${formatPDFDate(
      quote.date,
    )}`,
    boxX + 5,
    boxY + 21,
  );

  y += 36;

  /*
   * ================================
   * TITLE
   * ================================
   */

  pdf.setDrawColor(
    205,
    205,
    205,
  );

  pdf.line(
    margin,
    y,
    pageWidth -
      margin,
    y,
  );

  y += 9;

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    17,
  );

  pdf.setTextColor(
    24,
    24,
    24,
  );

  pdf.text(
    "DEVIS",
    margin,
    y,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    8,
  );

  pdf.setTextColor(
    100,
    100,
    100,
  );

  pdf.text(
    quote.projectName ||
      "Projet",
    margin,
    y + 6,
  );

  /*
   * ================================
   * CLIENT + PROJET
   * ================================
   */

  y += 17;

  const gap = 7;

  const infoWidth =
    (contentWidth -
      gap) /
    2;

  const infoHeight =
    31;

  pdf.setFillColor(
    249,
    249,
    249,
  );

  pdf.roundedRect(
    margin,
    y,
    infoWidth,
    infoHeight,
    2,
    2,
    "F",
  );

  pdf.roundedRect(
    margin +
      infoWidth +
      gap,
    y,
    infoWidth,
    infoHeight,
    2,
    2,
    "F",
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    90,
    90,
    90,
  );

  pdf.text(
    "CLIENT",
    margin + 5,
    y + 7,
  );

  pdf.text(
    "PROJET",
    margin +
      infoWidth +
      gap +
      5,
    y + 7,
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    9,
  );

  pdf.setTextColor(
    30,
    30,
    30,
  );

  pdf.text(
    quote.client.name ||
      "Client",
    margin + 5,
    y + 14,
  );

  if (
    quote.client.company
  ) {
    pdf.setFont(
      "helvetica",
      "normal",
    );

    pdf.setFontSize(
      7.5,
    );

    pdf.text(
      quote.client.company,
      margin + 5,
      y + 20,
    );
  }

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    90,
    90,
    90,
  );

  let clientY =
    y + 25;

  const clientContact =
    [
      quote.client.phone,
      quote.client.email,
    ]
      .filter(Boolean)
      .join(" • ");

  if (clientContact) {
    pdf.text(
      clientContact,
      margin + 5,
      clientY,
    );
  }

  if (
    quote.client.address
  ) {
    pdf.text(
      quote.client.address,
      margin + 5,
      clientY + 4,
    );
  }

  const projectX =
    margin +
    infoWidth +
    gap +
    5;

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    9,
  );

  pdf.setTextColor(
    30,
    30,
    30,
  );

  pdf.text(
    quote.projectName ||
      "Projet",
    projectX,
    y + 14,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    90,
    90,
    90,
  );

  drawWrappedText(
    pdf,
    quote.projectDescription ||
      "Description du projet",
    projectX,
    y + 20,
    infoWidth - 10,
    3.8,
  );

  y +=
    infoHeight +
    12;

  /*
   * ================================
   * ITEMS TABLE
   * ================================
   */

  const colDescription =
    89;

  const colQuantity =
    17;

  const colUnit =
    38;

  const colTotal =
    contentWidth -
    colDescription -
    colQuantity -
    colUnit;

  const tableX =
    margin;

  const rowHeight =
    9;

  pdf.setFillColor(
    35,
    45,
    43,
  );

  pdf.roundedRect(
    tableX,
    y,
    contentWidth,
    rowHeight,
    1.5,
    1.5,
    "F",
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.text(
    "DÉSIGNATION",
    tableX + 5,
    y + 6,
  );

  pdf.text(
    "QTÉ",
    tableX +
      colDescription +
      5,
    y + 6,
  );

  pdf.text(
    "PRIX UNIT.",
    tableX +
      colDescription +
      colQuantity +
      5,
    y + 6,
  );

  pdf.text(
    "TOTAL",
    tableX +
      colDescription +
      colQuantity +
      colUnit +
      5,
    y + 6,
  );

  y += rowHeight;

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7.5,
  );

  for (
    const item of quote.items
  ) {
    const description =
      item.description ||
      "Prestation";

    const descriptionLines =
      pdf.splitTextToSize(
        description,
        colDescription - 10,
      );

    const currentRowHeight =
      Math.max(
        rowHeight,
        descriptionLines.length *
          4 +
          5,
      );

    if (
      y +
        currentRowHeight >
      pageHeight - 45
    ) {
      drawFooter(
        pdf,
        settings,
        pageWidth,
        pageHeight,
      );

      pdf.addPage();

      y = 20;

      drawContinuationHeader(
        pdf,
        quote,
        pageWidth,
        margin,
      );

      y = 35;

      pdf.setFillColor(
        35,
        45,
        43,
      );

      pdf.rect(
        tableX,
        y,
        contentWidth,
        rowHeight,
        "F",
      );

      pdf.setFont(
        "helvetica",
        "bold",
      );

      pdf.setFontSize(
        7,
      );

      pdf.setTextColor(
        255,
        255,
        255,
      );

      pdf.text(
        "DÉSIGNATION",
        tableX + 5,
        y + 6,
      );

      pdf.text(
        "QTÉ",
        tableX +
          colDescription +
          5,
        y + 6,
      );

      pdf.text(
        "PRIX UNIT.",
        tableX +
          colDescription +
          colQuantity +
          5,
        y + 6,
      );

      pdf.text(
        "TOTAL",
        tableX +
          colDescription +
          colQuantity +
          colUnit +
          5,
        y + 6,
      );

      y += rowHeight;

      pdf.setFont(
        "helvetica",
        "normal",
      );

      pdf.setFontSize(
        7.5,
      );
    }

    if (
      quote.items.indexOf(
        item,
      ) %
        2 ===
      1
    ) {
      pdf.setFillColor(
        250,
        250,
        250,
      );

      pdf.rect(
        tableX,
        y,
        contentWidth,
        currentRowHeight,
        "F",
      );
    }

    pdf.setDrawColor(
      225,
      225,
      225,
    );

    pdf.line(
      tableX,
      y +
        currentRowHeight,
      tableX +
        contentWidth,
      y +
        currentRowHeight,
    );

    pdf.setTextColor(
      40,
      40,
      40,
    );

    pdf.text(
      descriptionLines,
      tableX + 5,
      y + 5,
    );

    pdf.text(
      String(
        item.quantity,
      ),
      tableX +
        colDescription +
        5,
      y + 5,
    );

    pdf.text(
      money(
        item.unitPrice,
        quote.currencySymbol,
      ),
      tableX +
        colDescription +
        colQuantity +
        5,
      y + 5,
    );

    pdf.text(
      money(
        item.quantity *
          item.unitPrice,
        quote.currencySymbol,
      ),
      tableX +
        colDescription +
        colQuantity +
        colUnit +
        5,
      y + 5,
    );

    y +=
      currentRowHeight;
  }

  /*
   * ================================
   * TOTALS
   * ================================
   */

  const totals =
    quoteTotalsSafe(
      quote,
    );

  const totalsWidth =
    72;

  const totalsX =
    pageWidth -
    margin -
    totalsWidth;

  y += 6;

  if (
    y + 45 >
    pageHeight - 35
  ) {
    drawFooter(
      pdf,
      settings,
      pageWidth,
      pageHeight,
    );

    pdf.addPage();

    y = 20;

    drawContinuationHeader(
      pdf,
      quote,
      pageWidth,
      margin,
    );

    y = 38;
  }

  pdf.setFontSize(
    7.5,
  );

  pdf.setTextColor(
    80,
    80,
    80,
  );

  pdf.text(
    "Sous-total",
    totalsX,
    y + 5,
  );

  pdf.text(
    money(
      totals.subtotal,
      quote.currencySymbol,
    ),
    pageWidth -
      margin,
    y + 5,
    {
      align: "right",
    },
  );

  let totalY =
    y + 11;

  if (
    totals.discount > 0
  ) {
    pdf.text(
      "Remise",
      totalsX,
      totalY,
    );

    pdf.text(
      `-${money(
        totals.discount,
        quote.currencySymbol,
      )}`,
      pageWidth -
        margin,
      totalY,
      {
        align: "right",
      },
    );

    totalY += 6;
  }

  if (quote.applyTax) {
    pdf.text(
      `TVA ${quote.taxRate}%`,
      totalsX,
      totalY,
    );

    pdf.text(
      money(
        totals.tax,
        quote.currencySymbol,
      ),
      pageWidth -
        margin,
      totalY,
      {
        align: "right",
      },
    );

    totalY += 7;
  }

  pdf.setFillColor(
    35,
    45,
    43,
  );

  pdf.roundedRect(
    totalsX - 3,
    totalY - 4,
    totalsWidth + 3,
    12,
    2,
    2,
    "F",
  );

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    8,
  );

  pdf.setTextColor(
    255,
    255,
    255,
  );

  pdf.text(
    "TOTAL TTC",
    totalsX + 2,
    totalY + 4,
  );

  pdf.text(
    money(
      totals.total,
      quote.currencySymbol,
    ),
    pageWidth -
      margin -
      2,
    totalY + 4,
    {
      align: "right",
    },
  );

  y =
    totalY +
    18;

  /*
   * ================================
   * NOTES / CONDITIONS
   * ================================
   */

  const notesWidth =
    contentWidth * 0.57;

  if (
    quote.notes ||
    quote.terms
  ) {
    if (
      y + 45 >
      pageHeight - 35
    ) {
      drawFooter(
        pdf,
        settings,
        pageWidth,
        pageHeight,
      );

      pdf.addPage();

      y = 20;

      drawContinuationHeader(
        pdf,
        quote,
        pageWidth,
        margin,
      );

      y = 37;
    }

    if (quote.notes) {
      pdf.setFont(
        "helvetica",
        "bold",
      );

      pdf.setFontSize(
        7.5,
      );

      pdf.setTextColor(
        40,
        40,
        40,
      );

      pdf.text(
        "NOTES",
        margin,
        y,
      );

      pdf.setFont(
        "helvetica",
        "normal",
      );

      pdf.setFontSize(
        7,
      );

      pdf.setTextColor(
        90,
        90,
        90,
      );

      y =
        drawWrappedText(
          pdf,
          quote.notes,
          margin,
          y + 5,
          notesWidth,
          3.8,
        ) + 3;
    }

    if (quote.terms) {
      pdf.setFont(
        "helvetica",
        "bold",
      );

      pdf.setFontSize(
        7.5,
      );

      pdf.setTextColor(
        40,
        40,
        40,
      );

      pdf.text(
        "CONDITIONS",
        margin,
        y,
      );

      pdf.setFont(
        "helvetica",
        "normal",
      );

      pdf.setFontSize(
        7,
      );

      pdf.setTextColor(
        90,
        90,
        90,
      );

      drawWrappedText(
        pdf,
        quote.terms,
        margin,
        y + 5,
        notesWidth,
        3.8,
      );
    }
  }

  /*
   * ================================
   * SIGNATURE + CACHET
   * ================================
   */

  let signatureY =
    pageHeight - 47;

  if (
    y >
    signatureY - 10
  ) {
    drawFooter(
      pdf,
      settings,
      pageWidth,
      pageHeight,
    );

    pdf.addPage();

    y = 20;

    drawContinuationHeader(
      pdf,
      quote,
      pageWidth,
      margin,
    );

    signatureY =
      pageHeight - 47;
  }

  const signatureAreaWidth =
    55;

  const signatureX =
    pageWidth -
    margin -
    signatureAreaWidth;

  const stampX =
    signatureX -
    67;

  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    80,
    80,
    80,
  );

  pdf.text(
    "CACHEt / CACHET",
    stampX,
    signatureY,
  );

  pdf.text(
    "SIGNATURE",
    signatureX,
    signatureY,
  );

  if (stamp) {
    addContainedImage(
      pdf,
      stamp,
      stampX,
      signatureY + 2,
      50,
      25,
    );
  }

  if (signature) {
    addContainedImage(
      pdf,
      signature,
      signatureX,
      signatureY + 2,
      signatureAreaWidth,
      25,
    );
  }

  /*
   * ================================
   * FOOTER
   * ================================
   */

  drawFooter(
    pdf,
    settings,
    pageWidth,
    pageHeight,
  );

  return pdf;
}

function addContainedImage(
  pdf: jsPDF,
  image: HTMLImageElement,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number,
) {
  const ratio =
    imageRatio(image);

  let width =
    maxWidth;

  let height =
    width / ratio;

  if (
    height >
    maxHeight
  ) {
    height =
      maxHeight;

    width =
      height * ratio;
  }

  pdf.addImage(
    image,
    "PNG",
    x,
    y,
    width,
    height,
  );
}

function drawFooter(
  pdf: jsPDF,
  settings: AppSettings,
  pageWidth: number,
  pageHeight: number,
) {
  const y =
    pageHeight - 11;

  pdf.setDrawColor(
    220,
    220,
    220,
  );

  pdf.setLineWidth(
    0.25,
  );

  pdf.line(
    15,
    y - 4,
    pageWidth - 15,
    y - 4,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    6.5,
  );

  pdf.setTextColor(
    110,
    110,
    110,
  );

  pdf.text(
    settings.company
      .footerText,
    15,
    y,
  );

  pdf.text(
    settings.company
      .website,
    pageWidth -
      15,
    y,
    {
      align: "right",
    },
  );
}

function drawContinuationHeader(
  pdf: jsPDF,
  quote: Quote,
  pageWidth: number,
  margin: number,
) {
  pdf.setFont(
    "helvetica",
    "bold",
  );

  pdf.setFontSize(
    10,
  );

  pdf.setTextColor(
    35,
    35,
    35,
  );

  pdf.text(
    `DEVIS ${quote.number}`,
    margin,
    20,
  );

  pdf.setFont(
    "helvetica",
    "normal",
  );

  pdf.setFontSize(
    7,
  );

  pdf.setTextColor(
    100,
    100,
    100,
  );

  pdf.text(
    "Suite du document",
    pageWidth -
      margin,
    20,
    {
      align: "right",
    },
  );

  pdf.setDrawColor(
    220,
    220,
    220,
  );

  pdf.line(
    margin,
    24,
    pageWidth -
      margin,
    24,
  );
}

function formatPDFDate(
  date: string,
) {
  if (!date) {
    return "";
  }

  const parts =
    date.split("-");

  if (
    parts.length !== 3
  ) {
    return date;
  }

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function quoteTotalsSafe(
  quote: Quote,
) {
  const subtotal =
    quote.items.reduce(
      (
        total,
        item,
      ) =>
        total +
        Number(
          item.quantity || 0,
        ) *
          Number(
            item.unitPrice ||
              0,
          ),
      0,
    );

  const discount =
    Math.max(
      0,
      Number(
        quote.discount || 0,
      ),
    );

  const taxable =
    Math.max(
      0,
      subtotal - discount,
    );

  const tax =
    quote.applyTax
      ? taxable *
        (Number(
          quote.taxRate || 0,
        ) /
          100)
      : 0;

  const total =
    taxable + tax;

  return {
    subtotal,
    discount,
    taxable,
    tax,
    total,
  };
}

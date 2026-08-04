import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  PDFPageProxy,
} from "pdfjs-dist";

export type { PDFDocumentProxy };

let workerConfigured = false;

async function getPdfJs() {
  const pdfjsLib = await import("pdfjs-dist/build/pdf.mjs");
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  return pdfjsLib;
}

export type RenderPageResult = {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
};

export function loadPdfDocument(
  source: ArrayBuffer | Uint8Array,
): Promise<PDFDocumentLoadingTask> {
  return getPdfJs().then((pdfjsLib) => pdfjsLib.getDocument({ data: source }));
}

export async function getPdfSource(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  targetWidth: number,
  maxHeight: number,
): Promise<RenderPageResult> {
  const page: PDFPageProxy = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const aspect = baseViewport.height / baseViewport.width;
  const width = Math.floor(Math.min(targetWidth, maxHeight / aspect));
  const viewport = page.getViewport({ scale: width / baseViewport.width });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, viewport }).promise;

  return { canvas, width: viewport.width, height: viewport.height };
}

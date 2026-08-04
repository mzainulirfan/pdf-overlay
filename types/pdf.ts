export type PdfDocumentInfo = {
  file: File;
  fileName: string;
  fileSize: number;
  totalPages: number;
  currentPage: number;
};

export type EditorStatus = "upload" | "editor";

export type EditorState = {
  status: EditorStatus;
  pdf: PdfDocumentInfo | null;
  isRendering: boolean;
  isExporting: boolean;
  error: string | null;
};
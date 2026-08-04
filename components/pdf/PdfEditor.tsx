"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createTextOverlay, type Overlay } from "@/types/overlay";
import type { PdfDocumentInfo } from "@/types/pdf";
import {
  getPdfSource,
  loadPdfDocument,
  renderPageToCanvas,
  type PDFDocumentProxy,
} from "@/lib/pdf-renderer";
import { exportPdfWithOverlays } from "@/lib/pdf-exporter";
import {
  isLikelyPdfFile,
  MAX_PDF_SIZE_BYTES,
  validateOverlayImage,
  validatePageCount,
  validatePdfFile,
} from "@/lib/file-validator";
import { loadImageFromOverlay } from "@/lib/overlay-renderer";
import {
  loadActiveTemplateId,
  loadTemplates,
  persistActiveTemplateId,
  persistTemplates,
} from "@/lib/template-store";
import {
  overlayFromStored,
  templateFromOverlays,
  type OverlayTemplate,
} from "@/types/template";
import ErrorMessage from "@/components/common/ErrorMessage";
import LoadingState from "@/components/common/LoadingState";
import PdfUploader from "@/components/pdf/PdfUploader";
import PdfNavigation from "@/components/pdf/PdfNavigation";
import PdfPagePreview from "@/components/pdf/PdfPagePreview";
import OverlayProperties from "@/components/overlay/OverlayProperties";
import TemplatePanel from "@/components/template/TemplatePanel";

type PdfjsDoc = PDFDocumentProxy;

export default function PdfEditor() {
  const [pdfInfo, setPdfInfo] = useState<PdfDocumentInfo | null>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfjsDoc | null>(null);
  const loadingTaskRef = useRef<{ destroy: () => void } | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCanvas, setPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });

  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [overlayImages, setOverlayImages] = useState<
    Record<string, HTMLImageElement | null>
  >({});
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  const [templates, setTemplates] = useState<OverlayTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);

  const [isRendering, setIsRendering] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const editorActiveRef = useRef(false);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(720);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const renderTokenRef = useRef(0);

  useEffect(() => {
    const node = previewContainerRef.current;
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const width = Math.floor(entries[0].contentRect.width);
      if (width > 0) setPreviewWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const task = queueMicrotask;
    task(() => {
      const stored = loadTemplates();
      setTemplates(stored);
      const active = loadActiveTemplateId();
      setActiveTemplateId(
        active && stored.some((t) => t.id === active) ? active : null,
      );
    });
  }, []);

  const applyTemplate = useCallback(async (template: OverlayTemplate) => {
    const nextOverlays: Overlay[] = [];
    const nextImages: Record<string, HTMLImageElement | null> = {};
    let firstId: string | null = null;

    const storedOverlays = Array.isArray(template.overlays) ? template.overlays : [];

    for (const stored of storedOverlays) {
      const id = `overlay-${crypto.randomUUID()}`;
      if (!firstId) firstId = id;
      const overlay = overlayFromStored(stored, id);
      nextOverlays.push(overlay);
      if (stored.type === "image" && stored.imageDataUrl) {
        try {
          const image = await loadImageFromOverlay({
            type: "image",
            imageUrl: stored.imageDataUrl,
          } as Overlay);
          nextImages[id] = image;
        } catch {
          nextImages[id] = null;
        }
      } else {
        nextImages[id] = null;
      }
    }

    setOverlays((prev) => [...prev, ...nextOverlays]);
    setOverlayImages((prev) => ({ ...prev, ...nextImages }));
    setSelectedOverlayId(firstId);
    setError(null);
  }, []);

  const handleSelectTemplate = useCallback(
    (id: string | null) => {
      setActiveTemplateId(id);
      persistActiveTemplateId(id);
      if (id) {
        const template = templates.find((t) => t.id === id);
        if (template) void applyTemplate(template);
      }
    },
    [templates, applyTemplate],
  );

  const handleSaveTemplate = useCallback(
    (name: string) => {
      if (overlays.length === 0) return;
      const template = templateFromOverlays(overlays, name);
      setTemplates((prev) => {
        const next = [...prev, template];
        persistTemplates(next);
        return next;
      });
      setActiveTemplateId(template.id);
      persistActiveTemplateId(template.id);
    },
    [overlays],
  );

  const handleDeleteTemplate = useCallback((id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      persistTemplates(next);
      return next;
    });
    setActiveTemplateId((prev) => {
      if (prev === id) {
        persistActiveTemplateId(null);
        return null;
      }
      return prev;
    });
  }, []);

  const handleSelectFile = useCallback(
    async (file: File) => {
      setError(null);
      const validation = validatePdfFile(file);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }
      const looksLikePdf = isLikelyPdfFile(file);

      try {
        const source = await getPdfSource(file);
        // Salinan terpisah untuk export. pdfjs mentransfer buffer ke worker
        // sehingga buffer asli bisa ter-detach.
        setPdfBytes(new Uint8Array(source.slice(0)));
        const loadingTask = await loadPdfDocument(new Uint8Array(source));
        let doc: PdfjsDoc;
        try {
          loadingTaskRef.current = loadingTask;
          doc = await loadingTask.promise;
        } catch (loadErr) {
          const message = String(loadErr);
          const isPasswordProtected =
            (loadErr as Error)?.name?.includes("Password") ||
            /encrypted|password/i.test(message);
          if (isPasswordProtected) {
            throw new Error("PDF yang dilindungi password belum didukung.");
          }
          throw new Error(
            looksLikePdf
              ? "File PDF tidak dapat dibaca atau rusak."
              : "Format file tidak didukung. Pilih file PDF.",
          );
        }

        const pageCheck = validatePageCount(doc.numPages);
        if (!pageCheck.ok) {
          loadingTask.destroy();
          loadingTaskRef.current = null;
          setError(pageCheck.message);
          return;
        }

        setPdfDoc(doc);
        setCurrentPage(1);
        setOverlays([]);
        setOverlayImages({});
        setSelectedOverlayId(null);
        setPdfInfo({
          file,
          fileName: file.name,
          fileSize: file.size,
          totalPages: doc.numPages,
          currentPage: 1,
        });

        if (activeTemplateId) {
          const template = templates.find((t) => t.id === activeTemplateId);
          if (template) void applyTemplate(template);
        }
      } catch (err) {
        setError((err as Error)?.message ?? "File tidak dapat diproses.");
      }
    },
    [templates, activeTemplateId, applyTemplate],
  );

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      let file: File | null = null;
      if (e.clipboardData?.files?.length) {
        for (const f of e.clipboardData.files) {
          if (f.type === "application/pdf" || /\.pdf$/i.test(f.name)) {
            file = f;
            break;
          }
        }
      }
      if (!file && e.clipboardData?.items) {
        for (const item of e.clipboardData.items) {
          if (item.kind === "file" && item.type === "application/pdf") {
            file = item.getAsFile();
            if (file) break;
          }
        }
      }
      if (file) {
        e.preventDefault();
        void handleSelectFile(file);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [handleSelectFile]);

  useEffect(() => {
    editorActiveRef.current = Boolean(pdfInfo && pdfDoc);
  }, [pdfInfo, pdfDoc]);

  useEffect(() => {
    let depth = 0;
    const onDragEnter = (e: DragEvent) => {
      if (!editorActiveRef.current) return;
      e.preventDefault();
      depth += 1;
      setDropActive(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!editorActiveRef.current) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };
    const onDragLeave = () => {
      if (!editorActiveRef.current) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDropActive(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!editorActiveRef.current) return;
      e.preventDefault();
      depth = 0;
      setDropActive(false);
      const file = Array.from(e.dataTransfer?.files ?? []).find(
        (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name),
      );
      if (file) void handleSelectFile(file);
    };
    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleSelectFile]);

  useEffect(() => {
    if (!pdfDoc) return;
    const token = ++renderTokenRef.current;

    const maxHeight = Math.floor(Math.min(window.innerHeight * 0.72, 1000));

    const run = async () => {
      setIsRendering(true);
      try {
        const { canvas, width, height } = await renderPageToCanvas(
          pdfDoc,
          currentPage,
          previewWidth,
          maxHeight,
        );
        if (token !== renderTokenRef.current) return;
        setPageCanvas(canvas);
        setPageSize({ width, height });
        setError(null);
      } catch {
        if (token !== renderTokenRef.current) return;
        setError("Halaman tidak dapat ditampilkan.");
      } finally {
        if (token === renderTokenRef.current) setIsRendering(false);
      }
    };

    void run();
  }, [pdfDoc, currentPage, previewWidth]);

  const goToPage = useCallback(
    (page: number) => {
      if (!pdfDoc) return;
      const next = Math.min(Math.max(1, page), pdfDoc.numPages);
      setCurrentPage(next);
    },
    [pdfDoc],
  );

  const updateOverlay = useCallback((id: string, patch: Partial<Overlay>) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    );
  }, []);

  const addTextOverlay = useCallback(() => {
    const overlay = createTextOverlay();
    setOverlays((prev) => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
    setError(null);
  }, []);

  const handleImageChosen = useCallback(async (file: File | undefined) => {
    if (!file) return;
    const validation = validateOverlayImage(file);
    if (!validation.ok) {
      setError(validation.message);
      return;
    }
    setError(null);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Gambar tidak dapat dibaca."));
        reader.readAsDataURL(file);
      });
      const image = await loadImageFromOverlay({
        type: "image",
        imageUrl: dataUrl,
      } as Overlay);
      const overlay: Overlay = {
        id: `overlay-${crypto.randomUUID()}`,
        type: "image",
        imageUrl: dataUrl,
        imageBytes: await file.arrayBuffer(),
        xRatio: 0.375,
        yRatio: 0.45,
        widthRatio: 0.3,
        heightRatio: 0.3,
        rotation: 0,
        opacity: 1,
        applyMode: "all-pages",
      };
      setOverlays((prev) => [...prev, overlay]);
      setOverlayImages((prev) => ({ ...prev, [overlay.id]: image }));
      setSelectedOverlayId(overlay.id);
    } catch {
      setError("Gambar tidak dapat digunakan. Pilih file PNG atau JPG.");
    }
  }, []);

  const deleteOverlay = useCallback((id: string) => {
    setOverlays((prev) => prev.filter((o) => o.id !== id));
    setOverlayImages((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSelectedOverlayId((prev) => (prev === id ? null : prev));
  }, []);

  const resetOverlay = useCallback((id: string) => {
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              xRatio: 0.375,
              yRatio: 0.45,
              widthRatio: o.type === "image" ? 0.3 : 0.25,
              heightRatio: o.type === "image" ? 0.3 : 0.1,
              rotation: 0,
              opacity: 1,
            }
          : o,
      ),
    );
  }, []);

  const buildExportBytes = useCallback(async () => {
    if (!pdfBytes || overlays.length === 0) return null;
    return exportPdfWithOverlays(
      pdfBytes,
      overlays,
      overlayImages,
      (msg) => setExportMessage(msg),
    );
  }, [pdfBytes, overlays, overlayImages]);

  const withExportGuard = useCallback(
    async (build: () => Promise<Uint8Array | null>): Promise<Uint8Array | null> => {
      if (isExporting) return null;
      setIsExporting(true);
      setError(null);
      setExportMessage("Menyiapkan PDF...");
      try {
        return await build();
      } catch (err) {
        const message = (err as Error)?.message ?? "";
        if (/encrypted|password/i.test(message)) {
          setError("PDF yang dilindungi password belum didukung.");
        } else {
          setError("PDF gagal dibuat. Periksa file dan coba kembali.");
        }
        return null;
      } finally {
        setIsExporting(false);
        setExportMessage(null);
      }
    },
    [isExporting],
  );

  const handleExport = useCallback(async () => {
    const result = await withExportGuard(buildExportBytes);
    if (!result) return;
    const base = pdfInfo?.fileName.replace(/\.pdf$/i, "") || "dokumen";
    const blob = new Blob([result as Uint8Array<ArrayBuffer>], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${base}-overlay.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [withExportGuard, buildExportBytes, pdfInfo]);

  const handlePrint = useCallback(async () => {
    const result = await withExportGuard(buildExportBytes);
    if (!result) return;
    const blob = new Blob([result as Uint8Array<ArrayBuffer>], {
      type: "application/pdf",
    });
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement("iframe");
    iframe.style.cssText =
      "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    };
    iframe.src = url;
    // Tunggu hingga dialog print untuk menghindari iframe terhapus terlalu cepat.
    setTimeout(() => {
      iframe.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  }, [withExportGuard, buildExportBytes]);

    const handleSelectUrl = useCallback(
    async (url: string) => {
      setError(null);

      let name = "dokumen-url.pdf";
      try {
        const path =
          new URL(url).pathname.split("/").filter(Boolean).pop() ?? "";
        if (path) name = path.endsWith(".pdf") ? path : `${path}.pdf`;
      } catch {
        // URL tidak dapat diparse, pakai nama default.
      }

      const readBytes = async (): Promise<ArrayBuffer | null> => {
        // 1) Coba fetch langsung dari browser (tetap privat, tanpa proxy).
        try {
          const direct = await fetch(url);
          if (direct.ok) return await direct.arrayBuffer();
          setError(
            `Server mengembalikan status ${direct.status}. Periksa kembali URL.`,
          );
          return null;
        } catch {
          // Diblokir CORS / gagal jaringan → coba lewat proxy server.
        }
        // 2) Fallback: proxy server-side (menembus CORS).
        try {
          const proxied = await fetch(
            `/api/pdf-proxy?url=${encodeURIComponent(url)}`,
          );
          if (!proxied.ok) {
            let message = `Gagal mengambil file. Status ${proxied.status}.`;
            try {
              const data = await proxied.json();
              if (data?.error) message = data.error;
            } catch {
              // Respons bukan JSON.
            }
            setError(message);
            return null;
          }
          return await proxied.arrayBuffer();
        } catch {
          setError(
            "Tidak dapat mengakses URL. Pastikan URL benar dan server mengizinkan akses lintas-domain (CORS).",
          );
          return null;
        }
      };

      const bytes = await readBytes();
      if (!bytes) return;
      if (bytes.byteLength > MAX_PDF_SIZE_BYTES) {
        setError("Ukuran file terlalu besar. Maksimal 25 MB.");
        return;
      }
      const file = new File([bytes], name, { type: "application/pdf" });
      await handleSelectFile(file);
    },
    [handleSelectFile],
  );

  const resetToUpload = useCallback(() => {
    loadingTaskRef.current?.destroy();
    loadingTaskRef.current = null;
    setPdfDoc(null);
    setPdfBytes(null);
    setPdfInfo(null);
    setPageCanvas(null);
    setPageSize({ width: 0, height: 0 });
    setCurrentPage(1);
    setOverlays([]);
    setOverlayImages({});
    setSelectedOverlayId(null);
    setError(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === "s") {
          e.preventDefault();
          if (editorActiveRef.current) void handleExport();
        } else if (key === "p") {
          e.preventDefault();
          if (editorActiveRef.current) void handlePrint();
        }
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && !isTyping) {
        if (selectedOverlayId) {
          e.preventDefault();
          deleteOverlay(selectedOverlayId);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleExport, handlePrint, deleteOverlay, selectedOverlayId]);

  if (!pdfInfo || !pdfDoc) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 pb-16">
        <PdfUploader onSelect={handleSelectFile} onSelectUrl={handleSelectUrl} />
        {error && <ErrorMessage message={error} />}
        <div className="mx-auto w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TemplatePanel
            templates={templates}
            activeTemplateId={activeTemplateId}
            canSave={false}
            onSelect={handleSelectTemplate}
            onSave={handleSaveTemplate}
            onDelete={handleDeleteTemplate}
          />
        </div>
      </main>
    );
  }

  const exportDisabled = overlays.length === 0 || isExporting;
  const selectedOverlay =
    overlays.find((o) => o.id === selectedOverlayId) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 -mx-6 border-b border-slate-200 bg-slate-50/85 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 21h10a2 2 0 0 0 2-2V9.414a1 1 0 0 0-.293-.707l-5.414-5.414A1 1 0 0 0 12.586 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold text-slate-900">
                {pdfInfo.fileName}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                <span>{pdfInfo.totalPages} halaman</span>
                <span aria-hidden>·</span>
                <span>{(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                <span aria-hidden>·</span>
                <span className="font-medium text-indigo-600">
                  {overlays.length} overlay
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetToUpload}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Ganti PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={exportDisabled}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isExporting ? "Membuat PDF..." : "Cetak"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportDisabled}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Membuat PDF..." : "Simpan PDF"}
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={addTextOverlay}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          Tambah Teks
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21zM11.25 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z"
            />
          </svg>
          Tambah Gambar
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            handleImageChosen(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="mx-1 h-6 w-px bg-slate-200" aria-hidden />
        <button
          type="button"
          onClick={() => selectedOverlay && resetOverlay(selectedOverlay.id)}
          disabled={!selectedOverlay}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Reset Posisi
        </button>
        <button
          type="button"
          onClick={() => selectedOverlay && deleteOverlay(selectedOverlay.id)}
          disabled={!selectedOverlay}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Hapus Overlay
        </button>
      </div>

      {error && <ErrorMessage message={error} />}

      <p className="-mt-2 text-xs text-slate-400">
        Untuk mengganti file: seret &amp; lepas PDF baru ke sini, atau salin file
        lalu tempel dengan Ctrl+V.
      </p>

      {/* Main */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-5">
          <div
            ref={previewContainerRef}
            className="flex w-full max-w-3xl flex-col items-center overflow-hidden"
          >
            {isRendering && pageCanvas === null ? (
              <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-sm">
                <LoadingState message="Merender halaman..." />
              </div>
            ) : pageSize.width > 0 ? (
              <PdfPagePreview
                pageWidth={pageSize.width}
                pageHeight={pageSize.height}
                canvas={pageCanvas}
                overlays={overlays}
                images={overlayImages}
                selectedId={selectedOverlayId}
                onSelect={setSelectedOverlayId}
                onChange={updateOverlay}
                onDelete={deleteOverlay}
              />
            ) : null}
          </div>
          <PdfNavigation
            currentPage={currentPage}
            totalPages={pdfInfo.totalPages}
            onPrev={() => goToPage(currentPage - 1)}
            onNext={() => goToPage(currentPage + 1)}
          />
        </div>

        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="flex flex-col gap-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div>
              {selectedOverlay ? (
                <OverlayProperties
                  overlay={selectedOverlay}
                  onChange={(patch) =>
                    updateOverlay(selectedOverlay.id, patch)
                  }
                  onDelete={() => deleteOverlay(selectedOverlay.id)}
                  onReset={() => resetOverlay(selectedOverlay.id)}
                />
              ) : (
                <button
                  type="button"
                  onClick={addTextOverlay}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-8 text-center transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="text-xs text-slate-500">
                    Belum ada overlay dipilih.
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    Klik di halaman untuk memilih, atau tambahkan overlay baru.
                  </span>
                </button>
              )}
            </div>
            <div className="h-px bg-slate-100" aria-hidden />
            <TemplatePanel
              templates={templates}
              activeTemplateId={activeTemplateId}
              canSave={overlays.length > 0}
              onSelect={handleSelectTemplate}
              onSave={handleSaveTemplate}
              onDelete={handleDeleteTemplate}
            />
          </div>
        </aside>
      </div>

      {/* Drop overlay saat mengganti file */}
      {dropActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white bg-slate-900/40 px-10 py-8 text-center">
            <svg
              className="h-8 w-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 16a4 4 0 0 1-.88-7.903A5 5 0 1 1 15.9 6h.1a5 5 0 0 1 1 9.9M15 13l-3-3m0 0-3 3m3-3v8"
              />
            </svg>
            <p className="text-lg font-semibold text-white">
              Lepaskan untuk mengganti PDF
            </p>
            <p className="text-sm text-white/80">
              Dokumen saat ini akan diganti dengan file baru.
            </p>
          </div>
        </div>
      )}

      {isExporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-sm">
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-white p-8 text-center shadow-xl">
            <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-indigo-600" />
            <p className="text-sm font-medium text-slate-800">
              {exportMessage ?? "Sedang membuat PDF..."}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

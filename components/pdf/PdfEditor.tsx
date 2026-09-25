"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createShapeOverlay,
  createTextOverlay,
  type Overlay,
} from "@/types/overlay";
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
import Toast, { type ToastData } from "@/components/common/Toast";
import PdfUploader from "@/components/pdf/PdfUploader";
import PdfNavigation from "@/components/pdf/PdfNavigation";
import PdfPagePreview from "@/components/pdf/PdfPagePreview";
import OverlayList from "@/components/overlay/OverlayList";
import OverlayProperties from "@/components/overlay/OverlayProperties";
import TemplateDialog from "@/components/template/TemplateDialog";

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
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (
      type: ToastData["type"],
      message: string,
      opts?: {
        action?: { label: string; onClick: () => void };
        durationMs?: number;
      },
    ) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, message, action: opts?.action }]);
      window.setTimeout(() => {
        dismissToast(id);
      }, opts?.durationMs ?? 4000);
    },
    [dismissToast],
  );

  const [lastDeleted, setLastDeleted] = useState<{
    overlay: Overlay;
    image: HTMLImageElement | null;
    index: number;
  } | null>(null);
  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    const { overlay, image, index } = lastDeleted;
    setOverlays((prev) => {
      if (prev.some((o) => o.id === overlay.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, overlay);
      return next;
    });
    if (image) {
      setOverlayImages((prev) => ({ ...prev, [overlay.id]: image }));
    }
    setSelectedOverlayId(overlay.id);
    setLastDeleted(null);
  }, [lastDeleted]);

  const deleteOverlay = useCallback(
    (id: string) => {
      const index = overlays.findIndex((o) => o.id === id);
      if (index === -1) return;
      const target = overlays[index];
      const image = overlayImages[id] ?? null;
      setOverlays((prev) => prev.filter((o) => o.id !== id));
      setOverlayImages((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSelectedOverlayId((prev) => (prev === id ? null : prev));
      setLastDeleted({ overlay: target, image, index });
      pushToast("info", "Overlay dihapus.", {
        action: { label: "Urungkan", onClick: undoDelete },
        durationMs: 5000,
      });
    },
    [overlays, overlayImages, pushToast, undoDelete],
  );

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewWidth, setPreviewWidth] = useState(720);
  const [zoom, setZoom] = useState(1);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const exportTitleRef = useRef<HTMLParagraphElement>(null);

  const TEXT_PRESETS = [
    "FRAGILE",
    "HANDLE WITH CARE",
    "JANGAN DIBANTING",
    "BARANG MUDAH PECAH",
    "THIS SIDE UP",
  ];

  const MIN_ZOOM = 0.5;
  const MAX_ZOOM = 2;
  const ZOOM_STEP = 0.25;

  const zoomIn = useCallback(() => {
    setZoom((z) => Math.min(MAX_ZOOM, Math.round((z + ZOOM_STEP) * 100) / 100));
  }, []);
  const zoomOut = useCallback(() => {
    setZoom((z) => Math.max(MIN_ZOOM, Math.round((z - ZOOM_STEP) * 100) / 100));
  }, []);
  const zoomFit = useCallback(() => setZoom(1), []);
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
    (name: string, overlayIds?: string[]) => {
      const selected = overlayIds
        ? overlays.filter((o) => overlayIds.includes(o.id))
        : overlays;
      if (selected.length === 0) return;
      const template = templateFromOverlays(selected, name);
      setTemplates((prev) => {
        const next = [...prev, template];
        persistTemplates(next);
        return next;
      });
      setActiveTemplateId(template.id);
      persistActiveTemplateId(template.id);
      pushToast("success", `Template "${name}" berhasil disimpan.`);
    },
    [overlays, pushToast],
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
        setLastDeleted(null);
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

  // Pindahkan fokus ke dialog saat export dimulai, kembalikan saat selesai.
  useEffect(() => {
    if (!exportMessage) return;
    const previous = document.activeElement as HTMLElement | null;
    exportTitleRef.current?.focus();
    return () => {
      previous?.focus?.();
    };
  }, [exportMessage]);

  useEffect(() => {
    let depth = 0;
    // Seretan internal (reorder overlay) tidak membawa Files — abaikan agar
    // tidak memicu indikator/drop ganti PDF.
    const carriesFiles = (e: DragEvent): boolean => {
      const types = e.dataTransfer?.types;
      return !!types && Array.from(types).includes("Files");
    };
    const onDragEnter = (e: DragEvent) => {
      if (!editorActiveRef.current || !carriesFiles(e)) return;
      e.preventDefault();
      depth += 1;
      setDropActive(true);
    };
    const onDragOver = (e: DragEvent) => {
      if (!editorActiveRef.current || !carriesFiles(e)) return;
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
      // Drop internal (mis. reorder overlay di sidebar) sudah ditangani
      // targetnya sendiri — jangan diperlakukan sebagai ganti PDF.
      if (e.defaultPrevented || !carriesFiles(e)) return;
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
          Math.max(1, Math.floor(previewWidth * zoom)),
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
  }, [pdfDoc, currentPage, previewWidth, zoom]);

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

  const addTextOverlay = useCallback((text?: string) => {
    const overlay = createTextOverlay(text);
    setOverlays((prev) => [...prev, overlay]);
    setSelectedOverlayId(overlay.id);
    setError(null);
  }, []);

  const addShapeOverlay = useCallback(() => {
    const overlay = createShapeOverlay();
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
        visible: true,
        applyMode: "all-pages",
      };
      setOverlays((prev) => [...prev, overlay]);
      setOverlayImages((prev) => ({ ...prev, [overlay.id]: image }));
      setSelectedOverlayId(overlay.id);
    } catch {
      setError("Gambar tidak dapat digunakan. Pilih file PNG atau JPG.");
    }
  }, []);


  const toggleOverlayVisibility = useCallback((id: string) => {
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === id ? { ...o, visible: !(o.visible !== false) } : o,
      ),
    );
  }, []);

  const toggleOverlayLock = useCallback((id: string) => {
    setOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, locked: !o.locked } : o)),
    );
  }, []);

  /** Geser urutan overlay (z-order): -1 ke bawah, +1 ke atas. */
  const moveOverlay = useCallback((id: string, dir: -1 | 1) => {
    setOverlays((prev) => {
      const index = prev.findIndex((o) => o.id === id);
      const target = index + dir;
      if (index === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }, []);

  /** Pindahkan overlay ke indeks array tujuan (untuk drag-and-drop). */
  const moveOverlayTo = useCallback((id: string, toArrayIndex: number) => {
    setOverlays((prev) => {
      const from = prev.findIndex((o) => o.id === id);
      if (from === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(Math.min(Math.max(0, toArrayIndex), next.length), 0, moved);
      return next;
    });
  }, []);

  const duplicateOverlay = useCallback(
    (id: string) => {
      const source = overlays.find((o) => o.id === id);
      if (!source) return;
      const baseName = source.name?.trim();
      const copy: Overlay = {
        ...source,
        id: `overlay-${crypto.randomUUID()}`,
        name: baseName ? `${baseName} (salinan)`.slice(0, 40) : undefined,
        // Geser sedikit agar terlihat sebagai salinan.
        xRatio: Math.min(1 - source.widthRatio, source.xRatio + 0.04),
        yRatio: Math.min(1 - source.heightRatio, source.yRatio + 0.04),
      };
      setOverlays((prev) => {
        const index = prev.findIndex((o) => o.id === id);
        const next = [...prev];
        next.splice(index + 1, 0, copy);
        return next;
      });
      const image = overlayImages[id] ?? null;
      if (image) {
        setOverlayImages((prev) => ({ ...prev, [copy.id]: image }));
      }
      setSelectedOverlayId(copy.id);
    },
    [overlays, overlayImages],
  );

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
    const visible = overlays.filter((o) => o.visible !== false);
    if (!pdfBytes || visible.length === 0) return null;
    return exportPdfWithOverlays(
      pdfBytes,
      visible,
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
    pushToast("success", "PDF berhasil dibuat dan siap diunduh.");
  }, [withExportGuard, buildExportBytes, pdfInfo, pushToast]);

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
    setLastDeleted(null);
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
        } else if (key === "z" && !isTyping) {
          e.preventDefault();
          if (editorActiveRef.current) undoDelete();
        }
        return;
      }

      if (e.key === "Escape") {
        setPresetOpen(false);
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
  }, [
    handleExport,
    handlePrint,
    deleteOverlay,
    selectedOverlayId,
    undoDelete,
  ]);

  if (!pdfInfo || !pdfDoc) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-16">
        <PdfUploader onSelect={handleSelectFile} onSelectUrl={handleSelectUrl} />
        {error && <ErrorMessage message={error} />}
        <Toast toasts={toasts} onDismiss={dismissToast} />
      </main>
    );
  }

  const exportDisabled =
    overlays.every((o) => o.visible === false) || isExporting;
  const selectedOverlay =
    overlays.find((o) => o.id === selectedOverlayId) ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 -mx-6 border-b border-neutral-800 bg-black/85 px-6 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-black">
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
              <h1 className="truncate text-sm font-semibold text-neutral-100">
                {pdfInfo.fileName}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                <span>{pdfInfo.totalPages} halaman</span>
                <span aria-hidden>·</span>
                <span>{(pdfInfo.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                <span aria-hidden>·</span>
                <span className="font-medium text-white">
                  {overlays.length} overlay
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={resetToUpload}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800"
            >
              Ganti PDF
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={exportDisabled}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm font-semibold text-neutral-200 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isExporting ? "Membuat PDF..." : "Cetak"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              disabled={exportDisabled}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isExporting ? "Membuat PDF..." : "Simpan PDF"}
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorMessage message={error} />}

      <p className="-mt-2 text-xs text-neutral-500">
        Tip: seret PDF baru ke sini atau Ctrl+V untuk mengganti file.
      </p>

      {/* Main */}
      <div className="flex flex-col gap-8 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col items-center gap-4">
          {/* Floating toolbar: tambah + zoom, menempel saat scroll */}
          <div className="sticky top-[72px] z-20 flex w-fit max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-neutral-800 bg-black/85 p-1.5 shadow-xl shadow-black/50 backdrop-blur">
            <div
              role="group"
              aria-label="Tambah overlay"
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <div className="flex">
                  <button
                    type="button"
                    onClick={() => addTextOverlay()}
                    title="Tambah overlay teks FRAGILE"
                    className="inline-flex items-center gap-1.5 rounded-l-xl bg-white px-3 py-1.5 text-[13px] font-medium text-black transition-colors hover:bg-neutral-300"
                  >
                    <span
                      aria-hidden
                      className="flex h-4 w-4 items-center justify-center text-sm font-black tracking-tight"
                    >
                      T
                    </span>
                    Teks
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={presetOpen}
                    aria-label="Pilih preset teks"
                    title="Pilih preset teks"
                    className="rounded-r-xl border-l border-black/20 bg-white px-1.5 text-black transition-colors hover:bg-neutral-300"
                  >
                    <svg
                      className={`h-4 w-4 transition-transform ${presetOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                      aria-hidden
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>
                {presetOpen && (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => setPresetOpen(false)}
                      className="fixed inset-0 z-20 cursor-default"
                    />
                    <ul
                      role="menu"
                      aria-label="Preset teks overlay"
                      className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-neutral-700 bg-neutral-900 py-1 shadow-xl shadow-black/40"
                    >
                      {TEXT_PRESETS.map((preset) => (
                        <li key={preset} role="none">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              addTextOverlay(preset);
                              setPresetOpen(false);
                            }}
                            className="block w-full truncate px-4 py-2 text-left text-sm text-neutral-200 transition-colors hover:bg-neutral-800"
                          >
                            {preset}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                title="Tambah gambar PNG atau JPG (maks 5 MB)"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21zM11.25 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5z"
                  />
                </svg>
                Gambar
              </button>
              <button
                type="button"
                onClick={addShapeOverlay}
                title="Tambah persegi hitam (atur transparansi di panel)"
                className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[13px] font-medium text-neutral-200 transition-colors hover:bg-neutral-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <rect x="4" y="7" width="16" height="10" rx="1" />
                </svg>
                Bentuk
              </button>
              <label htmlFor="overlay-image-input" className="sr-only">
                Pilih gambar overlay PNG atau JPG
              </label>
              <input
                id="overlay-image-input"
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,.png,.jpg,.jpeg"
                aria-label="Pilih gambar overlay PNG atau JPG"
                className="hidden"
                onChange={(e) => {
                  handleImageChosen(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => setTemplateDialogOpen(true)}
                aria-label={`Kelola template${templates.length > 0 ? `, ${templates.length} tersimpan` : ""}`}
                title={
                  templates.length === 0
                    ? "Kelola template — simpan susunan overlay untuk dipakai ulang"
                    : activeTemplateId
                      ? "Kelola template — 1 template aktif"
                      : `Kelola template — ${templates.length} tersimpan`
                }
                className="relative flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                  />
                </svg>
                {templates.length > 0 && (
                  <span
                    aria-hidden
                    className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold tabular-nums text-black"
                  >
                    {templates.length}
                  </span>
                )}
              </button>
            </div>

            <span className="h-6 w-px bg-neutral-800" aria-hidden />

            <div
              role="group"
              aria-label="Kontrol zoom preview"
              className="flex items-center gap-0.5"
            >
              <button
                type="button"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM}
                aria-label="Perkecil preview"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M5 12h14" />
                </svg>
              </button>
              <span
                aria-live="polite"
                className="min-w-12 text-center text-xs font-semibold tabular-nums text-neutral-200"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM}
                aria-label="Perbesar preview"
                className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                onClick={zoomFit}
                disabled={zoom === 1}
                className="rounded-full px-2 py-1 text-xs font-medium text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Fit
              </button>
            </div>
          </div>

          <p aria-live="polite" className="-mt-1 text-[11px] text-neutral-500">
            <span className="font-medium text-white">
              {overlays.length} overlay
            </span>{" "}
            · berlaku ke semua halaman
          </p>

          <div
            ref={previewContainerRef}
            className="w-full max-w-3xl overflow-x-auto"
          >
            {isRendering && pageCanvas === null ? (
              <div className="w-full rounded-2xl border border-neutral-800 bg-neutral-900">
                <LoadingState message="Merender halaman..." />
              </div>
            ) : pageSize.width > 0 ? (
              <div className="mx-auto w-fit">
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
                  onReset={resetOverlay}
                  onDuplicate={duplicateOverlay}
                  onToggleLock={toggleOverlayLock}
                  onToggleVisibility={toggleOverlayVisibility}
                />
              </div>
            ) : null}
          </div>
          <div className="sticky bottom-3 z-10">
            <PdfNavigation
              currentPage={currentPage}
              totalPages={pdfInfo.totalPages}
              onPrev={() => goToPage(currentPage - 1)}
              onNext={() => goToPage(currentPage + 1)}
              onGoTo={goToPage}
            />
          </div>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-72 lg:shrink-0">
          <section
            aria-labelledby="overlay-panel-title"
            className="flex flex-col gap-4 rounded-2xl border border-neutral-800 bg-neutral-900 p-5"
          >
            <h2
              id="overlay-panel-title"
              className="text-sm font-semibold text-neutral-100"
            >
              Overlay
            </h2>
            <OverlayList
              overlays={overlays}
              selectedId={selectedOverlayId}
              onSelect={setSelectedOverlayId}
              onDelete={deleteOverlay}
              onToggleVisibility={toggleOverlayVisibility}
              onToggleLock={toggleOverlayLock}
              onMove={moveOverlay}
              onMoveTo={moveOverlayTo}
              onDuplicate={duplicateOverlay}
            />
            <div>
              {selectedOverlay ? (
                <OverlayProperties
                  overlay={selectedOverlay}
                  onChange={(patch) =>
                    updateOverlay(selectedOverlay.id, patch)
                  }
                />
              ) : overlays.length === 0 ? (
                <button
                  type="button"
                  onClick={() => addTextOverlay()}
                  className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-700 bg-black/60 px-4 py-8 text-center transition-colors hover:border-white/40 hover:bg-white/5"
                >
                  <span className="text-xs text-neutral-500">
                    Belum ada overlay.
                  </span>
                  <span className="text-sm font-medium text-neutral-300">
                    Tambahkan teks atau gambar untuk memulai.
                  </span>
                </button>
              ) : (
                <p className="rounded-xl border border-dashed border-neutral-700 bg-black/60 px-4 py-5 text-center text-xs leading-relaxed text-neutral-500">
                  Pilih overlay dari daftar atau klik di halaman untuk mengatur
                  propertinya.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>

      {/* Drop overlay saat mengganti file */}
      {dropActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 px-4 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-white bg-neutral-900/40 px-10 py-8 text-center">
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

      {exportMessage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-busy="true"
          aria-labelledby="export-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/40 px-4 backdrop-blur-sm"
        >
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl bg-neutral-900 p-8 text-center shadow-xl">
            <div
              className="h-10 w-10 animate-spin rounded-full border-[3px] border-neutral-700 border-t-white"
              aria-hidden
            />
            <p
              id="export-dialog-title"
              ref={exportTitleRef}
              tabIndex={-1}
              className="text-sm font-medium text-neutral-200 outline-none"
            >
              {exportMessage}
            </p>
          </div>
        </div>
      )}
      <TemplateDialog
        open={templateDialogOpen}
        templates={templates}
        activeTemplateId={activeTemplateId}
        canSave={overlays.length > 0}
        overlays={overlays}
        onSelect={(id) => {
          handleSelectTemplate(id);
          setTemplateDialogOpen(false);
        }}
        onSave={handleSaveTemplate}
        onDelete={handleDeleteTemplate}
        onClose={() => setTemplateDialogOpen(false)}
      />
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

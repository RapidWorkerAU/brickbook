"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useRef, useState } from "react";
import { IconFileText } from "@tabler/icons-react";

let workerConfigured = false;

export function PdfThumbnail({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");

  useEffect(() => {
    if (!url) {
      setStatus("error");
      return;
    }
    let cancelled = false;

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        if (cancelled) return;
        if (!workerConfigured) {
          pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
          workerConfigured = true;
        }
        const pdf = await pdfjs.getDocument({ url }).promise;
        if (cancelled) return;
        const page = await pdf.getPage(1);
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx || cancelled) return;
        await page.render({ canvasContext: ctx, canvas, viewport }).promise;
        if (!cancelled) setStatus("done");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <>
      {status !== "done" ? (
        <div className="plan-doc-media-placeholder">
          <IconFileText size={28} />
          {status === "error" ? <span>PDF</span> : null}
        </div>
      ) : null}
      <canvas
        ref={canvasRef}
        style={{ display: status === "done" ? "block" : "none", width: "100%", height: "auto" }}
      />
    </>
  );
}

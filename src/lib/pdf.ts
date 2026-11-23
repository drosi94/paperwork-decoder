import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// Configure worker URL for Vite bundle
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export interface PdfExtractResult {
  text: string
  pages: number
  isScanned: boolean
  scannedImageFile?: File
}

/**
 * Reads a PDF file completely on-device without network egress.
 *
 * 1. For digital/text-based PDFs: Extracts embedded text with coordinate-based line breaking.
 * 2. For scanned PDFs (pure images): Renders the first page to an image canvas so
 *    on-device Gemini Nano can perform local OCR.
 */
export async function readPdf(file: File, maxPages = 5): Promise<PdfExtractResult> {
  const buffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) })
  const pdf = await loadingTask.promise
  const numPages = Math.min(pdf.numPages, maxPages)

  let fullText = ''

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()

    let lastY: number | null = null
    let pageText = ''

    for (const item of textContent.items) {
      if ('str' in item) {
        const textItem = item as { str: string; transform: number[] }
        const currentY = textItem.transform[5]

        if (lastY !== null && Math.abs(currentY - lastY) > 8) {
          pageText += '\n'
        } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
          pageText += ' '
        }

        pageText += textItem.str
        lastY = currentY
      }
    }

    if (pageText.trim()) {
      if (fullText.length > 0) fullText += '\n\n'
      fullText += pageText.trim()
    }
  }

  // If we found meaningful text (more than 30 characters), it's a digital text PDF
  if (fullText.trim().length >= 30) {
    return {
      text: fullText.trim(),
      pages: pdf.numPages,
      isScanned: false,
    }
  }

  // Otherwise, it's a scanned/image PDF: render the first page to canvas for on-device OCR
  const page1 = await pdf.getPage(1)
  const viewport = page1.getViewport({ scale: 2.0 }) // 2x scale for sharp OCR
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Canvas 2D context is unavailable for PDF rendering.')
  }

  await page1.render({
    canvasContext: context,
    canvas,
    viewport,
  }).promise

  const imageBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to rasterize PDF page to image blob.'))
    }, 'image/png')
  })

  const scannedImageFile = new File([imageBlob], `${file.name.replace(/\.pdf$/i, '')}-p1.png`, {
    type: 'image/png',
  })

  return {
    text: '',
    pages: pdf.numPages,
    isScanned: true,
    scannedImageFile,
  }
}

import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

/**
 * Capture a DOM element with html2canvas and export it as an A4 PDF.
 * Supports multi-page content automatically.
 */
export async function exportPlayerPDF(element: HTMLElement, playerName: string): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    allowTaint: false,
    backgroundColor: '#ffffff',
    logging: false,
    // Ensure off-screen element is still captured
    scrollX: 0,
    scrollY: 0,
  })

  const imgData = canvas.toDataURL('image/png')
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pdfW = pdf.internal.pageSize.getWidth()   // 210mm
  const pdfH = pdf.internal.pageSize.getHeight()  // 297mm

  // canvas is at scale:2 — divide by 2 to get logical px
  const logicalW = canvas.width  / 2
  const logicalH = canvas.height / 2
  const mmPerPx   = pdfW / logicalW
  const totalMM   = logicalH * mmPerPx

  if (totalMM <= pdfH) {
    // Single page
    pdf.addImage(imgData, 'PNG', 0, 0, pdfW, totalMM)
  } else {
    // Multi-page: slide the image down by one page height per iteration
    const pageSlicePx = pdfH / mmPerPx
    let yPx = 0
    let page = 0
    while (yPx < logicalH) {
      if (page > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -(yPx * mmPerPx), pdfW, totalMM)
      yPx += pageSlicePx
      page++
    }
  }

  // Sanitise filename: strip accents + non-alphanum
  const safe = playerName
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '_')
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  pdf.save(`VIZION_${safe}_${date}.pdf`)
}

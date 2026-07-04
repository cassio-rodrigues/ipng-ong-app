export async function exportToExcel(rows: Record<string, unknown>[], filename: string) {
  const XLSX = await import("xlsx")
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Dados")
  XLSX.writeFile(wb, `${filename}.xlsx`)
}

export async function downloadTemplate(headers: string[], filename: string) {
  const XLSX = await import("xlsx")
  const ws = XLSX.utils.aoa_to_sheet([headers])
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, "Modelo")
  XLSX.writeFile(wb, `modelo_${filename}.xlsx`)
}

export async function parseExcel(file: File): Promise<Record<string, string>[]> {
  const XLSX = await import("xlsx")
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: "array", cellDates: true })
        const ws = wb.Sheets[wb.SheetNames[0]]
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "", raw: false }) as Record<string, string>[])
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export function fmtDate(val: string | undefined): string | undefined {
  if (!val) return undefined
  const m = val.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  return val || undefined
}

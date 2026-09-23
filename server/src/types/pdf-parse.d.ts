declare module 'pdf-parse' {
  type PdfParseResult = {
    text: string
  }

  const pdfParse: (data: Buffer) => Promise<PdfParseResult>
  export default pdfParse
}

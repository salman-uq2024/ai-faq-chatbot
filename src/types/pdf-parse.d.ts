declare module "pdf-parse/lib/pdf-parse" {
  import type { Options, Result } from "pdf-parse";
  function pdfParse(dataBuffer: Buffer, options?: Options): Promise<Result>;
  export default pdfParse;
}

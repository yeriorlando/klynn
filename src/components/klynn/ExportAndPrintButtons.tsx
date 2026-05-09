import React from "react";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportToCsv } from "@/lib/export";
import { PrintLayout } from "./PrintLayout";
import { type Tenant } from "@/lib/storage";

interface Props {
  filename: string;
  columns: string[];
  data: (string | number)[][];
  tenant: Tenant;
  printTitle?: string;
}

export function ExportAndPrintButtons({ filename, columns, data, tenant, printTitle }: Props) {
  const [isPrinting, setIsPrinting] = React.useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    // Wait for the portal to render before printing
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 150);
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className="gap-2 bg-slate-800 text-white hover:bg-slate-900 shadow-sm border-0 transition-all duration-200 active:scale-95">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40 rounded-xl shadow-elegant">
          <DropdownMenuItem className="gap-2 cursor-pointer py-2 rounded-lg" onClick={() => exportToCsv(filename, columns, data)}>
            <FileSpreadsheet className="h-4 w-4 text-green-600" /> Excel (CSV)
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer py-2 rounded-lg" onClick={handlePrint}>
            <FileText className="h-4 w-4 text-red-600" /> PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm border-0 transition-all duration-200 active:scale-95" onClick={handlePrint}>
        <Printer className="h-4 w-4" /> {isPrinting ? "Preparando..." : "Imprimir"}
      </Button>

      {/* Hidden print layout, only rendered when printing */}
      {isPrinting && <PrintLayout title={printTitle || `Reporte de ${filename}`} tenant={tenant} columns={columns} data={data} />}
    </div>
  );
}

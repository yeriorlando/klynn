import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { type Tenant, formatRD, formatDateRD } from "@/lib/storage";

interface Props {
  title: string;
  tenant: Tenant;
  columns: string[];
  data: (string | number)[][];
}

export function PrintLayout({ title, tenant, columns, data }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="print-report bg-white p-8 text-black">
      {/* Encabezado */}
      <div className="flex justify-between items-center border-b-2 border-black pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div 
            className="h-16 w-16 rounded-xl flex items-center justify-center font-display text-white text-3xl print-color-adjust"
            style={{ background: `linear-gradient(135deg, ${tenant.color_primario}, ${tenant.color_secundario})` }}
          >
            {tenant.nombre.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold">{tenant.nombre}</h1>
            <p className="text-gray-600 text-sm">{tenant.telefono} | {tenant.email}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold tracking-wider text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">Fecha de impresión: {formatDateRD(new Date().toISOString())}</p>
        </div>
      </div>

      {/* Tabla */}
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100 print-color-adjust">
            {columns.map((col, i) => (
              <th key={i} className="py-3 px-4 font-bold text-gray-700 border-b-2 border-gray-300 uppercase text-xs">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-gray-200">
              {row.map((cell, j) => (
                <td key={j} className="py-3 px-4 text-gray-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-gray-500 italic">
                No hay datos para mostrar en este reporte.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Pie de página */}
      <div className="mt-12 text-center text-xs text-gray-400 pt-4 border-t border-gray-200">
        Reporte generado desde el sistema de gestión Klynn
      </div>
    </div>,
    document.body
  );
}

'use client'

import { ChartBarSquareIcon, CalendarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { useState, useMemo, useRef } from 'react'
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'usage' | 'daily'>('usage')
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day')
  
  // Estados para el rango de fechas
  const [startDate, setStartDate] = useState<string>('2025-05-01')
  const [endDate, setEndDate] = useState<string>('2025-06-31')
  
  // Referencias para capturar los gráficos
  const chartRef = useRef<any>(null)

  // Datos simulados completos
  const allPlatesData = [
    { name: 'Ensalada César', count: 120, date: '2025-05-01' },
    { name: 'Spaghetti Boloñesa', count: 98, date: '2025-05-02' },
    { name: 'Pollo Asado', count: 85, date: '2025-05-03' },
    { name: 'Tacos', count: 76, date: '2025-05-04' },
    { name: 'Sushi', count: 60, date: '2025-05-05' },
    { name: 'Pizza Margherita', count: 55, date: '2025-05-06' },
    { name: 'Hamburguesa', count: 48, date: '2025-05-07' },
    { name: 'Paella', count: 42, date: '2025-05-08' },
  ]

  const allDailyCounts = [
    { date: '2025-05-01', count: 34 },
    { date: '2025-05-02', count: 28 },
    { date: '2025-05-03', count: 45 },
    { date: '2025-05-04', count: 50 },
    { date: '2025-05-05', count: 42 },
    { date: '2025-05-06', count: 38 },
    { date: '2025-05-07', count: 47 },
    { date: '2025-05-08', count: 49 },
    { date: '2025-05-09', count: 31 },
    { date: '2025-05-10', count: 55 },
    { date: '2025-05-11', count: 44 },
    { date: '2025-05-12', count: 29 },
    { date: '2025-05-13', count: 53 },
    { date: '2025-05-14', count: 46 },
    { date: '2025-05-15', count: 52 },
    { date: '2025-05-16', count: 40 },
    { date: '2025-05-17', count: 36 },
    { date: '2025-05-18', count: 48 },
    { date: '2025-05-19', count: 41 },
    { date: '2025-05-20', count: 50 },
    { date: '2025-05-21', count: 43 },
    { date: '2025-05-22', count: 39 },
    { date: '2025-05-23', count: 58 },
    { date: '2025-05-24', count: 60 },
    { date: '2025-05-25', count: 54 },
    { date: '2025-05-26', count: 47 },
    { date: '2025-05-27', count: 49 },
    { date: '2025-05-28', count: 51 },
    { date: '2025-05-29', count: 45 },
    { date: '2025-05-30', count: 37 },
    { date: '2025-05-31', count: 56 },
    { date: '2025-06-01', count: 44 },
    { date: '2025-06-02', count: 52 },
    { date: '2025-06-03', count: 38 },
    { date: '2025-06-04', count: 46 },
    { date: '2025-06-05', count: 41 },
    { date: '2025-06-06', count: 48 },
    { date: '2025-06-07', count: 53 },
    { date: '2025-06-08', count: 35 },
    { date: '2025-06-09', count: 42 },
    { date: '2025-06-10', count: 59 },
  ]

  // Función para filtrar datos según el rango de fechas
  const getFilteredData = () => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Filtrar datos diarios
    const filteredDailyCounts = allDailyCounts.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= start && itemDate <= end
    })

    // Para los platos más usados, simularemos que se filtran por fecha también
    // En una aplicación real, esto vendría de tu base de datos
    const filteredPlatesData = allPlatesData.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= start && itemDate <= end
    })

    return { filteredDailyCounts, filteredPlatesData }
  }

  // Datos filtrados según el rango de fechas
  const { filteredDailyCounts, filteredPlatesData } = getFilteredData()

  // Top 5 platos más populares en el rango de fechas
  const topPlates = filteredPlatesData
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Estadísticas generales
  const totalUsage = topPlates.reduce((sum, p) => sum + p.count, 0)
  const avgDaily = filteredDailyCounts.length > 0 
    ? filteredDailyCounts.reduce((sum, d) => sum + d.count, 0) / filteredDailyCounts.length
    : 0
  const maxDay = filteredDailyCounts.length > 0
    ? filteredDailyCounts.reduce(
        (prev, curr) => (curr.count > prev.count ? curr : prev),
        filteredDailyCounts[0]
      )
    : { date: 'N/A', count: 0 }

  // Datos de chart según periodo
  const { labels, data } = useMemo(() => {
    if (filteredDailyCounts.length === 0) {
      return { labels: [], data: [] }
    }

    if (period === 'day') {
      return {
        labels: filteredDailyCounts.map((d) => d.date),
        data: filteredDailyCounts.map((d) => d.count),
      }
    }
    if (period === 'week') {
      const weeks: Record<string, number> = {}
      filteredDailyCounts.forEach(({ date, count }, idx) => {
        const weekNum = Math.floor(idx / 7) + 1
        const key = `Semana ${weekNum}`
        weeks[key] = (weeks[key] || 0) + count
      })
      return {
        labels: Object.keys(weeks),
        data: Object.values(weeks),
      }
    }
    // month
    const months: Record<string, number> = {}
    filteredDailyCounts.forEach(({ date, count }) => {
      const month = date.slice(0, 7) // 'YYYY-MM'
      months[month] = (months[month] || 0) + count
    })
    return {
      labels: Object.keys(months),
      data: Object.values(months),
    }
  }, [period, filteredDailyCounts])

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      title: { 
        display: true, 
        text: period === 'day'
          ? 'Platos por Día'
          : period === 'week'
          ? 'Platos por Semana'
          : 'Platos por Mes'
      },
    },
  }

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Reporte de Comedor')

      // Configurar estilos del título
      worksheet.mergeCells('A1:E1')
      const titleCell = worksheet.getCell('A1')
      titleCell.value = 'Reporte de Uso del Comedor'
      titleCell.font = {
        size: 16,
        bold: true,
        color: { argb: 'FFFFFF' }
      }
      titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4CAF50' }
      }
      titleCell.alignment = {
        horizontal: 'center',
        vertical: 'middle'
      }

      // Agregar información del rango de fechas
      worksheet.mergeCells('A2:E2')
      const rangeCell = worksheet.getCell('A2')
      rangeCell.value = `Período: ${startDate} al ${endDate}`
      rangeCell.font = { size: 12, bold: true }
      rangeCell.alignment = { horizontal: 'center' }

      // Agregar fecha del reporte
      worksheet.mergeCells('A3:E3')
      const dateCell = worksheet.getCell('A3')
      dateCell.value = `Fecha de generación: ${new Date().toLocaleDateString()}`
      dateCell.font = { size: 12 }
      dateCell.alignment = { horizontal: 'center' }

      // Sección de Estadísticas Generales
      worksheet.addRow([])
      const statsTitle = worksheet.addRow(['Estadísticas Generales'])
      statsTitle.font = { bold: true, size: 14 }
      statsTitle.alignment = { horizontal: 'center' }
      worksheet.addRow(['Total de Usos', totalUsage])
      worksheet.addRow(['Promedio Diario', avgDaily.toFixed(2)])
      worksheet.addRow(['Día más Ocupado', `${maxDay.date} (${maxDay.count} usos)`])

      // Sección de Platos más Populares
      worksheet.addRow([])
      const platesTitle = worksheet.addRow(['Platos más Populares'])
      platesTitle.font = { bold: true, size: 14 }
      platesTitle.alignment = { horizontal: 'center' }
      const headerRow = worksheet.addRow(['Nombre del Plato', 'Cantidad de Pedidos'])
      headerRow.font = { bold: true }
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      }

      // Agregar datos y estilo a la tabla de platos
      topPlates.forEach(plate => {
        const row = worksheet.addRow([plate.name, plate.count])
        row.getCell(2).numFmt = '#,##0'
      })

      // Dar formato a todas las celdas con datos
      worksheet.eachRow({ includeEmpty: false }, row => {
        row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        })
      })

      // Ajustar anchos de columna
      worksheet.getColumn(1).width = 30
      worksheet.getColumn(2).width = 20

      // Generar el archivo
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      saveAs(blob, `reporte-comedor-${startDate}-${endDate}.xlsx`)
    } catch (error) {
      console.error('Error al exportar a Excel:', error)
      alert('Hubo un error al exportar el archivo Excel')
    }
  }

  
  const exportToPDFEnhanced = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      let yPosition = 20;
  
      const colors = {
        primary: [41, 128, 185],
        secondary: [52, 152, 219],
        success: [39, 174, 96],
        warning: [243, 156, 18],
        danger: [231, 76, 60],
        dark: [44, 62, 80],
        light: [149, 165, 166],
        white: [255, 255, 255],
      };
  
      // Header
      doc.setFillColor(...colors.primary);
      doc.rect(0, 0, pageWidth, 50, 'F');
      doc.setTextColor(...colors.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(24);
      doc.text('REPORTE DE COMEDOR', pageWidth / 2, 25, { align: 'center' });
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text('Analisis Detallado de Uso', pageWidth / 2, 35, { align: 'center' });
      yPosition = 65;
  
      // Period Information
      doc.setFillColor(240, 248, 255);
      doc.rect(15, yPosition - 5, pageWidth - 30, 25, 'F');
      doc.setDrawColor(...colors.secondary);
      doc.rect(15, yPosition - 5, pageWidth - 30, 25, 'S');
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('PERIODO DE ANALISIS', 20, yPosition + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Desde: ${startDate}`, 20, yPosition + 12);
      doc.text(`Hasta: ${endDate}`, pageWidth / 2, yPosition + 12);
      doc.text(
        `Generado: ${new Date().toLocaleDateString('es-ES', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}`,
        20,
        yPosition + 19
      );
      yPosition += 40;
  
      // Main Statistics
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...colors.primary);
      doc.text('ESTADISTICAS PRINCIPALES', 20, yPosition);
      yPosition += 15;
  
      const stats = [
        {
          label: 'Total de Usos',
          value: totalUsage.toString(),
          color: colors.success,
          description: 'platos servidos en total',
        },
        {
          label: 'Promedio Diario',
          value: avgDaily.toFixed(1),
          color: colors.secondary,
          description: 'platos por dia',
        },
        {
          label: 'Dia Mas Activo',
          value: maxDay.count.toString(),
          color: colors.warning,
          description: `el ${maxDay.date}`,
        },
        {
          label: 'Dias Analizados',
          value: filteredDailyCounts.length.toString(),
          color: colors.danger,
          description: 'dias con datos',
        },
      ];
  
      const statBoxWidth = (pageWidth - 50) / 2;
      const statBoxHeight = 30;
  
      stats.forEach((stat, index) => {
        const xPos = 20 + (index % 2) * (statBoxWidth + 10);
        const yPos = yPosition + Math.floor(index / 2) * (statBoxHeight + 15);
        doc.setFillColor(...stat.color);
        doc.rect(xPos, yPos, statBoxWidth, statBoxHeight, 'F');
        doc.setDrawColor(stat.color[0] - 20, stat.color[1] - 20, stat.color[2] - 20);
        doc.rect(xPos, yPos, statBoxWidth, statBoxHeight, 'S');
        doc.setTextColor(...colors.white);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(stat.label, xPos + 5, yPos + 10);
        doc.setFontSize(16);
        doc.text(stat.value, xPos + 5, yPos + 20);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(stat.description, xPos + 5, yPos + 26);
      });
      yPosition += 80;
  
      // Top Dishes
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...colors.primary);
      doc.text('TOP PLATOS MAS POPULARES', 20, yPosition);
      yPosition += 10;
  
      const tableStartY = yPosition + 5;
      const rowHeight = 12;
      const colWidths = [15, 100, 30, 35];
      let currentX = 20;
  
      doc.setFillColor(...colors.dark);
      doc.rect(20, tableStartY, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      doc.setTextColor(...colors.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      const headers = ['#', 'Nombre del Plato', 'Usos', '% Total'];
      headers.forEach((header, index) => {
        doc.text(header, currentX + 3, tableStartY + 8);
        currentX += colWidths[index];
      });
      yPosition = tableStartY + rowHeight;
  
      topPlates.forEach((plate, index) => {
        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(248, 249, 250);
          doc.rect(20, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
        }
        doc.setDrawColor(220, 220, 220);
        doc.rect(20, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'S');
        doc.setTextColor(...colors.dark);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        currentX = 20;
        const rowData = [
          (index + 1).toString(),
          plate.name.length > 25 ? plate.name.substring(0, 22) + '...' : plate.name,
          plate.count.toString(),
          `${((plate.count / totalUsage) * 100).toFixed(1)}%`,
        ];
        rowData.forEach((data, colIndex) => {
          if (colIndex === 0 || colIndex === 2 || colIndex === 3) {
            doc.text(data, currentX + colWidths[colIndex] / 2, yPosition + 8, { align: 'center' });
          } else {
            doc.text(data, currentX + 3, yPosition + 8);
          }
          currentX += colWidths[colIndex];
        });
        yPosition += rowHeight;
      });
      yPosition += 20;
  
      // Temporal Analysis
      if (yPosition > pageHeight - 80) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...colors.primary);
      doc.text('ANALISIS TEMPORAL', 20, yPosition);
      yPosition += 15;
  
      const periodStats = {
        totalDays: filteredDailyCounts.length,
        minUsage: Math.min(...filteredDailyCounts.map((d) => d.count)),
        maxUsage: Math.max(...filteredDailyCounts.map((d) => d.count)),
        totalUsageDaily: filteredDailyCounts.reduce((sum, d) => sum + d.count, 0),
        variance: 0,
      };
      const mean = periodStats.totalUsageDaily / periodStats.totalDays;
      periodStats.variance =
        filteredDailyCounts.reduce((sum, d) => sum + Math.pow(d.count - mean, 2), 0) /
        periodStats.totalDays;
  
      doc.setFillColor(255, 248, 240);
      doc.rect(20, yPosition - 5, pageWidth - 40, 45, 'F');
      doc.setDrawColor(...colors.warning);
      doc.rect(20, yPosition - 5, pageWidth - 40, 45, 'S');
      doc.setTextColor(...colors.dark);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const analysisText = [
        `Dias analizados: ${periodStats.totalDays}`,
        `Uso minimo diario: ${periodStats.minUsage} platos`,
        `Uso maximo diario: ${periodStats.maxUsage} platos`,
        `Desviacion estandar: ${Math.sqrt(periodStats.variance).toFixed(1)} platos`,
        `Variabilidad: ${((Math.sqrt(periodStats.variance) / mean) * 100).toFixed(1)}%`,
        `Consistencia: ${periodStats.variance < 50 ? 'Alta' : periodStats.variance < 100 ? 'Media' : 'Baja'}`,
      ];
      analysisText.forEach((text, index) => {
        doc.text(text, 25, yPosition + 5 + index * 6);
      });
      yPosition += 60;
  
      // Strategic Recommendations
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 30;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(...colors.danger);
      doc.text('RECOMENDACIONES ESTRATEGICAS', 20, yPosition);
      yPosition += 15;
  
      const recommendations = [];
      if (topPlates.length > 0) {
        const topPlate = topPlates[0];
        const topPercentage = (topPlate.count / totalUsage) * 100;
        if (topPercentage > 30) {
          recommendations.push(
            `Alta demanda: "${topPlate.name}" representa ${topPercentage.toFixed(1)}% del total. Aumentar produccion y optimizar preparacion.`
          );
        } else {
          recommendations.push(
            `Demanda equilibrada: "${topPlate.name}" es popular (${topPercentage.toFixed(1)}%).`
          );
        }
      }
  
      const cv = (Math.sqrt(periodStats.variance) / mean) * 100;
      if (cv < 20) {
        recommendations.push(`Demanda estable: variabilidad baja (${cv.toFixed(1)}%). Mantener stock actual.`);
      } else if (cv < 40) {
        recommendations.push(
          `Demanda moderada: variabilidad media (${cv.toFixed(1)}%). Implementar buffer de seguridad.`
        );
      } else {
        recommendations.push(`Demanda variable: variabilidad alta (${cv.toFixed(1)}%). Revisar factores externos.`);
      }
  
      if (avgDaily < 30) {
        recommendations.push(`Promedio bajo (${avgDaily.toFixed(1)} platos/dia). Promocionar o ampliar horarios.`);
      } else if (avgDaily > 60) {
        recommendations.push(
          `Alta demanda: promedio alto (${avgDaily.toFixed(1)} platos/dia). Evaluar capacidad.`
        );
      }
  
      recommendations.push(
        `Optimizar: enfocar recursos en los top ${Math.min(3, topPlates.length)} platos que representan ${topPlates
          .slice(0, 3)
          .reduce((sum, p) => sum + (p.count / totalUsage) * 100, 0)
          .toFixed(1)}% de la demanda.`
      );
  
      recommendations.forEach((rec, index) => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = 30;
        }
        const recHeight = 20;
        doc.setFillColor(255, 245, 245);
        doc.rect(20, yPosition - 3, pageWidth - 40, recHeight, 'F');
        doc.setDrawColor(...colors.danger);
        doc.rect(20, yPosition - 3, pageWidth - 40, recHeight, 'S');
        doc.setTextColor(...colors.dark);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const lines = doc.splitTextToSize(rec, pageWidth - 50);
        lines.forEach((line, lineIndex) => {
          doc.text(line, 25, yPosition + 5 + lineIndex * 5);
        });
        yPosition += Math.max(recHeight, lines.length * 5 + 10);
      });
  
      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(...colors.light);
        doc.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(...colors.light);
        doc.text('Sistema de Gestion de Comedor - Reporte Automatico', 20, pageHeight - 12);
        doc.text(`Pagina ${i} de ${totalPages}`, pageWidth - 20, pageHeight - 12, { align: 'right' });
      }
  
      doc.save(`reporte-comedor-detallado-${startDate}-${endDate}.pdf`);
    } catch (error) {
      console.error('Error al exportar a PDF:', error);
      alert('Hubo un error al exportar el archivo PDF.');
    }
  };
  

  // Función para aplicar filtros
  const applyDateFilter = () => {
    // Los datos se filtran automáticamente por el useMemo y getFilteredData
    // Esta función se puede usar para validaciones adicionales si es necesario
    if (new Date(startDate) > new Date(endDate)) {
      alert('La fecha de inicio no puede ser mayor que la fecha de fin')
      return
    }
  }

  return (
    <main className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold flex"> 
          <ChartBarSquareIcon className="h-10 w-10 mr-2"/> Reportes
        </h1>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <ChartBarSquareIcon className="h-5 w-5" />
            Excel
          </button>
          <button
            onClick={exportToPDFEnhanced}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            PDF
          </button>
        </div>
      </div>

      {/* Selector de rango de fechas */}
      <div className="bg-white p-6 mb-6 rounded-[30px] border border-[#e2e8f0] shadow-sm">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <CalendarIcon className="h-5 w-5 mr-2" />
          Seleccionar Rango de Fechas
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex flex-col">
            <label htmlFor="start-date" className="text-sm font-medium text-gray-700 mb-1">
              Fecha de inicio
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="end-date" className="text-sm font-medium text-gray-700 mb-1">
              Fecha de fin
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex flex-col justify-end">
            <button
              onClick={applyDateFilter}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center gap-2 mt-auto"
            >
              <CalendarIcon className="h-4 w-4" />
              Aplicar Filtro
            </button>
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-600">
          Período seleccionado: {startDate} al {endDate} 
          ({filteredDailyCounts.length} días con datos)
        </div>
      </div>

      {/* Resumen general */}
      <div className="bg-gray-50 p-4 mb-6 rounded-[30px] border border-[#e2e8f0]">
        <h2 className="text-xl font-semibold mb-2">🔍 Resumen General</h2>
        <p>Total de usos de platos: <strong>{totalUsage}</strong></p>
        <p>Uso medio por día: <strong>{avgDaily.toFixed(1)}</strong></p>
        <p>Día más activo: <strong>{maxDay.date}</strong> ({maxDay.count})</p>
        <p>Período analizado: <strong>{startDate}</strong> a <strong>{endDate}</strong></p>
      </div>

      {/* Tab list */}
      <div role="tablist" className="flex space-x-4 mb-4">
        <button 
          role="tab"
          aria-selected={activeTab === 'usage'}
          onClick={() => setActiveTab('usage')}
          className={`px-3 py-2 border-b-2 ${
            activeTab === 'usage'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          } focus:outline-none`}
        >
          Platos más usados
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'daily'}
          onClick={() => setActiveTab('daily')}
          className={`px-3 py-2 border-b-2 ${
            activeTab === 'daily'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          } focus:outline-none`}
        >
          Nº platos por período
        </button>
      </div>

      {/* Contenedor de contenido */}
      <div className="rounded-[30px] border border-[#e2e8f0] bg-white p-6 text-gray-900">
        {filteredDailyCounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No hay datos disponibles para el rango de fechas seleccionado</p>
            <p className="text-gray-400 text-sm mt-2">Intenta seleccionar un rango de fechas diferente</p>
          </div>
        ) : activeTab === 'usage' ? (
          <Bar
            data={{
              labels: topPlates.map((p) => p.name),
              datasets: [
                {
                  label: 'Veces usadas',
                  data: topPlates.map((p) => p.count),
                  backgroundColor: 'rgba(59,130,246,0.5)',
                  borderColor: 'rgba(59,130,246,1)',
                  borderWidth: 1,
                },
              ],
            }}
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: { display: true, text: `Top ${topPlates.length} Platos Más Usados (${startDate} - ${endDate})` },
              },
            }}
          />
        ) : (
          <>
            {/* Sub-tabs para día/semana/mes */}
            <div className="flex space-x-4 mb-4">
              {['day', 'week', 'month'].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p as any)}
                  className={`px-3 py-1 rounded ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {p === 'day'
                    ? 'Día'
                    : p === 'week'
                    ? 'Semana'
                    : 'Mes'}
                </button>
              ))}
            </div>

            <Line
              data={{
                labels,
                datasets: [
                  {
                    label:
                      period === 'day'
                        ? 'Platos/día'
                        : period === 'week'
                        ? 'Platos/semana'
                        : 'Platos/mes',
                    data,
                    fill: false,
                    borderColor:
                      period === 'month' ? 'rgb(234, 179, 8)' : 'rgb(16,185,129)',
                    tension: 0.3,
                  },
                ],
              }}
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { 
                    display: true, 
                    text: `${chartOptions.plugins.title.text} (${startDate} - ${endDate})`
                  },
                },
              }}
            />
          </>
        )}
      </div>
    </main>
  )
}
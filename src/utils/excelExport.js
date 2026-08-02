import * as XLSX from 'xlsx';
import { formatDate } from './helpers';

export function exportToExcel(records, selectedMonth = 'all') {
  if (!records || records.length === 0) return false;

  // Filter by month if specified (selectedMonth format 'YYYY-MM')
  let filteredRecords = records;
  if (selectedMonth && selectedMonth !== 'all') {
    filteredRecords = records.filter(r => {
      const d = r.dateFrom || r.entryDate;
      return d && d.startsWith(selectedMonth);
    });
  }

  if (filteredRecords.length === 0) return null;

  const wb = XLSX.utils.book_new();

  // ────────────────────────────────────────────────────────
  // SHEET 1: Rental Records
  // ────────────────────────────────────────────────────────
  const headers = [
    'Sr No', 'Entry Date', 'Customer Name', 'Phone', 'Address',
    'Bike Model', 'Bike Number Plate',
    'Date From', 'Date To', 'Duration',
    'Rent Amount (₹)', 'Safety Deposit (₹)', 'Advance Amount (₹)', 'Balance Due (₹)', 'Payment Status',
    'Aadhar Card', 'Driving License', 'Notes',
  ];

  const rows = filteredRecords.map((r, i) => {
    const bal = r.balanceDue || 0;
    const status = bal <= 0 ? 'PAID ✅' : `PENDING (₹${bal.toFixed(2)})`;

    return [
      i + 1,
      formatDate(r.entryDate),
      r.customerName,
      r.customerPhone    || '',
      r.customerAddress  || '',
      r.bikeModel,
      r.bikeNumber       || '',
      r.dateFrom ? formatDate(r.dateFrom) : '',
      r.dateTo   ? formatDate(r.dateTo)   : '',
      r.duration         || '',
      r.rentAmount    || 0,
      r.safetyDeposit || 0,
      r.advanceAmount || 0,
      bal,
      status,
      r.aadharCard    ? r.aadharCard.name  : 'Not uploaded',
      r.drivingLicense? r.drivingLicense.name : 'Not uploaded',
      r.notes         || '',
    ];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws1['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 22 }, { wch: 14 }, { wch: 20 },
    { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 20 }, { wch: 14 },
    { wch: 16 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 18 },
    { wch: 22 }, { wch: 22 }, { wch: 30 },
  ];
  ws1['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws1, 'Rental Records');

  // ────────────────────────────────────────────────────────
  // SHEET 2: Bike-Wise Rent Breakdown
  // ────────────────────────────────────────────────────────
  const bikeStats = {};
  filteredRecords.forEach(r => {
    const bike = r.bikeModel || 'Unknown';
    if (!bikeStats[bike]) {
      bikeStats[bike] = { trips: 0, rent: 0, deposit: 0, advance: 0, balance: 0 };
    }
    bikeStats[bike].trips   += 1;
    bikeStats[bike].rent    += parseFloat(r.rentAmount)    || 0;
    bikeStats[bike].deposit += parseFloat(r.safetyDeposit) || 0;
    bikeStats[bike].advance += parseFloat(r.advanceAmount) || 0;
    bikeStats[bike].balance += parseFloat(r.balanceDue)    || 0;
  });

  const bikeHeaders = ['Bike Model', 'Total Rentals', 'Total Rent Amount (₹)', 'Safety Deposits (₹)', 'Advance Paid (₹)', 'Balance Due (₹)'];
  const bikeRows = Object.entries(bikeStats).map(([bike, data]) => [
    bike,
    data.trips,
    data.rent,
    data.deposit,
    data.advance,
    data.balance
  ]);

  // Grand Total Row
  const totalTrips   = bikeRows.reduce((s, row) => s + row[1], 0);
  const totalRent    = bikeRows.reduce((s, row) => s + row[2], 0);
  const totalDeposit = bikeRows.reduce((s, row) => s + row[3], 0);
  const totalAdvance = bikeRows.reduce((s, row) => s + row[4], 0);
  const totalBalance = bikeRows.reduce((s, row) => s + row[5], 0);

  bikeRows.push(['TOTAL ALL BIKES', totalTrips, totalRent, totalDeposit, totalAdvance, totalBalance]);

  const ws2 = XLSX.utils.aoa_to_sheet([bikeHeaders, ...bikeRows]);
  ws2['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 18 }, { wch: 16 }];
  ws2['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws2, 'Bike-Wise Revenue');

  // ────────────────────────────────────────────────────────
  // SHEET 3: Monthly Breakdown Report
  // ────────────────────────────────────────────────────────
  const monthStats = {};
  records.forEach(r => {
    const d = r.dateFrom ? new Date(r.dateFrom) : new Date(r.entryDate);
    const monthKey = !isNaN(d) ? d.toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : 'Unknown';
    if (!monthStats[monthKey]) {
      monthStats[monthKey] = { trips: 0, rent: 0, deposit: 0, balance: 0 };
    }
    monthStats[monthKey].trips   += 1;
    monthStats[monthKey].rent    += parseFloat(r.rentAmount)    || 0;
    monthStats[monthKey].deposit += parseFloat(r.safetyDeposit) || 0;
    monthStats[monthKey].balance += parseFloat(r.balanceDue)    || 0;
  });

  const monthHeaders = ['Month & Year', 'Total Rentals', 'Total Rent Amount (₹)', 'Safety Deposits (₹)', 'Pending Balance (₹)'];
  const monthRows = Object.entries(monthStats).map(([mKey, data]) => [
    mKey,
    data.trips,
    data.rent,
    data.deposit,
    data.balance
  ]);

  const ws3 = XLSX.utils.aoa_to_sheet([monthHeaders, ...monthRows]);
  ws3['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 22 }, { wch: 20 }, { wch: 20 }];
  ws3['!freeze'] = { xSplit: 0, ySplit: 1 };
  XLSX.utils.book_append_sheet(wb, ws3, 'Monthly Report');

  // ────────────────────────────────────────────────────────
  // SHEET 4: Executive Summary
  // ────────────────────────────────────────────────────────
  const summaryData = [
    ['WHEELZY MANAGEMENT SYSTEM — EXECUTIVE REPORT'],
    ['Generated On', new Date().toLocaleString('en-IN')],
    ['Report Period', selectedMonth === 'all' ? 'All Time' : selectedMonth],
    [],
    ['Key Financial Metric', 'Value'],
    ['Total Bike Rentals',     totalTrips],
    ['Total Rent Revenue',     `₹${totalRent.toFixed(2)}`],
    ['Total Safety Deposits',  `₹${totalDeposit.toFixed(2)}`],
    ['Total Advance Received', `₹${totalAdvance.toFixed(2)}`],
    ['Total Pending Balance',  `₹${totalBalance.toFixed(2)}`],
  ];

  const ws4 = XLSX.utils.aoa_to_sheet(summaryData);
  ws4['!cols'] = [{ wch: 32 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, ws4, 'Executive Summary');

  const dateStr  = new Date().toISOString().slice(0, 10);
  const fileName = selectedMonth === 'all' 
    ? `Wheelzy_Bike_Rental_Report_${dateStr}.xlsx`
    : `Wheelzy_Monthly_Report_${selectedMonth}.xlsx`;

  XLSX.writeFile(wb, fileName);
  return fileName;
}

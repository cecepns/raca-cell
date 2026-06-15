import { formatCurrency, formatDate } from './request';

const statusLabels = { success: 'Sukses', pending: 'Pending', failed: 'Gagal' };
const typeLabels = { prepaid: 'Prabayar', pasca: 'Pascabayar' };

const divider = '================================';
const line = '--------------------------------';

export const getReceiptStoreName = (partnerName) => {
  const trimmed = partnerName?.trim();
  return trimmed || 'Raca Cell';
};

export const buildReceiptText = (transaction, partnerName) => {
  const storeName = getReceiptStoreName(partnerName);
  const hasPartner = !!partnerName?.trim();
  const lines = [
    divider,
    storeName.toUpperCase(),
    ...(hasPartner ? [] : ['Raca Cell PPOB']),
    divider,
    `Tanggal   : ${formatDate(transaction.created_at)}`,
    `Ref ID    : ${transaction.ref_id}`,
    `Status    : ${statusLabels[transaction.status] || transaction.status}`,
    line,
    `Produk    : ${transaction.product_name}`,
    `Nomor     : ${transaction.customer_no}`,
    `Tipe      : ${typeLabels[transaction.transaction_type] || 'Prabayar'}`,
    `Harga     : ${formatCurrency(transaction.selling_price)}`,
  ];

  if (transaction.sn) {
    lines.push(line, `SN/Token  : ${transaction.sn}`);
  }

  if (transaction.message && transaction.status !== 'success') {
    lines.push(`Keterangan: ${transaction.message}`);
  }

  lines.push(
    divider,
    'Terima kasih atas kepercayaan Anda',
    divider
  );

  return lines.join('\n');
};

export const buildReceiptWhatsAppMessage = (transaction, partnerName) => {
  const storeName = getReceiptStoreName(partnerName);
  return `*Struk Transaksi - ${storeName}*\n\n${buildReceiptText(transaction, partnerName)}`;
};

export const downloadReceiptImage = async (element, filename) => {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
};

export const shareReceiptImage = async (element, title) => {
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
  });

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Gagal membuat gambar struk');

  const file = new File([blob], `${title}.png`, { type: 'image/png' });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
    return 'shared';
  }

  const link = document.createElement('a');
  link.download = `${title}.png`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
  return 'downloaded';
};

export const printReceipt = (elementId) => {
  const receiptEl = document.getElementById(elementId);
  if (!receiptEl) return;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Struk Transaksi</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            line-height: 1.4;
            color: #000;
            background: #fff;
            width: 58mm;
            padding: 4mm;
          }
          .receipt-print { width: 100%; }
          .receipt-print .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .receipt-print .row { display: flex; justify-content: space-between; gap: 4px; }
          .receipt-print .row .label { flex-shrink: 0; }
          .receipt-print .row .value { text-align: right; word-break: break-all; }
          .receipt-print .center { text-align: center; }
          .receipt-print .title { font-weight: bold; font-size: 13px; }
          .receipt-print .subtitle { font-size: 10px; margin-top: 2px; }
          .receipt-print .sn { word-break: break-all; font-size: 10px; }
        </style>
      </head>
      <body>${receiptEl.innerHTML}</body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};

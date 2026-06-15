import { formatCurrency, formatDate } from '../../utils/request';
import { getReceiptStoreName } from '../../utils/receipt';

const statusLabels = { success: 'Sukses', pending: 'Pending', failed: 'Gagal' };
const typeLabels = { prepaid: 'Prabayar', pasca: 'Pascabayar' };

const ReceiptPreview = ({ transaction, partnerName, id = 'receipt-preview' }) => {
  const storeName = getReceiptStoreName(partnerName);
  const hasPartner = !!partnerName?.trim();

  return (
    <div id={id} className="receipt-print bg-white text-black font-mono text-xs leading-relaxed p-4 max-w-[280px] mx-auto">
      <div className="divider border-t border-dashed border-black my-2" />
      <div className="center text-center">
        <p className="title font-bold text-sm">{storeName.toUpperCase()}</p>
        {!hasPartner && (
          <p className="subtitle text-[10px] text-gray-600">Raca Cell PPOB</p>
        )}
      </div>
      <div className="divider border-t border-dashed border-black my-2" />

      <div className="space-y-1">
        <ReceiptRow label="Tanggal" value={formatDate(transaction.created_at)} />
        <ReceiptRow label="Ref ID" value={transaction.ref_id} />
        <ReceiptRow label="Status" value={statusLabels[transaction.status] || transaction.status} />
      </div>

      <div className="divider border-t border-dashed border-black my-2" />

      <div className="space-y-1">
        <ReceiptRow label="Produk" value={transaction.product_name} />
        <ReceiptRow label="Nomor" value={transaction.customer_no} />
        <ReceiptRow label="Tipe" value={typeLabels[transaction.transaction_type] || 'Prabayar'} />
        <ReceiptRow label="Harga" value={formatCurrency(transaction.selling_price)} bold />
      </div>

      {transaction.sn && (
        <>
          <div className="divider border-t border-dashed border-black my-2" />
          <div>
            <p className="text-[10px] text-gray-600 mb-0.5">SN/Token</p>
            <p className="sn text-[11px] break-all font-semibold">{transaction.sn}</p>
          </div>
        </>
      )}

      {transaction.message && transaction.status !== 'success' && (
        <div className="mt-2">
          <p className="text-[10px] text-gray-600">Keterangan</p>
          <p className="text-[10px] break-words">{transaction.message}</p>
        </div>
      )}

      <div className="divider border-t border-dashed border-black my-2" />
      <p className="center text-center text-[10px]">Terima kasih atas kepercayaan Anda</p>
      <div className="divider border-t border-dashed border-black my-2" />
    </div>
  );
};

const ReceiptRow = ({ label, value, bold }) => (
  <div className="row flex justify-between gap-2">
    <span className="label text-gray-600 shrink-0">{label}</span>
    <span className={`value text-right break-all ${bold ? 'font-bold' : ''}`}>{value}</span>
  </div>
);

export default ReceiptPreview;

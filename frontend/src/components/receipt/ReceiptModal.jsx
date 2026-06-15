import { useState } from 'react';
import toast from 'react-hot-toast';
import { Printer, Download, MessageCircle, Image, Loader2 } from 'lucide-react';
import Modal from '../ui/Modal';
import ReceiptPreview from './ReceiptPreview';
import {
  buildReceiptWhatsAppMessage,
  downloadReceiptImage,
  printReceipt,
  shareReceiptImage,
} from '../../utils/receipt';
import { buildWhatsAppShareUrl } from '../../utils/whatsapp';

const ReceiptModal = ({ isOpen, onClose, transaction, partnerName }) => {
  const [loading, setLoading] = useState(null);

  if (!transaction) return null;

  const receiptId = `receipt-print-${transaction.id}`;
  const filename = `struk-${transaction.ref_id}`;

  const runAction = async (key, action) => {
    setLoading(key);
    try {
      await action();
    } catch (err) {
      toast.error(err?.message || 'Gagal memproses struk');
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => {
    printReceipt(receiptId);
    toast.success('Dialog cetak dibuka');
  };

  const handleDownload = () =>
    runAction('download', async () => {
      const el = document.getElementById(receiptId);
      await downloadReceiptImage(el, `${filename}.png`);
      toast.success('Struk berhasil diunduh');
    });

  const handleShareText = () => {
    const message = buildReceiptWhatsAppMessage(transaction, partnerName);
    window.open(buildWhatsAppShareUrl(message), '_blank', 'noopener,noreferrer');
    toast.success('Membuka WhatsApp...');
  };

  const handleShareImage = () =>
    runAction('share-image', async () => {
      const el = document.getElementById(receiptId);
      const result = await shareReceiptImage(el, filename);
      if (result === 'shared') {
        toast.success('Pilih kontak WhatsApp untuk membagikan struk');
      } else {
        toast.success('Gambar struk diunduh. Bagikan manual ke WhatsApp jika perlu.');
      }
    });

  const actions = [
    { key: 'print', icon: Printer, label: 'Cetak Struk', onClick: handlePrint, color: 'bg-gray-900 text-white hover:bg-gray-800' },
    { key: 'download', icon: Download, label: 'Unduh Gambar', onClick: handleDownload, color: 'bg-primary-600 text-white hover:bg-primary-700' },
    { key: 'wa-text', icon: MessageCircle, label: 'Bagikan Teks WA', onClick: handleShareText, color: 'bg-green-500 text-white hover:bg-green-600' },
    { key: 'share-image', icon: Image, label: 'Bagikan Gambar WA', onClick: handleShareImage, color: 'bg-green-600 text-white hover:bg-green-700' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Struk Transaksi" size="sm">
      <div className="space-y-4">
        <div className="border rounded-xl overflow-hidden bg-gray-50">
          <ReceiptPreview
            transaction={transaction}
            partnerName={partnerName}
            id={receiptId}
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ key, icon: Icon, label, onClick, color }) => (
            <button
              key={key}
              type="button"
              onClick={onClick}
              disabled={loading !== null}
              className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition disabled:opacity-50 ${color}`}
            >
              {loading === key ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Icon className="w-4 h-4" />
              )}
              {label}
            </button>
          ))}
        </div>

        <p className="text-[10px] text-gray-400 text-center">
          Cetak struk menggunakan printer termal 58mm. Atur nama mitra di halaman Profil.
        </p>
      </div>
    </Modal>
  );
};

export default ReceiptModal;

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Wallet, MessageCircle, Send } from 'lucide-react';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';
import { useAuth } from '../context/AuthContext';
import { get, post, formatCurrency, formatDate, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { buildWhatsAppUrl, buildTopupWhatsAppMessage } from '../utils/whatsapp';

const statusLabels = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const TOPUP_PRESETS = [
  { value: 50000, label: '50rb' },
  { value: 100000, label: '100rb' },
  { value: 250000, label: '250rb' },
  { value: 500000, label: '500rb' },
];

const TopupRequest = () => {
  const { user } = useAuth();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.TOPUP_REQUESTS.LIST, {
        page: pagination.page,
        limit: pagination.limit,
      });
      setRequests(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    get(API_ENDPOINTS.SETTINGS.CONTACT).then((res) => setContact(res.data)).catch(() => {});
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [pagination.page, pagination.limit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt < 10000) {
      toast.error('Minimum request topup Rp 10.000');
      return;
    }

    setSubmitting(true);
    try {
      await post(API_ENDPOINTS.TOPUP_REQUESTS.LIST, { amount: amt, note });
      toast.success('Request topup berhasil dikirim');
      setAmount('');
      setNote('');
      fetchRequests();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openWhatsApp = (requestAmount) => {
    if (!contact?.admin_whatsapp) {
      toast.error('Nomor WhatsApp admin belum diatur');
      return;
    }
    const url = buildWhatsAppUrl(contact.admin_whatsapp, buildTopupWhatsAppMessage(user, requestAmount || amount));
    if (url) window.open(url, '_blank');
  };

  const hasPending = requests.some((r) => r.status === 'pending');

  return (
    <div>
      <Header title="Request Topup Saldo" subtitle={`Saldo: ${formatCurrency(user?.balance)}`} />

      <div className="px-4 -mt-4 space-y-4">
        <form onSubmit={handleSubmit} className="bg-white border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Ajukan Topup</h3>
              <p className="text-xs text-gray-500">Admin akan memproses request Anda</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nominal (Rp)</label>
            <input
              type="number"
              min="10000"
              step="1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Min. 10000"
              disabled={hasPending}
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
            <div className="flex gap-2 mt-2 flex-wrap">
              {TOPUP_PRESETS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  disabled={hasPending}
                  onClick={() => setAmount(String(value))}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium disabled:opacity-50 ${
                    parseFloat(amount) === value
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan (opsional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Metode transfer, bukti, dll."
              disabled={hasPending}
              className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
            />
          </div>

          {hasPending && (
            <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
              Anda masih punya request yang menunggu persetujuan admin.
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || hasPending}
            className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? <LoadingSpinner size="sm" className="text-white" /> : <><Send className="w-4 h-4" /> Kirim Request</>}
          </button>

          {contact?.admin_whatsapp && (
            <button
              type="button"
              onClick={() => openWhatsApp()}
              className="w-full bg-green-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-4 h-4" />
              Chat Admin via WhatsApp
            </button>
          )}
        </form>

        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Riwayat Request</h3>
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : requests.length === 0 ? (
            <EmptyState title="Belum ada request topup" />
          ) : (
            <div className="space-y-2">
              {requests.map((req) => (
                <div key={req.id} className="bg-white border rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-bold text-primary-600">{formatCurrency(req.amount)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[req.status]}`}>
                      {statusLabels[req.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{formatDate(req.created_at)}</p>
                  {req.note && <p className="text-xs text-gray-500 mt-1">Catatan: {req.note}</p>}
                  {req.admin_note && <p className="text-xs text-gray-500 mt-1">Admin: {req.admin_note}</p>}
                  {req.status === 'pending' && contact?.admin_whatsapp && (
                    <button
                      onClick={() => openWhatsApp(req.amount)}
                      className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1"
                    >
                      <MessageCircle className="w-3 h-3" /> Hubungi Admin
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
          <Pagination
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            onLimitChange={(limit) => setPagination((p) => ({ ...p, limit, page: 1 }))}
          />
        </div>
      </div>
    </div>
  );
};

export default TopupRequest;

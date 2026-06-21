import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Percent, TrendingUp, MessageCircle, Package } from 'lucide-react';
import Header from '../../components/layout/Header';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { get, put, formatCurrency, getErrorMessage } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';

const MarginSettings = () => {
  const [margin, setMargin] = useState('');
  const [currentMargin, setCurrentMargin] = useState(0);
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingWa, setSavingWa] = useState(false);

  const exampleModal = 10000;
  const previewMargin = parseFloat(margin) || 0;
  const previewSelling = Math.ceil(exampleModal + (exampleModal * previewMargin) / 100);
  const previewProfit = previewSelling - exampleModal;

  useEffect(() => {
    Promise.all([
      get(API_ENDPOINTS.SETTINGS.MARGIN),
      get(API_ENDPOINTS.SETTINGS.WHATSAPP),
    ])
      .then(([marginRes, waRes]) => {
        setCurrentMargin(marginRes.data.margin_percent);
        setMargin(String(marginRes.data.margin_percent));
        setWhatsapp(waRes.data.admin_whatsapp || '');
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const value = parseFloat(margin);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('Margin harus antara 0% - 100%');
      return;
    }

    setSaving(true);
    try {
      const res = await put(API_ENDPOINTS.SETTINGS.MARGIN, { margin_percent: value });
      setCurrentMargin(res.data.margin_percent);
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWhatsapp = async () => {
    setSavingWa(true);
    try {
      const res = await put(API_ENDPOINTS.SETTINGS.WHATSAPP, { admin_whatsapp: whatsapp });
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingWa(false);
    }
  };

  return (
    <div>
      <Header title="Pengaturan Aplikasi" subtitle="Margin harga & kontak admin" />

      <div className="px-4 -mt-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <>
            <div className="bg-white border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                  <Percent className="w-5 h-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Margin Aktif</p>
                  <p className="text-2xl font-bold text-primary-600">{currentMargin}%</p>
                </div>
              </div>

              <p className="text-xs text-gray-500 mb-4">
                Margin diterapkan ke semua harga produk dari Digiflazz secara dinamis.
                Harga jual = harga modal + (harga modal × margin%). Perubahan langsung aktif tanpa restart server.
                Produk dengan margin khusus per item tidak terpengaruh pengaturan ini.
              </p>

              <Link
                to="/admin/product-margins"
                className="flex items-center gap-3 mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl hover:bg-indigo-100 transition-colors"
              >
                <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <Package className="w-4 h-4 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-indigo-900">Margin Per Produk</p>
                  <p className="text-xs text-indigo-700">Atur margin khusus per SKU produk</p>
                </div>
              </Link>

              <label className="block text-sm font-medium text-gray-700 mb-2">Atur Margin (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.5"
                  value={margin || 0}
                  onChange={(e) => setMargin(e.target.value)}
                  className="flex-1 accent-primary-600"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  className="w-20 px-3 py-2 border rounded-xl text-center text-sm font-medium"
                />
              </div>

              <div className="flex gap-2 mt-3 flex-wrap">
                {[0, 3, 5, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMargin(String(preset))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      parseFloat(margin) === preset
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <h3 className="font-medium text-gray-900">Preview Perhitungan</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Harga Modal (contoh)</span>
                  <span className="font-medium">{formatCurrency(exampleModal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Margin ({previewMargin}%)</span>
                  <span className="font-medium text-orange-600">+{formatCurrency(previewProfit)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span className="font-medium text-gray-900">Harga Jual</span>
                  <span className="font-bold text-primary-600">{formatCurrency(previewSelling)}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center"
            >
              {saving ? <LoadingSpinner size="sm" className="text-white" /> : 'Simpan Margin'}
            </button>

            <div className="bg-white border rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">WhatsApp Admin</p>
                  <p className="text-sm font-medium text-gray-900">Untuk chat & request topup user</p>
                </div>
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Nomor WhatsApp</label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 mb-3"
              />
              <p className="text-xs text-gray-500 mb-3">Format: 08xx atau 628xx. User bisa hubungi admin via tombol WhatsApp.</p>

              <button
                onClick={handleSaveWhatsapp}
                disabled={savingWa}
                className="w-full bg-green-500 text-white py-3 rounded-xl font-medium disabled:opacity-60 flex items-center justify-center"
              >
                {savingWa ? <LoadingSpinner size="sm" className="text-white" /> : 'Simpan WhatsApp'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MarginSettings;

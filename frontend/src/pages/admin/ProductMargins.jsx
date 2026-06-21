import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Percent, Edit2, RotateCcw, ArrowLeft } from 'lucide-react';
import Header from '../../components/layout/Header';
import SearchInput from '../../components/ui/SearchInput';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import { useDebounce } from '../../hooks/useDebounce';
import { get, put, del, formatCurrency, getErrorMessage } from '../../utils/request';
import { API_ENDPOINTS } from '../../utils/endpoints';
import { SERVICES } from '../../constants/services';

const TYPE_TABS = [
  { id: 'prepaid', label: 'Prabayar' },
  { id: 'pasca', label: 'Pascabayar' },
];

const ProductMargins = () => {
  const [products, setProducts] = useState([]);
  const [customMargins, setCustomMargins] = useState([]);
  const [globalMargin, setGlobalMargin] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCustom, setLoadingCustom] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedService, setSelectedService] = useState('pulsa');
  const [productType, setProductType] = useState('prepaid');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [customPagination, setCustomPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [editProduct, setEditProduct] = useState(null);
  const [marginInput, setMarginInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  const debouncedSearch = useDebounce(search);
  const isPasca = productType === 'pasca';
  const productsEndpoint = isPasca ? API_ENDPOINTS.PRODUCTS.PASCA : API_ENDPOINTS.PRODUCTS.PREPAID;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await get(productsEndpoint, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        service: selectedService,
      });
      setProducts(res.data);
      setPagination(res.pagination);
      setGlobalMargin(res.margin_percent ?? globalMargin);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomMargins = async () => {
    setLoadingCustom(true);
    try {
      const res = await get(API_ENDPOINTS.PRODUCTS.MARGINS.LIST, {
        page: customPagination.page,
        limit: customPagination.limit,
        search: debouncedSearch,
        transaction_type: productType,
      });
      setCustomMargins(res.data);
      setCustomPagination(res.pagination);
      setGlobalMargin(res.global_margin_percent ?? globalMargin);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoadingCustom(false);
    }
  };

  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
    setCustomPagination((p) => ({ ...p, page: 1 }));
  }, [debouncedSearch, selectedService, productType, activeTab]);

  useEffect(() => {
    if (activeTab === 'browse') fetchProducts();
  }, [debouncedSearch, selectedService, productType, pagination.page, pagination.limit, activeTab]);

  useEffect(() => {
    if (activeTab === 'custom') fetchCustomMargins();
  }, [debouncedSearch, productType, customPagination.page, customPagination.limit, activeTab]);

  const openEdit = (product) => {
    setEditProduct(product);
    const current = product.custom_margin_percent ?? product.margin_percent ?? globalMargin;
    setMarginInput(String(current));
  };

  const handleSave = async () => {
    const value = parseFloat(marginInput);
    if (Number.isNaN(value) || value < 0 || value > 100) {
      toast.error('Margin harus antara 0% - 100%');
      return;
    }

    setSaving(true);
    try {
      const res = await put(API_ENDPOINTS.PRODUCTS.MARGINS.SET(editProduct.buyer_sku_code), {
        margin_percent: value,
        product_name: editProduct.product_name,
        transaction_type: isPasca ? 'pasca' : 'prepaid',
      });
      toast.success(res.message);
      setEditProduct(null);
      if (activeTab === 'browse') fetchProducts();
      else fetchCustomMargins();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async (product) => {
    if (!product.has_custom_margin && !product.custom_margin_percent) {
      toast.error('Produk ini menggunakan margin global');
      return;
    }

    setSaving(true);
    try {
      const res = await del(API_ENDPOINTS.PRODUCTS.MARGINS.SET(product.buyer_sku_code));
      toast.success(res.message);
      setEditProduct(null);
      if (activeTab === 'browse') fetchProducts();
      else fetchCustomMargins();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const previewSelling = (product, marginValue) => {
    const base = parseFloat(product.price) || 0;
    const margin = parseFloat(marginValue) || 0;
    return Math.ceil(base + (base * margin) / 100);
  };

  return (
    <div>
      <Header
        title="Margin Per Produk"
        subtitle={`Margin global: ${globalMargin}%`}
        right={
          <Link to="/admin/margin" className="p-2 bg-white/20 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
        }
      />

      <div className="px-4 -mt-4 space-y-3">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-800">
          Produk dengan margin khusus akan mengabaikan margin global. Produk tanpa margin khusus tetap memakai margin global ({globalMargin}%).
        </div>

        <div className="flex gap-2">
          {[
            { id: 'browse', label: 'Semua Produk' },
            { id: 'custom', label: 'Margin Khusus' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium ${
                activeTab === tab.id ? 'bg-primary-600 text-white' : 'bg-white border text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProductType(tab.id)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium ${
                productType === tab.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'browse' && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {SERVICES.filter((s) => s.type === productType).map((svc) => (
              <button
                key={svc.id}
                type="button"
                onClick={() => setSelectedService(svc.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  selectedService === svc.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {svc.label}
              </button>
            ))}
          </div>
        )}

        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cari nama produk atau SKU..."
        />

        {activeTab === 'browse' ? (
          loading ? (
            <div className="flex justify-center py-12"><LoadingSpinner /></div>
          ) : products.length === 0 ? (
            <EmptyState title="Produk tidak ditemukan" description="Coba ubah pencarian atau layanan" />
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.buyer_sku_code}
                  className="bg-white border rounded-xl p-3 flex items-center gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{product.product_name}</p>
                    <p className="text-xs text-gray-500">{product.brand} • {product.buyer_sku_code}</p>
                    {!isPasca && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Modal {formatCurrency(product.price)} → Jual {formatCurrency(product.selling_price)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        product.has_custom_margin
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        <Percent className="w-3 h-3" />
                        {product.has_custom_margin
                          ? `Khusus ${product.custom_margin_percent}%`
                          : `Global ${globalMargin}%`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {product.has_custom_margin && (
                      <button
                        type="button"
                        onClick={() => handleReset(product)}
                        disabled={saving}
                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                        title="Kembali ke margin global"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEdit(product)}
                      className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                      title="Atur margin"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : loadingCustom ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : customMargins.length === 0 ? (
          <EmptyState
            title="Belum ada margin khusus"
            description={`Semua produk ${productType} memakai margin global ${globalMargin}%`}
          />
        ) : (
          <div className="space-y-2">
            {customMargins.map((item) => (
              <div
                key={item.buyer_sku_code}
                className="bg-white border rounded-xl p-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.buyer_sku_code} • {item.transaction_type}</p>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-1 rounded-full text-[10px] font-medium bg-indigo-100 text-indigo-700">
                    <Percent className="w-3 h-3" />
                    {item.margin_percent}%
                  </span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleReset({ ...item, has_custom_margin: true })}
                    disabled={saving}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="Kembali ke margin global"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit({
                      buyer_sku_code: item.buyer_sku_code,
                      product_name: item.product_name,
                      custom_margin_percent: item.margin_percent,
                      margin_percent: item.margin_percent,
                      has_custom_margin: true,
                      price: 0,
                    })}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'browse' ? (
          <Pagination
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            onLimitChange={(limit) => setPagination((p) => ({ ...p, limit, page: 1 }))}
          />
        ) : (
          <Pagination
            pagination={customPagination}
            onPageChange={(page) => setCustomPagination((p) => ({ ...p, page }))}
            onLimitChange={(limit) => setCustomPagination((p) => ({ ...p, limit, page: 1 }))}
          />
        )}
      </div>

      <Modal
        isOpen={!!editProduct}
        onClose={() => setEditProduct(null)}
        title="Atur Margin Produk"
      >
        {editProduct && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-900">{editProduct.product_name}</p>
              <p className="text-xs text-gray-500 mt-1">{editProduct.buyer_sku_code}</p>
              {!isPasca && editProduct.price > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Harga modal: {formatCurrency(editProduct.price)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Margin (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={marginInput}
                onChange={(e) => setMarginInput(e.target.value)}
                className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <div className="flex gap-2 mt-2 flex-wrap">
                {[0, 3, 5, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMarginInput(String(preset))}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                      parseFloat(marginInput) === preset
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>

            {!isPasca && editProduct.price > 0 && (
              <div className="bg-primary-50 rounded-xl p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Preview harga jual</span>
                  <span className="font-bold text-primary-600">
                    {formatCurrency(previewSelling(editProduct, marginInput))}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Global saat ini: {globalMargin}%
                  {parseFloat(marginInput) === globalMargin && ' (sama dengan global)'}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {editProduct.has_custom_margin && (
                <button
                  type="button"
                  onClick={() => handleReset(editProduct)}
                  disabled={saving}
                  className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-60"
                >
                  Pakai Global
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center"
              >
                {saving ? <LoadingSpinner size="sm" className="text-white" /> : 'Simpan Margin'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ProductMargins;

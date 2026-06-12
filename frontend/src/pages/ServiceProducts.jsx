import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import Header from '../components/layout/Header';
import SearchInput from '../components/ui/SearchInput';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { get, post, formatCurrency, getErrorMessage } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { getServiceById, SERVICES } from '../constants/services';

const ServiceProducts = () => {
  const { serviceId } = useParams();
  const service = getServiceById(serviceId);
  const isPasca = service.type === 'pasca';
  const { user, updateBalance, refreshProfile } = useAuth();
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [customerNo, setCustomerNo] = useState('');
  const [processing, setProcessing] = useState(false);
  const [inquiryData, setInquiryData] = useState(null);
  const [inquiring, setInquiring] = useState(false);

  const debouncedSearch = useDebounce(search);
  const Icon = service.icon;
  const productsEndpoint = isPasca ? API_ENDPOINTS.PRODUCTS.PASCA : API_ENDPOINTS.PRODUCTS.PREPAID;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await get(productsEndpoint, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        brand: selectedBrand,
        service: service.id,
      });
      setProducts(res.data);
      setPagination(res.pagination);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelectedBrand('');
    setSearch('');
    setPagination((p) => ({ ...p, page: 1 }));
  }, [serviceId]);

  useEffect(() => {
    get(API_ENDPOINTS.PRODUCTS.BRANDS, { service: service.id })
      .then((res) => setBrands(res.data))
      .catch(() => setBrands([]));
  }, [service.id]);

  useEffect(() => {
    fetchProducts();
  }, [debouncedSearch, selectedBrand, pagination.page, pagination.limit, service.id, isPasca]);

  const resetModal = () => {
    setSelectedProduct(null);
    setCustomerNo('');
    setInquiryData(null);
  };

  const handleBuy = async () => {
    if (!customerNo || customerNo.length < service.minLength) {
      toast.error(`${service.customerLabel} tidak valid`);
      return;
    }
    if (parseFloat(user.balance) < selectedProduct.selling_price) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    setProcessing(true);
    try {
      const res = await post(API_ENDPOINTS.TRANSACTIONS.TOPUP, {
        buyer_sku_code: selectedProduct.buyer_sku_code,
        customer_no: customerNo,
        product_name: selectedProduct.product_name,
        category: selectedProduct.category,
        brand: selectedProduct.brand,
        price: selectedProduct.price,
      });
      toast.success(res.message);
      updateBalance(res.data.balance_after);
      await refreshProfile();
      resetModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleInquiry = async () => {
    if (!customerNo || customerNo.length < service.minLength) {
      toast.error(`${service.customerLabel} tidak valid`);
      return;
    }

    setInquiring(true);
    try {
      const res = await post(API_ENDPOINTS.TRANSACTIONS.PASCA_INQUIRY, {
        buyer_sku_code: selectedProduct.buyer_sku_code,
        customer_no: customerNo,
        product_name: selectedProduct.product_name,
        category: selectedProduct.category,
        brand: selectedProduct.brand,
      });
      setInquiryData(res.data);
      toast.success(res.message);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setInquiring(false);
    }
  };

  const handlePayPasca = async () => {
    if (!inquiryData?.ref_id) return;
    if (parseFloat(user.balance) < inquiryData.selling_price) {
      toast.error('Saldo tidak mencukupi');
      return;
    }

    setProcessing(true);
    try {
      const res = await post(API_ENDPOINTS.TRANSACTIONS.PASCA_PAY, { ref_id: inquiryData.ref_id });
      toast.success(res.message);
      updateBalance(res.data.balance_after);
      await refreshProfile();
      resetModal();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  if (!SERVICES.find((s) => s.id === serviceId)) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Layanan tidak ditemukan</p>
        <Link to="/layanan" className="text-primary-600 text-sm mt-2 inline-block">Kembali</Link>
      </div>
    );
  }

  return (
    <div>
      <Header
        title={service.label}
        subtitle={`Saldo: ${formatCurrency(user?.balance)}`}
        right={
          <Link to="/layanan" className="p-2 bg-white/20 rounded-xl">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
        }
      />

      <div className="px-4 -mt-4 space-y-3">
        <SearchInput value={search} onChange={setSearch} placeholder={`Cari ${service.label.toLowerCase()}...`} />

        {brands.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => { setSelectedBrand(''); setPagination((p) => ({ ...p, page: 1 })); }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                !selectedBrand ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Semua
            </button>
            {brands.map((brand) => (
              <button
                key={brand}
                onClick={() => { setSelectedBrand(brand); setPagination((p) => ({ ...p, page: 1 })); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  selectedBrand === brand ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {brand}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : products.length === 0 ? (
          <EmptyState title="Produk tidak ditemukan" description="Coba ubah filter atau hubungi admin" />
        ) : (
          <div className="space-y-2">
            {products.map((product) => (
              <button
                key={product.buyer_sku_code}
                onClick={() => setSelectedProduct(product)}
                className="w-full flex items-center gap-3 bg-white border rounded-xl p-3 hover:shadow-sm transition-shadow text-left"
              >
                <div className={`w-10 h-10 ${service.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{product.product_name}</p>
                  <p className="text-xs text-gray-500">{product.brand} • {product.category}</p>
                  {isPasca && (
                    <p className="text-[10px] text-gray-400 mt-0.5">Biaya admin: {formatCurrency(product.admin)}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  {isPasca ? (
                    <p className="text-xs font-medium text-primary-600">Cek Tagihan</p>
                  ) : (
                    <p className="font-bold text-primary-600 text-sm">{formatCurrency(product.selling_price)}</p>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-300 ml-auto" />
                </div>
              </button>
            ))}
          </div>
        )}

        <Pagination
          pagination={pagination}
          onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
          onLimitChange={(limit) => setPagination((p) => ({ ...p, limit, page: 1 }))}
        />
      </div>

      <Modal
        isOpen={!!selectedProduct}
        onClose={resetModal}
        title={isPasca ? `Bayar ${service.label}` : `Beli ${service.label}`}
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-900">{selectedProduct.product_name}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedProduct.brand}</p>
              {!isPasca && (
                <p className="text-lg font-bold text-primary-600 mt-2">
                  {formatCurrency(selectedProduct.selling_price)}
                </p>
              )}
            </div>

            {!inquiryData ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{service.customerLabel}</label>
                  <input
                    type="text"
                    value={customerNo}
                    onChange={(e) => setCustomerNo(e.target.value)}
                    placeholder={service.customerPlaceholder}
                    className="w-full px-4 py-3 bg-white text-gray-900 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                {isPasca ? (
                  <button
                    onClick={handleInquiry}
                    disabled={inquiring}
                    className="w-full bg-amber-500 text-white py-3 rounded-xl font-medium hover:bg-amber-600 disabled:opacity-60 flex items-center justify-center"
                  >
                    {inquiring ? <LoadingSpinner size="sm" className="text-white" /> : 'Cek Tagihan'}
                  </button>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>Saldo Anda</span>
                      <span className="font-medium">{formatCurrency(user?.balance)}</span>
                    </div>
                    <button
                      onClick={handleBuy}
                      disabled={processing}
                      className="w-full bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center"
                    >
                      {processing ? <LoadingSpinner size="sm" className="text-white" /> : 'Beli Sekarang'}
                    </button>
                  </>
                )}
              </>
            ) : (
              <>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nama</span>
                    <span className="font-medium text-gray-900">{inquiryData.customer_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{service.customerLabel}</span>
                    <span className="font-medium text-gray-900">{inquiryData.customer_no}</span>
                  </div>
                  {inquiryData.periode && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Periode</span>
                      <span className="font-medium text-gray-900">{inquiryData.periode}</span>
                    </div>
                  )}
                  {inquiryData.desc?.tarif && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tarif/Daya</span>
                      <span className="font-medium text-gray-900">
                        {inquiryData.desc.tarif} / {inquiryData.desc.daya} VA
                      </span>
                    </div>
                  )}
                  {Array.isArray(inquiryData.desc?.detail) && inquiryData.desc.detail.length > 0 && (
                    <div className="pt-2 border-t border-amber-100 space-y-1">
                      {inquiryData.desc.detail.map((item, idx) => (
                        <div key={idx} className="text-xs text-gray-600">
                          Periode {item.periode}: Tagihan {formatCurrency(item.nilai_tagihan)}
                          {item.denda ? ` + Denda ${formatCurrency(item.denda)}` : ''}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-amber-100">
                    <span className="text-gray-700 font-medium">Total Bayar</span>
                    <span className="font-bold text-primary-600 text-lg">
                      {formatCurrency(inquiryData.selling_price)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Saldo Anda</span>
                  <span className="font-medium">{formatCurrency(user?.balance)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setInquiryData(null)}
                    className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50"
                  >
                    Ubah ID
                  </button>
                  <button
                    onClick={handlePayPasca}
                    disabled={processing}
                    className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-60 flex items-center justify-center"
                  >
                    {processing ? <LoadingSpinner size="sm" className="text-white" /> : 'Bayar Sekarang'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceProducts;

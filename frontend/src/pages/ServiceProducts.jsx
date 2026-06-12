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

  const debouncedSearch = useDebounce(search);
  const Icon = service.icon;

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await get(API_ENDPOINTS.PRODUCTS.PREPAID, {
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
  }, [debouncedSearch, selectedBrand, pagination.page, pagination.limit, service.id]);

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
      setSelectedProduct(null);
      setCustomerNo('');
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
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-primary-600 text-sm">{formatCurrency(product.selling_price)}</p>
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
        onClose={() => { setSelectedProduct(null); setCustomerNo(''); }}
        title={`Beli ${service.label}`}
      >
        {selectedProduct && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-medium text-gray-900">{selectedProduct.product_name}</p>
              <p className="text-sm text-gray-500 mt-1">{selectedProduct.brand}</p>
              <p className="text-lg font-bold text-primary-600 mt-2">
                {formatCurrency(selectedProduct.selling_price)}
              </p>
            </div>

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
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceProducts;

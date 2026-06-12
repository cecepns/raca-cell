import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import Header from '../components/layout/Header';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { get, formatCurrency } from '../utils/request';
import { API_ENDPOINTS } from '../utils/endpoints';
import { SERVICES } from '../constants/services';

const Services = () => {
  const { user } = useAuth();
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    get(API_ENDPOINTS.PRODUCTS.SERVICES)
      .then((res) => {
        const map = {};
        res.data.forEach((item) => { map[item.id] = item.total; });
        setCounts(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Header title="Layanan PPOB" subtitle={`Saldo: ${formatCurrency(user?.balance)}`} />

      <div className="px-4 -mt-4">
        {loading ? (
          <div className="flex justify-center py-12"><LoadingSpinner /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {SERVICES.map(({ id, label, description, icon: Icon, color }) => (
              <Link
                key={id}
                to={`/layanan/${id}`}
                className="bg-white border rounded-2xl p-4 hover:shadow-md transition-shadow"
              >
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center mb-3`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 text-sm">{label}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{description}</p>
                {counts[id] !== undefined && (
                  <p className="text-[10px] text-primary-600 font-medium mt-2">{counts[id]} produk</p>
                )}
                <ChevronRight className="w-4 h-4 text-gray-300 mt-2 ml-auto" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Services;

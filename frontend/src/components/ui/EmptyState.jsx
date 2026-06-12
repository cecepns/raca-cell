import { Inbox } from 'lucide-react';

const EmptyState = ({ title = 'Tidak ada data', description = '' }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
      <Inbox className="w-8 h-8 text-gray-400" />
    </div>
    <h3 className="text-gray-700 font-medium">{title}</h3>
    {description && <p className="text-gray-500 text-sm mt-1">{description}</p>}
  </div>
);

export default EmptyState;

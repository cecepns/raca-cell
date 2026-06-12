import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

const MobileLayout = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="max-w-mobile mx-auto min-h-screen bg-white shadow-xl relative">
      <main className="pb-20">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  </div>
);

export default MobileLayout;

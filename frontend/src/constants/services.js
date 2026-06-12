import { Smartphone, Wifi, Ticket, Gamepad2, Zap } from 'lucide-react';

export const SERVICES = [
  {
    id: 'pulsa',
    label: 'Pulsa',
    description: 'Isi pulsa semua operator',
    icon: Smartphone,
    color: 'bg-blue-500',
    customerLabel: 'Nomor HP',
    customerPlaceholder: '08xxxxxxxxxx',
    minLength: 10,
  },
  {
    id: 'data',
    label: 'Paket Data',
    description: 'Kuota internet semua operator',
    icon: Wifi,
    color: 'bg-purple-500',
    customerLabel: 'Nomor HP',
    customerPlaceholder: '08xxxxxxxxxx',
    minLength: 10,
  },
  {
    id: 'voucher',
    label: 'Voucher',
    description: 'Voucher digital & e-voucher',
    icon: Ticket,
    color: 'bg-orange-500',
    customerLabel: 'Nomor HP / ID',
    customerPlaceholder: 'Nomor tujuan voucher',
    minLength: 5,
  },
  {
    id: 'game',
    label: 'Game Online',
    description: 'Top up game favorit Anda',
    icon: Gamepad2,
    color: 'bg-pink-500',
    customerLabel: 'User ID / Nomor HP',
    customerPlaceholder: 'ID game atau nomor HP',
    minLength: 3,
  },
  {
    id: 'pln',
    label: 'PLN',
    description: 'Token listrik & produk PLN',
    icon: Zap,
    color: 'bg-yellow-500',
    customerLabel: 'ID Pelanggan / No. Meter',
    customerPlaceholder: 'ID pelanggan PLN',
    minLength: 5,
  },
];

export const getServiceById = (id) => SERVICES.find((s) => s.id === id) || SERVICES[0];

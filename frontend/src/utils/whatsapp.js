export const buildWhatsAppUrl = (phone, message) => {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return null;
  let normalized = digits;
  if (normalized.startsWith('0')) normalized = `62${normalized.slice(1)}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
};

export const buildTopupWhatsAppMessage = (user, amount) =>
  `Halo Admin Raca Cell,\n\nSaya ingin request topup saldo:\n` +
  `Nama: ${user?.name}\n` +
  `Email: ${user?.email}\n` +
  `Nominal: Rp ${Number(amount).toLocaleString('id-ID')}\n\n` +
  `Mohon konfirmasi. Terima kasih.`;

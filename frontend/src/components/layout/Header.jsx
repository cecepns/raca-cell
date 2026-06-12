const Header = ({ title, subtitle, right }) => (
  <div className="bg-primary-600 text-white px-4 pt-6 pb-8 rounded-b-3xl">
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle && <p className="text-primary-100 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  </div>
);

export default Header;

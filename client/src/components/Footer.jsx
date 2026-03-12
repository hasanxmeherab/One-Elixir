import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white text-white">
      <div className="bg-black mx-2 md:mx-[5%] rounded-xl border-t-4 border-[#e74c3c]">
      <div className="px-[6%] py-14">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr_1fr] gap-12">

          {/* ── COL 1: SUPPORT ── */}
          <div>
            <h3 className="text-[#e74c3c] text-[13px] font-bold tracking-[5px] uppercase mb-7">
              Support
            </h3>

            <div className="flex flex-col gap-4 mb-8">
              {/* Phone */}
              <a
                href="tel:+8801636400363"
                className="flex items-center gap-3 border border-white rounded-full px-5 py-[11px] text-white text-[14px] font-medium w-fit hover:bg-white hover:text-black transition-colors no-underline"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current shrink-0">
                  <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" />
                </svg>
                +880 1636-400363
              </a>

              {/* Track Order */}
              <Link
                to="/track"
                className="flex items-center gap-3 border border-white rounded-full px-5 py-[11px] text-white text-[14px] font-medium w-fit hover:bg-white hover:text-black transition-colors no-underline"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-current shrink-0">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                Track My Order
              </Link>
            </div>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/people/OneElixir/61586827432727/"
                target="_blank" rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#1877F2] flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
              <a
                href="https://www.instagram.com/one_elixir/"
                target="_blank" rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#833AB4] flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              <a
                href="https://wa.me/8801636400363"
                target="_blank" rel="noreferrer"
                className="w-10 h-10 rounded-full bg-[#25D366] flex items-center justify-center hover:opacity-80 transition-opacity"
              >
                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] fill-white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          </div>

          {/* ── COL 2: About Us + Policy (2 sub-columns) ── */}
          <div className="grid grid-cols-2 gap-8">
            {/* About Us */}
            <div>
              <h3 className="text-[#e74c3c] text-[18px] font-semibold tracking-widest mb-6">
                About Us
              </h3>
              <ul className="flex flex-col gap-[14px] list-none p-0 m-0">
                {[
                  'About Us',
                  'Terms & Conditions',
                  'Track Order',
                  'Contact Us',
                  'FAQs',
                  'Blog',
                  'Sitemap',
                ].map((item) => (
                  <li key={item}>
                    <span className="text-[#cccccc] text-[14px] cursor-default hover:text-white transition-colors">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policy */}
            <div>
              <h3 className="text-[#e74c3c] text-[18px] font-semibold tracking-widest mb-6">
                Policy
              </h3>
              <ul className="flex flex-col gap-[14px] list-none p-0 m-0">
                {[
                  'Privacy Policy',
                  'Pre-Order Policy',
                  'Refund Policy',
                  'Return Policy',
                  'Warranty Policy',
                  'Delivery Policy',
                ].map((item) => (
                  <li key={item}>
                    <span className="text-[#cccccc] text-[14px] cursor-default hover:text-white transition-colors">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── COL 3: Stay Connected ── */}
          <div>
            <h3 className="text-[#e74c3c] text-[18px] font-semibold tracking-widest mb-6">
              Stay Connected
            </h3>
            <p className="text-white text-[15px] font-medium mb-4">OneElixir</p>
            <div className="text-[#cccccc] text-[13px] leading-[1.8] mb-5">
              <p className="font-semibold text-white mb-1">Warehouse Address –</p>
              <p>Dhaka, Bangladesh</p>
            </div>
            <p className="text-[#cccccc] text-[13px] leading-relaxed mb-5">
              <span className="font-bold text-white">Kindly note</span> that this location does not
              serve as our sales outlet or pickup point.
            </p>
            <p className="text-[13px] text-[#cccccc]">
              Email:{' '}
              <a
                href="mailto:oneelixir26@gmail.com"
                className="text-[#e74c3c] no-underline hover:underline"
              >
                oneelixir26@gmail.com
              </a>
            </p>
          </div>
        </div>
      </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white px-[8%] py-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="text-[#555] text-[12px] tracking-widest uppercase">
          © {new Date().getFullYear()} OneElixir. All rights reserved.
        </p>
        <p className="text-[#888] text-[11px]">Made with ❤️ in Bangladesh</p>
        </div>
      </div>
  </footer>
  );
}
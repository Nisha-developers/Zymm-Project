// Phone-style frame on desktop, full screen on mobile. Soft green aurora behind a pale glass-grey base.
export default function Shell({ children }) {
  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="relative h-dvh w-full overflow-hidden  md:h-screen"
        style={{ background: "linear-gradient(180deg,#f7f8f7 0%,#e1e4e1 52%,#b7bcb7 100%)" }}>
         
          
        <div className="pointer-events-none absolute -left-24 -top-20 h-80 w-80 rounded-full bg-emerald-300/35 blur-3xl" />
        <div className="pointer-events-none absolute -right-28 top-1/3 h-72 w-72 rounded-full bg-lime-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-72 w-72 rounded-full bg-teal-300/30 blur-3xl" />
        <div className="relative h-full overflow-y-auto md:px-[5rem]">{children}</div>
      </div>
    </div>
  );
}

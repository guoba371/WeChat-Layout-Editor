import { ArrowUp } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const visibleOffset = 260;

function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const tickingRef = useRef(false);

  useEffect(() => {
    function updateVisibility() {
      tickingRef.current = false;
      setVisible(window.scrollY > visibleOffset);
    }

    function handleScroll() {
      if (tickingRef.current) return;

      tickingRef.current = true;
      window.requestAnimationFrame(updateVisibility);
    }

    updateVisibility();
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <button
      type="button"
      aria-label="回到顶部"
      onClick={scrollToTop}
      className={[
        'fixed bottom-8 right-6 z-40 grid h-14 w-14 place-items-center rounded-[18px] border border-slate-200 bg-white/90 text-slate-500 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-[18px] transition duration-200 hover:-translate-y-0.5 hover:text-slate-950 dark:border-white/10 dark:bg-[#2b2021]/95 dark:text-white/62 dark:shadow-[0_20px_54px_rgba(0,0,0,0.42)] dark:hover:text-white xl:right-[calc((100vw-1160px)/2+34px)]',
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      ].join(' ')}
    >
      <ArrowUp size={24} strokeWidth={2.3} />
    </button>
  );
}

export default BackToTopButton;

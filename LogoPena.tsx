import { useEffect, useRef } from 'react';
import { LOGO_PENA_PATHS, LOGO_PENA_VIEWBOX } from './logo-pena';
import './logo-pena.css';

/**
 * Logo utama Irsyads (pena) yang dirakit: tetes jatuh, badan tumbuh, mata pena naik.
 * Diputar ulang saat penunjuk masuk ke logo atau tautan pembungkusnya.
 */
export function LogoPena({ height = 48, label, className = '' }: { height?: number; label?: string; className?: string }) {
    const ref = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const rakit = (e: Event) => {
            if ((e as PointerEvent).pointerType === 'touch') return;
            el.classList.remove('lp-rakit');
            void el.getBoundingClientRect();
            el.classList.add('lp-rakit');
        };
        const host = el.closest('a,button') ?? el;
        host.addEventListener('pointerenter', rakit);
        return () => host.removeEventListener('pointerenter', rakit);
    }, []);
    return (
        <span ref={ref} className={`logo-pena lp-rakit ${className}`} style={{ height, width: (height * 202) / 600 }}>
            <svg viewBox={LOGO_PENA_VIEWBOX} fill="currentColor" fillRule="evenodd" focusable="false" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
                {LOGO_PENA_PATHS.map(p => <path key={p.name} className={`lp-${p.name}`} d={p.d} />)}
            </svg>
        </span>
    );
}

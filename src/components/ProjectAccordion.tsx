import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Project } from '../data/work';

interface Props {
  projects: Project[];
}

/**
 * The projects on the Work stage as an accordion: each row is a button that opens the project's
 * description and a link to the site. One project is open at a time; opening another closes it.
 * Follows the WAI-ARIA accordion pattern, including Up/Down/Home/End between the headers.
 */
export default function ProjectAccordion({ projects }: Props) {
  const [open, setOpen] = useState<number | null>(null);
  const baseId = useId();
  const headers = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const last = projects.length - 1;
    const to =
      e.key === 'ArrowDown'
        ? Math.min(last, i + 1)
        : e.key === 'ArrowUp'
          ? Math.max(0, i - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    headers.current[to]?.focus();
  };

  return (
    <ul className="mt-5 flex flex-col gap-2">
      {projects.map((p, i) => {
        const isOpen = open === i;
        const headerId = `${baseId}-header-${i}`;
        const panelId = `${baseId}-panel-${i}`;
        return (
          <li
            key={p.name}
            className="border-rule grid grid-cols-[auto_1fr] items-baseline gap-3.5 border-t pt-2 text-sm leading-[1.35] sm:text-lg"
          >
            <span aria-hidden="true" className="text-accent-text font-mono font-medium">
              ~
            </span>
            <div className="min-w-0">
              <h3 className="text-inherit">
                <button
                  type="button"
                  id={headerId}
                  ref={(el) => {
                    headers.current[i] = el;
                  }}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  onClick={() => setOpen(isOpen ? null : i)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className="group flex w-full cursor-pointer items-baseline justify-between gap-3 text-left"
                >
                  <span className="flex flex-col flex-wrap items-baseline gap-1 md:flex-row md:gap-3.5">
                    <strong className="text-ink group-hover:text-accent-text font-medium transition-colors">
                      {p.name}
                    </strong>
                    <span className="text-muted leading-[1.7]">{p.summary}</span>
                  </span>
                  <svg
                    aria-hidden="true"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={[
                      'mt-1 shrink-0 self-start text-muted transition-transform duration-300 ease-out motion-reduce:transition-none',
                      isOpen ? 'rotate-180' : '',
                    ].join(' ')}
                  >
                    <path
                      d="M3 6l5 5 5-5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </h3>
              {/* Opens by growing a grid row from 0fr to 1fr. Visibility transitions too, so a closing panel stays
                  in view until the row has collapsed; inert keeps a closed panel out of the tab order. */}
              <div
                id={panelId}
                aria-labelledby={headerId}
                inert={!isOpen}
                className={[
                  'grid transition-[grid-template-rows,visibility] duration-300 ease-out motion-reduce:transition-none',
                  isOpen ? '' : 'invisible',
                ].join(' ')}
                style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="text-body max-w-[60ch] pt-3 pb-1 text-sm leading-[1.7] text-pretty sm:text-base">
                    {p.description}
                  </p>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-underline mt-2 mb-3 inline-block text-sm sm:text-base"
                  >
                    Visit {p.name}
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

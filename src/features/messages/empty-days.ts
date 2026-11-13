import { useLayoutEffect, type RefObject } from "react";

/** Marks a rendered day divider. */
export const DAY_DIVIDER = "data-day-divider";
/** Set on a divider whose day shows nothing under it. */
export const EMPTY_DAY = "data-empty-day";

// Under a pixel of content is rounding, not a row.
const SHOWN = 1;

const outerHeight = (element: HTMLElement) => {
  if (!element.getClientRects().length) return 0;
  const style = getComputedStyle(element);
  return (
    element.getBoundingClientRect().height +
    (Number.parseFloat(style.marginTop) || 0) +
    (Number.parseFloat(style.marginBottom) || 0)
  );
};

/** A day divider heads the rows after it, up to the next divider. When none
 * of them shows anything, for example because a plugin's CSS hides every row
 * of that day, the divider heads an empty day, so it is marked to hide too.
 * What shows is up to CSS, so this reads layout: each item's height less its
 * own dividers. A day still open at the last mounted item is left shown,
 * since its later rows may be outside the virtualized range. */
export function markEmptyDays(list: Element) {
  let day: { divider: HTMLElement; content: number } | undefined;
  const close = (empty: boolean) => {
    if (day && day.divider.hasAttribute(EMPTY_DAY) !== empty)
      day.divider.toggleAttribute(EMPTY_DAY, empty);
  };
  for (const item of list.children) {
    if (!(item instanceof HTMLElement)) continue;
    const dividers = [
      ...item.querySelectorAll<HTMLElement>(`[${DAY_DIVIDER}]`),
    ];
    const content =
      item.getBoundingClientRect().height -
      dividers.reduce((sum, divider) => sum + outerHeight(divider), 0);
    const divider = dividers.at(-1);
    if (divider) {
      close(!!day && day.content < SHOWN);
      day = { divider, content: 0 };
    }
    if (day) day.content += Math.max(0, content);
  }
  close(false);
}

/** Keeps `markEmptyDays` current for the scroller's virtualized list, as
 * items mount, unmount and change size. */
export function useEmptyDays(
  scroller: RefObject<HTMLElement | null>,
  mounted: boolean,
) {
  useLayoutEffect(() => {
    const list = scroller.current?.querySelector("ol");
    if (
      !mounted ||
      !list ||
      typeof ResizeObserver === "undefined" ||
      typeof MutationObserver === "undefined"
    )
      return;
    let frame: number | undefined;
    const schedule = () => {
      frame ??= requestAnimationFrame(() => {
        frame = undefined;
        markEmptyDays(list);
      });
    };
    const sizes = new ResizeObserver(schedule);
    // Observe exactly the mounted items, so unmounted ones are released.
    const observe = () => {
      sizes.disconnect();
      for (const item of list.children) sizes.observe(item);
    };
    const items = new MutationObserver(() => {
      observe();
      schedule();
    });
    items.observe(list, { childList: true });
    observe();
    schedule();
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      items.disconnect();
      sizes.disconnect();
    };
  }, [scroller, mounted]);
}

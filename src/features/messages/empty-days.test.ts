// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { DAY_DIVIDER, EMPTY_DAY, markEmptyDays } from "./empty-days";

// jsdom has no layout: each item and divider reports the height CSS gave it.
const DIVIDER = 32;
type Item = { day?: string; content: number };

function list(items: readonly Item[]) {
  const root = document.createElement("ol");
  for (const { day, content } of items) {
    const item = document.createElement("li");
    if (day) {
      const divider = document.createElement("div");
      divider.setAttribute(DAY_DIVIDER, "");
      divider.textContent = day;
      divider.getBoundingClientRect = () =>
        new DOMRect(0, 0, 800, divider.hasAttribute(EMPTY_DAY) ? 0 : DIVIDER);
      divider.getClientRects = () =>
        (divider.hasAttribute(EMPTY_DAY)
          ? []
          : [new DOMRect()]) as unknown as DOMRectList;
      item.append(divider);
    }
    item.getBoundingClientRect = () => {
      const divider = item.querySelector(`[${DAY_DIVIDER}]`);
      const shown = divider && !divider.hasAttribute(EMPTY_DAY);
      return new DOMRect(0, 0, 800, content + (shown ? DIVIDER : 0));
    };
    root.append(item);
  }
  document.body.append(root);
  return root;
}
const empty = (root: Element) =>
  [...root.querySelectorAll(`[${EMPTY_DAY}]`)].map((node) => node.textContent);

afterEach(() => document.body.replaceChildren());

it("hides a day whose rows show nothing before the next day", () => {
  const root = list([
    { day: "Yesterday", content: 0 },
    { content: 0 },
    { day: "Today", content: 60 },
  ]);
  markEmptyDays(root);
  expect(empty(root)).toEqual(["Yesterday"]);
  // Hiding it changes its item's height; measuring again keeps the result.
  markEmptyDays(root);
  expect(empty(root)).toEqual(["Yesterday"]);
});

it("keeps a day whose divider row is hidden but a later row shows", () => {
  const root = list([
    { day: "Yesterday", content: 0 },
    { content: 48 },
    { day: "Today", content: 60 },
  ]);
  markEmptyDays(root);
  expect(empty(root)).toEqual([]);
});

it("leaves the last mounted day shown, since its rows may not be mounted", () => {
  const root = list([
    { day: "Yesterday", content: 60 },
    { day: "Today", content: 0 },
  ]);
  markEmptyDays(root);
  expect(empty(root)).toEqual([]);
});

it("shows a hidden day again once one of its rows shows", () => {
  const root = list([
    { day: "Yesterday", content: 0 },
    { day: "Today", content: 60 },
  ]);
  markEmptyDays(root);
  expect(empty(root)).toEqual(["Yesterday"]);
  // A row of that day appears below its (now hidden) divider.
  const first = root.children[0] as HTMLElement;
  first.getBoundingClientRect = () => new DOMRect(0, 0, 800, 40);
  markEmptyDays(root);
  expect(empty(root)).toEqual([]);
});

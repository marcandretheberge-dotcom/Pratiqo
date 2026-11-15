/** Public Café entrance with community gates OFF — no private APIs or fixtures. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import * as React from "react";

const require = createRequire(`${process.cwd()}/package.json`);
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://www.pratiqo.ca/cafe?language=it&yoReturn=/yo/langues/italien",
  pretendToBeVisual: true,
});
for (const [key, value] of Object.entries({
  window: dom.window,
  self: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  MutationObserver: dom.window.MutationObserver,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

let mediaRequests = 0;
let cafeApiFetches = 0;
Object.defineProperty(dom.window.navigator, "mediaDevices", {
  value: {
    getUserMedia: () => {
      mediaRequests += 1;
      return Promise.reject(new Error("public entrance must not request media"));
    },
  },
});
Object.defineProperty(dom.window, "matchMedia", {
  value: () => Object.assign(new dom.window.EventTarget(), { matches: false, media: "" }),
});
Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  value: class {
    observe() {}
    disconnect() {}
    unobserve() {}
  },
});
Object.defineProperties(dom.window.HTMLMediaElement.prototype, {
  play: { configurable: true, value() { return Promise.resolve(); } },
  pause: { configurable: true, value() {} },
  load: { configurable: true, value() {} },
});
dom.window.fetch = async (input: RequestInfo | URL) => {
  const url = String(input);
  if (/\/api\/cafe/.test(url)) cafeApiFetches += 1;
  return new Response("{}", { status: 200 });
};
(globalThis as { fetch?: typeof fetch }).fetch = dom.window.fetch as typeof fetch;

const previousCss = require.extensions[".css"];
require.extensions[".css"] = (module: NodeModule) => {
  module.exports = {};
};

const searchParams = new URLSearchParams("language=it&yoReturn=/yo/langues/italien");
require.cache[require.resolve("next/navigation")] = {
  id: require.resolve("next/navigation"),
  filename: require.resolve("next/navigation"),
  loaded: true,
  exports: {
    useSearchParams: () => searchParams,
    useRouter: () => ({ push: () => undefined, replace: () => undefined }),
    usePathname: () => "/cafe",
  },
} as NodeModule;
require.cache[require.resolve("next/link")] = {
  id: require.resolve("next/link"),
  filename: require.resolve("next/link"),
  loaded: true,
  exports: {
    __esModule: true,
    default: ({ href, children }: { href: string; children: React.ReactNode }) =>
      React.createElement("a", { href }, children),
  },
} as NodeModule;

let currentLocale = "en";
let localeListeners: Array<() => void> = [];
require.cache[require.resolve("@/lib/locale-context")] = {
  id: require.resolve("@/lib/locale-context"),
  filename: require.resolve("@/lib/locale-context"),
  loaded: true,
  exports: {
    useLocale: () => {
      const [, bump] = React.useState(0);
      React.useEffect(() => {
        const listener = () => bump((value) => value + 1);
        localeListeners.push(listener);
        return () => {
          localeListeners = localeListeners.filter((item) => item !== listener);
        };
      }, []);
      return {
        locale: currentLocale,
        setLocale: (next: string) => {
          currentLocale = next;
          for (const listener of localeListeners) listener();
        },
      };
    },
  },
} as NodeModule;

const { CafePublicEntrance } = require("@/components/cafe/CafePublicEntrance") as typeof import("../../components/cafe/CafePublicEntrance");
const pageSource = require("node:fs").readFileSync("app/cafe/page.tsx", "utf8") as string;
if (previousCss) require.extensions[".css"] = previousCss;
else delete require.extensions[".css"];

const { render, cleanup, fireEvent, act, within } = require("@testing-library/react") as typeof import("@testing-library/react");

async function flush() {
  await act(async () => {
    await new Promise<void>((resolve) => setImmediate(resolve));
  });
}

function mount() {
  // Null hero avoids film playback assertions here; browser coverage checks the MP4.
  return render(<CafePublicEntrance heroVideoSrc={null} />);
}

async function enterAndChooseFrenchPractice() {
  const view = mount();
  await flush();
  assert.ok(view.getByRole("heading", { name: "Café des langues" }));
  assert.ok(view.getByRole("button", { name: "Enter" }));
  assert.equal(view.queryByText(/tables disponibles|remaining spots/i), null);

  fireEvent.click(view.getByRole("button", { name: "Enter" }));
  await flush();
  assert.ok(view.getByRole("heading", { name: "Which language are we practising?" }));

  const practice = within(view.getByRole("group", { name: "Language(s) to practise" }));
  assert.equal((practice.getByRole("checkbox", { name: "Italian" }) as HTMLInputElement).checked, true);
  fireEvent.click(practice.getByRole("checkbox", { name: "Italian" }));
  fireEvent.click(practice.getByRole("checkbox", { name: "French" }));
  fireEvent.click(within(view.getByRole("group", { name: "Native language(s)" })).getByRole("checkbox", { name: "French" }));

  fireEvent.click(view.getByRole("button", { name: "Continue" }));
  await flush();
  const soon = within(view.getByRole("region", { name: "Conversations are coming soon" }).closest("section") ?? view.container);
  assert.ok(view.getByRole("heading", { name: "Conversations are coming soon" }));
  assert.match(soon.getByText(/To practise/i).textContent ?? "", /French/);
  assert.doesNotMatch(soon.getByText(/To practise/i).textContent ?? "", /Italian/);
  assert.ok(soon.getByRole("link", { name: "Back to my learning" }));
  assert.equal(mediaRequests, 0);
  assert.equal(cafeApiFetches, 0);
  return view;
}

async function keepsSelectionsWhenGoingBack() {
  const view = await enterAndChooseFrenchPractice();
  fireEvent.click(view.getByRole("button", { name: "Change languages" }));
  await flush();
  assert.equal(
    (within(view.getByRole("group", { name: "Language(s) to practise" })).getByRole("checkbox", { name: "French" }) as HTMLInputElement).checked,
    true,
  );
  assert.equal(
    (within(view.getByRole("group", { name: "Language(s) to practise" })).getByRole("checkbox", { name: "Italian" }) as HTMLInputElement).checked,
    false,
  );
}

async function interfaceLanguageSwitchWorks() {
  currentLocale = "en";
  const view = mount();
  await flush();
  fireEvent.click(view.getByRole("button", { name: "FR" }));
  await flush();
  assert.ok(view.getByRole("button", { name: "Entrer" }));
}

async function pageRoutesPublicEntranceWhenCommunityDisabled() {
  assert.match(pageSource, /CafePublicEntrance/);
  assert.doesNotMatch(pageSource, /CafeFrontDoor/);
  assert.match(pageSource, /isCafeCommunityEnabled\(\)/);
}

void (async () => {
  for (const test of [
    pageRoutesPublicEntranceWhenCommunityDisabled,
    enterAndChooseFrenchPractice,
    keepsSelectionsWhenGoingBack,
    interfaceLanguageSwitchWorks,
  ]) {
    try {
      await test();
      console.log(`✓ ${test.name}`);
    } finally {
      cleanup();
      await flush();
      mediaRequests = 0;
      cafeApiFetches = 0;
      currentLocale = "en";
    }
  }
  assert.equal(mediaRequests, 0);
  assert.equal(cafeApiFetches, 0);
  console.log("cafePublicEntrance: public gated journey scenarios passed");
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => dom.window.close());

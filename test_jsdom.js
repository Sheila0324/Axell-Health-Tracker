import { JSDOM, VirtualConsole } from 'jsdom';

const virtualConsole = new VirtualConsole();
virtualConsole.on("error", (e) => {
  console.log("JSDOM Error:", e);
});
virtualConsole.on("log", (msg) => {
  console.log("JSDOM Log:", msg);
});
virtualConsole.on("jsdomError", (e) => {
  console.log("JSDOM Internal Error:", e.message, e.stack);
});

(async () => {
  try {
    console.log("Loading http://localhost:4174/...");
    const dom = await JSDOM.fromURL("http://localhost:4174/", {
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
      virtualConsole,
      beforeParse(window) {
        window.matchMedia = () => ({ matches: false, addListener: () => {}, removeListener: () => {} });
      }
    });

    console.log("Waiting for 3 seconds...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log("Root content:", dom.window.document.getElementById('root')?.innerHTML);
    process.exit(0);
  } catch (err) {
    console.error("Fatal error:", err);
    process.exit(1);
  }
})();

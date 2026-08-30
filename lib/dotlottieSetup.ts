import { setWasmUrl } from "@lottiefiles/dotlottie-react";

// The library fetches its WASM runtime from a CDN (jsdelivr, then unpkg) by
// default, which the app's CSP (connect-src 'self') correctly blocks — so
// it's pointed at a same-origin copy instead, shipped in public/, rather
// than loosening the CSP to trust two third-party CDN origins for a file
// the npm package already includes. Import this module for its side effect
// before rendering any DotLottieReact component.
setWasmUrl("/dotlottie-player.wasm");

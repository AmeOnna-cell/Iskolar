// Inline <head> scripts for the root layout. They live in a plain module on purpose: a string exported
// from a "use client" file is a client reference on the server, so it rendered as a function that throws
// (a syntax error) and never ran.

export const THEME_KEY = "iskolar-theme";

/** Runs before paint so a stored theme choice never flashes the wrong theme. */
const themeInitScript = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.dataset.theme=t}catch(e){}`;

/**
 * Back/Forward guard hook. Listeners on `window` run in registration order, and Next's App Router
 * registers its popstate listener at hydration, so this one (registered at parse time) runs first.
 * A page with unsaved work sets `window[LEAVE_GUARD]`; returning false stops the event before Next sees it.
 */
export const LEAVE_GUARD = "__iskolarLeaveGuard";
const leaveGuardScript = `addEventListener("popstate",function(e){var g=window.${LEAVE_GUARD};if(g&&g(e)===false)e.stopImmediatePropagation()});`;

export const headScript = themeInitScript + leaveGuardScript;

declare global {
  interface Window {
    [LEAVE_GUARD]?: (e: PopStateEvent) => boolean;
  }
}

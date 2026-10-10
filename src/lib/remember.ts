import { supabase } from "@/integrations/supabase/client";

// "Remember me" off = sign out when the browser is closed.
// localStorage keeps the choice; sessionStorage marks "this browser session is active".
const KEY = "hms_remember";
const ACTIVE = "hms_session_active";

export function setRememberMe(remember: boolean) {
  localStorage.setItem(KEY, remember ? "1" : "0");
  sessionStorage.setItem(ACTIVE, "1");
}

/** Run once on app start (browser only). */
export async function enforceRememberMe() {
  if (localStorage.getItem(KEY) === "0" && !sessionStorage.getItem(ACTIVE)) {
    localStorage.removeItem(KEY);
    await supabase.auth.signOut();
  }
  sessionStorage.setItem(ACTIVE, "1");
}

import { redirect } from "next/navigation";

// Canonical teacher recruitment page is /devenir-enseignant.
// This URL supports ad campaigns and alternate search intents.
export default function DevenirProfPage() {
  redirect("/devenir-enseignant");
}

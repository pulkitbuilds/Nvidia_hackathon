import "./globals.css";
export const metadata = { title: "Evidentia", description: "Evidence-first RAG powered by NVIDIA" };
export default function RootLayout({ children }) {
  return (<html lang="en"><body>{children}</body></html>);
}

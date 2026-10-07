import "./globals.css";

export const metadata = { title: "ยาและนัดหมาย" };

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

import "./globals.css";

export const metadata = {
  title: "Video Editor Portfolio",
  description: "Short-form video editing portfolio",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

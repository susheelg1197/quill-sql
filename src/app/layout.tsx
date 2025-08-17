import 'antd/dist/reset.css';
import type { Metadata } from 'next';
import { ConfigProvider, theme as antdTheme, App as AntApp } from 'antd';

export const metadata: Metadata = {
  title: 'Quill SQL',
  description: 'Interview project',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ConfigProvider theme={{ algorithm: antdTheme.defaultAlgorithm }}>
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </body>
    </html>
  );
}
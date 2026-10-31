import './globals.css';
import Nav from './nav';

export const metadata = { title: 'Legal Case Finder' };
export default function RootLayout({ children }) {
  return (<html lang="en"><body><Nav /><main>{children}</main></body></html>);
}

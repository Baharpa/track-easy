import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/globals.css';
import { SWRConfig } from 'swr';
import { fetcher } from '../lib/api';
import Layout from '../components/Layout';

export default function App({ Component, pageProps }) {
  return (
    <SWRConfig value={{ fetcher }}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </SWRConfig>
  );
}

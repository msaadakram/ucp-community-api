/* Admin section layout: shared styles only. Pages import Shell from
 * ./admin-shell (named exports don't cross Next layout boundaries). */

import { styles } from './admin-styles';

export default function AdminLayout({ children }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      {children}
    </>
  );
}


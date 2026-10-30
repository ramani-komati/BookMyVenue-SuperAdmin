import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/services/adminApi';
import { customCategoryOf } from '@/constants/subcategories';

// One fetch per page load, shared by every panel that mounts the hook;
// `invalidateSubcategoryOptions` drops it after the Sub-categories page
// changes something.
let cached = null;
export const invalidateSubcategoryOptions = () => {
  cached = null;
};

/**
 * useSubcategoryOptions — the shared custom sub-categories the Register
 * Venues / All venues forms offer next to the built-in lists. The super
 * admin sees APPROVED and PENDING names (GET /api/admin/subcategories);
 * picking a pending one approves it when the venue is submitted. Rejected
 * names are not offered. The vendor portal has its own copy of this hook
 * (approved names only).
 *
 * `sharedFor(type)` → [{ name, status }] for a wizard venue type.
 */
export default function useSubcategoryOptions() {
  const [rows, setRows] = useState(() => (cached && cached.data) || []);

  useEffect(() => {
    let alive = true;
    if (!cached) cached = { data: null, promise: adminApi.listSubcategories() };
    cached.promise
      .then((res) => {
        const data = Array.isArray(res?.subCategories) ? res.subCategories : [];
        cached.data = data;
        if (alive) setRows(data);
      })
      .catch(() => {
        // The built-in lists still work — never block registration on this.
        cached = null;
      });
    return () => {
      alive = false;
    };
  }, []);

  const sharedFor = useCallback(
    (type) => {
      const category = customCategoryOf(type);
      return rows
        .filter((r) => r.category === category && r.status !== 'rejected')
        .map((r) => ({ name: r.name, status: r.status }));
    },
    [rows],
  );
  return { sharedFor };
}
